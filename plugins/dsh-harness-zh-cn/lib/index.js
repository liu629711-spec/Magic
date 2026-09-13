/**
 * dsh-harness-zh-cn — DeepSeek Harness 中文汉化插件
 *
 * 通过 `system-prompt/assemble` 瀑布钩子，在每次组装完成后把模型可见的
 * 系统提示词（sections）、运行时上下文（contexts）与工具描述（tools）
 * 从英文翻译成中文。不修改任何 DSH 源码，卸载即还原。
 *
 * 翻译策略：
 *  - 以"整句/整段精确匹配"为主（对已知的固定提示文本），
 *  - 以"模板正则"为辅（对含 ${...} 插值的动态文本，如路径、数字、模式名），
 *  - 机器协议标记（[exit code: N]、[killed by signal: X]、[sandbox: ...]、
 *    [stderr]、(no output) 等）一律保留原样，避免破坏下游解析。
 */
import { readFileSync, readdirSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import z from "@deepseek-ai/schemastery";
import { BlockAssembler, createUserMessage } from "@deepseek-ai/dsh-llm";

const HERE = dirname(fileURLToPath(import.meta.url));
const DICT_DIR = join(HERE, "..", "dict");

/** Cordis 插件名。 */
export const name = "harness-zh";

/** 依赖的系统提示词注册服务与 Web 服务（commands 用 ctx.get 轮询获取，避免影响 apply）。 */
export const inject = ["systemPrompt", "webServer"];

/** 插件配置 schema：默认全开，可分别关闭某一类翻译。 */
export const Config = z.object({
	includeSections: z.boolean().default(true),
	includeContexts: z.boolean().default(true),
	includeTools: z.boolean().default(true),
	verbose: z.boolean().default(false)
});

/**
 * 加载 dict/ 下所有 *.json 翻译字典，合并为：
 *   { exact: Map<en, zh>, patterns: Array<{re, template}> }
 * 字典条目格式（见 dict/*.json 与子代理任务说明）：
 *   { "<包>:<键>": { kind, en, zh } }
 */
function loadDictionaries() {
	const exact = new Map();
	const patterns = [];
	let files = [];
	try {
		files = readdirSync(DICT_DIR).filter((f) => f.endsWith(".json"));
	} catch {
		// dict 目录不存在时静默降级（空翻译表）
	}
	for (const file of files) {
		const raw = readFileSync(join(DICT_DIR, file), "utf8");
		let entries;
		try {
			entries = JSON.parse(raw);
		} catch (error) {
			console.warn(`[dsh-harness-zh-cn] 跳过无法解析的字典 ${file}: ${error.message}`);
			continue;
		}
		// 支持两种结构：
		// 1) 扁平：{ "键": { kind, en, zh } }
		// 2) 嵌套：{ "包": { "键": { kind, en, zh } } }
		const flat = Object.values(entries).every((value) => value && typeof value.en === "string");
		const map = flat ? entries : Object.values(entries).reduce((acc, group) => {
			if (group && typeof group === "object") Object.assign(acc, group);
			return acc;
		}, {});
		for (const entry of Object.values(map)) {
			if (!entry || typeof entry.en !== "string" || typeof entry.zh !== "string") continue;
			if (entry.en.length === 0) continue;
			if (entry.template === true) {
				try {
					patterns.push({
						re: new RegExp(entry.en),
						template: entry.zh
					});
				} catch {
					// 非法正则跳过
				}
			} else {
				// 精确匹配优先：先长后短，避免短句误伤
				exact.set(entry.en, entry.zh);
				// 同时索引空白折叠版本，容忍拼接处的空格差异
				const collapsed = entry.en.replace(/\s+/g, " ").trim();
				if (collapsed !== entry.en && !exact.has(collapsed)) exact.set(collapsed, entry.zh);
			}
		}
	}
	return { exact, patterns };
}

const DICTS = loadDictionaries();

/** 将连续空白折叠为单个空格，用于宽松匹配（消除拼接处空格差异）。 */
function collapseWhitespace(text) {
	return text.replace(/\s+/g, " ").trim();
}

/**
 * 将一段模型可见文本翻译成中文；无法翻译时原样返回。
 * 保留机器协议标记与代码标识符。
 * 匹配顺序：精确匹配 → 空白折叠后精确匹配 → 模板正则。
 */
export function translate(text) {
	if (typeof text !== "string" || text.length === 0) return text;
	const exact = DICTS.exact.get(text);
	if (exact !== undefined) return exact;
	const collapsed = collapseWhitespace(text);
	if (collapsed !== text) {
		const loose = DICTS.exact.get(collapsed);
		if (loose !== undefined) return loose;
	}
	// 模板翻译：按正则整体替换（全串匹配）
	for (const { re, template } of DICTS.patterns) {
		if (re.test(text)) {
			const next = text.replace(re, template);
			if (next !== text) return next;
		}
	}
	return text;
}

/** 递归翻译工具参数 schema 中的 description 字段。 */
function translateParameters(parameters, seen = new Set()) {
	if (parameters === null || typeof parameters !== "object" || seen.has(parameters)) return;
	seen.add(parameters);
	for (const value of Object.values(parameters)) {
		if (value === null || typeof value !== "object") continue;
		if (typeof value.description === "string") {
			value.description = translate(value.description);
		}
		translateParameters(value, seen);
	}
}

/**
 * 应用翻译：修改 assembly 中的 sections、contexts、tools 描述。
 * 在瀑布 next() 之后执行，避免影响其他插件对原始英文的依赖。
 */
function applyTranslation(assembly, config) {
	if (config.includeSections !== false) {
		for (const section of assembly.sections) {
			section.text = translate(section.text);
		}
	}
	if (config.includeContexts !== false) {
		for (const context of assembly.contexts) {
			context.text = translate(context.text);
		}
	}
	if (config.includeTools !== false) {
		for (const tool of assembly.tools) {
			if (typeof tool.description === "string") {
				tool.description = translate(tool.description);
			}
			if (tool.parameters) translateParameters(tool.parameters);
		}
	}
}

/** Cordis 插件入口。 */
export function apply(ctx, config = {}) {
	diag("apply called");
	const effective = { ...Config, ...config };
	ctx.on("system-prompt/assemble", async (assembly, _context, next) => {
		const result = await next();
		applyTranslation(result, effective);
		return result;
	});
	try { installTranslateEndpoint(ctx, effective); diag("apply: endpoint installed"); } catch (e) { diag("apply: endpoint FAILED " + (e && e.message)); }
	// commands 服务可能在 apply 时尚未就绪，轮询等待（不阻塞、不影响 apply / 启动）。
	try {
		let attempts = 0;
		const tryPatch = () => {
			try {
				const c = ctx.get && typeof ctx.get === "function" ? ctx.get("commands") : void 0;
				if (c && typeof c.list === "function") { patchCommandListDescriptions(ctx); return; }
				if (++attempts < 60) setTimeout(tryPatch, 200);
				else diag("poll: gave up waiting for commands service");
			} catch (e) { diag("poll threw: " + (e && e.message)); }
		};
		tryPatch();
	} catch (e) { /* never break boot */ }
}

/**
 * 命令描述（host 侧）整句精确翻译表。命令名称保留英文（是派发标识符），
 * 只翻译 `commands.list` 返回的描述。Gateway 在每次 RPC 调用时动态读取
 * `ctx.commands.list`，因此这里 monkey-patch 一定生效，且不受 client 缓存影响。
 */
const COMMAND_DESCRIPTIONS = {
	"Compact older conversation history": "压缩较早的对话历史",
	"record feedback about this session": "记录本次会话的反馈",
	"set or view the goal for a long-running task": "设置或查看长期任务的目标",
	"Switch the permission preset (sandbox mode + approval policy)": "切换权限预设（沙箱模式 + 审批策略）",
	"Enter or leave plan mode": "进入或退出计划模式",
	"Download this Session log as a ZIP archive": "将会话日志下载为 ZIP 压缩包"
};

/** 写文件诊断（host 日志的 ctx.logger 不可靠）。写多个候选路径，至少一个可写。 */
const DIAG_PATHS = [
	"D:\\DSHHome\\harness-zh-diag.log",
	process.env.TEMP ? join(process.env.TEMP, "harness-zh-diag.log") : null,
	"D:\\Projects\\harness workspace\\dsh-harness-zh-cn\\diag.log"
].filter(Boolean);
function diag(line) {
	for (const p of DIAG_PATHS) {
		try { appendFileSync(p, new Date().toISOString() + " " + line + "\n"); return; } catch (e) { /* try next */ }
	}
}

/** 包装 host 的 `commands.list`，把描述翻译成中文（未命中表则保持原文）。全程防御，绝不抛错。 */
function patchCommandListDescriptions(ctx) {
	try {
		// commands 未加入 inject，故只能用 ctx.get() 惰性获取（已由轮询确保就绪）。
		const commands = ctx.get && typeof ctx.get === "function" ? ctx.get("commands") : ctx.commands;
		diag("patch: ctx.get=" + (typeof ctx.get) + " commands.available=" + (!!commands));
		if (!commands || typeof commands.list !== "function") {
			diag("patch: commands.list NOT available, skip");
			return;
		}
		const originalList = commands.list.bind(commands);
		commands.list = function (agent) {
			// 注意：绝对不能对 agent（cordis 守卫代理）做 JSON.stringify——
			// 那会触发 `cannot get property "toJSON" without inject` 而中断翻译。
			try {
				const rows = originalList(agent);
				if (!Array.isArray(rows)) return rows;
				const translated = rows.map((d) => {
					if (!d || typeof d.description !== "string") return d;
					if (/[\u4e00-\u9fff]/.test(d.description)) return d;
					const zh = COMMAND_DESCRIPTIONS[d.description];
					return zh !== void 0 && zh !== d.description ? { ...d, description: zh } : d;
				});
				try {
					diag("list -> " + translated.map((d) => (d && d.name) + "=" + JSON.stringify(d && d.description)).join(" | "));
				} catch (e) { /* diag never breaks translation */ }
				return translated;
			} catch (e) {
				diag("list() threw: " + (e && e.stack ? e.stack.split("\n")[0] : e));
				try { return originalList(agent); } catch (e2) { return []; }
			}
		};
		diag("patch: commands.list patched OK");
	} catch (e) {
		diag("patch outer threw: " + (e && e.message));
	}
}

/**
 * 翻译端点：POST /api/harness-zh/translate
 * 接收 { texts: string[] }，用当前部署的默认模型批量翻译成中文。
 * LLM 或默认模型不可用时返回 503（client 端回退到词表翻译）。
 * 逐条单独调用模型，结果以数组返回（顺序与输入一致）。
 */
function installTranslateEndpoint(ctx, config) {
	const webServer = ctx.webServer ?? ctx.get("webServer");
	if (webServer === void 0) return;
	ctx.effect(() => webServer.register({
		kind: "exact",
		path: "/api/harness-zh/translate",
		handler: async (req, res) => {
			try {
				if ((req.method ?? "GET").toUpperCase() !== "POST") {
					res.writeHead(405, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ ok: false, error: "method not allowed" }));
					return;
				}
				let raw = "";
				for await (const chunk of req) raw += chunk;
				let body;
				try { body = JSON.parse(raw || "{}"); } catch { body = {}; }
				const texts = Array.isArray(body.texts) ? body.texts.filter((t) => typeof t === "string").slice(0, 50) : [];
				if (texts.length === 0) {
					res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ ok: true, translations: [] }));
					return;
				}
				const translations = await translateBatch(ctx, texts);
				if (translations === null) {
					res.writeHead(503, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ ok: false, error: "llm unavailable" }));
					return;
				}
				res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
				res.end(JSON.stringify({ ok: true, translations }));
			} catch (error) {
				res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
				res.end(JSON.stringify({ ok: false, error: String(error && error.message || error) }));
			}
		}
	}), "dsh-harness-zh-cn: translate endpoint");
}

/** 用默认模型批量翻译；LLM 不可用时返回 null。 */
async function translateBatch(ctx, texts) {
	const llm = ctx.get("llm");
	if (llm === void 0) return null;
	const defaultModel = ctx.get("agentDefaultModel");
	let provider = "deepseek";
	let model = "deepseek-chat";
	try {
		const selection = defaultModel?.currentSelection?.();
		if (selection?.provider) provider = selection.provider;
		if (selection?.model) model = selection.model;
	} catch { /* keep defaults */ }

	// 1. 收集需要翻译的条目（跳过空串与已含中文的）
	const need = [];
	const needIdx = [];
	texts.forEach((text, i) => {
		const trimmed = String(text ?? "").trim();
		if (trimmed.length === 0) return;
		if (/[\u4e00-\u9fff]/.test(trimmed)) return;
		need.push(trimmed);
		needIdx.push(i);
	});
	const results = texts.slice();
	if (need.length === 0) return results;

	// 2. 批量翻译：一次调用翻译多条，模型返回 JSON 数组（与输入顺序一致）。
	// 每条最多 200 字符；超过则分组。
	const MAX_PER_CALL = 20;
	for (let start = 0; start < need.length; start += MAX_PER_CALL) {
		const chunk = need.slice(start, start + MAX_PER_CALL);
		try {
			const translated = await translateChunk(llm, provider, model, chunk);
			if (translated !== null) {
				for (let j = 0; j < chunk.length; j++) {
					const t = translated[j];
					if (typeof t === "string" && t.length > 0) results[needIdx[start + j]] = t;
				}
			}
		} catch (error) {
			console.warn(`[dsh-harness-zh-cn] translate chunk failed: ${error?.message ?? error}`);
			// 逐条回退
			for (let j = 0; j < chunk.length; j++) {
				try {
					const one = await translateOne(llm, provider, model, chunk[j]);
					results[needIdx[start + j]] = one;
				} catch { /* keep original */ }
			}
		}
	}
	return results;
}

/** 一次 LLM 调用翻译一批文本（≤20 条），返回与输入同序的中文数组；失败返回 null。 */
async function translateChunk(llm, provider, model, texts) {
	const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
	const messages = [createUserMessage({
		content: [{ type: "text", text: numbered }],
		source: { kind: "plugin", plugin: "dsh-harness-zh-cn" }
	})];
	const options = {
		provider,
		model,
		messages,
		system: "你是专业翻译。把下面每行编号的英文逐条翻译成自然流畅的中文，保持编号格式，只输出编号+译文，每行一条，不要解释、引号或多余文字。",
		purpose: "harness-zh-translate",
		maxTokens: 2048
	};
	const stream = llm.stream ? llm.stream(options) : await llm.call?.(options);
	if (!stream || typeof stream[Symbol.asyncIterator] !== "function") return null;
	const assembler = new BlockAssembler();
	for await (const chunk of stream) assembler.push(chunk);
	const blocks = assembler.blocks();
	const out = blocks.filter((block) => block.type === "text").map((block) => block.text).join("").trim();
	if (out.length === 0) return null;
	// 解析 "N. 译文" 行，与输入顺序对应
	const result = texts.map(() => "");
	let current = 0;
	for (const line of out.split("\n")) {
		const m = /^\s*(\d+)[.、:：]\s*(.+)$/.exec(line.trim());
		if (m) {
			const idx = Number(m[1]) - 1;
			if (idx >= 0 && idx < texts.length && result[idx] === "") {
				result[idx] = m[2].trim();
				current++;
			}
		} else if (current > 0) {
			// 续行追加到上一条
			const last = texts.map((_, i) => i).filter((i) => result[i] !== "").at(-1);
			if (last !== void 0) result[last] += " " + line.trim();
		}
	}
	// 未解析出的条目回退为原文
	for (let i = 0; i < result.length; i++) {
		if (result[i] === "") result[i] = texts[i];
	}
	return result;
}

/** 调用一次 LLM 翻译单个文本。 */
async function translateOne(llm, provider, model, text) {
	const messages = [createUserMessage({
		content: [{ type: "text", text }],
		source: { kind: "plugin", plugin: "dsh-harness-zh-cn" }
	})];
	const options = {
		provider,
		model,
		messages,
		system: "你是专业翻译。把用户提供的英文翻译成自然流畅的中文，只输出译文，不要任何解释、引号或额外文字。",
		purpose: "harness-zh-translate",
		maxTokens: 512
	};
	const stream = llm.stream ? llm.stream(options) : await llm.call?.(options);
	if (!stream || typeof stream[Symbol.asyncIterator] !== "function") return text;
	const assembler = new BlockAssembler();
	for await (const chunk of stream) assembler.push(chunk);
	const blocks = assembler.blocks();
	const out = blocks.filter((block) => block.type === "text").map((block) => block.text).join("").trim();
	return out.length > 0 ? out : text;
}

/** Cordis 插件默认导出（加载器按 default 取插件对象）。 */
export default { name, inject, Config, apply };
