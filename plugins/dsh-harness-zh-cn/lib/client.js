/**
 * dsh-harness-zh-cn — Client half (browser-side UI localization).
 *
 * Loaded through the client module system (`window.__ModuleLoader__.load`);
 * the returned `apply(ctx)` receives the real client root Context.
 *
 * It does three things, none of which modify DSH source:
 *  1. Wraps `window.fetch` to intercept `/api/market/list` responses and
 *     translate each plugin card's English `description` into Chinese.
 *  2. Patches `ctx.locale.lookup` (the LocaleRuntime instance method backing
 *     every `t()` seat) so the `zh` dictionary wins for any namespace that
 *     ships one — localizing all `t()` labels, including the composer "+"
 *     menu button, its slash-menu group titles and chrome.
 *  3. Replaces the `ctx.remote.commands.list` getter to translate each
 *     slash-command descriptor's display-only `description`; the `name` is
 *     preserved because it is the identifier dispatch/parsing relies on.
 *
 * Translation strategy (dictionary + phrase rules, no LLM for these seams):
 *  1. If the text already contains CJK, leave it untouched.
 *  2. Replace known phrases via a sorted glossary (longest first, word-boundary).
 *  3. Apply light sentence shaping: strip leading "A/An/The", convert leftover
 *     "and"-conjoined fragments, drop empty words, and tidy whitespace.
 *
 * Uninstall the plugin and every hook is restored: no source is modified.
 */
window.__ModuleLoader__.load({
	id: "dsh-harness-zh-cn",
	factory: function (require) {
		"use strict";

		// ── marketplace glossary: common English repo-description phrases ──
		// [english, chinese]; matched case-insensitively at word boundaries,
		// longest first so "for DeepSeek Harness" wins over "DeepSeek Harness".
		var GLOSSARY = [
			["DeepSeek Harness", "DeepSeek Harness"],
			["deepseek-harness", "DeepSeek Harness"],
			["for DeepSeek Harness", "面向 DeepSeek Harness 的"],
			["for DSH", "面向 DSH 的"],
			["of DeepSeek Harness", "DeepSeek Harness 的"],
			["plugin marketplace", "插件市场"],
			["plugin market", "插件市场"],
			["marketplace", "插件市场"],
			["plugins", "插件"],
			["plugin", "插件"],
			["DSH Web UI", "DSH Web 界面"],
			["web ui", "Web 界面"],
			["web client", "Web 客户端"],
			["web gui", "Web 图形界面"],
			["web app", "Web 应用"],
			["in the web", "在 Web 界面中"],
			["conversation", "对话"],
			["chat", "对话"],
			["sidebar", "侧边栏"],
			["settings", "设置"],
			["settings panel", "设置面板"],
			["mobile", "移动端"],
			["responsive", "自适应"],
			["theme", "主题"],
			["themes", "主题"],
			["agent", "代理"],
			["agents", "代理"],
			["subagent", "子代理"],
			["subagents", "子代理"],
			["tool", "工具"],
			["tools", "工具"],
			["toolkit", "工具集"],
			["model", "模型"],
			["models", "模型"],
			["session", "会话"],
			["sessions", "会话"],
			["workflow", "工作流"],
			["workflows", "工作流"],
			["automation", "自动化"],
			["automate", "自动化"],
			["skill", "技能"],
			["skills", "技能包"],
			["skill pack", "技能包"],
			["search", "搜索"],
			["install", "安装"],
			["installed", "已安装"],
			["installation", "安装"],
			["update", "更新"],
			["updates", "更新"],
			["keyboard", "键盘"],
			["shortcut", "快捷键"],
			["shortcuts", "快捷键"],
			["hotkey", "快捷键"],
			["hotkeys", "快捷键"],
			["voice", "语音"],
			["speech", "语音"],
			["image", "图像"],
			["images", "图像"],
			["picture", "图片"],
			["file", "文件"],
			["files", "文件"],
			["folder", "文件夹"],
			["directory", "目录"],
			["terminal", "终端"],
			["command line", "命令行"],
			["chinese", "中文"],
			["localization", "本地化"],
			["localize", "本地化"],
			["i18n", "国际化"],
			["translation", "翻译"],
			["translate", "翻译"],
			["real-time", "实时"],
			["realtime", "实时"],
			["real time", "实时"],
			["browser", "浏览器"],
			["github", "GitHub"],
			["command", "命令"],
			["commands", "命令"],
			["notification", "通知"],
			["notifications", "通知"],
			["alerts", "提醒"],
			["alert", "提醒"],
			["config", "配置"],
			["configuration", "配置"],
			["custom", "自定义"],
			["customizable", "可自定义"],
			["configurable", "可配置"],
			["flexible", "灵活"],
			["management", "管理"],
			["manager", "管理器"],
			["manage", "管理"],
			["generation", "生成"],
			["generate", "生成"],
			["integration", "集成"],
			["integrate", "集成"],
			["integrated", "集成"],
			["extension", "扩展"],
			["enhancement", "增强"],
			["enhanced", "增强的"],
			["experimental", "实验性"],
			["lightweight", "轻量"],
			["zero-dependency", "零依赖"],
			["zero dependency", "零依赖"],
			["efficient", "高效"],
			["high-performance", "高性能"],
			["high performance", "高性能"],
			["fast", "快速"],
			["simple", "简单"],
			["easy", "易用"],
			["user-friendly", "用户友好"],
			["friendly", "友好"],
			["powerful", "强大"],
			["open source", "开源"],
			["cli", "命令行工具"],
			["gui", "图形界面"],
			["based on", "基于"],
			["built on", "构建于"],
			["built with", "使用"],
			["written in", "使用"],
			["written for", "面向"],
			["provides", "提供"],
			["provide", "提供"],
			["adds", "新增"],
			["add", "添加"],
			["with", "支持"],
			["supports", "支持"],
			["support", "支持"],
			["including", "包括"],
			["and more", "等更多功能"],
			["runtime", "运行时"],
			["in real time", "实时"],
			["input", "输入"],
			["output", "输出"],
			["display", "显示"],
			["render", "渲染"],
			["rendering", "渲染"],
			["view", "视图"],
			["views", "视图"],
			["panel", "面板"],
			["tab", "标签页"],
			["tabs", "标签页"],
			["button", "按钮"],
			["buttons", "按钮"],
			["icon", "图标"],
			["icons", "图标"],
			["menu", "菜单"],
			["list", "列表"],
			["lists", "列表"],
			["history", "历史"],
			["records", "记录"],
			["record", "记录"],
			["data", "数据"],
			["text", "文本"],
			["content", "内容"],
			["documents", "文档"],
			["document", "文档"],
			["code", "代码"],
			["coding", "编程"],
			["programming", "编程"],
			["development", "开发"],
			["developer", "开发者"],
			["design", "设计"],
			["interface", "界面"],
			["layout", "布局"],
			["style", "样式"],
			["styling", "样式"],
			["dark", "深色"],
			["light", "浅色"],
			["color", "颜色"],
			["colors", "颜色"],
			["network", "网络"],
			["remote", "远程"],
			["local", "本地"],
			["cloud", "云端"],
			["server", "服务端"],
			["server-side", "服务端"],
			["client-side", "客户端"],
			["host", "宿主"],
			["plugin system", "插件系统"],
			["plugin manager", "插件管理器"],
			["plugin management", "插件管理"],
			["system tray", "系统托盘"],
			["system", "系统"],
			["application", "应用"],
			["app", "应用"],
			["feature", "功能"],
			["features", "功能"],
			["function", "功能"],
			["functionality", "功能"],
			["security", "安全"],
			["secure", "安全"],
			["privacy", "隐私"],
			["permission", "权限"],
			["permissions", "权限"],
			["sandbox", "沙箱"],
			["approval", "审批"],
			["audit", "审计"],
			["log", "日志"],
			["logs", "日志"],
			["monitor", "监控"],
			["monitoring", "监控"],
			["tracking", "追踪"],
			["track", "追踪"],
			["sync", "同步"],
			["synchronize", "同步"],
			["synchronization", "同步"],
			["backup", "备份"],
			["export", "导出"],
			["import", "导入"],
			["upload", "上传"],
			["download", "下载"],
			["share", "分享"],
			["collaboration", "协作"],
			["collaborative", "协作"],
			["team", "团队"],
			["project", "项目"],
			["task", "任务"],
			["tasks", "任务"],
			["job", "任务"],
			["jobs", "任务"],
			["schedule", "定时"],
			["scheduled", "定时"],
			["cron", "定时任务"],
			["timer", "计时器"],
			["reminder", "提醒"],
			["reminders", "提醒"],
			["calendar", "日历"],
			["email", "邮件"],
			["message", "消息"],
			["messages", "消息"],
			["notification", "通知"],
			["notifications", "通知"],
			["alerts", "提醒"],
			["alert", "提醒"],
			["analysis", "分析"],
			["analyze", "分析"],
			["analytics", "分析"],
			["statistics", "统计"],
			["stats", "统计"],
			["report", "报告"],
			["reports", "报告"],
			["review", "审查"],
			["check", "检查"],
			["validate", "校验"],
			["validation", "校验"],
			["test", "测试"],
			["testing", "测试"],
			["debug", "调试"],
			["debugging", "调试"],
			["error", "错误"],
			["errors", "错误"],
			["failure", "失败"],
			["success", "成功"],
			["status", "状态"],
			["state", "状态"],
			["progress", "进度"],
			["percentage", "百分比"],
			["version", "版本"],
			["versions", "版本"],
			["update check", "更新检查"],
			["upgrade", "升级"],
			["release", "发布"],
			["releases", "发布"],
			["build", "构建"],
			["compile", "编译"],
			["deploy", "部署"],
			["deployment", "部署"],
			["package", "打包"],
			["packaging", "打包"],
			["installer", "安装程序"],
			["portable", "便携"],
			["standalone", "独立"],
			["cross-platform", "跨平台"],
			["cross platform", "跨平台"],
			["multi-platform", "多平台"],
			["windows", "Windows"],
			["macos", "macOS"],
			["linux", "Linux"],
			["browser extension", "浏览器扩展"],
			["browser-based", "基于浏览器的"],
			["based on the web", "基于 Web"],
			["web-based", "基于 Web 的"],
			["and", "与"]
		];

		GLOSSARY.sort(function (a, b) { return b[0].length - a[0].length; });

		function escapeRe(s) {
			return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}

		/** Strip a leading article and tidy spacing. */
		function tidy(s) {
			s = s.replace(/^(a|an|the)\s+/i, "");
			// "X: Y" → "X：Y" for the first colon separator.
			s = s.replace(/^([^:]{0,40}):\s+/, function (m, head) {
				return /[\u4e00-\u9fff]/.test(head) ? head + "：" : m;
			});
			s = s.replace(/\s+/g, " ").trim();
			// Drop stray words like a lone "and".
			s = s.replace(/\s+and\s+$/i, "").trim();
			s = s.replace(/^and\s+/i, "").trim();
			// "，与" → "、"
			s = s.replace(/，\s*与\s*$/g, "等");
			// Remove a dangling Chinese classifier artifact: "的的"
			s = s.replace(/的\s*的/g, "的");
			return s;
		}

		/** Translate one repo description (fallback: glossary). */
		function translateDescription(text) {
			if (typeof text !== "string" || text.length === 0) return text;
			if (/[\u4e00-\u9fff]/.test(text)) return text;
			var out = text;
			for (var i = 0; i < GLOSSARY.length; i++) {
				var key = GLOSSARY[i][0];
				var val = GLOSSARY[i][1];
				var re = new RegExp("(?<![A-Za-z0-9])" + escapeRe(key) + "(?![A-Za-z0-9])", "gi");
				out = out.replace(re, val);
			}
			return tidy(out);
		}

		// ── LLM translation (primary) with glossary fallback + localStorage cache ──
		var CACHE_KEY = "dsh-harness-zh:translations:v1";

		function readCache() {
			try {
				var raw = localStorage.getItem(CACHE_KEY);
				return raw ? JSON.parse(raw) : {};
			} catch (e) { return {}; }
		}

		function writeCache(cache) {
			try {
				// Cap the cache at ~500 entries to avoid unbounded growth.
				var keys = Object.keys(cache);
				if (keys.length > 500) {
					var trimmed = {};
					for (var i = keys.length - 400; i < keys.length; i++) trimmed[keys[i]] = cache[keys[i]];
					cache = trimmed;
				}
				localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
			} catch (e) { /* storage full/unavailable — ignore */ }
		}

		/** Batch-translate English descriptions via the host LLM endpoint. */
		function translateWithLlm(texts) {
			return fetch("/api/harness-zh/translate", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ texts: texts })
			}).then(function (res) {
				if (!res.ok) throw new Error("translate endpoint " + res.status);
				return res.json();
			}).then(function (data) {
				if (!data || data.ok !== true || !Array.isArray(data.translations)) throw new Error("bad translate response");
				return data.translations;
			});
		}

		/** Intercept fetch responses for /api/market/list. */
		// 策略：同步返回（词表翻译即时渲染，绝不让列表等 LLM）；
		// 后台用 LLM 批量翻译未缓存项并写入 localStorage，下次打开即显示流畅中文。
		function installFetchInterceptor() {
			var origFetch = window.fetch;
			if (typeof origFetch !== "function") return;
			window.fetch = function (input, init) {
				var url = typeof input === "string" ? input : input && input.url ? input.url : "";
				if (url.indexOf("/api/market/list") === -1 || (init && init.method && init.method !== "GET")) {
					return origFetch.apply(this, arguments);
				}
				return origFetch.apply(this, arguments).then(function (res) {
					return res.clone().json().then(function (data) {
						try {
							if (!data || !Array.isArray(data.items)) return res;
							// 搜索模式（URL 带 q）不触发 LLM 翻译：避免每次输入都调模型 + 页面重载。
							// 仅在浏览模式（无 q）下后台 LLM 翻译，结果缓存供后续使用。
							var isSearch = url.indexOf("q=") !== -1;
							var cache = readCache();
							var toTranslate = [];
							var idx = [];
							// 同步 pass：用缓存或词表翻译，立即返回给页面渲染。
							data.items.forEach(function (item, i) {
								if (!item || typeof item.description !== "string") return;
								var d = item.description;
								if (/[\u4e00-\u9fff]/.test(d)) return; // already Chinese
								if (cache[d]) { item.description = cache[d]; return; }
								item.description = translateDescription(d); // glossary now
								if (!isSearch) { toTranslate.push(d); idx.push(i); }
							});
							var response = new Response(JSON.stringify(data), {
								status: res.status, statusText: res.statusText,
								headers: { "content-type": "application/json; charset=utf-8" }
							});
							// 浏览模式下后台 LLM 翻译未缓存项（不阻塞渲染；结果缓存供下次，不自动刷新）。
							if (toTranslate.length > 0) {
								translateWithLlm(toTranslate).then(function (translations) {
									var cache2 = readCache();
									for (var i = 0; i < idx.length; i++) {
										var zh = translations && translations[i] ? String(translations[i]).trim() : "";
										if (zh && zh !== toTranslate[i]) cache2[toTranslate[i]] = zh;
									}
									writeCache(cache2);
								}).catch(function () { /* keep glossary results */ });
							}
							return response;
						} catch (e) {
							return res;
						}
					}).catch(function () {
						return res;
					});
				});
			};
		}

		installFetchInterceptor();

		// ── Client-context localization ─────────────────────────────────────────
		// The plugin's `apply(ctx)` receives the real client root Context (this
		// package is a standard `dsh.client` web entry). We hook two read-only seams
		// (both uninstallable on unload; neither edits DSH source):
		//   A) LocaleRuntime.lookup — force the `zh` dictionary to win for every
		//      namespace that ships one, so all `t()` labels — including the composer
		//      "+" button, its slash-menu group titles and chrome — render Chinese,
		//      without touching the active locale or the boot-once locale face.
		//   B) ctx.remote.commands.list — translate each slash-command descriptor's
		//      `description` (display-only). The command `name` is left untouched
		//      because it is the identifier `/goal`-style parsing, dispatch and fuzzy
		//      matching all rely on.
		function patchLocaleForZh(ctx) {
			var locale = ctx.get ? ctx.get("locale") : ctx.locale;
			if (!locale || typeof locale.lookup !== "function") return null;
			var original = locale.lookup.bind(locale);
			locale.lookup = function (ns, key) {
				var zh;
				try {
					var locales = locale.dicts && locale.dicts.get(ns);
					zh = locales && locales.get("zh") && locales.get("zh")[key];
					if (zh === void 0 && ns !== "common") {
						var common = locale.dicts && locale.dicts.get("common");
						zh = common && common.get("zh") && common.get("zh")[key];
					}
				} catch (e) { zh = void 0; }
				return zh !== void 0 ? zh : original(ns, key);
			};
			return function restore() {
				locale.lookup = original;
			};
		}

		// Exact (whole-description) translations for the built-in command menu.
		// Command NAMES stay English (they are dispatch identifiers); only descriptions are localized.
		var COMMAND_DESC = {
			"Compact older conversation history": "压缩较早的对话历史",
			"record feedback about this session": "记录本次会话的反馈",
			"set or view the goal for a long-running task": "设置或查看长期任务的目标",
			"Switch the permission preset (sandbox mode + approval policy)": "切换权限预设（沙箱模式 + 审批策略）",
			"Enter or leave plan mode": "进入或退出计划模式",
			"Download this Session log as a ZIP archive": "将会话日志下载为 ZIP 压缩包"
		};

		function patchCommandDescriptions(ctx) {
			var remote = ctx.get ? ctx.get("remote") : ctx.remote;
			if (!remote || !remote.commands) return null;
			var ns = remote.commands;
			var desc;
			try { desc = Object.getOwnPropertyDescriptor(ns, "list"); } catch (e) { return null; }
			if (!desc || desc.configurable !== true || typeof desc.get !== "function") return null;
			var originalGet = desc.get;
			var originalList = originalGet.call(ns);
			Object.defineProperty(ns, "list", {
				configurable: true,
				get: function () {
					return function () {
						var p;
						try { p = originalList.apply(ns, arguments); } catch (e) { return Promise.reject(e); }
						return Promise.resolve(p).then(function (descs) {
							// 全程防御：任何异常都回退原始列表，绝不让命令菜单减少或失败。
							try {
								if (!Array.isArray(descs)) return descs;
								var cache = readCache();
							var need = [];
							var idx = [];
							var out = descs.map(function (d, i) {
								if (!d || typeof d.description !== "string" || /[\u4e00-\u9fff]/.test(d.description)) return d;
								var en = d.description;
								if (Object.prototype.hasOwnProperty.call(COMMAND_DESC, en)) {
									return COMMAND_DESC[en] === en ? d : Object.assign({}, d, { description: COMMAND_DESC[en] });
								}
								if (cache[en]) return Object.assign({}, d, { description: cache[en] });
								need.push(en);
								idx.push(i);
								return d;
							});
							// 未内置覆盖的命令描述 → 后台 LLM 翻译并缓存，下次打开菜单即中文（不阻塞首次渲染）。
							if (need.length > 0) {
								translateWithLlm(need).then(function (translations) {
									var c2 = readCache();
									for (var j = 0; j < idx.length; j++) {
										var zh = translations && translations[j] ? String(translations[j]).trim() : "";
										if (zh && zh !== need[j]) c2[need[j]] = zh;
									}
									writeCache(c2);
								}).catch(function () { /* keep original for this pass */ });
								}
								return out;
							} catch (e) { return descs; }
						});
					};
				}
			});
			// CommandUiRuntime 监听了 commands/change → directory.invalidateAll()，
			// 让已被缓存的命令列表失效，下次打开菜单即经本补丁重拉中文描述。
			// （命令数 7/3 是 DSH 按"命令是否在行首/带参数"的正常过滤，非缺陷，无需处理。）
			try {
				if (remote && typeof remote.$emit === "function") {
					remote.$emit("commands/change");
				}
			} catch (e) { /* ignore */ }
			return function restore() {
				try { Object.defineProperty(ns, "list", desc); } catch (e) { /* ignore */ }
			};
		}

		// The loader uses the factory return value as the module exports.
		return {
			apply: function apply(ctx) {
				var disposers = [];
				console.log("[dsh-harness-zh-cn] apply called; ctx.get=" + typeof (ctx && ctx.get));
				try { var r1 = patchLocaleForZh(ctx); if (r1) disposers.push(r1); console.log("[dsh-harness-zh-cn] locale.lookup patched = " + !!r1); } catch (e) { console.log("[dsh-harness-zh-cn] locale patch FAILED: " + (e && e.message)); }
				try { var r2 = patchCommandDescriptions(ctx); if (r2) disposers.push(r2); console.log("[dsh-harness-zh-cn] commands.list patched = " + !!r2); } catch (e) { console.log("[dsh-harness-zh-cn] commands patch FAILED: " + (e && e.message)); }
				if (disposers.length === 0) return;
				var cleanup = function () {
					for (var i = 0; i < disposers.length; i++) { try { disposers[i](); } catch (e) { /* ignore */ } }
				};
				try { ctx.on("dispose", cleanup); } catch (e) { /* patches stay for app lifetime */ }
			}
		};
	}
});
