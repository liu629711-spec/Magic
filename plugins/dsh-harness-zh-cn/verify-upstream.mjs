// 核对子代理重构的 en 与 upstream 真实英文源码
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DICT_DIR = "D:/Projects/harness workspace/dsh-harness-zh/dict";
const UPSTREAM = "D:/Projects/harness workspace/upstream-ref/packages";

// 被汉化的 8 个文件 → upstream 源码路径映射
const MAPPINGS = {
	"dsh-tool-bash:lib/index.js": ["shell/tool-bash/src/index.ts", "shell/tool-bash/src/render.ts", "shell/tool-bash/src/background.ts"],
	"dsh-tool-fs:lib/index.js": ["fs/tool-fs/src/index.ts", "fs/tool-fs/src/read.ts", "fs/tool-fs/src/write.ts", "fs/tool-fs/src/edit.ts", "fs/tool-fs/src/read-image.ts", "fs/tool-fs/src/sandbox.ts", "fs/tool-fs/src/read-render.ts"],
	"dsh-tool-fs-search:lib/index.js": ["fs/tool-fs-search/src/index.ts", "fs/tool-fs-search/src/glob.ts", "fs/tool-fs-search/src/grep.ts", "fs/tool-fs-search/src/presentation.ts"],
	"dsh-system-prompt:lib/index.js": ["core/system-prompt/src/index.ts"],
	"dsh-app-boot:lib/index.js": ["boot/app-boot/src/index.ts"],
	"dsh-agent-instructions:lib/index.js": ["context/agent-instructions/src/index.ts", "context/agent-instructions/src/render.ts", "context/agent-instructions/src/config.ts", "context/agent-instructions/src/state.ts", "context/agent-instructions/src/files.ts"],
	"dsh-agent-loop:lib/index.js": ["core/agent-loop/src/index.ts"],
	"dsh-subagent:lib/types/child-agent.js": ["subagent/subagent/src/child-agent.ts"]
};

function findFile(base, name) {
	// 递归查找匹配文件名的真实路径（忽略目录结构差异）
	try {
		const entries = readdirSync(base);
		for (const e of entries) {
			const p = join(base, e);
			if (statSync(p).isDirectory()) {
				const found = findFile(p, name);
				if (found) return found;
			} else if (e === name) return p;
		}
	} catch { /* ignore */ }
	return undefined;
}

// 收集 upstream 所有 .ts 源码文本（规范化空白）
function collectUpstreamTexts(paths) {
	const texts = new Set();
	for (const rel of paths) {
		let p = join(UPSTREAM, rel);
		if (!statSync(p).isFile()) {
			p = findFile(UPSTREAM, rel.split("/").pop());
			if (!p) { console.log("  [缺失] upstream 文件:", rel); continue; }
		}
		const src = readFileSync(p, "utf8");
		// 提取所有单引号/双引号/模板字符串字面量（粗略）
		const re = /(?:description|text|summary|title|intro|message|detail|return|returns)\s*[:=]\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`)/gs;
		for (const m of src.matchAll(re)) {
			const raw = m[1] ?? m[2] ?? m[3];
			if (!raw) continue;
			const clean = raw.replace(/\\n/g, "\n").replace(/\s+/g, " ").trim();
			if (clean.length > 20) texts.add(clean);
		}
	}
	return texts;
}

const collapse = (s) => s.replace(/\s+/g, " ").trim();

for (const [pkgKey, upstreamPaths] of Object.entries(MAPPINGS)) {
	console.log(`\n===== ${pkgKey} =====`);
	const upstreamTexts = collectUpstreamTexts(upstreamPaths);
	// 加载字典
	let entries = {};
	for (const f of readdirSync(DICT_DIR).filter((f) => f.endsWith(".json"))) {
		const data = JSON.parse(readFileSync(join(DICT_DIR, f), "utf8"));
		const flat = Object.values(data).every((v) => v && typeof v.en === "string");
		if (flat) entries = { ...entries, ...data };
		else for (const g of Object.values(data)) if (g) entries = { ...entries, ...g };
	}
	// 该包下的条目（精确包前缀匹配，避免 dsh-tool-fs 误匹配 dsh-tool-fs-search）
	const pkgName = pkgKey.split(":")[0];
	const pkgEntries = Object.entries(entries).filter(([k]) => k.startsWith(pkgName + ":") || k.startsWith(pkgName + "."));
	let matched = 0, unmatched = 0;
	for (const [key, e] of pkgEntries) {
		if (e.template === true) continue;
		const en = collapse(e.en);
		const hit = [...upstreamTexts].some((t) => t === en || t.includes(en) || en.includes(t));
		if (hit) matched++;
		else { unmatched++; console.log(`  [未命中] ${key}: ${e.en.slice(0, 80)}`); }
	}
	console.log(`  matched: ${matched} / ${pkgEntries.length} (unmatched: ${unmatched})`);
}
