window.__ModuleLoader__.load({
	id: "@magic/dsh-ceo-ui",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/.pnpm/use-sync-external-store@1.6.0_react@19.2.8/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js
var require_use_sync_external_store_shim_development = __commonJS({
  "../../node_modules/.pnpm/use-sync-external-store@1.6.0_react@19.2.8/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim.development.js"(exports) {
    "use strict";
    (function() {
      function is(x, y) {
        return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
      }
      function useSyncExternalStore$2(subscribe, getSnapshot) {
        didWarnOld18Alpha || void 0 === React.startTransition || (didWarnOld18Alpha = true, console.error(
          "You are using an outdated, pre-release alpha of React 18 that does not support useSyncExternalStore. The use-sync-external-store shim will not work correctly. Upgrade to a newer pre-release."
        ));
        var value = getSnapshot();
        if (!didWarnUncachedGetSnapshot) {
          var cachedValue = getSnapshot();
          objectIs(value, cachedValue) || (console.error(
            "The result of getSnapshot should be cached to avoid an infinite loop"
          ), didWarnUncachedGetSnapshot = true);
        }
        cachedValue = useState7({
          inst: { value, getSnapshot }
        });
        var inst = cachedValue[0].inst, forceUpdate = cachedValue[1];
        useLayoutEffect4(
          function() {
            inst.value = value;
            inst.getSnapshot = getSnapshot;
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
          },
          [subscribe, value, getSnapshot]
        );
        useEffect5(
          function() {
            checkIfSnapshotChanged(inst) && forceUpdate({ inst });
            return subscribe(function() {
              checkIfSnapshotChanged(inst) && forceUpdate({ inst });
            });
          },
          [subscribe]
        );
        useDebugValue2(value);
        return value;
      }
      function checkIfSnapshotChanged(inst) {
        var latestGetSnapshot = inst.getSnapshot;
        inst = inst.value;
        try {
          var nextValue = latestGetSnapshot();
          return !objectIs(inst, nextValue);
        } catch (error) {
          return true;
        }
      }
      function useSyncExternalStore$1(subscribe, getSnapshot) {
        return getSnapshot();
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var React = require("react"), objectIs = "function" === typeof Object.is ? Object.is : is, useState7 = React.useState, useEffect5 = React.useEffect, useLayoutEffect4 = React.useLayoutEffect, useDebugValue2 = React.useDebugValue, didWarnOld18Alpha = false, didWarnUncachedGetSnapshot = false, shim = "undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement ? useSyncExternalStore$1 : useSyncExternalStore$2;
      exports.useSyncExternalStore = void 0 !== React.useSyncExternalStore ? React.useSyncExternalStore : shim;
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// ../../node_modules/.pnpm/use-sync-external-store@1.6.0_react@19.2.8/node_modules/use-sync-external-store/shim/index.js
var require_shim = __commonJS({
  "../../node_modules/.pnpm/use-sync-external-store@1.6.0_react@19.2.8/node_modules/use-sync-external-store/shim/index.js"(exports, module2) {
    "use strict";
    if (false) {
      module2.exports = null;
    } else {
      module2.exports = require_use_sync_external_store_shim_development();
    }
  }
});

// ../../node_modules/.pnpm/use-sync-external-store@1.6.0_react@19.2.8/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js
var require_with_selector_development = __commonJS({
  "../../node_modules/.pnpm/use-sync-external-store@1.6.0_react@19.2.8/node_modules/use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js"(exports) {
    "use strict";
    (function() {
      function is(x, y) {
        return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
      }
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var React = require("react"), shim = require_shim(), objectIs = "function" === typeof Object.is ? Object.is : is, useSyncExternalStore4 = shim.useSyncExternalStore, useRef6 = React.useRef, useEffect5 = React.useEffect, useMemo3 = React.useMemo, useDebugValue2 = React.useDebugValue;
      exports.useSyncExternalStoreWithSelector = function(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
        var instRef = useRef6(null);
        if (null === instRef.current) {
          var inst = { hasValue: false, value: null };
          instRef.current = inst;
        } else inst = instRef.current;
        instRef = useMemo3(
          function() {
            function memoizedSelector(nextSnapshot) {
              if (!hasMemo) {
                hasMemo = true;
                memoizedSnapshot = nextSnapshot;
                nextSnapshot = selector(nextSnapshot);
                if (void 0 !== isEqual && inst.hasValue) {
                  var currentSelection = inst.value;
                  if (isEqual(currentSelection, nextSnapshot))
                    return memoizedSelection = currentSelection;
                }
                return memoizedSelection = nextSnapshot;
              }
              currentSelection = memoizedSelection;
              if (objectIs(memoizedSnapshot, nextSnapshot))
                return currentSelection;
              var nextSelection = selector(nextSnapshot);
              if (void 0 !== isEqual && isEqual(currentSelection, nextSelection))
                return memoizedSnapshot = nextSnapshot, currentSelection;
              memoizedSnapshot = nextSnapshot;
              return memoizedSelection = nextSelection;
            }
            var hasMemo = false, memoizedSnapshot, memoizedSelection, maybeGetServerSnapshot = void 0 === getServerSnapshot ? null : getServerSnapshot;
            return [
              function() {
                return memoizedSelector(getSnapshot());
              },
              null === maybeGetServerSnapshot ? void 0 : function() {
                return memoizedSelector(maybeGetServerSnapshot());
              }
            ];
          },
          [getSnapshot, getServerSnapshot, selector, isEqual]
        );
        var value = useSyncExternalStore4(subscribe, instRef[0], instRef[1]);
        useEffect5(
          function() {
            inst.hasValue = true;
            inst.value = value;
          },
          [value]
        );
        useDebugValue2(value);
        return value;
      };
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    })();
  }
});

// ../../node_modules/.pnpm/use-sync-external-store@1.6.0_react@19.2.8/node_modules/use-sync-external-store/shim/with-selector.js
var require_with_selector = __commonJS({
  "../../node_modules/.pnpm/use-sync-external-store@1.6.0_react@19.2.8/node_modules/use-sync-external-store/shim/with-selector.js"(exports, module2) {
    "use strict";
    if (false) {
      module2.exports = null;
    } else {
      module2.exports = require_with_selector_development();
    }
  }
});

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/CeoDecisionDrawer.ts
var import_react = require("react");

// src/team.ts
var CEO_RUN_JOURNAL = "ceo/run-journal";
var CEO_RUN_PROCESS = "ceo/run-process";
var CEO_PLAN = "ceo/plan";
var CEO_MEMBER_RESULT = "ceo/member-result";
var CEO_PLAN_REVISED = "ceo/plan-revised";
var CEO_RUN_PHASE = "ceo/run-phase";
var CEO_RUN_PROGRESS = "ceo/run-progress";
var CEO_MEMBER_USAGE = "ceo/member-usage";
var CEO_MEMBER_CONTEXT = "ceo/member-context";
var CEO_MEMBER_HALTED = "ceo/member-halted";
var CEO_MEMBER_REDIRECTED = "ceo/member-redirected";
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseSearchSources(value) {
  if (!Array.isArray(value)) return [];
  const sources = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.url !== "string" || item.url.trim() === "") continue;
    sources.push({
      url: item.url,
      ...typeof item.title === "string" && item.title.trim() !== "" ? { title: item.title } : {},
      ...typeof item.snippet === "string" && item.snippet.trim() !== "" ? { snippet: item.snippet } : {}
    });
  }
  return sources;
}
function requiredString(value, fallback) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}
function idList(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim() !== "").map((item) => item.trim());
}
function parseObject(argsRaw) {
  if (typeof argsRaw !== "string") return argsRaw;
  try {
    return JSON.parse(argsRaw);
  } catch {
    return argsRaw;
  }
}
function parseCeoDelegateTasks(argsRaw) {
  const parsed = parseObject(argsRaw);
  if (isRecord(parsed) && Array.isArray(parsed.tasks)) {
    return parsed.tasks.flatMap((item, index2) => {
      if (!isRecord(item)) return [];
      const role = requiredString(item.role, "member");
      const task2 = requiredString(item.task, requiredString(item.work_package, "task"));
      const rawId2 = typeof item.id === "string" && item.id.trim() !== "" ? item.id.trim() : `n${String(index2)}`;
      return [{ role, task: task2, rawId: rawId2, dependsOn: idList(item.depends_on) }];
    });
  }
  if (typeof parsed === "string") {
    const task2 = parsed.trim() || "task";
    return [{ role: "member", task: task2, dependsOn: [] }];
  }
  if (!isRecord(parsed)) {
    return [{ role: "member", task: "task", dependsOn: [] }];
  }
  const task = requiredString(parsed.task, requiredString(parsed.work_package, requiredString(parsed.prompt, "task")));
  const rawId = typeof parsed.id === "string" && parsed.id.trim() !== "" ? parsed.id.trim() : void 0;
  return [{
    role: requiredString(parsed.role, "member"),
    task,
    rawId,
    dependsOn: idList(parsed.depends_on)
  }];
}
var REPORT_STATUS = /* @__PURE__ */ new Set([
  "completed",
  "blocked",
  "failed",
  "partial",
  "unverified",
  "unknown_after_restart"
]);
var HONEST_STATUS = /* @__PURE__ */ new Set([
  "blocked",
  "failed",
  "unverified",
  "unknown_after_restart"
]);
function reportStatusOf(value) {
  return typeof value === "string" && REPORT_STATUS.has(value.trim()) ? value.trim() : void 0;
}
function fieldText(value) {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (Array.isArray(value)) {
    const parts = value.map((item) => typeof item === "string" ? item.trim() : "").filter((item) => item !== "");
    return parts.length > 0 ? parts.join("\n") : void 0;
  }
  return void 0;
}
var EMPTY_DECISION = /^(none|n\/a|na|null|nil|empty|-|无|没有|暂无|无需|不需要|空|\[\]|\{\}|\[\s*\]|\{\s*\})$/i;
var ROLE_DISPLAY = {
  research: "\u8C03\u7814",
  researcher: "\u8C03\u7814",
  survey: "\u8C03\u7814",
  synthesis: "\u6C47\u603B",
  synthesizer: "\u6C47\u603B",
  synthesize: "\u6C47\u603B",
  review: "\u5BA1\u9605",
  reviewer: "\u5BA1\u9605",
  implementation: "\u5B9E\u73B0",
  implementer: "\u5B9E\u73B0",
  implement: "\u5B9E\u73B0",
  writer: "\u64B0\u5199",
  analysis: "\u5206\u6790",
  analyst: "\u5206\u6790",
  member: "\u6210\u5458"
};
var GENERIC_SEATS = /* @__PURE__ */ new Set([
  ...Object.keys(ROLE_DISPLAY),
  ...Object.values(ROLE_DISPLAY)
]);
var TASK_LEAD = /^(?:请你|请您|请|帮我|帮忙)?(?:完成|进行|做一下|做)?(?:调研一下|研究一下|分析一下|对比一下|汇总一下|撰写一下)?(?:调研|研究|分析|撰写|汇总|对比|调查|搜集|收集)?/u;
function displayCeoRole(role) {
  const key = role.trim();
  if (key === "") return "\u6210\u5458";
  return ROLE_DISPLAY[key.toLowerCase()] ?? key;
}
function isGenericSeat(role) {
  const key = role.trim();
  if (key === "") return true;
  return GENERIC_SEATS.has(key.toLowerCase()) || GENERIC_SEATS.has(key);
}
function seatTitleFromTask(task) {
  const raw = task.trim();
  if (raw === "") return void 0;
  const hasDomestic = /国内|中国市场|海内/.test(raw) || /中国大陆/.test(raw) && /除中国/.test(raw) === false;
  const hasOverseas = /海外|境外|国际|全球除中|除中国/.test(raw);
  if (/汇总|综合|综述|合成/.test(raw)) return "\u7ED3\u8BBA\u6C47\u603B";
  if (hasDomestic && hasOverseas) return "\u5BF9\u6BD4";
  if (hasDomestic) return "\u56FD\u5185\u5E02\u573A";
  if (hasOverseas) return "\u6D77\u5916\u5E02\u573A";
  if (/欧洲/.test(raw)) return "\u6B27\u6D32\u5E02\u573A";
  if (/北美|美国/.test(raw)) return "\u5317\u7F8E\u5E02\u573A";
  if (/日本/.test(raw)) return "\u65E5\u672C\u5E02\u573A";
  if (/竞品/.test(raw)) return "\u7ADE\u54C1";
  if (/对比|比较/.test(raw)) return "\u5BF9\u6BD4";
  let text = raw.replace(TASK_LEAD, "").trim();
  text = (text.split(/[。.\n；;]/u)[0] ?? text).trim();
  text = (text.split(/[，,、]/u)[0] ?? text).trim();
  text = text.replace(/^(?:一下|下)\s*/u, "").replace(/^(?:\d{4}(?:\s*[-~]\s*\d{4})?年)/u, "").trim();
  const chars = Array.from(text);
  if (chars.length > 8) text = chars.slice(0, 8).join("");
  return text.length >= 2 ? text : void 0;
}
function seatNameOf(role, task) {
  const trimmedRole = role.trim();
  if (trimmedRole !== "" && isGenericSeat(trimmedRole) === false) {
    return displayCeoRole(trimmedRole);
  }
  return seatTitleFromTask(task) ?? displayCeoRole(trimmedRole);
}
function displayCeoSeat(member, roster2 = []) {
  const base = seatNameOf(member.role, member.task);
  if (roster2.length === 0) return base;
  const same = roster2.filter((item) => seatNameOf(item.role, item.task) === base);
  if (same.length <= 1) return base;
  const index2 = same.findIndex((item) => item.callId === member.callId);
  return index2 <= 0 ? base : `${base}${String(index2 + 1)}`;
}
function hasUserDecision(text) {
  const value = (text ?? "").trim().replace(/[。.\s]+$/u, "").trim();
  return value !== "" && EMPTY_DECISION.test(value) === false;
}
function decisionText(value) {
  const text = fieldText(value);
  return hasUserDecision(text) ? text : void 0;
}
function reportFromRecord(parsed) {
  const report = {
    status: reportStatusOf(parsed.status),
    done: fieldText(parsed.done),
    notDone: fieldText(parsed.not_done ?? parsed.notDone),
    artifacts: fieldText(parsed.artifacts),
    evidence: fieldText(parsed.evidence),
    risksOrBlockers: fieldText(parsed.risks_or_blockers ?? parsed.risksOrBlockers),
    next: fieldText(parsed.next),
    userDecisions: decisionText(parsed.user_decisions ?? parsed.userDecisions)
  };
  return Object.values(report).some((value) => value !== void 0) ? report : void 0;
}
var REPORT_LABELS = {
  status: "status",
  done: "done",
  not_done: "notDone",
  notdone: "notDone",
  artifacts: "artifacts",
  evidence: "evidence",
  risks_or_blockers: "risksOrBlockers",
  risksorblockers: "risksOrBlockers",
  next: "next",
  user_decisions: "userDecisions",
  userdecisions: "userDecisions"
};
var FIELD_LINE = /^[-*]?\s*(?:\*\*|__|`)?([A-Za-z][A-Za-z0-9_]*)(?:\*\*|__|`)?\s*[:：]\s*(.*)$/;
var CN_DECISION_LINE = /^[-*]?\s*(?:用户决策|待用户决策)[:：]\s*(.*)$/u;
var LEAD_IN_NOISE = /[，,;；:：]?\s*(?:以下为结构化结果|结构化结果如下|structured result follows)\s*[:：]?\s*$/i;
function fieldLineOf(line2) {
  const trimmed = line2.trim();
  const chinese = CN_DECISION_LINE.exec(trimmed);
  if (chinese !== null) return { key: "userDecisions", value: (chinese[1] ?? "").trim() };
  const labeled = FIELD_LINE.exec(trimmed);
  if (labeled === null) return void 0;
  const key = REPORT_LABELS[labeled[1].toLowerCase()];
  if (key === void 0) return void 0;
  return { key, value: labeled[2].trim() };
}
function looksLikeMemberReport(text) {
  const report = parseCeoMemberReport(text);
  if (report === void 0) return false;
  const filled = Object.values(report).filter((value) => value !== void 0).length;
  return report.status !== void 0 || filled >= 2;
}
function looksLikeStructuredDump(text) {
  const trimmed = text.trim();
  if (trimmed === "") return false;
  if (looksLikeMemberReport(trimmed)) return true;
  if (/```(?:json|jsonc)?\s*\r?\n\s*\{/i.test(trimmed) && /["']?status["']?\s*:/.test(trimmed)) {
    return true;
  }
  const jsonStart = trimmed.indexOf("{");
  return jsonStart >= 0 && jsonStart < 80 && /"(?:status|done|user_decisions|not_done)"\s*:/.test(trimmed);
}
function reportLeadIn(text) {
  const lines = [];
  for (const raw of text.split(/\r?\n/)) {
    if (fieldLineOf(raw) !== void 0) break;
    lines.push(raw);
  }
  const lead = lines.join("\n").trim().replace(LEAD_IN_NOISE, "").trim();
  return lead === "" ? void 0 : lead;
}
function clipDebriefSummary(text, limit = 220) {
  const paragraph = text.split(/\n\n/)[0]?.trim() ?? text.trim();
  const sentences = paragraph.split(/(?<=[。.!？?])\s*/).filter((item) => item.trim() !== "");
  let sentence = sentences[0]?.trim() || paragraph;
  if (sentence.length < 12 && sentences[1] !== void 0) {
    sentence = `${sentence}${sentences[1].trim()}`;
  }
  if (sentence.length <= limit) return sentence;
  return `${sentence.slice(0, limit).trimEnd()}\u2026`;
}
function debriefSummaryOf(report, lastMessage) {
  const source = lastMessage === void 0 ? void 0 : unwrapReportText(lastMessage);
  const lead = source === void 0 ? void 0 : reportLeadIn(source);
  if (lead !== void 0 && looksLikeStructuredDump(lead) === false && lead.trimStart().startsWith("{") === false) {
    return clipDebriefSummary(lead);
  }
  if ((report?.done ?? "").trim() !== "") return clipDebriefSummary(report.done);
  if ((lastMessage ?? "").trim() !== "" && looksLikeMemberReport(lastMessage) === false && looksLikeStructuredDump(lastMessage) === false) {
    return clipDebriefSummary(lastMessage);
  }
  return "";
}
function reportTextFromProcess(process2) {
  if (process2 === void 0) return void 0;
  for (let index2 = process2.length - 1; index2 >= 0; index2 -= 1) {
    const step = process2[index2];
    if (step?.kind !== "content") continue;
    if (looksLikeMemberReport(step.text)) return step.text;
  }
  return void 0;
}
function presentCeoMemberReport(member) {
  const fromMessage = member.lastMessage === void 0 ? void 0 : parseCeoMemberReport(member.lastMessage);
  const fromProcess = reportTextFromProcess(member.process);
  return mergeReports(
    mergeReports(member.report, fromMessage),
    fromProcess === void 0 ? void 0 : parseCeoMemberReport(fromProcess)
  );
}
function unwrapReportText(text) {
  return text.trim().replace(
    /```(?:json|jsonc)?\s*\r?\n([\s\S]*?)\r?\n```/i,
    (_match, inner) => inner.trim()
  );
}
function parseCeoMemberReport(text) {
  const trimmed = unwrapReportText(text);
  if (trimmed === "") return void 0;
  const jsonStart = trimmed.indexOf("{");
  if (jsonStart >= 0 && jsonStart < 80) {
    try {
      const parsed = JSON.parse(trimmed.slice(jsonStart));
      if (isRecord(parsed)) {
        const fromJson = reportFromRecord(parsed);
        if (fromJson !== void 0) return fromJson;
      }
    } catch {
    }
  }
  const report = {};
  let current;
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const labeled = fieldLineOf(rawLine);
    if (labeled !== void 0) {
      current = labeled.key;
      if (labeled.key === "status") report.status = reportStatusOf(labeled.value);
      else if (labeled.value !== "") report[labeled.key] = labeled.value;
      continue;
    }
    const line2 = rawLine.trim();
    if (current !== void 0 && current !== "status" && line2 !== "") {
      const previous = report[current];
      report[current] = previous ? `${previous}
${line2}` : line2;
    }
  }
  if (hasUserDecision(report.userDecisions) === false) report.userDecisions = void 0;
  return Object.values(report).some((value) => value !== void 0) ? report : void 0;
}
function presentCeoMember(member) {
  const needsDecision = hasUserDecision(member.report?.userDecisions) && (member.answeredDecision ?? "").trim() === "";
  const hasBlocker = member.report?.status === "blocked";
  if (member.report?.status !== void 0) {
    return { viewStatus: member.report.status, needsDecision, hasBlocker };
  }
  if (member.halted === true) {
    return { viewStatus: "unverified", needsDecision, hasBlocker };
  }
  if (member.status === "error") {
    return { viewStatus: "error", needsDecision, hasBlocker };
  }
  if (member.status === "running") {
    return { viewStatus: "running", needsDecision, hasBlocker };
  }
  if (member.status === "queued") {
    return { viewStatus: "queued", needsDecision, hasBlocker };
  }
  return { viewStatus: "delegated", needsDecision, hasBlocker };
}
function ceoAttentionItems(members) {
  const items = [];
  for (const member of members) {
    const presentation = presentCeoMember(member);
    if (presentation.needsDecision) {
      items.push({ kind: "decision", member });
      continue;
    }
    if (presentation.hasBlocker || presentation.viewStatus === "blocked") {
      items.push({ kind: "blocker", member });
      continue;
    }
    if (presentation.viewStatus === "failed" || presentation.viewStatus === "error") {
      items.push({ kind: "failed", member });
      continue;
    }
    if (presentation.viewStatus === "unverified") {
      items.push({ kind: "unverified", member });
      continue;
    }
    if (presentation.viewStatus === "unknown_after_restart") {
      items.push({ kind: "unknown_after_restart", member });
    }
  }
  return items;
}
function textFromContent(content) {
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (isRecord(block) && block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("\n");
}
function senderSessionIdOf(source) {
  if (!isRecord(source)) return void 0;
  if (source.kind !== "agent-message" && source.kind !== "subagent-settled") return void 0;
  return typeof source.senderSessionId === "string" && source.senderSessionId.trim() !== "" ? source.senderSessionId.trim() : void 0;
}
function unwrapMemberMessage(memberId, text) {
  const agentPrefix = `Agent ${memberId} sent a message:`;
  if (text.startsWith(agentPrefix)) {
    return text.slice(agentPrefix.length).replace(/^\r?\n/, "");
  }
  const closing = text.split(/\r?\nIts closing message:\r?\n/);
  if (closing.length >= 2) return closing.slice(1).join("\nIts closing message:\n");
  return "";
}
function settlementStatusOf(text) {
  if (text.includes("was stopped before it finished")) return "unverified";
  if (text.includes("ran out of room before it finished")) return "unverified";
  if (text.includes("finished and will do no further work")) return "unverified";
  if (text.includes("declined the task")) return "failed";
  if (text.includes("failed before it finished")) return "failed";
  if (text.includes("ended abnormally")) return "failed";
  return void 0;
}
function settlementContradictsSuccess(text) {
  if (text.includes("was stopped before it finished")) return "unverified";
  if (text.includes("ran out of room before it finished")) return "unverified";
  if (text.includes("declined the task")) return "failed";
  if (text.includes("failed before it finished")) return "failed";
  if (text.includes("ended abnormally")) return "failed";
  return void 0;
}
function mergeStatus(existing, incoming) {
  if (incoming === void 0) return existing;
  if (existing !== void 0 && HONEST_STATUS.has(existing) && (incoming === "completed" || incoming === "partial")) {
    return existing;
  }
  return incoming;
}
function mergeReports(existing, incoming) {
  if (incoming === void 0) return existing;
  if (existing === void 0) return incoming;
  const next = {
    status: mergeStatus(existing.status, incoming.status),
    done: incoming.done ?? existing.done,
    notDone: incoming.notDone ?? existing.notDone,
    artifacts: incoming.artifacts ?? existing.artifacts,
    evidence: incoming.evidence ?? existing.evidence,
    risksOrBlockers: incoming.risksOrBlockers ?? existing.risksOrBlockers,
    next: incoming.next ?? existing.next,
    userDecisions: incoming.userDecisions ?? existing.userDecisions
  };
  if (next.status === existing.status && next.done === existing.done && next.notDone === existing.notDone && next.artifacts === existing.artifacts && next.evidence === existing.evidence && next.risksOrBlockers === existing.risksOrBlockers && next.next === existing.next && next.userDecisions === existing.userDecisions) {
    return existing;
  }
  return next;
}
function mergeCeoMember(existing, incoming) {
  const report = mergeReports(existing.report, incoming.report);
  const lastMessage = incoming.lastMessage ?? existing.lastMessage;
  const memberId = incoming.memberId ?? existing.memberId;
  const seq = incoming.seq > existing.seq ? incoming.seq : existing.seq;
  const answeredDecision = incoming.answeredDecision ?? existing.answeredDecision;
  const process2 = incoming.process ?? existing.process;
  const usage = incoming.usage ?? existing.usage;
  const contextChannels = incoming.contextChannels ?? existing.contextChannels;
  const halted = incoming.halted === true || existing.halted === true;
  const redirectedNote = incoming.redirectedNote ?? existing.redirectedNote;
  const status = incoming.status === "error" || existing.status === "error" ? "error" : incoming.status === "running" && report !== void 0 ? existing.status : incoming.status;
  if (existing.role === incoming.role && existing.task === incoming.task && existing.batchCallId === incoming.batchCallId && existing.runId === incoming.runId && existing.rawId === incoming.rawId && existing.seq === seq && existing.memberId === memberId && existing.status === status && existing.report === report && existing.lastMessage === lastMessage && existing.answeredDecision === answeredDecision && existing.process === process2 && existing.usage === usage && existing.contextChannels === contextChannels && existing.halted === halted && existing.redirectedNote === redirectedNote) {
    return existing;
  }
  return {
    ...incoming,
    seq,
    memberId,
    status,
    report,
    lastMessage,
    answeredDecision,
    process: process2,
    usage,
    contextChannels,
    halted,
    redirectedNote
  };
}
function applyCeoMemberMessage(members, event) {
  const body = unwrapMemberMessage(event.memberId, event.text);
  const parsed = parseCeoMemberReport(body);
  const settlement = event.sourceKind === "subagent-settled" ? settlementStatusOf(event.text) : void 0;
  const contradiction = event.sourceKind === "subagent-settled" ? settlementContradictsSuccess(event.text) : void 0;
  let found = false;
  const next = members.map((member) => {
    if (member.memberId !== event.memberId) return member;
    found = true;
    const existing = member.report?.status;
    const existingHonest = existing !== void 0 && HONEST_STATUS.has(existing);
    const declared = parsed?.status;
    const incoming = parsed !== void 0 ? !existingHonest && contradiction !== void 0 && (declared === "completed" || declared === "partial" || declared === void 0) ? { ...parsed, status: contradiction } : declared === void 0 && existing === void 0 && settlement !== void 0 ? { ...parsed, status: settlement } : parsed : !existingHonest && contradiction !== void 0 ? { status: contradiction } : settlement !== void 0 && existing === void 0 ? { status: settlement } : void 0;
    const report = mergeReports(member.report, incoming);
    const questionChanged = incoming?.userDecisions !== void 0 && incoming.userDecisions !== member.report?.userDecisions;
    return {
      ...member,
      seq: event.seq,
      lastMessage: body !== "" ? body : member.lastMessage,
      report,
      answeredDecision: questionChanged ? void 0 : member.answeredDecision,
      status: member.status === "error" || event.sourceKind === "subagent-settled" ? member.status === "error" ? "error" : "ok" : member.status
    };
  });
  return found ? next : members;
}
function formatCeoDecisionMessage(member, answer) {
  const who = member.memberId ?? member.role;
  const runId = member.rawId ?? member.runId ?? who;
  const question = (member.report?.userDecisions ?? "").trim();
  const lines = [
    `User decision for member ${who} (${member.role} \xB7 ${member.task}).`
  ];
  if (question !== "") lines.push(`Question: ${question}`);
  lines.push(`Decision: ${answer.trim()}`);
  lines.push(`Call ceo_replan with continue run_id ${runId} and this answer.`);
  lines.push("Do not send_message the member. Do not call ceo_delegate again. Do not rewrite their work as success.");
  return lines.join("\n");
}
function applyCeoUserDecision(member, answer) {
  const trimmed = answer.trim();
  if (trimmed === "" || member.answeredDecision === trimmed) return member;
  return { ...member, answeredDecision: trimmed };
}
function parseCeoDelegateMemberId(text) {
  const match = text.match(/as member (\S+)/);
  return match?.[1];
}
function parseCeoDelegateRuns(text) {
  const runs = [];
  for (const line2 of text.split(/\r?\n/)) {
    const match = line2.match(/^delegated (.+) \(([^)]+)\)(?: as member (\S+))? (\S+)$/);
    if (match === null) continue;
    runs.push({
      role: match[1],
      runId: match[2],
      memberId: match[3],
      phase: match[4]
    });
  }
  return runs;
}
function startCeoTeam(turn) {
  return { turn, members: [], progress: { completed: 0, total: 0 }, planHistory: [] };
}
function applyCeoDelegateCall(state, event) {
  const tasks = parseCeoDelegateTasks(event.argsRaw);
  const batch = tasks.map((task, index2) => {
    const rawId = task.rawId ?? `n${String(index2)}`;
    return {
      callId: `${event.callId}:${rawId}`,
      batchCallId: event.callId,
      seq: event.seq,
      role: task.role,
      task: task.task,
      dependsOn: task.dependsOn,
      rawId,
      status: "queued"
    };
  });
  const others = state.members.filter((member) => member.batchCallId !== event.callId);
  return { ...state, members: [...others, ...batch] };
}
var RUN_PHASES = /* @__PURE__ */ new Set([
  "queued",
  "running",
  "completed",
  "failed",
  "skipped",
  "cancelled",
  "unverified",
  "unknown_after_restart",
  "blocked"
]);
function parseCeoRunJournalRuns(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const phase = typeof item.phase === "string" && RUN_PHASES.has(item.phase) ? item.phase : "queued";
    const rawId = requiredString(item.rawId, requiredString(item.runId, "n0"));
    return [{
      runId: requiredString(item.runId, rawId),
      rawId,
      role: requiredString(item.role, "member"),
      task: requiredString(item.task, "task"),
      dependsOn: idList(item.dependsOn),
      phase,
      ...typeof item.memberId === "string" && item.memberId.trim() !== "" ? { memberId: item.memberId.trim() } : {}
    }];
  });
}
function journalStatus(phase) {
  if (phase === "queued") return "queued";
  if (phase === "running") return "running";
  if (phase === "blocked") return "ok";
  if (phase === "failed" || phase === "error" || phase === "skipped") return "error";
  return "ok";
}
function phaseStatus(phase) {
  if (phase === "queued") return "queued";
  if (phase === "running") return "running";
  if (phase === "blocked") return "ok";
  if (phase === "failed" || phase === "error" || phase === "skipped") return "error";
  return "ok";
}
function phaseReport(phase) {
  if (phase === "completed") return { status: "completed" };
  if (phase === "blocked") return { status: "blocked" };
  if (phase === "unverified" || phase === "cancelled") return { status: "unverified" };
  if (phase === "unknown_after_restart") return { status: "unknown_after_restart" };
  if (phase === "failed" || phase === "skipped") return { status: "failed" };
  return void 0;
}
function applyCeoRunJournal(state, event) {
  if (event.runs.length === 0 || event.callId === "") return state;
  const batch = state.members.filter((member) => member.batchCallId === event.callId);
  if (batch.length === 0) {
    const members2 = event.runs.map((run) => ({
      callId: `${event.callId}:${run.rawId}`,
      batchCallId: event.callId,
      seq: event.seq,
      role: run.role,
      task: run.task,
      dependsOn: run.dependsOn,
      rawId: run.rawId,
      runId: run.runId,
      memberId: run.memberId,
      status: journalStatus(run.phase),
      report: phaseReport(run.phase)
    }));
    return { ...state, members: [...state.members, ...members2] };
  }
  const members = state.members.map((member) => {
    if (member.batchCallId !== event.callId) return member;
    const index2 = batch.findIndex((item) => item.callId === member.callId);
    const run = event.runs.find(
      (item) => item.rawId === member.rawId || item.runId === member.runId
    ) ?? event.runs[index2];
    if (run === void 0) return member;
    return {
      ...member,
      seq: event.seq,
      runId: run.runId,
      rawId: run.rawId,
      memberId: run.memberId ?? member.memberId,
      status: member.status === "error" ? "error" : member.report?.status === "unknown_after_restart" && run.phase === "running" ? member.status : journalStatus(run.phase),
      report: member.report?.status === "unknown_after_restart" && run.phase === "running" ? member.report : mergeReports(member.report, phaseReport(run.phase)),
      process: member.process
    };
  });
  const extras = event.runs.flatMap((run) => {
    if (batch.some((member) => member.rawId === run.rawId || member.runId === run.runId)) return [];
    return [{
      callId: `${event.callId}:${run.rawId}`,
      batchCallId: event.callId,
      seq: event.seq,
      role: run.role,
      task: run.task,
      dependsOn: run.dependsOn,
      rawId: run.rawId,
      runId: run.runId,
      memberId: run.memberId,
      status: journalStatus(run.phase),
      report: phaseReport(run.phase)
    }];
  });
  return extras.length === 0 ? { ...state, members } : { ...state, members: [...members, ...extras] };
}
function replaceTrailing(process2, kind, text) {
  const last = process2.at(-1);
  if (last?.kind === kind) return [...process2.slice(0, -1), { kind, text }];
  return [...process2, { kind, text }];
}
function applyCeoProcessOp(process2, op) {
  const current = process2 ?? [];
  if (op.kind === "reasoning" || op.kind === "content") {
    return replaceTrailing(current, op.kind, op.text);
  }
  if (op.kind === "tool-start") {
    return [
      ...current,
      {
        kind: "tool",
        toolCallId: op.toolCallId,
        name: op.name,
        ...op.args === void 0 ? {} : { args: op.args },
        status: "running"
      }
    ];
  }
  const index2 = current.findLastIndex(
    (step) => step.kind === "tool" && step.toolCallId === op.toolCallId
  );
  if (index2 < 0) {
    return [
      ...current,
      {
        kind: "tool",
        toolCallId: op.toolCallId,
        name: "tool",
        ...op.result === void 0 ? {} : { result: op.result },
        ...op.sources === void 0 ? {} : { sources: op.sources },
        status: op.isError === true ? "error" : "ok"
      }
    ];
  }
  const existing = current[index2];
  if (existing === void 0 || existing.kind !== "tool") return [...current];
  const next = current.slice();
  next[index2] = {
    ...existing,
    ...op.result === void 0 ? {} : { result: op.result },
    ...op.sources === void 0 ? {} : { sources: op.sources },
    status: op.isError === true ? "error" : "ok"
  };
  return next;
}
function parseCeoProcessOp(value) {
  if (!isRecord(value) || typeof value.kind !== "string") return void 0;
  if ((value.kind === "reasoning" || value.kind === "content") && typeof value.text === "string") {
    return { kind: value.kind, text: value.text };
  }
  if (value.kind === "tool-start" && typeof value.toolCallId === "string" && typeof value.name === "string") {
    return {
      kind: "tool-start",
      toolCallId: value.toolCallId,
      name: value.name,
      ...typeof value.args === "string" ? { args: value.args } : {}
    };
  }
  if (value.kind === "tool-end" && typeof value.toolCallId === "string") {
    return {
      kind: "tool-end",
      toolCallId: value.toolCallId,
      ...typeof value.result === "string" ? { result: value.result } : {},
      ...Array.isArray(value.sources) ? { sources: parseSearchSources(value.sources) } : {},
      ...value.isError === true ? { isError: true } : {}
    };
  }
  return void 0;
}
function applyCeoRunProcess(state, event) {
  if (event.callId === "") return state;
  return {
    ...state,
    members: state.members.map((member) => {
      if (member.batchCallId !== event.callId) return member;
      const sameRun = event.runId !== void 0 && event.runId !== "" && member.runId === event.runId;
      const sameMember = event.memberId !== void 0 && event.memberId !== "" && member.memberId === event.memberId;
      if (!sameRun && !sameMember) return member;
      return {
        ...member,
        seq: event.seq,
        ...event.memberId === void 0 ? {} : { memberId: event.memberId },
        process: applyCeoProcessOp(member.process, event.op)
      };
    })
  };
}
function applyCeoDelegateResult(state, event) {
  const runs = parseCeoDelegateRuns(event.text);
  const batch = state.members.filter((member) => member.batchCallId === event.callId);
  const members = state.members.map((member) => {
    if (member.batchCallId !== event.callId) return member;
    const index2 = batch.findIndex((item) => item.callId === member.callId);
    const run = runs[index2];
    return {
      ...member,
      seq: event.seq,
      runId: run?.runId ?? member.runId,
      memberId: run?.memberId ?? member.memberId,
      status: event.isError ? "error" : run === void 0 ? member.status : phaseStatus(run.phase),
      report: mergeReports(member.report, run === void 0 ? void 0 : phaseReport(run.phase))
    };
  });
  return { ...state, members };
}
function projectCeoTeam(state) {
  if (state.members.length === 0 && state.plan === void 0) return null;
  return {
    turn: state.turn,
    members: state.members,
    progress: state.progress,
    planHistory: state.planHistory,
    ...state.plan === void 0 ? {} : { plan: state.plan }
  };
}
function applyCeoMemberResult(state, event) {
  const parsed = parseCeoMemberReport(event.output);
  const declared = event.status ?? parsed?.status;
  const contradictory = event.stopReason !== void 0 && event.stopReason !== "completed" && (declared === "completed" || declared === "partial");
  const status = contradictory ? "unverified" : declared;
  return {
    ...state,
    members: state.members.map((member) => {
      if (member.batchCallId !== event.callId || member.memberId !== event.memberId && member.runId !== event.runId) return member;
      return {
        ...member,
        seq: event.seq,
        memberId: event.memberId,
        lastMessage: event.output.trim() || member.lastMessage,
        report: mergeReports(member.report, {
          ...parsed,
          ...status === void 0 ? {} : { status }
        }),
        status: status !== void 0 && HONEST_STATUS.has(status) ? "ok" : member.status
      };
    })
  };
}
function applyCeoPlan(state, event) {
  if (!event.planId || !event.summary || !event.analysis || !Array.isArray(event.tasks)) return state;
  const tasks = event.tasks.flatMap((item) => {
    if (!isRecord(item) || typeof item.role !== "string" || typeof item.task !== "string") return [];
    return [{
      ...typeof item.id === "string" && item.id.trim() !== "" ? { id: item.id.trim() } : {},
      role: item.role.trim(),
      task: item.task.trim(),
      dependsOn: idList(item.dependsOn)
    }];
  });
  const plan = {
    planId: event.planId,
    version: typeof event.version === "number" ? event.version : (state.plan?.version ?? 0) + 1,
    summary: event.summary,
    analysis: event.analysis,
    ...event.teamBrief === void 0 ? {} : { teamBrief: event.teamBrief },
    tasks
  };
  return {
    ...state,
    plan,
    planHistory: [...state.planHistory, plan].slice(-8)
  };
}
function applyCeoRunProgress(state, event) {
  if (!event.callId || event.total < 0 || event.completed < 0) return state;
  return { ...state, progress: { completed: Math.min(event.completed, event.total), total: event.total } };
}
function applyCeoRunPhase(state, event) {
  if (!event.callId || !event.runId || !event.memberId) return state;
  return { ...state, members: state.members.map((member) => member.batchCallId === event.callId && (member.runId === event.runId || member.memberId === event.memberId) ? { ...member, seq: event.seq, activity: { phase: event.phase, ...event.toolName ? { toolName: event.toolName } : {} } } : member) };
}
function usageNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}
function parseUsage(value) {
  if (!isRecord(value)) return void 0;
  const inputTokens = usageNumber(value.inputTokens);
  const outputTokens = usageNumber(value.outputTokens);
  if (inputTokens === void 0 && outputTokens === void 0) return void 0;
  const usage = { inputTokens: inputTokens ?? 0, outputTokens: outputTokens ?? 0 };
  const total = usageNumber(value.totalTokens);
  if (total !== void 0) usage.totalTokens = total;
  const cacheRead = usageNumber(value.cacheReadTokens);
  if (cacheRead !== void 0) usage.cacheReadTokens = cacheRead;
  const reasoning = usageNumber(value.reasoningTokens);
  if (reasoning !== void 0) usage.reasoningTokens = reasoning;
  return usage;
}
function parseContextChannels(value) {
  if (!Array.isArray(value)) return void 0;
  const channels = value.flatMap((item) => {
    if (!isRecord(item) || typeof item.channel !== "string") return [];
    return [{
      channel: item.channel,
      chars: usageNumber(item.chars) ?? 0,
      truncated: item.truncated === true
    }];
  });
  return channels.length > 0 ? channels : void 0;
}
function applyCeoMemberUsage(state, event) {
  if (!event.callId || !event.runId) return state;
  const usage = parseUsage(event.usage);
  if (usage === void 0) return state;
  return {
    ...state,
    members: state.members.map(
      (member) => member.batchCallId === event.callId && (member.runId === event.runId || member.memberId === event.memberId) ? { ...member, seq: event.seq, usage } : member
    )
  };
}
function applyCeoMemberContext(state, event) {
  if (!event.callId || !event.runId) return state;
  const contextChannels = parseContextChannels(event.channels);
  if (contextChannels === void 0) return state;
  return {
    ...state,
    members: state.members.map(
      (member) => member.batchCallId === event.callId && (member.runId === event.runId || member.memberId === event.memberId) ? { ...member, seq: event.seq, contextChannels } : member
    )
  };
}
function applyCeoMemberHalted(state, event) {
  if (!event.callId || !event.runId) return state;
  return {
    ...state,
    members: state.members.map(
      (member) => member.batchCallId === event.callId && (member.runId === event.runId || event.memberId !== void 0 && member.memberId === event.memberId) ? { ...member, seq: event.seq, halted: true } : member
    )
  };
}
function applyCeoMemberRedirected(state, event) {
  if (!event.callId || !event.runId || event.note.trim() === "") return state;
  return {
    ...state,
    members: state.members.map(
      (member) => member.batchCallId === event.callId && member.runId === event.runId ? { ...member, seq: event.seq, redirectedNote: event.note.trim() } : member
    )
  };
}
function formatTokenCount(value) {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return String(value);
}

// src/client/selection.ts
var selected = null;
var roster = [];
var rosterSessionId;
var pendingMessages = [];
var listeners = /* @__PURE__ */ new Set();
function notify() {
  for (const listener of listeners) listener();
}
function getSelectedCeoMember() {
  return selected;
}
function getCeoRoster() {
  return roster;
}
function getCeoRosterSessionId() {
  return rosterSessionId;
}
function subscribeCeoSelection(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function selectCeoMember(member) {
  if (selected === member) return;
  selected = member;
  notify();
}
function refreshSelected() {
  if (selected === null) return;
  selected = roster.find((member) => member.callId === selected?.callId) ?? null;
}
function drainPending(members) {
  if (pendingMessages.length === 0) return members.slice();
  const still = [];
  let next = members;
  for (const event of pendingMessages) {
    const applied = applyCeoMemberMessage(next, event);
    if (applied === next) still.push(event);
    else next = applied;
  }
  pendingMessages = still;
  return next === members ? members.slice() : [...next];
}
function publishCeoTeam(members, sessionId) {
  if (sessionId !== void 0 && sessionId !== rosterSessionId) {
    selected = null;
    roster = [];
    pendingMessages = [];
    rosterSessionId = sessionId;
  } else if (sessionId !== void 0) {
    rosterSessionId = sessionId;
  }
  if (members.length === 0) return;
  const next = roster.slice();
  let changed = false;
  for (const incoming of members) {
    const index2 = next.findIndex((member) => member.callId === incoming.callId);
    if (index2 === -1) {
      next.push(incoming);
      changed = true;
      continue;
    }
    const merged = mergeCeoMember(next[index2], incoming);
    if (merged !== next[index2]) {
      next[index2] = merged;
      changed = true;
    }
  }
  const drained = drainPending(next);
  if (!changed && drained.length === next.length && drained.every((member, index2) => member === next[index2])) {
    return;
  }
  roster = drained;
  refreshSelected();
  notify();
}
function recordCeoUserDecision(callId, answer) {
  const index2 = roster.findIndex((member) => member.callId === callId);
  if (index2 === -1) return;
  const next = applyCeoUserDecision(roster[index2], answer);
  if (next === roster[index2]) return;
  roster = roster.slice();
  roster[index2] = next;
  refreshSelected();
  notify();
}
function applyCeoRosterMessage(event) {
  const next = applyCeoMemberMessage(roster, event);
  if (next === roster) {
    pendingMessages = [...pendingMessages, event];
    return;
  }
  roster = next;
  refreshSelected();
  notify();
}

// src/client/theme.ts
var ink = {
  primary: "var(--dsw-alias-label-primary, #f3f3f5)",
  secondary: "var(--dsw-alias-label-secondary, #c8c8d0)",
  tertiary: "var(--dsw-alias-label-tertiary, #9a9aa8)",
  danger: "var(--dsw-alias-state-danger, #f87171)",
  warn: "var(--dsw-alias-state-warning, #fbbf24)",
  success: "var(--dsw-alias-state-success, #4ade80)",
  accent: "var(--dsw-alias-state-business-primary, #7aa2ff)"
};
var surface = {
  base: "var(--dsw-alias-bg-base, #121218)",
  layer1: "var(--dsw-alias-bg-layer-1, #1c1c24)",
  layer2: "var(--dsw-alias-bg-layer-2, #24242e)",
  layer3: "var(--dsw-alias-bg-layer-3, #2c2c38)",
  raised: "var(--dsw-alias-bg-module-platform, #2c2c38)",
  overlay: "var(--dsw-alias-bg-overlay, #3a3a48)"
};
var line = {
  subtle: "var(--dsw-alias-border-l2, #3a3a48)",
  strong: "var(--dsw-alias-border-l3, #4a4a58)"
};
var wrap = {
  minWidth: 0,
  overflowWrap: "anywhere",
  wordBreak: "break-word"
};

// src/client/CeoDecisionDrawer.ts
function pendingDecisions(members) {
  return members.filter((member) => presentCeoMember(member).needsDecision);
}
function CeoDecisionDock({
  sessionId,
  sendDecision,
  t
}) {
  const members = (0, import_react.useSyncExternalStore)(subscribeCeoSelection, getCeoRoster, getCeoRoster);
  const rosterSessionId2 = (0, import_react.useSyncExternalStore)(subscribeCeoSelection, getCeoRosterSessionId, getCeoRosterSessionId);
  if (sessionId !== void 0 && rosterSessionId2 !== void 0 && sessionId !== rosterSessionId2) {
    return null;
  }
  return (0, import_react.createElement)(CeoDecisionDrawer, { members, sendDecision, t });
}
function CeoDecisionDrawer({ members, sendDecision, t }) {
  const pending = pendingDecisions(members);
  const [index2, setIndex] = (0, import_react.useState)(0);
  const [minimized, setMinimized] = (0, import_react.useState)(false);
  const [draft, setDraft] = (0, import_react.useState)("");
  const [sending, setSending] = (0, import_react.useState)(false);
  const [sendError, setSendError] = (0, import_react.useState)(void 0);
  if (pending.length === 0 || sendDecision === void 0) return null;
  const current = pending[Math.min(index2, pending.length - 1)];
  if (current === void 0) return null;
  const question = (current.report?.userDecisions ?? "").trim();
  const seat = displayCeoSeat(current, members);
  const canSend = draft.trim() !== "" && !sending;
  const submit = () => {
    if (!canSend) return;
    const answer = draft.trim();
    setSending(true);
    setSendError(void 0);
    void sendDecision(formatCeoDecisionMessage(current, answer)).then((result) => {
      setSending(false);
      if (!result.ok) {
        setSendError(result.error ?? t("decision.error"));
        return;
      }
      recordCeoUserDecision(current.callId, answer);
      setDraft("");
    }, (error) => {
      setSending(false);
      setSendError(error instanceof Error ? error.message : t("decision.error"));
    });
  };
  return (0, import_react.createElement)(
    "aside",
    {
      "data-magic-ceo-decision-drawer": current.callId,
      style: {
        margin: "0 0 10px",
        border: `1px solid ${line.subtle}`,
        borderRadius: 12,
        background: surface.layer2,
        overflow: "hidden"
      }
    },
    (0, import_react.createElement)(
      "header",
      {
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: "10px 12px"
        }
      },
      (0, import_react.createElement)(
        "div",
        { style: { minWidth: 0, flex: 1 } },
        (0, import_react.createElement)("div", {
          style: { fontSize: 11, fontWeight: 510, color: ink.warn, lineHeight: "16px" }
        }, t("drawer.caption")),
        (0, import_react.createElement)("h2", {
          style: {
            ...wrap,
            margin: "4px 0 0",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: "20px",
            color: ink.primary
          }
        }, question === "" ? t("drawer.fallbackQuestion", { seat }) : question)
      ),
      (0, import_react.createElement)(
        "div",
        { style: { display: "flex", gap: 2, flex: "0 0 auto" } },
        pending.length > 1 ? (0, import_react.createElement)("span", {
          style: { fontSize: 11, color: ink.tertiary, lineHeight: "28px", padding: "0 4px" }
        }, `${String(Math.min(index2, pending.length - 1) + 1)}/${String(pending.length)}`) : null,
        pending.length > 1 ? iconButton(t("drawer.prev"), index2 <= 0 || sending, () => {
          setIndex((value) => Math.max(0, value - 1));
          setDraft("");
          setSendError(void 0);
        }, "\u2039") : null,
        pending.length > 1 ? iconButton(t("drawer.next"), index2 >= pending.length - 1 || sending, () => {
          setIndex((value) => Math.min(pending.length - 1, value + 1));
          setDraft("");
          setSendError(void 0);
        }, "\u203A") : null,
        iconButton(
          t(minimized ? "drawer.expand" : "drawer.fold"),
          sending,
          () => {
            setMinimized((value) => !value);
          },
          minimized ? "\u25B4" : "\u25BE"
        )
      )
    ),
    minimized ? null : (0, import_react.createElement)(
      "div",
      { style: { padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 10 } },
      (0, import_react.createElement)("div", {
        style: { fontSize: 12, lineHeight: "18px", color: ink.tertiary }
      }, t("drawer.context", { seat })),
      current.task.trim() === "" ? null : (0, import_react.createElement)("div", {
        style: {
          ...wrap,
          fontSize: 12,
          lineHeight: "18px",
          color: ink.secondary,
          display: "-webkit-box",
          overflow: "hidden",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical"
        }
      }, current.task),
      (0, import_react.createElement)("textarea", {
        value: draft,
        rows: 3,
        placeholder: t("drawer.placeholder"),
        disabled: sending,
        onChange: (event) => {
          setDraft(event.target.value);
        },
        style: {
          width: "100%",
          resize: "vertical",
          boxSizing: "border-box",
          padding: "8px 10px",
          borderRadius: 8,
          border: `0.5px solid ${line.subtle}`,
          background: surface.layer3,
          color: ink.primary,
          fontSize: 13,
          lineHeight: "20px"
        }
      }),
      sendError !== void 0 ? (0, import_react.createElement)("div", { style: { fontSize: 12, color: ink.danger } }, sendError) : null,
      (0, import_react.createElement)(
        "div",
        { style: { display: "flex", justifyContent: "flex-end" } },
        (0, import_react.createElement)("button", {
          type: "button",
          disabled: !canSend,
          onClick: submit,
          style: {
            padding: "6px 12px",
            borderRadius: 8,
            border: 0,
            background: canSend ? "var(--dsw-alias-state-business-primary, #3b82f6)" : surface.overlay,
            color: canSend ? "#fff" : ink.tertiary,
            cursor: canSend ? "pointer" : "default",
            fontSize: 13,
            fontWeight: 510
          }
        }, sending ? t("decision.sending") : t("decision.send"))
      )
    )
  );
}
function iconButton(label, disabled, onClick, glyph) {
  const style2 = {
    width: 28,
    height: 28,
    border: 0,
    borderRadius: 8,
    background: "transparent",
    color: ink.secondary,
    cursor: disabled ? "default" : "pointer",
    fontSize: 14,
    opacity: disabled ? 0.45 : 1
  };
  return (0, import_react.createElement)("button", {
    type: "button",
    title: label,
    "aria-label": label,
    disabled,
    onClick,
    style: style2
  }, glyph);
}

// src/client/CeoDelegateRow.ts
var import_react2 = require("react");
function argsRawOf(block) {
  return ("call" in block ? block.call?.argsRaw : block.argsRaw) ?? "";
}
function resultText(block) {
  if (!Array.isArray(block.content)) return "";
  return block.content.filter((item) => item.type === "text" && typeof item.text === "string").map((item) => item.text ?? "").join("\n");
}
function CeoDelegateRow({ block, inspect, t }) {
  const tasks = parseCeoDelegateTasks(argsRawOf(block));
  const parsed = tasks[0];
  const done = "kind" in block || Array.isArray(block.content);
  const failed = block.isError === true || block.error?.code !== void 0;
  const memberId = parseCeoDelegateMemberId(resultText(block));
  const status = !done ? "running" : failed ? "error" : "ok";
  const summary = tasks.length > 1 ? `${String(tasks.length)} tasks` : `${parsed?.role ?? "member"} \xB7 ${parsed?.task ?? "task"}`;
  return (0, import_react2.createElement)(
    "button",
    {
      type: "button",
      "data-magic-ceo-delegate": block.callId,
      "data-status": status,
      onClick: inspect,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        minHeight: 32,
        padding: "0 8px",
        border: 0,
        borderRadius: 8,
        background: surface.layer2,
        color: ink.secondary,
        cursor: inspect === void 0 ? "default" : "pointer",
        textAlign: "left"
      }
    },
    (0, import_react2.createElement)("span", { style: { fontWeight: 510 } }, t("tool.title")),
    (0, import_react2.createElement)("span", {
      style: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, summary),
    (0, import_react2.createElement)("span", {
      style: { marginLeft: "auto", fontSize: 11, color: ink.tertiary }
    }, memberId ?? t(`status.${status}`))
  );
}

// src/client/CeoTeamGraph.ts
var import_react5 = require("react");

// ../../node_modules/.pnpm/@xyflow+react@12.11.6_react_c2c6b2ffa45210201bfebe3ffbf25aee/node_modules/@xyflow/react/dist/esm/index.js
var import_jsx_runtime = require("react/jsx-runtime");
var import_react4 = require("react");

// ../../node_modules/.pnpm/classcat@5.0.5/node_modules/classcat/index.js
function cc(names) {
  if (typeof names === "string" || typeof names === "number") return "" + names;
  let out = "";
  if (Array.isArray(names)) {
    for (let i = 0, tmp; i < names.length; i++) {
      if ((tmp = cc(names[i])) !== "") {
        out += (out && " ") + tmp;
      }
    }
  } else {
    for (let k in names) {
      if (names[k]) out += (out && " ") + k;
    }
  }
  return out;
}

// ../../node_modules/.pnpm/d3-dispatch@3.0.1/node_modules/d3-dispatch/src/dispatch.js
var noop = { value: () => {
} };
function dispatch() {
  for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
    if (!(t = arguments[i] + "") || t in _ || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
    _[t] = [];
  }
  return new Dispatch(_);
}
function Dispatch(_) {
  this._ = _;
}
function parseTypenames(typenames, types) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
    return { type: t, name };
  });
}
Dispatch.prototype = dispatch.prototype = {
  constructor: Dispatch,
  on: function(typename, callback) {
    var _ = this._, T = parseTypenames(typename + "", _), t, i = -1, n = T.length;
    if (arguments.length < 2) {
      while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
      return;
    }
    if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
    while (++i < n) {
      if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
      else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
    }
    return this;
  },
  copy: function() {
    var copy = {}, _ = this._;
    for (var t in _) copy[t] = _[t].slice();
    return new Dispatch(copy);
  },
  call: function(type, that) {
    if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  },
  apply: function(type, that, args) {
    if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
    for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
  }
};
function get(type, name) {
  for (var i = 0, n = type.length, c; i < n; ++i) {
    if ((c = type[i]).name === name) {
      return c.value;
    }
  }
}
function set(type, name, callback) {
  for (var i = 0, n = type.length; i < n; ++i) {
    if (type[i].name === name) {
      type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
      break;
    }
  }
  if (callback != null) type.push({ name, value: callback });
  return type;
}
var dispatch_default = dispatch;

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/namespaces.js
var xhtml = "http://www.w3.org/1999/xhtml";
var namespaces_default = {
  svg: "http://www.w3.org/2000/svg",
  xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/namespace.js
function namespace_default(name) {
  var prefix = name += "", i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
  return namespaces_default.hasOwnProperty(prefix) ? { space: namespaces_default[prefix], local: name } : name;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/creator.js
function creatorInherit(name) {
  return function() {
    var document2 = this.ownerDocument, uri = this.namespaceURI;
    return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
  };
}
function creatorFixed(fullname) {
  return function() {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}
function creator_default(name) {
  var fullname = namespace_default(name);
  return (fullname.local ? creatorFixed : creatorInherit)(fullname);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selector.js
function none() {
}
function selector_default(selector) {
  return selector == null ? none : function() {
    return this.querySelector(selector);
  };
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/select.js
function select_default(select) {
  if (typeof select !== "function") select = selector_default(select);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }
  return new Selection(subgroups, this._parents);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/array.js
function array(x) {
  return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selectorAll.js
function empty() {
  return [];
}
function selectorAll_default(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectAll.js
function arrayAll(select) {
  return function() {
    return array(select.apply(this, arguments));
  };
}
function selectAll_default(select) {
  if (typeof select === "function") select = arrayAll(select);
  else select = selectorAll_default(select);
  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }
  return new Selection(subgroups, parents);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/matcher.js
function matcher_default(selector) {
  return function() {
    return this.matches(selector);
  };
}
function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChild.js
var find = Array.prototype.find;
function childFind(match) {
  return function() {
    return find.call(this.children, match);
  };
}
function childFirst() {
  return this.firstElementChild;
}
function selectChild_default(match) {
  return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/selectChildren.js
var filter = Array.prototype.filter;
function children() {
  return Array.from(this.children);
}
function childrenFilter(match) {
  return function() {
    return filter.call(this.children, match);
  };
}
function selectChildren_default(match) {
  return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/filter.js
function filter_default(match) {
  if (typeof match !== "function") match = matcher_default(match);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }
  return new Selection(subgroups, this._parents);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sparse.js
function sparse_default(update) {
  return new Array(update.length);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/enter.js
function enter_default() {
  return new Selection(this._enter || this._groups.map(sparse_default), this._parents);
}
function EnterNode(parent, datum2) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum2;
}
EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function(child) {
    return this._parent.insertBefore(child, this._next);
  },
  insertBefore: function(child, next) {
    return this._parent.insertBefore(child, next);
  },
  querySelector: function(selector) {
    return this._parent.querySelector(selector);
  },
  querySelectorAll: function(selector) {
    return this._parent.querySelectorAll(selector);
  }
};

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/constant.js
function constant_default(x) {
  return function() {
    return x;
  };
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/data.js
function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0, node, groupLength = group.length, dataLength = data.length;
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}
function bindKey(parent, group, enter, update, exit, data, key) {
  var i, node, nodeByKeyValue = /* @__PURE__ */ new Map(), groupLength = group.length, dataLength = data.length, keyValues = new Array(groupLength), keyValue;
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }
  for (i = 0; i < dataLength; ++i) {
    keyValue = key.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
      exit[i] = node;
    }
  }
}
function datum(node) {
  return node.__data__;
}
function data_default(value, key) {
  if (!arguments.length) return Array.from(this, datum);
  var bind = key ? bindKey : bindIndex, parents = this._parents, groups = this._groups;
  if (typeof value !== "function") value = constant_default(value);
  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j], group = groups[j], groupLength = group.length, data = arraylike(value.call(parent, parent && parent.__data__, j, parents)), dataLength = data.length, enterGroup = enter[j] = new Array(dataLength), updateGroup = update[j] = new Array(dataLength), exitGroup = exit[j] = new Array(groupLength);
    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1) i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength) ;
        previous._next = next || null;
      }
    }
  }
  update = new Selection(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}
function arraylike(data) {
  return typeof data === "object" && "length" in data ? data : Array.from(data);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/exit.js
function exit_default() {
  return new Selection(this._exit || this._groups.map(sparse_default), this._parents);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/join.js
function join_default(onenter, onupdate, onexit) {
  var enter = this.enter(), update = this, exit = this.exit();
  if (typeof onenter === "function") {
    enter = onenter(enter);
    if (enter) enter = enter.selection();
  } else {
    enter = enter.append(onenter + "");
  }
  if (onupdate != null) {
    update = onupdate(update);
    if (update) update = update.selection();
  }
  if (onexit == null) exit.remove();
  else onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/merge.js
function merge_default(context) {
  var selection2 = context.selection ? context.selection() : context;
  for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }
  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }
  return new Selection(merges, this._parents);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/order.js
function order_default() {
  for (var groups = this._groups, j = -1, m = groups.length; ++j < m; ) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }
  return this;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/sort.js
function sort_default(compare) {
  if (!compare) compare = ascending;
  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }
  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }
  return new Selection(sortgroups, this._parents).order();
}
function ascending(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/call.js
function call_default() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/nodes.js
function nodes_default() {
  return Array.from(this);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/node.js
function node_default() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node) return node;
    }
  }
  return null;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/size.js
function size_default() {
  let size = 0;
  for (const node of this) ++size;
  return size;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/empty.js
function empty_default() {
  return !this.node();
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/each.js
function each_default(callback) {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) callback.call(node, node.__data__, i, group);
    }
  }
  return this;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/attr.js
function attrRemove(name) {
  return function() {
    this.removeAttribute(name);
  };
}
function attrRemoveNS(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}
function attrConstant(name, value) {
  return function() {
    this.setAttribute(name, value);
  };
}
function attrConstantNS(fullname, value) {
  return function() {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}
function attrFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  };
}
function attrFunctionNS(fullname, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
    else this.setAttributeNS(fullname.space, fullname.local, v);
  };
}
function attr_default(name, value) {
  var fullname = namespace_default(name);
  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
  }
  return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/window.js
function window_default(node) {
  return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/style.js
function styleRemove(name) {
  return function() {
    this.style.removeProperty(name);
  };
}
function styleConstant(name, value, priority) {
  return function() {
    this.style.setProperty(name, value, priority);
  };
}
function styleFunction(name, value, priority) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) this.style.removeProperty(name);
    else this.style.setProperty(name, v, priority);
  };
}
function style_default(name, value, priority) {
  return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
}
function styleValue(node, name) {
  return node.style.getPropertyValue(name) || window_default(node).getComputedStyle(node, null).getPropertyValue(name);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/property.js
function propertyRemove(name) {
  return function() {
    delete this[name];
  };
}
function propertyConstant(name, value) {
  return function() {
    this[name] = value;
  };
}
function propertyFunction(name, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (v == null) delete this[name];
    else this[name] = v;
  };
}
function property_default(name, value) {
  return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/classed.js
function classArray(string) {
  return string.trim().split(/^|\s+/);
}
function classList(node) {
  return node.classList || new ClassList(node);
}
function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}
ClassList.prototype = {
  add: function(name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function(name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function(name) {
    return this._names.indexOf(name) >= 0;
  }
};
function classedAdd(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.add(names[i]);
}
function classedRemove(node, names) {
  var list = classList(node), i = -1, n = names.length;
  while (++i < n) list.remove(names[i]);
}
function classedTrue(names) {
  return function() {
    classedAdd(this, names);
  };
}
function classedFalse(names) {
  return function() {
    classedRemove(this, names);
  };
}
function classedFunction(names, value) {
  return function() {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}
function classed_default(name, value) {
  var names = classArray(name + "");
  if (arguments.length < 2) {
    var list = classList(this.node()), i = -1, n = names.length;
    while (++i < n) if (!list.contains(names[i])) return false;
    return true;
  }
  return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/text.js
function textRemove() {
  this.textContent = "";
}
function textConstant(value) {
  return function() {
    this.textContent = value;
  };
}
function textFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}
function text_default(value) {
  return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/html.js
function htmlRemove() {
  this.innerHTML = "";
}
function htmlConstant(value) {
  return function() {
    this.innerHTML = value;
  };
}
function htmlFunction(value) {
  return function() {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}
function html_default(value) {
  return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/raise.js
function raise() {
  if (this.nextSibling) this.parentNode.appendChild(this);
}
function raise_default() {
  return this.each(raise);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/lower.js
function lower() {
  if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function lower_default() {
  return this.each(lower);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/append.js
function append_default(name) {
  var create2 = typeof name === "function" ? name : creator_default(name);
  return this.select(function() {
    return this.appendChild(create2.apply(this, arguments));
  });
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/insert.js
function constantNull() {
  return null;
}
function insert_default(name, before) {
  var create2 = typeof name === "function" ? name : creator_default(name), select = before == null ? constantNull : typeof before === "function" ? before : selector_default(before);
  return this.select(function() {
    return this.insertBefore(create2.apply(this, arguments), select.apply(this, arguments) || null);
  });
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/remove.js
function remove() {
  var parent = this.parentNode;
  if (parent) parent.removeChild(this);
}
function remove_default() {
  return this.each(remove);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/clone.js
function selection_cloneShallow() {
  var clone = this.cloneNode(false), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function selection_cloneDeep() {
  var clone = this.cloneNode(true), parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function clone_default(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/datum.js
function datum_default(value) {
  return arguments.length ? this.property("__data__", value) : this.node().__data__;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/on.js
function contextListener(listener) {
  return function(event) {
    listener.call(this, event, this.__data__);
  };
}
function parseTypenames2(typenames) {
  return typenames.trim().split(/^|\s+/).map(function(t) {
    var name = "", i = t.indexOf(".");
    if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
    return { type: t, name };
  });
}
function onRemove(typename) {
  return function() {
    var on = this.__on;
    if (!on) return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i) on.length = i;
    else delete this.__on;
  };
}
function onAdd(typename, value, options) {
  return function() {
    var on = this.__on, o, listener = contextListener(value);
    if (on) for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = { type: typename.type, name: typename.name, value, listener, options };
    if (!on) this.__on = [o];
    else on.push(o);
  };
}
function on_default(typename, value, options) {
  var typenames = parseTypenames2(typename + ""), i, n = typenames.length, t;
  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }
  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
  return this;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/dispatch.js
function dispatchEvent(node, type, params) {
  var window2 = window_default(node), event = window2.CustomEvent;
  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window2.document.createEvent("Event");
    if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
    else event.initEvent(type, false, false);
  }
  node.dispatchEvent(event);
}
function dispatchConstant(type, params) {
  return function() {
    return dispatchEvent(this, type, params);
  };
}
function dispatchFunction(type, params) {
  return function() {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}
function dispatch_default2(type, params) {
  return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/iterator.js
function* iterator_default() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i]) yield node;
    }
  }
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/selection/index.js
var root = [null];
function Selection(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}
function selection() {
  return new Selection([[document.documentElement]], root);
}
function selection_selection() {
  return this;
}
Selection.prototype = selection.prototype = {
  constructor: Selection,
  select: select_default,
  selectAll: selectAll_default,
  selectChild: selectChild_default,
  selectChildren: selectChildren_default,
  filter: filter_default,
  data: data_default,
  enter: enter_default,
  exit: exit_default,
  join: join_default,
  merge: merge_default,
  selection: selection_selection,
  order: order_default,
  sort: sort_default,
  call: call_default,
  nodes: nodes_default,
  node: node_default,
  size: size_default,
  empty: empty_default,
  each: each_default,
  attr: attr_default,
  style: style_default,
  property: property_default,
  classed: classed_default,
  text: text_default,
  html: html_default,
  raise: raise_default,
  lower: lower_default,
  append: append_default,
  insert: insert_default,
  remove: remove_default,
  clone: clone_default,
  datum: datum_default,
  on: on_default,
  dispatch: dispatch_default2,
  [Symbol.iterator]: iterator_default
};
var selection_default = selection;

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/select.js
function select_default2(selector) {
  return typeof selector === "string" ? new Selection([[document.querySelector(selector)]], [document.documentElement]) : new Selection([[selector]], root);
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/sourceEvent.js
function sourceEvent_default(event) {
  let sourceEvent;
  while (sourceEvent = event.sourceEvent) event = sourceEvent;
  return event;
}

// ../../node_modules/.pnpm/d3-selection@3.0.0/node_modules/d3-selection/src/pointer.js
function pointer_default(event, node) {
  event = sourceEvent_default(event);
  if (node === void 0) node = event.currentTarget;
  if (node) {
    var svg = node.ownerSVGElement || node;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }
    if (node.getBoundingClientRect) {
      var rect = node.getBoundingClientRect();
      return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
    }
  }
  return [event.pageX, event.pageY];
}

// ../../node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/noevent.js
var nonpassive = { passive: false };
var nonpassivecapture = { capture: true, passive: false };
function nopropagation(event) {
  event.stopImmediatePropagation();
}
function noevent_default(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

// ../../node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/nodrag.js
function nodrag_default(view) {
  var root2 = view.document.documentElement, selection2 = select_default2(view).on("dragstart.drag", noevent_default, nonpassivecapture);
  if ("onselectstart" in root2) {
    selection2.on("selectstart.drag", noevent_default, nonpassivecapture);
  } else {
    root2.__noselect = root2.style.MozUserSelect;
    root2.style.MozUserSelect = "none";
  }
}
function yesdrag(view, noclick) {
  var root2 = view.document.documentElement, selection2 = select_default2(view).on("dragstart.drag", null);
  if (noclick) {
    selection2.on("click.drag", noevent_default, nonpassivecapture);
    setTimeout(function() {
      selection2.on("click.drag", null);
    }, 0);
  }
  if ("onselectstart" in root2) {
    selection2.on("selectstart.drag", null);
  } else {
    root2.style.MozUserSelect = root2.__noselect;
    delete root2.__noselect;
  }
}

// ../../node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/constant.js
var constant_default2 = (x) => () => x;

// ../../node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/event.js
function DragEvent(type, {
  sourceEvent,
  subject,
  target,
  identifier,
  active,
  x,
  y,
  dx,
  dy,
  dispatch: dispatch2
}) {
  Object.defineProperties(this, {
    type: { value: type, enumerable: true, configurable: true },
    sourceEvent: { value: sourceEvent, enumerable: true, configurable: true },
    subject: { value: subject, enumerable: true, configurable: true },
    target: { value: target, enumerable: true, configurable: true },
    identifier: { value: identifier, enumerable: true, configurable: true },
    active: { value: active, enumerable: true, configurable: true },
    x: { value: x, enumerable: true, configurable: true },
    y: { value: y, enumerable: true, configurable: true },
    dx: { value: dx, enumerable: true, configurable: true },
    dy: { value: dy, enumerable: true, configurable: true },
    _: { value: dispatch2 }
  });
}
DragEvent.prototype.on = function() {
  var value = this._.on.apply(this._, arguments);
  return value === this._ ? this : value;
};

// ../../node_modules/.pnpm/d3-drag@3.0.0/node_modules/d3-drag/src/drag.js
function defaultFilter(event) {
  return !event.ctrlKey && !event.button;
}
function defaultContainer() {
  return this.parentNode;
}
function defaultSubject(event, d) {
  return d == null ? { x: event.x, y: event.y } : d;
}
function defaultTouchable() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function drag_default() {
  var filter2 = defaultFilter, container = defaultContainer, subject = defaultSubject, touchable = defaultTouchable, gestures = {}, listeners2 = dispatch_default("start", "drag", "end"), active = 0, mousedownx, mousedowny, mousemoving, touchending, clickDistance2 = 0;
  function drag(selection2) {
    selection2.on("mousedown.drag", mousedowned).filter(touchable).on("touchstart.drag", touchstarted).on("touchmove.drag", touchmoved, nonpassive).on("touchend.drag touchcancel.drag", touchended).style("touch-action", "none").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  function mousedowned(event, d) {
    if (touchending || !filter2.call(this, event, d)) return;
    var gesture = beforestart(this, container.call(this, event, d), event, d, "mouse");
    if (!gesture) return;
    select_default2(event.view).on("mousemove.drag", mousemoved, nonpassivecapture).on("mouseup.drag", mouseupped, nonpassivecapture);
    nodrag_default(event.view);
    nopropagation(event);
    mousemoving = false;
    mousedownx = event.clientX;
    mousedowny = event.clientY;
    gesture("start", event);
  }
  function mousemoved(event) {
    noevent_default(event);
    if (!mousemoving) {
      var dx = event.clientX - mousedownx, dy = event.clientY - mousedowny;
      mousemoving = dx * dx + dy * dy > clickDistance2;
    }
    gestures.mouse("drag", event);
  }
  function mouseupped(event) {
    select_default2(event.view).on("mousemove.drag mouseup.drag", null);
    yesdrag(event.view, mousemoving);
    noevent_default(event);
    gestures.mouse("end", event);
  }
  function touchstarted(event, d) {
    if (!filter2.call(this, event, d)) return;
    var touches = event.changedTouches, c = container.call(this, event, d), n = touches.length, i, gesture;
    for (i = 0; i < n; ++i) {
      if (gesture = beforestart(this, c, event, d, touches[i].identifier, touches[i])) {
        nopropagation(event);
        gesture("start", event, touches[i]);
      }
    }
  }
  function touchmoved(event) {
    var touches = event.changedTouches, n = touches.length, i, gesture;
    for (i = 0; i < n; ++i) {
      if (gesture = gestures[touches[i].identifier]) {
        noevent_default(event);
        gesture("drag", event, touches[i]);
      }
    }
  }
  function touchended(event) {
    var touches = event.changedTouches, n = touches.length, i, gesture;
    if (touchending) clearTimeout(touchending);
    touchending = setTimeout(function() {
      touchending = null;
    }, 500);
    for (i = 0; i < n; ++i) {
      if (gesture = gestures[touches[i].identifier]) {
        nopropagation(event);
        gesture("end", event, touches[i]);
      }
    }
  }
  function beforestart(that, container2, event, d, identifier, touch) {
    var dispatch2 = listeners2.copy(), p = pointer_default(touch || event, container2), dx, dy, s;
    if ((s = subject.call(that, new DragEvent("beforestart", {
      sourceEvent: event,
      target: drag,
      identifier,
      active,
      x: p[0],
      y: p[1],
      dx: 0,
      dy: 0,
      dispatch: dispatch2
    }), d)) == null) return;
    dx = s.x - p[0] || 0;
    dy = s.y - p[1] || 0;
    return function gesture(type, event2, touch2) {
      var p0 = p, n;
      switch (type) {
        case "start":
          gestures[identifier] = gesture, n = active++;
          break;
        case "end":
          delete gestures[identifier], --active;
        // falls through
        case "drag":
          p = pointer_default(touch2 || event2, container2), n = active;
          break;
      }
      dispatch2.call(
        type,
        that,
        new DragEvent(type, {
          sourceEvent: event2,
          subject: s,
          target: drag,
          identifier,
          active: n,
          x: p[0] + dx,
          y: p[1] + dy,
          dx: p[0] - p0[0],
          dy: p[1] - p0[1],
          dispatch: dispatch2
        }),
        d
      );
    };
  }
  drag.filter = function(_) {
    return arguments.length ? (filter2 = typeof _ === "function" ? _ : constant_default2(!!_), drag) : filter2;
  };
  drag.container = function(_) {
    return arguments.length ? (container = typeof _ === "function" ? _ : constant_default2(_), drag) : container;
  };
  drag.subject = function(_) {
    return arguments.length ? (subject = typeof _ === "function" ? _ : constant_default2(_), drag) : subject;
  };
  drag.touchable = function(_) {
    return arguments.length ? (touchable = typeof _ === "function" ? _ : constant_default2(!!_), drag) : touchable;
  };
  drag.on = function() {
    var value = listeners2.on.apply(listeners2, arguments);
    return value === listeners2 ? drag : value;
  };
  drag.clickDistance = function(_) {
    return arguments.length ? (clickDistance2 = (_ = +_) * _, drag) : Math.sqrt(clickDistance2);
  };
  return drag;
}

// ../../node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/define.js
function define_default(constructor, factory, prototype) {
  constructor.prototype = factory.prototype = prototype;
  prototype.constructor = constructor;
}
function extend(parent, definition) {
  var prototype = Object.create(parent.prototype);
  for (var key in definition) prototype[key] = definition[key];
  return prototype;
}

// ../../node_modules/.pnpm/d3-color@3.1.0/node_modules/d3-color/src/color.js
function Color() {
}
var darker = 0.7;
var brighter = 1 / darker;
var reI = "\\s*([+-]?\\d+)\\s*";
var reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*";
var reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*";
var reHex = /^#([0-9a-f]{3,8})$/;
var reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`);
var reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`);
var reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`);
var reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`);
var reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`);
var reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);
var named = {
  aliceblue: 15792383,
  antiquewhite: 16444375,
  aqua: 65535,
  aquamarine: 8388564,
  azure: 15794175,
  beige: 16119260,
  bisque: 16770244,
  black: 0,
  blanchedalmond: 16772045,
  blue: 255,
  blueviolet: 9055202,
  brown: 10824234,
  burlywood: 14596231,
  cadetblue: 6266528,
  chartreuse: 8388352,
  chocolate: 13789470,
  coral: 16744272,
  cornflowerblue: 6591981,
  cornsilk: 16775388,
  crimson: 14423100,
  cyan: 65535,
  darkblue: 139,
  darkcyan: 35723,
  darkgoldenrod: 12092939,
  darkgray: 11119017,
  darkgreen: 25600,
  darkgrey: 11119017,
  darkkhaki: 12433259,
  darkmagenta: 9109643,
  darkolivegreen: 5597999,
  darkorange: 16747520,
  darkorchid: 10040012,
  darkred: 9109504,
  darksalmon: 15308410,
  darkseagreen: 9419919,
  darkslateblue: 4734347,
  darkslategray: 3100495,
  darkslategrey: 3100495,
  darkturquoise: 52945,
  darkviolet: 9699539,
  deeppink: 16716947,
  deepskyblue: 49151,
  dimgray: 6908265,
  dimgrey: 6908265,
  dodgerblue: 2003199,
  firebrick: 11674146,
  floralwhite: 16775920,
  forestgreen: 2263842,
  fuchsia: 16711935,
  gainsboro: 14474460,
  ghostwhite: 16316671,
  gold: 16766720,
  goldenrod: 14329120,
  gray: 8421504,
  green: 32768,
  greenyellow: 11403055,
  grey: 8421504,
  honeydew: 15794160,
  hotpink: 16738740,
  indianred: 13458524,
  indigo: 4915330,
  ivory: 16777200,
  khaki: 15787660,
  lavender: 15132410,
  lavenderblush: 16773365,
  lawngreen: 8190976,
  lemonchiffon: 16775885,
  lightblue: 11393254,
  lightcoral: 15761536,
  lightcyan: 14745599,
  lightgoldenrodyellow: 16448210,
  lightgray: 13882323,
  lightgreen: 9498256,
  lightgrey: 13882323,
  lightpink: 16758465,
  lightsalmon: 16752762,
  lightseagreen: 2142890,
  lightskyblue: 8900346,
  lightslategray: 7833753,
  lightslategrey: 7833753,
  lightsteelblue: 11584734,
  lightyellow: 16777184,
  lime: 65280,
  limegreen: 3329330,
  linen: 16445670,
  magenta: 16711935,
  maroon: 8388608,
  mediumaquamarine: 6737322,
  mediumblue: 205,
  mediumorchid: 12211667,
  mediumpurple: 9662683,
  mediumseagreen: 3978097,
  mediumslateblue: 8087790,
  mediumspringgreen: 64154,
  mediumturquoise: 4772300,
  mediumvioletred: 13047173,
  midnightblue: 1644912,
  mintcream: 16121850,
  mistyrose: 16770273,
  moccasin: 16770229,
  navajowhite: 16768685,
  navy: 128,
  oldlace: 16643558,
  olive: 8421376,
  olivedrab: 7048739,
  orange: 16753920,
  orangered: 16729344,
  orchid: 14315734,
  palegoldenrod: 15657130,
  palegreen: 10025880,
  paleturquoise: 11529966,
  palevioletred: 14381203,
  papayawhip: 16773077,
  peachpuff: 16767673,
  peru: 13468991,
  pink: 16761035,
  plum: 14524637,
  powderblue: 11591910,
  purple: 8388736,
  rebeccapurple: 6697881,
  red: 16711680,
  rosybrown: 12357519,
  royalblue: 4286945,
  saddlebrown: 9127187,
  salmon: 16416882,
  sandybrown: 16032864,
  seagreen: 3050327,
  seashell: 16774638,
  sienna: 10506797,
  silver: 12632256,
  skyblue: 8900331,
  slateblue: 6970061,
  slategray: 7372944,
  slategrey: 7372944,
  snow: 16775930,
  springgreen: 65407,
  steelblue: 4620980,
  tan: 13808780,
  teal: 32896,
  thistle: 14204888,
  tomato: 16737095,
  turquoise: 4251856,
  violet: 15631086,
  wheat: 16113331,
  white: 16777215,
  whitesmoke: 16119285,
  yellow: 16776960,
  yellowgreen: 10145074
};
define_default(Color, color, {
  copy(channels) {
    return Object.assign(new this.constructor(), this, channels);
  },
  displayable() {
    return this.rgb().displayable();
  },
  hex: color_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: color_formatHex,
  formatHex8: color_formatHex8,
  formatHsl: color_formatHsl,
  formatRgb: color_formatRgb,
  toString: color_formatRgb
});
function color_formatHex() {
  return this.rgb().formatHex();
}
function color_formatHex8() {
  return this.rgb().formatHex8();
}
function color_formatHsl() {
  return hslConvert(this).formatHsl();
}
function color_formatRgb() {
  return this.rgb().formatRgb();
}
function color(format) {
  var m, l;
  format = (format + "").trim().toLowerCase();
  return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) : l === 3 ? new Rgb(m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, (m & 15) << 4 | m & 15, 1) : l === 8 ? rgba(m >> 24 & 255, m >> 16 & 255, m >> 8 & 255, (m & 255) / 255) : l === 4 ? rgba(m >> 12 & 15 | m >> 8 & 240, m >> 8 & 15 | m >> 4 & 240, m >> 4 & 15 | m & 240, ((m & 15) << 4 | m & 15) / 255) : null) : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) : named.hasOwnProperty(format) ? rgbn(named[format]) : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0) : null;
}
function rgbn(n) {
  return new Rgb(n >> 16 & 255, n >> 8 & 255, n & 255, 1);
}
function rgba(r, g, b, a) {
  if (a <= 0) r = g = b = NaN;
  return new Rgb(r, g, b, a);
}
function rgbConvert(o) {
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Rgb();
  o = o.rgb();
  return new Rgb(o.r, o.g, o.b, o.opacity);
}
function rgb(r, g, b, opacity) {
  return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
}
function Rgb(r, g, b, opacity) {
  this.r = +r;
  this.g = +g;
  this.b = +b;
  this.opacity = +opacity;
}
define_default(Rgb, rgb, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
  },
  rgb() {
    return this;
  },
  clamp() {
    return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
  },
  displayable() {
    return -0.5 <= this.r && this.r < 255.5 && (-0.5 <= this.g && this.g < 255.5) && (-0.5 <= this.b && this.b < 255.5) && (0 <= this.opacity && this.opacity <= 1);
  },
  hex: rgb_formatHex,
  // Deprecated! Use color.formatHex.
  formatHex: rgb_formatHex,
  formatHex8: rgb_formatHex8,
  formatRgb: rgb_formatRgb,
  toString: rgb_formatRgb
}));
function rgb_formatHex() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
}
function rgb_formatHex8() {
  return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
}
function rgb_formatRgb() {
  const a = clampa(this.opacity);
  return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
}
function clampa(opacity) {
  return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
}
function clampi(value) {
  return Math.max(0, Math.min(255, Math.round(value) || 0));
}
function hex(value) {
  value = clampi(value);
  return (value < 16 ? "0" : "") + value.toString(16);
}
function hsla(h7, s, l, a) {
  if (a <= 0) h7 = s = l = NaN;
  else if (l <= 0 || l >= 1) h7 = s = NaN;
  else if (s <= 0) h7 = NaN;
  return new Hsl(h7, s, l, a);
}
function hslConvert(o) {
  if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
  if (!(o instanceof Color)) o = color(o);
  if (!o) return new Hsl();
  if (o instanceof Hsl) return o;
  o = o.rgb();
  var r = o.r / 255, g = o.g / 255, b = o.b / 255, min = Math.min(r, g, b), max = Math.max(r, g, b), h7 = NaN, s = max - min, l = (max + min) / 2;
  if (s) {
    if (r === max) h7 = (g - b) / s + (g < b) * 6;
    else if (g === max) h7 = (b - r) / s + 2;
    else h7 = (r - g) / s + 4;
    s /= l < 0.5 ? max + min : 2 - max - min;
    h7 *= 60;
  } else {
    s = l > 0 && l < 1 ? 0 : h7;
  }
  return new Hsl(h7, s, l, o.opacity);
}
function hsl(h7, s, l, opacity) {
  return arguments.length === 1 ? hslConvert(h7) : new Hsl(h7, s, l, opacity == null ? 1 : opacity);
}
function Hsl(h7, s, l, opacity) {
  this.h = +h7;
  this.s = +s;
  this.l = +l;
  this.opacity = +opacity;
}
define_default(Hsl, hsl, extend(Color, {
  brighter(k) {
    k = k == null ? brighter : Math.pow(brighter, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  darker(k) {
    k = k == null ? darker : Math.pow(darker, k);
    return new Hsl(this.h, this.s, this.l * k, this.opacity);
  },
  rgb() {
    var h7 = this.h % 360 + (this.h < 0) * 360, s = isNaN(h7) || isNaN(this.s) ? 0 : this.s, l = this.l, m2 = l + (l < 0.5 ? l : 1 - l) * s, m1 = 2 * l - m2;
    return new Rgb(
      hsl2rgb(h7 >= 240 ? h7 - 240 : h7 + 120, m1, m2),
      hsl2rgb(h7, m1, m2),
      hsl2rgb(h7 < 120 ? h7 + 240 : h7 - 120, m1, m2),
      this.opacity
    );
  },
  clamp() {
    return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
  },
  displayable() {
    return (0 <= this.s && this.s <= 1 || isNaN(this.s)) && (0 <= this.l && this.l <= 1) && (0 <= this.opacity && this.opacity <= 1);
  },
  formatHsl() {
    const a = clampa(this.opacity);
    return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
  }
}));
function clamph(value) {
  value = (value || 0) % 360;
  return value < 0 ? value + 360 : value;
}
function clampt(value) {
  return Math.max(0, Math.min(1, value || 0));
}
function hsl2rgb(h7, m1, m2) {
  return (h7 < 60 ? m1 + (m2 - m1) * h7 / 60 : h7 < 180 ? m2 : h7 < 240 ? m1 + (m2 - m1) * (240 - h7) / 60 : m1) * 255;
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/basis.js
function basis(t1, v0, v1, v2, v3) {
  var t2 = t1 * t1, t3 = t2 * t1;
  return ((1 - 3 * t1 + 3 * t2 - t3) * v0 + (4 - 6 * t2 + 3 * t3) * v1 + (1 + 3 * t1 + 3 * t2 - 3 * t3) * v2 + t3 * v3) / 6;
}
function basis_default(values) {
  var n = values.length - 1;
  return function(t) {
    var i = t <= 0 ? t = 0 : t >= 1 ? (t = 1, n - 1) : Math.floor(t * n), v1 = values[i], v2 = values[i + 1], v0 = i > 0 ? values[i - 1] : 2 * v1 - v2, v3 = i < n - 1 ? values[i + 2] : 2 * v2 - v1;
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/basisClosed.js
function basisClosed_default(values) {
  var n = values.length;
  return function(t) {
    var i = Math.floor(((t %= 1) < 0 ? ++t : t) * n), v0 = values[(i + n - 1) % n], v1 = values[i % n], v2 = values[(i + 1) % n], v3 = values[(i + 2) % n];
    return basis((t - i / n) * n, v0, v1, v2, v3);
  };
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/constant.js
var constant_default3 = (x) => () => x;

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/color.js
function linear(a, d) {
  return function(t) {
    return a + t * d;
  };
}
function exponential(a, b, y) {
  return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
    return Math.pow(a + t * b, y);
  };
}
function gamma(y) {
  return (y = +y) === 1 ? nogamma : function(a, b) {
    return b - a ? exponential(a, b, y) : constant_default3(isNaN(a) ? b : a);
  };
}
function nogamma(a, b) {
  var d = b - a;
  return d ? linear(a, d) : constant_default3(isNaN(a) ? b : a);
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/rgb.js
var rgb_default = (function rgbGamma(y) {
  var color2 = gamma(y);
  function rgb2(start2, end) {
    var r = color2((start2 = rgb(start2)).r, (end = rgb(end)).r), g = color2(start2.g, end.g), b = color2(start2.b, end.b), opacity = nogamma(start2.opacity, end.opacity);
    return function(t) {
      start2.r = r(t);
      start2.g = g(t);
      start2.b = b(t);
      start2.opacity = opacity(t);
      return start2 + "";
    };
  }
  rgb2.gamma = rgbGamma;
  return rgb2;
})(1);
function rgbSpline(spline) {
  return function(colors) {
    var n = colors.length, r = new Array(n), g = new Array(n), b = new Array(n), i, color2;
    for (i = 0; i < n; ++i) {
      color2 = rgb(colors[i]);
      r[i] = color2.r || 0;
      g[i] = color2.g || 0;
      b[i] = color2.b || 0;
    }
    r = spline(r);
    g = spline(g);
    b = spline(b);
    color2.opacity = 1;
    return function(t) {
      color2.r = r(t);
      color2.g = g(t);
      color2.b = b(t);
      return color2 + "";
    };
  };
}
var rgbBasis = rgbSpline(basis_default);
var rgbBasisClosed = rgbSpline(basisClosed_default);

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/numberArray.js
function numberArray_default(a, b) {
  if (!b) b = [];
  var n = a ? Math.min(b.length, a.length) : 0, c = b.slice(), i;
  return function(t) {
    for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
    return c;
  };
}
function isNumberArray(x) {
  return ArrayBuffer.isView(x) && !(x instanceof DataView);
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/array.js
function genericArray(a, b) {
  var nb = b ? b.length : 0, na = a ? Math.min(nb, a.length) : 0, x = new Array(na), c = new Array(nb), i;
  for (i = 0; i < na; ++i) x[i] = value_default(a[i], b[i]);
  for (; i < nb; ++i) c[i] = b[i];
  return function(t) {
    for (i = 0; i < na; ++i) c[i] = x[i](t);
    return c;
  };
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/date.js
function date_default(a, b) {
  var d = /* @__PURE__ */ new Date();
  return a = +a, b = +b, function(t) {
    return d.setTime(a * (1 - t) + b * t), d;
  };
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/number.js
function number_default(a, b) {
  return a = +a, b = +b, function(t) {
    return a * (1 - t) + b * t;
  };
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/object.js
function object_default(a, b) {
  var i = {}, c = {}, k;
  if (a === null || typeof a !== "object") a = {};
  if (b === null || typeof b !== "object") b = {};
  for (k in b) {
    if (k in a) {
      i[k] = value_default(a[k], b[k]);
    } else {
      c[k] = b[k];
    }
  }
  return function(t) {
    for (k in i) c[k] = i[k](t);
    return c;
  };
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/string.js
var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
var reB = new RegExp(reA.source, "g");
function zero(b) {
  return function() {
    return b;
  };
}
function one(b) {
  return function(t) {
    return b(t) + "";
  };
}
function string_default(a, b) {
  var bi = reA.lastIndex = reB.lastIndex = 0, am, bm, bs, i = -1, s = [], q = [];
  a = a + "", b = b + "";
  while ((am = reA.exec(a)) && (bm = reB.exec(b))) {
    if ((bs = bm.index) > bi) {
      bs = b.slice(bi, bs);
      if (s[i]) s[i] += bs;
      else s[++i] = bs;
    }
    if ((am = am[0]) === (bm = bm[0])) {
      if (s[i]) s[i] += bm;
      else s[++i] = bm;
    } else {
      s[++i] = null;
      q.push({ i, x: number_default(am, bm) });
    }
    bi = reB.lastIndex;
  }
  if (bi < b.length) {
    bs = b.slice(bi);
    if (s[i]) s[i] += bs;
    else s[++i] = bs;
  }
  return s.length < 2 ? q[0] ? one(q[0].x) : zero(b) : (b = q.length, function(t) {
    for (var i2 = 0, o; i2 < b; ++i2) s[(o = q[i2]).i] = o.x(t);
    return s.join("");
  });
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/value.js
function value_default(a, b) {
  var t = typeof b, c;
  return b == null || t === "boolean" ? constant_default3(b) : (t === "number" ? number_default : t === "string" ? (c = color(b)) ? (b = c, rgb_default) : string_default : b instanceof color ? rgb_default : b instanceof Date ? date_default : isNumberArray(b) ? numberArray_default : Array.isArray(b) ? genericArray : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object_default : number_default)(a, b);
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/decompose.js
var degrees = 180 / Math.PI;
var identity = {
  translateX: 0,
  translateY: 0,
  rotate: 0,
  skewX: 0,
  scaleX: 1,
  scaleY: 1
};
function decompose_default(a, b, c, d, e, f) {
  var scaleX, scaleY, skewX;
  if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
  if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
  if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
  if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
  return {
    translateX: e,
    translateY: f,
    rotate: Math.atan2(b, a) * degrees,
    skewX: Math.atan(skewX) * degrees,
    scaleX,
    scaleY
  };
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/parse.js
var svgNode;
function parseCss(value) {
  const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
  return m.isIdentity ? identity : decompose_default(m.a, m.b, m.c, m.d, m.e, m.f);
}
function parseSvg(value) {
  if (value == null) return identity;
  if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgNode.setAttribute("transform", value);
  if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
  value = value.matrix;
  return decompose_default(value.a, value.b, value.c, value.d, value.e, value.f);
}

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/transform/index.js
function interpolateTransform(parse, pxComma, pxParen, degParen) {
  function pop(s) {
    return s.length ? s.pop() + " " : "";
  }
  function translate(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push("translate(", null, pxComma, null, pxParen);
      q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
    } else if (xb || yb) {
      s.push("translate(" + xb + pxComma + yb + pxParen);
    }
  }
  function rotate(a, b, s, q) {
    if (a !== b) {
      if (a - b > 180) b += 360;
      else if (b - a > 180) a += 360;
      q.push({ i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: number_default(a, b) });
    } else if (b) {
      s.push(pop(s) + "rotate(" + b + degParen);
    }
  }
  function skewX(a, b, s, q) {
    if (a !== b) {
      q.push({ i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: number_default(a, b) });
    } else if (b) {
      s.push(pop(s) + "skewX(" + b + degParen);
    }
  }
  function scale(xa, ya, xb, yb, s, q) {
    if (xa !== xb || ya !== yb) {
      var i = s.push(pop(s) + "scale(", null, ",", null, ")");
      q.push({ i: i - 4, x: number_default(xa, xb) }, { i: i - 2, x: number_default(ya, yb) });
    } else if (xb !== 1 || yb !== 1) {
      s.push(pop(s) + "scale(" + xb + "," + yb + ")");
    }
  }
  return function(a, b) {
    var s = [], q = [];
    a = parse(a), b = parse(b);
    translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
    rotate(a.rotate, b.rotate, s, q);
    skewX(a.skewX, b.skewX, s, q);
    scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
    a = b = null;
    return function(t) {
      var i = -1, n = q.length, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  };
}
var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

// ../../node_modules/.pnpm/d3-interpolate@3.0.1/node_modules/d3-interpolate/src/zoom.js
var epsilon2 = 1e-12;
function cosh(x) {
  return ((x = Math.exp(x)) + 1 / x) / 2;
}
function sinh(x) {
  return ((x = Math.exp(x)) - 1 / x) / 2;
}
function tanh(x) {
  return ((x = Math.exp(2 * x)) - 1) / (x + 1);
}
var zoom_default = (function zoomRho(rho, rho2, rho4) {
  function zoom(p0, p1) {
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2], dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, i, S;
    if (d2 < epsilon2) {
      S = Math.log(w1 / w0) / rho;
      i = function(t) {
        return [
          ux0 + t * dx,
          uy0 + t * dy,
          w0 * Math.exp(rho * t * S)
        ];
      };
    } else {
      var d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1), b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1), r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1 - r0) / rho;
      i = function(t) {
        var s = t * S, coshr0 = cosh(r0), u = w0 / (rho2 * d1) * (coshr0 * tanh(rho * s + r0) - sinh(r0));
        return [
          ux0 + u * dx,
          uy0 + u * dy,
          w0 * coshr0 / cosh(rho * s + r0)
        ];
      };
    }
    i.duration = S * 1e3 * rho / Math.SQRT2;
    return i;
  }
  zoom.rho = function(_) {
    var _1 = Math.max(1e-3, +_), _2 = _1 * _1, _4 = _2 * _2;
    return zoomRho(_1, _2, _4);
  };
  return zoom;
})(Math.SQRT2, 2, 4);

// ../../node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timer.js
var frame = 0;
var timeout = 0;
var interval = 0;
var pokeDelay = 1e3;
var taskHead;
var taskTail;
var clockLast = 0;
var clockNow = 0;
var clockSkew = 0;
var clock = typeof performance === "object" && performance.now ? performance : Date;
var setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) {
  setTimeout(f, 17);
};
function now() {
  return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
}
function clearNow() {
  clockNow = 0;
}
function Timer() {
  this._call = this._time = this._next = null;
}
Timer.prototype = timer.prototype = {
  constructor: Timer,
  restart: function(callback, delay, time) {
    if (typeof callback !== "function") throw new TypeError("callback is not a function");
    time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
    if (!this._next && taskTail !== this) {
      if (taskTail) taskTail._next = this;
      else taskHead = this;
      taskTail = this;
    }
    this._call = callback;
    this._time = time;
    sleep();
  },
  stop: function() {
    if (this._call) {
      this._call = null;
      this._time = Infinity;
      sleep();
    }
  }
};
function timer(callback, delay, time) {
  var t = new Timer();
  t.restart(callback, delay, time);
  return t;
}
function timerFlush() {
  now();
  ++frame;
  var t = taskHead, e;
  while (t) {
    if ((e = clockNow - t._time) >= 0) t._call.call(void 0, e);
    t = t._next;
  }
  --frame;
}
function wake() {
  clockNow = (clockLast = clock.now()) + clockSkew;
  frame = timeout = 0;
  try {
    timerFlush();
  } finally {
    frame = 0;
    nap();
    clockNow = 0;
  }
}
function poke() {
  var now2 = clock.now(), delay = now2 - clockLast;
  if (delay > pokeDelay) clockSkew -= delay, clockLast = now2;
}
function nap() {
  var t0, t1 = taskHead, t2, time = Infinity;
  while (t1) {
    if (t1._call) {
      if (time > t1._time) time = t1._time;
      t0 = t1, t1 = t1._next;
    } else {
      t2 = t1._next, t1._next = null;
      t1 = t0 ? t0._next = t2 : taskHead = t2;
    }
  }
  taskTail = t0;
  sleep(time);
}
function sleep(time) {
  if (frame) return;
  if (timeout) timeout = clearTimeout(timeout);
  var delay = time - clockNow;
  if (delay > 24) {
    if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
    if (interval) interval = clearInterval(interval);
  } else {
    if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
    frame = 1, setFrame(wake);
  }
}

// ../../node_modules/.pnpm/d3-timer@3.0.1/node_modules/d3-timer/src/timeout.js
function timeout_default(callback, delay, time) {
  var t = new Timer();
  delay = delay == null ? 0 : +delay;
  t.restart((elapsed) => {
    t.stop();
    callback(elapsed + delay);
  }, delay, time);
  return t;
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/schedule.js
var emptyOn = dispatch_default("start", "end", "cancel", "interrupt");
var emptyTween = [];
var CREATED = 0;
var SCHEDULED = 1;
var STARTING = 2;
var STARTED = 3;
var RUNNING = 4;
var ENDING = 5;
var ENDED = 6;
function schedule_default(node, name, id2, index2, group, timing) {
  var schedules = node.__transition;
  if (!schedules) node.__transition = {};
  else if (id2 in schedules) return;
  create(node, id2, {
    name,
    index: index2,
    // For context during callback.
    group,
    // For context during callback.
    on: emptyOn,
    tween: emptyTween,
    time: timing.time,
    delay: timing.delay,
    duration: timing.duration,
    ease: timing.ease,
    timer: null,
    state: CREATED
  });
}
function init(node, id2) {
  var schedule = get2(node, id2);
  if (schedule.state > CREATED) throw new Error("too late; already scheduled");
  return schedule;
}
function set2(node, id2) {
  var schedule = get2(node, id2);
  if (schedule.state > STARTED) throw new Error("too late; already running");
  return schedule;
}
function get2(node, id2) {
  var schedule = node.__transition;
  if (!schedule || !(schedule = schedule[id2])) throw new Error("transition not found");
  return schedule;
}
function create(node, id2, self) {
  var schedules = node.__transition, tween;
  schedules[id2] = self;
  self.timer = timer(schedule, 0, self.time);
  function schedule(elapsed) {
    self.state = SCHEDULED;
    self.timer.restart(start2, self.delay, self.time);
    if (self.delay <= elapsed) start2(elapsed - self.delay);
  }
  function start2(elapsed) {
    var i, j, n, o;
    if (self.state !== SCHEDULED) return stop();
    for (i in schedules) {
      o = schedules[i];
      if (o.name !== self.name) continue;
      if (o.state === STARTED) return timeout_default(start2);
      if (o.state === RUNNING) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("interrupt", node, node.__data__, o.index, o.group);
        delete schedules[i];
      } else if (+i < id2) {
        o.state = ENDED;
        o.timer.stop();
        o.on.call("cancel", node, node.__data__, o.index, o.group);
        delete schedules[i];
      }
    }
    timeout_default(function() {
      if (self.state === STARTED) {
        self.state = RUNNING;
        self.timer.restart(tick, self.delay, self.time);
        tick(elapsed);
      }
    });
    self.state = STARTING;
    self.on.call("start", node, node.__data__, self.index, self.group);
    if (self.state !== STARTING) return;
    self.state = STARTED;
    tween = new Array(n = self.tween.length);
    for (i = 0, j = -1; i < n; ++i) {
      if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
        tween[++j] = o;
      }
    }
    tween.length = j + 1;
  }
  function tick(elapsed) {
    var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1), i = -1, n = tween.length;
    while (++i < n) {
      tween[i].call(node, t);
    }
    if (self.state === ENDING) {
      self.on.call("end", node, node.__data__, self.index, self.group);
      stop();
    }
  }
  function stop() {
    self.state = ENDED;
    self.timer.stop();
    delete schedules[id2];
    for (var i in schedules) return;
    delete node.__transition;
  }
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/interrupt.js
function interrupt_default(node, name) {
  var schedules = node.__transition, schedule, active, empty2 = true, i;
  if (!schedules) return;
  name = name == null ? null : name + "";
  for (i in schedules) {
    if ((schedule = schedules[i]).name !== name) {
      empty2 = false;
      continue;
    }
    active = schedule.state > STARTING && schedule.state < ENDING;
    schedule.state = ENDED;
    schedule.timer.stop();
    schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
    delete schedules[i];
  }
  if (empty2) delete node.__transition;
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/interrupt.js
function interrupt_default2(name) {
  return this.each(function() {
    interrupt_default(this, name);
  });
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/tween.js
function tweenRemove(id2, name) {
  var tween0, tween1;
  return function() {
    var schedule = set2(this, id2), tween = schedule.tween;
    if (tween !== tween0) {
      tween1 = tween0 = tween;
      for (var i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1 = tween1.slice();
          tween1.splice(i, 1);
          break;
        }
      }
    }
    schedule.tween = tween1;
  };
}
function tweenFunction(id2, name, value) {
  var tween0, tween1;
  if (typeof value !== "function") throw new Error();
  return function() {
    var schedule = set2(this, id2), tween = schedule.tween;
    if (tween !== tween0) {
      tween1 = (tween0 = tween).slice();
      for (var t = { name, value }, i = 0, n = tween1.length; i < n; ++i) {
        if (tween1[i].name === name) {
          tween1[i] = t;
          break;
        }
      }
      if (i === n) tween1.push(t);
    }
    schedule.tween = tween1;
  };
}
function tween_default(name, value) {
  var id2 = this._id;
  name += "";
  if (arguments.length < 2) {
    var tween = get2(this.node(), id2).tween;
    for (var i = 0, n = tween.length, t; i < n; ++i) {
      if ((t = tween[i]).name === name) {
        return t.value;
      }
    }
    return null;
  }
  return this.each((value == null ? tweenRemove : tweenFunction)(id2, name, value));
}
function tweenValue(transition2, name, value) {
  var id2 = transition2._id;
  transition2.each(function() {
    var schedule = set2(this, id2);
    (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
  });
  return function(node) {
    return get2(node, id2).value[name];
  };
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/interpolate.js
function interpolate_default(a, b) {
  var c;
  return (typeof b === "number" ? number_default : b instanceof color ? rgb_default : (c = color(b)) ? (b = c, rgb_default) : string_default)(a, b);
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attr.js
function attrRemove2(name) {
  return function() {
    this.removeAttribute(name);
  };
}
function attrRemoveNS2(fullname) {
  return function() {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}
function attrConstant2(name, interpolate, value1) {
  var string00, string1 = value1 + "", interpolate0;
  return function() {
    var string0 = this.getAttribute(name);
    return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
  };
}
function attrConstantNS2(fullname, interpolate, value1) {
  var string00, string1 = value1 + "", interpolate0;
  return function() {
    var string0 = this.getAttributeNS(fullname.space, fullname.local);
    return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
  };
}
function attrFunction2(name, interpolate, value) {
  var string00, string10, interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttribute(name);
    string0 = this.getAttribute(name);
    string1 = value1 + "";
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}
function attrFunctionNS2(fullname, interpolate, value) {
  var string00, string10, interpolate0;
  return function() {
    var string0, value1 = value(this), string1;
    if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
    string0 = this.getAttributeNS(fullname.space, fullname.local);
    string1 = value1 + "";
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}
function attr_default2(name, value) {
  var fullname = namespace_default(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate_default;
  return this.attrTween(name, typeof value === "function" ? (fullname.local ? attrFunctionNS2 : attrFunction2)(fullname, i, tweenValue(this, "attr." + name, value)) : value == null ? (fullname.local ? attrRemoveNS2 : attrRemove2)(fullname) : (fullname.local ? attrConstantNS2 : attrConstant2)(fullname, i, value));
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/attrTween.js
function attrInterpolate(name, i) {
  return function(t) {
    this.setAttribute(name, i.call(this, t));
  };
}
function attrInterpolateNS(fullname, i) {
  return function(t) {
    this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
  };
}
function attrTweenNS(fullname, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
    return t0;
  }
  tween._value = value;
  return tween;
}
function attrTween(name, value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
    return t0;
  }
  tween._value = value;
  return tween;
}
function attrTween_default(name, value) {
  var key = "attr." + name;
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error();
  var fullname = namespace_default(name);
  return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/delay.js
function delayFunction(id2, value) {
  return function() {
    init(this, id2).delay = +value.apply(this, arguments);
  };
}
function delayConstant(id2, value) {
  return value = +value, function() {
    init(this, id2).delay = value;
  };
}
function delay_default(value) {
  var id2 = this._id;
  return arguments.length ? this.each((typeof value === "function" ? delayFunction : delayConstant)(id2, value)) : get2(this.node(), id2).delay;
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/duration.js
function durationFunction(id2, value) {
  return function() {
    set2(this, id2).duration = +value.apply(this, arguments);
  };
}
function durationConstant(id2, value) {
  return value = +value, function() {
    set2(this, id2).duration = value;
  };
}
function duration_default(value) {
  var id2 = this._id;
  return arguments.length ? this.each((typeof value === "function" ? durationFunction : durationConstant)(id2, value)) : get2(this.node(), id2).duration;
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/ease.js
function easeConstant(id2, value) {
  if (typeof value !== "function") throw new Error();
  return function() {
    set2(this, id2).ease = value;
  };
}
function ease_default(value) {
  var id2 = this._id;
  return arguments.length ? this.each(easeConstant(id2, value)) : get2(this.node(), id2).ease;
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/easeVarying.js
function easeVarying(id2, value) {
  return function() {
    var v = value.apply(this, arguments);
    if (typeof v !== "function") throw new Error();
    set2(this, id2).ease = v;
  };
}
function easeVarying_default(value) {
  if (typeof value !== "function") throw new Error();
  return this.each(easeVarying(this._id, value));
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/filter.js
function filter_default2(match) {
  if (typeof match !== "function") match = matcher_default(match);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }
  return new Transition(subgroups, this._parents, this._name, this._id);
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/merge.js
function merge_default2(transition2) {
  if (transition2._id !== this._id) throw new Error();
  for (var groups0 = this._groups, groups1 = transition2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }
  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }
  return new Transition(merges, this._parents, this._name, this._id);
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/on.js
function start(name) {
  return (name + "").trim().split(/^|\s+/).every(function(t) {
    var i = t.indexOf(".");
    if (i >= 0) t = t.slice(0, i);
    return !t || t === "start";
  });
}
function onFunction(id2, name, listener) {
  var on0, on1, sit = start(name) ? init : set2;
  return function() {
    var schedule = sit(this, id2), on = schedule.on;
    if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);
    schedule.on = on1;
  };
}
function on_default2(name, listener) {
  var id2 = this._id;
  return arguments.length < 2 ? get2(this.node(), id2).on.on(name) : this.each(onFunction(id2, name, listener));
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/remove.js
function removeFunction(id2) {
  return function() {
    var parent = this.parentNode;
    for (var i in this.__transition) if (+i !== id2) return;
    if (parent) parent.removeChild(this);
  };
}
function remove_default2() {
  return this.on("end.remove", removeFunction(this._id));
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/select.js
function select_default3(select) {
  var name = this._name, id2 = this._id;
  if (typeof select !== "function") select = selector_default(select);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
        if ("__data__" in node) subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
        schedule_default(subgroup[i], name, id2, i, subgroup, get2(node, id2));
      }
    }
  }
  return new Transition(subgroups, this._parents, name, id2);
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selectAll.js
function selectAll_default2(select) {
  var name = this._name, id2 = this._id;
  if (typeof select !== "function") select = selectorAll_default(select);
  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        for (var children2 = select.call(node, node.__data__, i, group), child, inherit2 = get2(node, id2), k = 0, l = children2.length; k < l; ++k) {
          if (child = children2[k]) {
            schedule_default(child, name, id2, k, children2, inherit2);
          }
        }
        subgroups.push(children2);
        parents.push(node);
      }
    }
  }
  return new Transition(subgroups, parents, name, id2);
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/selection.js
var Selection2 = selection_default.prototype.constructor;
function selection_default2() {
  return new Selection2(this._groups, this._parents);
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/style.js
function styleNull(name, interpolate) {
  var string00, string10, interpolate0;
  return function() {
    var string0 = styleValue(this, name), string1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : interpolate0 = interpolate(string00 = string0, string10 = string1);
  };
}
function styleRemove2(name) {
  return function() {
    this.style.removeProperty(name);
  };
}
function styleConstant2(name, interpolate, value1) {
  var string00, string1 = value1 + "", interpolate0;
  return function() {
    var string0 = styleValue(this, name);
    return string0 === string1 ? null : string0 === string00 ? interpolate0 : interpolate0 = interpolate(string00 = string0, value1);
  };
}
function styleFunction2(name, interpolate, value) {
  var string00, string10, interpolate0;
  return function() {
    var string0 = styleValue(this, name), value1 = value(this), string1 = value1 + "";
    if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
    return string0 === string1 ? null : string0 === string00 && string1 === string10 ? interpolate0 : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
  };
}
function styleMaybeRemove(id2, name) {
  var on0, on1, listener0, key = "style." + name, event = "end." + key, remove2;
  return function() {
    var schedule = set2(this, id2), on = schedule.on, listener = schedule.value[key] == null ? remove2 || (remove2 = styleRemove2(name)) : void 0;
    if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);
    schedule.on = on1;
  };
}
function style_default2(name, value, priority) {
  var i = (name += "") === "transform" ? interpolateTransformCss : interpolate_default;
  return value == null ? this.styleTween(name, styleNull(name, i)).on("end.style." + name, styleRemove2(name)) : typeof value === "function" ? this.styleTween(name, styleFunction2(name, i, tweenValue(this, "style." + name, value))).each(styleMaybeRemove(this._id, name)) : this.styleTween(name, styleConstant2(name, i, value), priority).on("end.style." + name, null);
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/styleTween.js
function styleInterpolate(name, i, priority) {
  return function(t) {
    this.style.setProperty(name, i.call(this, t), priority);
  };
}
function styleTween(name, value, priority) {
  var t, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
    return t;
  }
  tween._value = value;
  return tween;
}
function styleTween_default(name, value, priority) {
  var key = "style." + (name += "");
  if (arguments.length < 2) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error();
  return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/text.js
function textConstant2(value) {
  return function() {
    this.textContent = value;
  };
}
function textFunction2(value) {
  return function() {
    var value1 = value(this);
    this.textContent = value1 == null ? "" : value1;
  };
}
function text_default2(value) {
  return this.tween("text", typeof value === "function" ? textFunction2(tweenValue(this, "text", value)) : textConstant2(value == null ? "" : value + ""));
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/textTween.js
function textInterpolate(i) {
  return function(t) {
    this.textContent = i.call(this, t);
  };
}
function textTween(value) {
  var t0, i0;
  function tween() {
    var i = value.apply(this, arguments);
    if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
    return t0;
  }
  tween._value = value;
  return tween;
}
function textTween_default(value) {
  var key = "text";
  if (arguments.length < 1) return (key = this.tween(key)) && key._value;
  if (value == null) return this.tween(key, null);
  if (typeof value !== "function") throw new Error();
  return this.tween(key, textTween(value));
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/transition.js
function transition_default() {
  var name = this._name, id0 = this._id, id1 = newId();
  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        var inherit2 = get2(node, id0);
        schedule_default(node, name, id1, i, group, {
          time: inherit2.time + inherit2.delay + inherit2.duration,
          delay: 0,
          duration: inherit2.duration,
          ease: inherit2.ease
        });
      }
    }
  }
  return new Transition(groups, this._parents, name, id1);
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/end.js
function end_default() {
  var on0, on1, that = this, id2 = that._id, size = that.size();
  return new Promise(function(resolve, reject) {
    var cancel = { value: reject }, end = { value: function() {
      if (--size === 0) resolve();
    } };
    that.each(function() {
      var schedule = set2(this, id2), on = schedule.on;
      if (on !== on0) {
        on1 = (on0 = on).copy();
        on1._.cancel.push(cancel);
        on1._.interrupt.push(cancel);
        on1._.end.push(end);
      }
      schedule.on = on1;
    });
    if (size === 0) resolve();
  });
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/transition/index.js
var id = 0;
function Transition(groups, parents, name, id2) {
  this._groups = groups;
  this._parents = parents;
  this._name = name;
  this._id = id2;
}
function transition(name) {
  return selection_default().transition(name);
}
function newId() {
  return ++id;
}
var selection_prototype = selection_default.prototype;
Transition.prototype = transition.prototype = {
  constructor: Transition,
  select: select_default3,
  selectAll: selectAll_default2,
  selectChild: selection_prototype.selectChild,
  selectChildren: selection_prototype.selectChildren,
  filter: filter_default2,
  merge: merge_default2,
  selection: selection_default2,
  transition: transition_default,
  call: selection_prototype.call,
  nodes: selection_prototype.nodes,
  node: selection_prototype.node,
  size: selection_prototype.size,
  empty: selection_prototype.empty,
  each: selection_prototype.each,
  on: on_default2,
  attr: attr_default2,
  attrTween: attrTween_default,
  style: style_default2,
  styleTween: styleTween_default,
  text: text_default2,
  textTween: textTween_default,
  remove: remove_default2,
  tween: tween_default,
  delay: delay_default,
  duration: duration_default,
  ease: ease_default,
  easeVarying: easeVarying_default,
  end: end_default,
  [Symbol.iterator]: selection_prototype[Symbol.iterator]
};

// ../../node_modules/.pnpm/d3-ease@3.0.1/node_modules/d3-ease/src/cubic.js
function cubicInOut(t) {
  return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/transition.js
var defaultTiming = {
  time: null,
  // Set on use.
  delay: 0,
  duration: 250,
  ease: cubicInOut
};
function inherit(node, id2) {
  var timing;
  while (!(timing = node.__transition) || !(timing = timing[id2])) {
    if (!(node = node.parentNode)) {
      throw new Error(`transition ${id2} not found`);
    }
  }
  return timing;
}
function transition_default2(name) {
  var id2, timing;
  if (name instanceof Transition) {
    id2 = name._id, name = name._name;
  } else {
    id2 = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
  }
  for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        schedule_default(node, name, id2, i, group, timing || inherit(node, id2));
      }
    }
  }
  return new Transition(groups, this._parents, name, id2);
}

// ../../node_modules/.pnpm/d3-transition@3.0.1_d3-selection@3.0.0/node_modules/d3-transition/src/selection/index.js
selection_default.prototype.interrupt = interrupt_default2;
selection_default.prototype.transition = transition_default2;

// ../../node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/constant.js
var constant_default4 = (x) => () => x;

// ../../node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/event.js
function ZoomEvent(type, {
  sourceEvent,
  target,
  transform: transform2,
  dispatch: dispatch2
}) {
  Object.defineProperties(this, {
    type: { value: type, enumerable: true, configurable: true },
    sourceEvent: { value: sourceEvent, enumerable: true, configurable: true },
    target: { value: target, enumerable: true, configurable: true },
    transform: { value: transform2, enumerable: true, configurable: true },
    _: { value: dispatch2 }
  });
}

// ../../node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/transform.js
function Transform(k, x, y) {
  this.k = k;
  this.x = x;
  this.y = y;
}
Transform.prototype = {
  constructor: Transform,
  scale: function(k) {
    return k === 1 ? this : new Transform(this.k * k, this.x, this.y);
  },
  translate: function(x, y) {
    return x === 0 & y === 0 ? this : new Transform(this.k, this.x + this.k * x, this.y + this.k * y);
  },
  apply: function(point) {
    return [point[0] * this.k + this.x, point[1] * this.k + this.y];
  },
  applyX: function(x) {
    return x * this.k + this.x;
  },
  applyY: function(y) {
    return y * this.k + this.y;
  },
  invert: function(location) {
    return [(location[0] - this.x) / this.k, (location[1] - this.y) / this.k];
  },
  invertX: function(x) {
    return (x - this.x) / this.k;
  },
  invertY: function(y) {
    return (y - this.y) / this.k;
  },
  rescaleX: function(x) {
    return x.copy().domain(x.range().map(this.invertX, this).map(x.invert, x));
  },
  rescaleY: function(y) {
    return y.copy().domain(y.range().map(this.invertY, this).map(y.invert, y));
  },
  toString: function() {
    return "translate(" + this.x + "," + this.y + ") scale(" + this.k + ")";
  }
};
var identity2 = new Transform(1, 0, 0);
transform.prototype = Transform.prototype;
function transform(node) {
  while (!node.__zoom) if (!(node = node.parentNode)) return identity2;
  return node.__zoom;
}

// ../../node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/noevent.js
function nopropagation2(event) {
  event.stopImmediatePropagation();
}
function noevent_default2(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}

// ../../node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/zoom.js
function defaultFilter2(event) {
  return (!event.ctrlKey || event.type === "wheel") && !event.button;
}
function defaultExtent() {
  var e = this;
  if (e instanceof SVGElement) {
    e = e.ownerSVGElement || e;
    if (e.hasAttribute("viewBox")) {
      e = e.viewBox.baseVal;
      return [[e.x, e.y], [e.x + e.width, e.y + e.height]];
    }
    return [[0, 0], [e.width.baseVal.value, e.height.baseVal.value]];
  }
  return [[0, 0], [e.clientWidth, e.clientHeight]];
}
function defaultTransform() {
  return this.__zoom || identity2;
}
function defaultWheelDelta(event) {
  return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 2e-3) * (event.ctrlKey ? 10 : 1);
}
function defaultTouchable2() {
  return navigator.maxTouchPoints || "ontouchstart" in this;
}
function defaultConstrain(transform2, extent, translateExtent) {
  var dx0 = transform2.invertX(extent[0][0]) - translateExtent[0][0], dx1 = transform2.invertX(extent[1][0]) - translateExtent[1][0], dy0 = transform2.invertY(extent[0][1]) - translateExtent[0][1], dy1 = transform2.invertY(extent[1][1]) - translateExtent[1][1];
  return transform2.translate(
    dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1),
    dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1)
  );
}
function zoom_default2() {
  var filter2 = defaultFilter2, extent = defaultExtent, constrain = defaultConstrain, wheelDelta2 = defaultWheelDelta, touchable = defaultTouchable2, scaleExtent = [0, Infinity], translateExtent = [[-Infinity, -Infinity], [Infinity, Infinity]], duration = 250, interpolate = zoom_default, listeners2 = dispatch_default("start", "zoom", "end"), touchstarting, touchfirst, touchending, touchDelay = 500, wheelDelay = 150, clickDistance2 = 0, tapDistance = 10;
  function zoom(selection2) {
    selection2.property("__zoom", defaultTransform).on("wheel.zoom", wheeled, { passive: false }).on("mousedown.zoom", mousedowned).on("dblclick.zoom", dblclicked).filter(touchable).on("touchstart.zoom", touchstarted).on("touchmove.zoom", touchmoved).on("touchend.zoom touchcancel.zoom", touchended).style("-webkit-tap-highlight-color", "rgba(0,0,0,0)");
  }
  zoom.transform = function(collection, transform2, point, event) {
    var selection2 = collection.selection ? collection.selection() : collection;
    selection2.property("__zoom", defaultTransform);
    if (collection !== selection2) {
      schedule(collection, transform2, point, event);
    } else {
      selection2.interrupt().each(function() {
        gesture(this, arguments).event(event).start().zoom(null, typeof transform2 === "function" ? transform2.apply(this, arguments) : transform2).end();
      });
    }
  };
  zoom.scaleBy = function(selection2, k, p, event) {
    zoom.scaleTo(selection2, function() {
      var k0 = this.__zoom.k, k1 = typeof k === "function" ? k.apply(this, arguments) : k;
      return k0 * k1;
    }, p, event);
  };
  zoom.scaleTo = function(selection2, k, p, event) {
    zoom.transform(selection2, function() {
      var e = extent.apply(this, arguments), t0 = this.__zoom, p0 = p == null ? centroid(e) : typeof p === "function" ? p.apply(this, arguments) : p, p1 = t0.invert(p0), k1 = typeof k === "function" ? k.apply(this, arguments) : k;
      return constrain(translate(scale(t0, k1), p0, p1), e, translateExtent);
    }, p, event);
  };
  zoom.translateBy = function(selection2, x, y, event) {
    zoom.transform(selection2, function() {
      return constrain(this.__zoom.translate(
        typeof x === "function" ? x.apply(this, arguments) : x,
        typeof y === "function" ? y.apply(this, arguments) : y
      ), extent.apply(this, arguments), translateExtent);
    }, null, event);
  };
  zoom.translateTo = function(selection2, x, y, p, event) {
    zoom.transform(selection2, function() {
      var e = extent.apply(this, arguments), t = this.__zoom, p0 = p == null ? centroid(e) : typeof p === "function" ? p.apply(this, arguments) : p;
      return constrain(identity2.translate(p0[0], p0[1]).scale(t.k).translate(
        typeof x === "function" ? -x.apply(this, arguments) : -x,
        typeof y === "function" ? -y.apply(this, arguments) : -y
      ), e, translateExtent);
    }, p, event);
  };
  function scale(transform2, k) {
    k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], k));
    return k === transform2.k ? transform2 : new Transform(k, transform2.x, transform2.y);
  }
  function translate(transform2, p0, p1) {
    var x = p0[0] - p1[0] * transform2.k, y = p0[1] - p1[1] * transform2.k;
    return x === transform2.x && y === transform2.y ? transform2 : new Transform(transform2.k, x, y);
  }
  function centroid(extent2) {
    return [(+extent2[0][0] + +extent2[1][0]) / 2, (+extent2[0][1] + +extent2[1][1]) / 2];
  }
  function schedule(transition2, transform2, point, event) {
    transition2.on("start.zoom", function() {
      gesture(this, arguments).event(event).start();
    }).on("interrupt.zoom end.zoom", function() {
      gesture(this, arguments).event(event).end();
    }).tween("zoom", function() {
      var that = this, args = arguments, g = gesture(that, args).event(event), e = extent.apply(that, args), p = point == null ? centroid(e) : typeof point === "function" ? point.apply(that, args) : point, w = Math.max(e[1][0] - e[0][0], e[1][1] - e[0][1]), a = that.__zoom, b = typeof transform2 === "function" ? transform2.apply(that, args) : transform2, i = interpolate(a.invert(p).concat(w / a.k), b.invert(p).concat(w / b.k));
      return function(t) {
        if (t === 1) t = b;
        else {
          var l = i(t), k = w / l[2];
          t = new Transform(k, p[0] - l[0] * k, p[1] - l[1] * k);
        }
        g.zoom(null, t);
      };
    });
  }
  function gesture(that, args, clean) {
    return !clean && that.__zooming || new Gesture(that, args);
  }
  function Gesture(that, args) {
    this.that = that;
    this.args = args;
    this.active = 0;
    this.sourceEvent = null;
    this.extent = extent.apply(that, args);
    this.taps = 0;
  }
  Gesture.prototype = {
    event: function(event) {
      if (event) this.sourceEvent = event;
      return this;
    },
    start: function() {
      if (++this.active === 1) {
        this.that.__zooming = this;
        this.emit("start");
      }
      return this;
    },
    zoom: function(key, transform2) {
      if (this.mouse && key !== "mouse") this.mouse[1] = transform2.invert(this.mouse[0]);
      if (this.touch0 && key !== "touch") this.touch0[1] = transform2.invert(this.touch0[0]);
      if (this.touch1 && key !== "touch") this.touch1[1] = transform2.invert(this.touch1[0]);
      this.that.__zoom = transform2;
      this.emit("zoom");
      return this;
    },
    end: function() {
      if (--this.active === 0) {
        delete this.that.__zooming;
        this.emit("end");
      }
      return this;
    },
    emit: function(type) {
      var d = select_default2(this.that).datum();
      listeners2.call(
        type,
        this.that,
        new ZoomEvent(type, {
          sourceEvent: this.sourceEvent,
          target: zoom,
          type,
          transform: this.that.__zoom,
          dispatch: listeners2
        }),
        d
      );
    }
  };
  function wheeled(event, ...args) {
    if (!filter2.apply(this, arguments)) return;
    var g = gesture(this, args).event(event), t = this.__zoom, k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], t.k * Math.pow(2, wheelDelta2.apply(this, arguments)))), p = pointer_default(event);
    if (g.wheel) {
      if (g.mouse[0][0] !== p[0] || g.mouse[0][1] !== p[1]) {
        g.mouse[1] = t.invert(g.mouse[0] = p);
      }
      clearTimeout(g.wheel);
    } else if (t.k === k) return;
    else {
      g.mouse = [p, t.invert(p)];
      interrupt_default(this);
      g.start();
    }
    noevent_default2(event);
    g.wheel = setTimeout(wheelidled, wheelDelay);
    g.zoom("mouse", constrain(translate(scale(t, k), g.mouse[0], g.mouse[1]), g.extent, translateExtent));
    function wheelidled() {
      g.wheel = null;
      g.end();
    }
  }
  function mousedowned(event, ...args) {
    if (touchending || !filter2.apply(this, arguments)) return;
    var currentTarget = event.currentTarget, g = gesture(this, args, true).event(event), v = select_default2(event.view).on("mousemove.zoom", mousemoved, true).on("mouseup.zoom", mouseupped, true), p = pointer_default(event, currentTarget), x0 = event.clientX, y0 = event.clientY;
    nodrag_default(event.view);
    nopropagation2(event);
    g.mouse = [p, this.__zoom.invert(p)];
    interrupt_default(this);
    g.start();
    function mousemoved(event2) {
      noevent_default2(event2);
      if (!g.moved) {
        var dx = event2.clientX - x0, dy = event2.clientY - y0;
        g.moved = dx * dx + dy * dy > clickDistance2;
      }
      g.event(event2).zoom("mouse", constrain(translate(g.that.__zoom, g.mouse[0] = pointer_default(event2, currentTarget), g.mouse[1]), g.extent, translateExtent));
    }
    function mouseupped(event2) {
      v.on("mousemove.zoom mouseup.zoom", null);
      yesdrag(event2.view, g.moved);
      noevent_default2(event2);
      g.event(event2).end();
    }
  }
  function dblclicked(event, ...args) {
    if (!filter2.apply(this, arguments)) return;
    var t0 = this.__zoom, p0 = pointer_default(event.changedTouches ? event.changedTouches[0] : event, this), p1 = t0.invert(p0), k1 = t0.k * (event.shiftKey ? 0.5 : 2), t1 = constrain(translate(scale(t0, k1), p0, p1), extent.apply(this, args), translateExtent);
    noevent_default2(event);
    if (duration > 0) select_default2(this).transition().duration(duration).call(schedule, t1, p0, event);
    else select_default2(this).call(zoom.transform, t1, p0, event);
  }
  function touchstarted(event, ...args) {
    if (!filter2.apply(this, arguments)) return;
    var touches = event.touches, n = touches.length, g = gesture(this, args, event.changedTouches.length === n).event(event), started, i, t, p;
    nopropagation2(event);
    for (i = 0; i < n; ++i) {
      t = touches[i], p = pointer_default(t, this);
      p = [p, this.__zoom.invert(p), t.identifier];
      if (!g.touch0) g.touch0 = p, started = true, g.taps = 1 + !!touchstarting;
      else if (!g.touch1 && g.touch0[2] !== p[2]) g.touch1 = p, g.taps = 0;
    }
    if (touchstarting) touchstarting = clearTimeout(touchstarting);
    if (started) {
      if (g.taps < 2) touchfirst = p[0], touchstarting = setTimeout(function() {
        touchstarting = null;
      }, touchDelay);
      interrupt_default(this);
      g.start();
    }
  }
  function touchmoved(event, ...args) {
    if (!this.__zooming) return;
    var g = gesture(this, args).event(event), touches = event.changedTouches, n = touches.length, i, t, p, l;
    noevent_default2(event);
    for (i = 0; i < n; ++i) {
      t = touches[i], p = pointer_default(t, this);
      if (g.touch0 && g.touch0[2] === t.identifier) g.touch0[0] = p;
      else if (g.touch1 && g.touch1[2] === t.identifier) g.touch1[0] = p;
    }
    t = g.that.__zoom;
    if (g.touch1) {
      var p0 = g.touch0[0], l0 = g.touch0[1], p1 = g.touch1[0], l1 = g.touch1[1], dp = (dp = p1[0] - p0[0]) * dp + (dp = p1[1] - p0[1]) * dp, dl = (dl = l1[0] - l0[0]) * dl + (dl = l1[1] - l0[1]) * dl;
      t = scale(t, Math.sqrt(dp / dl));
      p = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
      l = [(l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2];
    } else if (g.touch0) p = g.touch0[0], l = g.touch0[1];
    else return;
    g.zoom("touch", constrain(translate(t, p, l), g.extent, translateExtent));
  }
  function touchended(event, ...args) {
    if (!this.__zooming) return;
    var g = gesture(this, args).event(event), touches = event.changedTouches, n = touches.length, i, t;
    nopropagation2(event);
    if (touchending) clearTimeout(touchending);
    touchending = setTimeout(function() {
      touchending = null;
    }, touchDelay);
    for (i = 0; i < n; ++i) {
      t = touches[i];
      if (g.touch0 && g.touch0[2] === t.identifier) delete g.touch0;
      else if (g.touch1 && g.touch1[2] === t.identifier) delete g.touch1;
    }
    if (g.touch1 && !g.touch0) g.touch0 = g.touch1, delete g.touch1;
    if (g.touch0) g.touch0[1] = this.__zoom.invert(g.touch0[0]);
    else {
      g.end();
      if (g.taps === 2) {
        t = pointer_default(t, this);
        if (Math.hypot(touchfirst[0] - t[0], touchfirst[1] - t[1]) < tapDistance) {
          var p = select_default2(this).on("dblclick.zoom");
          if (p) p.apply(this, arguments);
        }
      }
    }
  }
  zoom.wheelDelta = function(_) {
    return arguments.length ? (wheelDelta2 = typeof _ === "function" ? _ : constant_default4(+_), zoom) : wheelDelta2;
  };
  zoom.filter = function(_) {
    return arguments.length ? (filter2 = typeof _ === "function" ? _ : constant_default4(!!_), zoom) : filter2;
  };
  zoom.touchable = function(_) {
    return arguments.length ? (touchable = typeof _ === "function" ? _ : constant_default4(!!_), zoom) : touchable;
  };
  zoom.extent = function(_) {
    return arguments.length ? (extent = typeof _ === "function" ? _ : constant_default4([[+_[0][0], +_[0][1]], [+_[1][0], +_[1][1]]]), zoom) : extent;
  };
  zoom.scaleExtent = function(_) {
    return arguments.length ? (scaleExtent[0] = +_[0], scaleExtent[1] = +_[1], zoom) : [scaleExtent[0], scaleExtent[1]];
  };
  zoom.translateExtent = function(_) {
    return arguments.length ? (translateExtent[0][0] = +_[0][0], translateExtent[1][0] = +_[1][0], translateExtent[0][1] = +_[0][1], translateExtent[1][1] = +_[1][1], zoom) : [[translateExtent[0][0], translateExtent[0][1]], [translateExtent[1][0], translateExtent[1][1]]];
  };
  zoom.constrain = function(_) {
    return arguments.length ? (constrain = _, zoom) : constrain;
  };
  zoom.duration = function(_) {
    return arguments.length ? (duration = +_, zoom) : duration;
  };
  zoom.interpolate = function(_) {
    return arguments.length ? (interpolate = _, zoom) : interpolate;
  };
  zoom.on = function() {
    var value = listeners2.on.apply(listeners2, arguments);
    return value === listeners2 ? zoom : value;
  };
  zoom.clickDistance = function(_) {
    return arguments.length ? (clickDistance2 = (_ = +_) * _, zoom) : Math.sqrt(clickDistance2);
  };
  zoom.tapDistance = function(_) {
    return arguments.length ? (tapDistance = +_, zoom) : tapDistance;
  };
  return zoom;
}

// ../../node_modules/.pnpm/@xyflow+system@0.0.82/node_modules/@xyflow/system/dist/esm/index.js
var errorMessages = {
  error001: (lib = "react") => `Seems like you have not used ${lib === "svelte" ? "SvelteFlowProvider" : "ReactFlowProvider"} as an ancestor. Help: https://${lib}flow.dev/error#001`,
  error002: () => "It looks like you've created a new nodeTypes or edgeTypes object. If this wasn't on purpose please define the nodeTypes/edgeTypes outside of the component or memoize them.",
  error003: (nodeType) => `Node type "${nodeType}" not found. Using fallback type "default".`,
  error004: () => "The parent container needs a width and a height to render the graph.",
  error005: () => "Only child nodes can use a parent extent.",
  error006: () => "Can't create edge. An edge needs a source and a target.",
  error007: (id2) => `The old edge with id=${id2} does not exist.`,
  error009: (type) => `Marker type "${type}" doesn't exist.`,
  error008: (handleType, { id: id2, sourceHandle, targetHandle }) => `Couldn't create edge for ${handleType} handle id: "${handleType === "source" ? sourceHandle : targetHandle}", edge id: ${id2}.`,
  error010: () => "Handle: No node id found. Make sure to only use a Handle inside a custom Node.",
  error011: (edgeType) => `Edge type "${edgeType}" not found. Using fallback type "default".`,
  error012: (id2) => `Node with id "${id2}" does not exist, it may have been removed. This can happen when a node is deleted before the "onNodeClick" handler is called.`,
  error013: (lib = "react") => `It seems that you haven't loaded the styles. Please import '@xyflow/${lib}/dist/style.css' or base.css to make sure everything is working properly.`,
  error014: () => "useNodeConnections: No node ID found. Call useNodeConnections inside a custom Node or provide a node ID.",
  error015: () => "It seems that you are trying to drag a node that is not initialized. Please use onNodesChange as explained in the docs.",
  error016: (id2) => `Edge with id "${id2}" does not exist, it may have been removed. This can happen when an edge is deleted before the "onEdgeClick" handler is called.`
};
var infiniteExtent = [
  [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
  [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY]
];
var elementSelectionKeys = ["Enter", " ", "Escape"];
var defaultAriaLabelConfig = {
  "node.a11yDescription.default": "Press enter or space to select a node. Press delete to remove it and escape to cancel.",
  "node.a11yDescription.keyboardDisabled": "Press enter or space to select a node. You can then use the arrow keys to move the node around. Press delete to remove it and escape to cancel.",
  "node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) => `Moved selected node ${direction}. New position, x: ${x}, y: ${y}`,
  "edge.a11yDescription.default": "Press enter or space to select an edge. You can then press delete to remove it or escape to cancel.",
  // Control elements
  "controls.ariaLabel": "Control Panel",
  "controls.zoomIn.ariaLabel": "Zoom In",
  "controls.zoomOut.ariaLabel": "Zoom Out",
  "controls.fitView.ariaLabel": "Fit View",
  "controls.interactive.ariaLabel": "Toggle Interactivity",
  // Mini map
  "minimap.ariaLabel": "Mini Map",
  // Handle
  "handle.ariaLabel": "Handle"
};
var ConnectionMode;
(function(ConnectionMode2) {
  ConnectionMode2["Strict"] = "strict";
  ConnectionMode2["Loose"] = "loose";
})(ConnectionMode || (ConnectionMode = {}));
var PanOnScrollMode;
(function(PanOnScrollMode2) {
  PanOnScrollMode2["Free"] = "free";
  PanOnScrollMode2["Vertical"] = "vertical";
  PanOnScrollMode2["Horizontal"] = "horizontal";
})(PanOnScrollMode || (PanOnScrollMode = {}));
var SelectionMode;
(function(SelectionMode2) {
  SelectionMode2["Partial"] = "partial";
  SelectionMode2["Full"] = "full";
})(SelectionMode || (SelectionMode = {}));
var initialConnection = {
  inProgress: false,
  isValid: null,
  from: null,
  fromHandle: null,
  fromPosition: null,
  fromNode: null,
  to: null,
  toHandle: null,
  toPosition: null,
  toNode: null,
  pointer: null
};
var ConnectionLineType;
(function(ConnectionLineType2) {
  ConnectionLineType2["Bezier"] = "default";
  ConnectionLineType2["Straight"] = "straight";
  ConnectionLineType2["Step"] = "step";
  ConnectionLineType2["SmoothStep"] = "smoothstep";
  ConnectionLineType2["SimpleBezier"] = "simplebezier";
})(ConnectionLineType || (ConnectionLineType = {}));
var MarkerType;
(function(MarkerType2) {
  MarkerType2["Arrow"] = "arrow";
  MarkerType2["ArrowClosed"] = "arrowclosed";
})(MarkerType || (MarkerType = {}));
var Position;
(function(Position2) {
  Position2["Left"] = "left";
  Position2["Top"] = "top";
  Position2["Right"] = "right";
  Position2["Bottom"] = "bottom";
})(Position || (Position = {}));
var oppositePosition = {
  [Position.Left]: Position.Right,
  [Position.Right]: Position.Left,
  [Position.Top]: Position.Bottom,
  [Position.Bottom]: Position.Top
};
var isEdgeBase = (element) => !!element && typeof element === "object" && "id" in element && "source" in element && "target" in element;
var isNodeBase = (element) => !!element && typeof element === "object" && "id" in element && "position" in element && !("source" in element) && !("target" in element);
var isInternalNodeBase = (element) => !!element && typeof element === "object" && "id" in element && "internals" in element && !("source" in element) && !("target" in element);
var getNodePositionWithOrigin = (node, nodeOrigin = [0, 0]) => {
  const { width, height } = getNodeDimensions(node);
  const origin = node.origin ?? nodeOrigin;
  const offsetX = width * origin[0];
  const offsetY = height * origin[1];
  return {
    x: node.position.x - offsetX,
    y: node.position.y - offsetY
  };
};
var getNodesBounds = (nodes, params = { nodeOrigin: [0, 0] }) => {
  if (!params.nodeLookup) {
    console.warn("Please use `getNodesBounds` from `useReactFlow`/`useSvelteFlow` hook to ensure correct values for sub flows. If not possible, you have to provide a nodeLookup to support sub flows.");
  }
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let hasNode = false;
  const box = nodes.reduce((currBox, nodeOrId) => {
    const isId = typeof nodeOrId === "string";
    let currentNode = !params.nodeLookup && !isId ? nodeOrId : void 0;
    if (params.nodeLookup) {
      currentNode = isId ? params.nodeLookup.get(nodeOrId) : !isInternalNodeBase(nodeOrId) ? params.nodeLookup.get(nodeOrId.id) : nodeOrId;
    }
    if (!currentNode) {
      return currBox;
    }
    hasNode = true;
    return getBoundsOfBoxes(currBox, nodeToBox(currentNode, params.nodeOrigin));
  }, { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity });
  return hasNode ? boxToRect(box) : { x: 0, y: 0, width: 0, height: 0 };
};
var getInternalNodesBounds = (nodeLookup, params = {}) => {
  let box = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity };
  let hasVisibleNodes = false;
  nodeLookup.forEach((node) => {
    if (params.filter === void 0 || params.filter(node)) {
      box = getBoundsOfBoxes(box, nodeToBox(node));
      hasVisibleNodes = true;
    }
  });
  return hasVisibleNodes ? boxToRect(box) : { x: 0, y: 0, width: 0, height: 0 };
};
var getNodesInside = (nodes, rect, [tx, ty, tScale] = [0, 0, 1], partially = false, excludeNonSelectableNodes = false) => {
  const paneX = (rect.x - tx) / tScale;
  const paneY = (rect.y - ty) / tScale;
  const paneWidth = rect.width / tScale;
  const paneHeight = rect.height / tScale;
  const visibleNodes = [];
  for (const node of nodes.values()) {
    const { measured, selectable = true, hidden = false } = node;
    if (excludeNonSelectableNodes && !selectable || hidden) {
      continue;
    }
    const width = measured.width ?? node.width ?? node.initialWidth ?? 0;
    const height = measured.height ?? node.height ?? node.initialHeight ?? 0;
    const { x, y } = node.internals.positionAbsolute;
    const overlappingArea = getRectsOverlappingArea(paneX, paneY, paneWidth, paneHeight, x, y, width, height);
    const area = width * height;
    const partiallyVisible = partially && overlappingArea > 0;
    const forceInitialRender = !node.internals.handleBounds;
    const isVisible = forceInitialRender || partiallyVisible || overlappingArea >= area;
    if (isVisible || node.dragging) {
      visibleNodes.push(node);
    }
  }
  return visibleNodes;
};
var getConnectedEdges = (nodes, edges) => {
  const nodeIds = /* @__PURE__ */ new Set();
  nodes.forEach((node) => {
    nodeIds.add(node.id);
  });
  return edges.filter((edge) => nodeIds.has(edge.source) || nodeIds.has(edge.target));
};
function getFitViewNodes(nodeLookup, options) {
  const fitViewNodes = /* @__PURE__ */ new Map();
  const optionNodeIds = options?.nodes ? new Set(options.nodes.map((node) => node.id)) : null;
  nodeLookup.forEach((n) => {
    let isVisible;
    if (options?.includeHiddenNodes) {
      const { width, height } = getNodeDimensions(n);
      isVisible = width > 0 && height > 0;
    } else {
      isVisible = Boolean(n.measured.width && n.measured.height && !n.hidden);
    }
    if (isVisible && (!optionNodeIds || optionNodeIds.has(n.id))) {
      fitViewNodes.set(n.id, n);
    }
  });
  return fitViewNodes;
}
async function fitViewport({ nodes, width, height, panZoom, minZoom, maxZoom }, options) {
  if (nodes.size === 0) {
    return true;
  }
  const nodesToFit = getFitViewNodes(nodes, options);
  const bounds = getInternalNodesBounds(nodesToFit);
  const viewport = getViewportForBounds(bounds, width, height, options?.minZoom ?? minZoom, options?.maxZoom ?? maxZoom, options?.padding ?? 0.1);
  await panZoom.setViewport(viewport, {
    duration: options?.duration,
    ease: options?.ease,
    interpolate: options?.interpolate
  });
  return true;
}
function calculateNodePosition({ nodeId, nextPosition, nodeLookup, nodeOrigin = [0, 0], nodeExtent, onError }) {
  const node = nodeLookup.get(nodeId);
  const parentNode = node.parentId ? nodeLookup.get(node.parentId) : void 0;
  const { x: parentX, y: parentY } = parentNode ? parentNode.internals.positionAbsolute : { x: 0, y: 0 };
  const origin = node.origin ?? nodeOrigin;
  let extent = node.extent || nodeExtent;
  if (node.extent === "parent" && !node.expandParent) {
    if (!parentNode) {
      onError?.("005", errorMessages["error005"]());
    } else {
      const { width: parentWidth, height: parentHeight } = getNodeDimensions(parentNode);
      if (parentWidth && parentHeight) {
        extent = [
          [parentX, parentY],
          [parentX + parentWidth, parentY + parentHeight]
        ];
      }
    }
  } else if (parentNode && isCoordinateExtent(node.extent)) {
    extent = [
      [node.extent[0][0] + parentX, node.extent[0][1] + parentY],
      [node.extent[1][0] + parentX, node.extent[1][1] + parentY]
    ];
  }
  const positionAbsolute = isCoordinateExtent(extent) ? clampPosition(nextPosition, extent, node.measured) : nextPosition;
  if (node.measured.width === void 0 || node.measured.height === void 0) {
    onError?.("015", errorMessages["error015"]());
  }
  return {
    position: {
      x: positionAbsolute.x - parentX + (node.measured.width ?? 0) * origin[0],
      y: positionAbsolute.y - parentY + (node.measured.height ?? 0) * origin[1]
    },
    positionAbsolute
  };
}
async function getElementsToRemove({ nodesToRemove = [], edgesToRemove = [], nodes, edges, onBeforeDelete }) {
  const nodeIds = new Set(nodesToRemove.map((node) => node.id));
  const matchingNodes = [];
  for (const node of nodes) {
    if (node.deletable === false) {
      continue;
    }
    const isIncluded = nodeIds.has(node.id);
    const parentHit = !isIncluded && node.parentId && matchingNodes.find((n) => n.id === node.parentId);
    if (isIncluded || parentHit) {
      matchingNodes.push(node);
    }
  }
  const edgeIds = new Set(edgesToRemove.map((edge) => edge.id));
  const deletableEdges = edges.filter((edge) => edge.deletable !== false);
  const connectedEdges = getConnectedEdges(matchingNodes, deletableEdges);
  const matchingEdges = connectedEdges;
  for (const edge of deletableEdges) {
    const isIncluded = edgeIds.has(edge.id);
    if (isIncluded && !matchingEdges.find((e) => e.id === edge.id)) {
      matchingEdges.push(edge);
    }
  }
  if (!onBeforeDelete) {
    return {
      edges: matchingEdges,
      nodes: matchingNodes
    };
  }
  const onBeforeDeleteResult = await onBeforeDelete({
    nodes: matchingNodes,
    edges: matchingEdges
  });
  if (typeof onBeforeDeleteResult === "boolean") {
    return onBeforeDeleteResult ? { edges: matchingEdges, nodes: matchingNodes } : { edges: [], nodes: [] };
  }
  return onBeforeDeleteResult;
}
var clamp = (val, min = 0, max = 1) => Math.min(Math.max(val, min), max);
var clampPosition = (position = { x: 0, y: 0 }, extent, dimensions) => ({
  x: clamp(position.x, extent[0][0], extent[1][0] - (dimensions?.width ?? 0)),
  y: clamp(position.y, extent[0][1], extent[1][1] - (dimensions?.height ?? 0))
});
function clampPositionToParent(childPosition, childDimensions, parent) {
  const { width: parentWidth, height: parentHeight } = getNodeDimensions(parent);
  const { x: parentX, y: parentY } = parent.internals.positionAbsolute;
  return clampPosition(childPosition, [
    [parentX, parentY],
    [parentX + parentWidth, parentY + parentHeight]
  ], childDimensions);
}
var calcAutoPanVelocity = (value, min, max) => {
  if (value < min) {
    return clamp(Math.abs(value - min), 1, min) / min;
  } else if (value > max) {
    return -clamp(Math.abs(value - max), 1, min) / min;
  }
  return 0;
};
var calcAutoPan = (pos, bounds, speed = 15, distance2 = 40) => {
  const xMovement = calcAutoPanVelocity(pos.x, distance2, bounds.width - distance2) * speed;
  const yMovement = calcAutoPanVelocity(pos.y, distance2, bounds.height - distance2) * speed;
  return [xMovement, yMovement];
};
var getBoundsOfBoxes = (box1, box2) => ({
  x: Math.min(box1.x, box2.x),
  y: Math.min(box1.y, box2.y),
  x2: Math.max(box1.x2, box2.x2),
  y2: Math.max(box1.y2, box2.y2)
});
var rectToBox = ({ x, y, width, height }) => ({
  x,
  y,
  x2: x + width,
  y2: y + height
});
var boxToRect = ({ x, y, x2, y2 }) => ({
  x,
  y,
  width: x2 - x,
  height: y2 - y
});
var nodeToRect = (node, nodeOrigin = [0, 0]) => {
  const { x, y } = isInternalNodeBase(node) ? node.internals.positionAbsolute : getNodePositionWithOrigin(node, nodeOrigin);
  return {
    x,
    y,
    width: node.measured?.width ?? node.width ?? node.initialWidth ?? 0,
    height: node.measured?.height ?? node.height ?? node.initialHeight ?? 0
  };
};
var nodeToBox = (node, nodeOrigin = [0, 0]) => {
  const { x, y } = isInternalNodeBase(node) ? node.internals.positionAbsolute : getNodePositionWithOrigin(node, nodeOrigin);
  return {
    x,
    y,
    x2: x + (node.measured?.width ?? node.width ?? node.initialWidth ?? 0),
    y2: y + (node.measured?.height ?? node.height ?? node.initialHeight ?? 0)
  };
};
var getBoundsOfRects = (rect1, rect2) => boxToRect(getBoundsOfBoxes(rectToBox(rect1), rectToBox(rect2)));
var getRectsOverlappingArea = (aX, aY, aWidth, aHeight, bX, bY, bWidth, bHeight) => {
  const xOverlap = Math.max(0, Math.min(aX + aWidth, bX + bWidth) - Math.max(aX, bX));
  const yOverlap = Math.max(0, Math.min(aY + aHeight, bY + bHeight) - Math.max(aY, bY));
  return Math.ceil(xOverlap * yOverlap);
};
var getOverlappingArea = (rectA, rectB) => getRectsOverlappingArea(rectA.x, rectA.y, rectA.width, rectA.height, rectB.x, rectB.y, rectB.width, rectB.height);
var isRectObject = (obj) => isNumeric(obj.width) && isNumeric(obj.height) && isNumeric(obj.x) && isNumeric(obj.y);
var isNumeric = (n) => !isNaN(n) && isFinite(n);
var createDevWarn = (lib, helpUrl) => (id2, message) => {
  if (true) {
    console.warn(`[${lib}]: ${message} Help: ${helpUrl}error#${id2}`);
  }
};
var snapPosition = (position, snapGrid = [1, 1]) => {
  return {
    x: snapGrid[0] * Math.round(position.x / snapGrid[0]),
    y: snapGrid[1] * Math.round(position.y / snapGrid[1])
  };
};
var pointToRendererPoint = ({ x, y }, [tx, ty, tScale], snapToGrid = false, snapGrid = [1, 1]) => {
  const position = {
    x: (x - tx) / tScale,
    y: (y - ty) / tScale
  };
  return snapToGrid ? snapPosition(position, snapGrid) : position;
};
var rendererPointToPoint = ({ x, y }, [tx, ty, tScale]) => {
  return {
    x: x * tScale + tx,
    y: y * tScale + ty
  };
};
function parsePadding(padding, viewport) {
  if (typeof padding === "number") {
    return Math.floor((viewport - viewport / (1 + padding)) * 0.5);
  }
  if (typeof padding === "string" && padding.endsWith("px")) {
    const paddingValue = parseFloat(padding);
    if (!Number.isNaN(paddingValue)) {
      return Math.floor(paddingValue);
    }
  }
  if (typeof padding === "string" && padding.endsWith("%")) {
    const paddingValue = parseFloat(padding);
    if (!Number.isNaN(paddingValue)) {
      return Math.floor(viewport * paddingValue * 0.01);
    }
  }
  console.error(`The padding value "${padding}" is invalid. Please provide a number or a string with a valid unit (px or %).`);
  return 0;
}
function parsePaddings(padding, width, height) {
  if (typeof padding === "string" || typeof padding === "number") {
    const paddingY = parsePadding(padding, height);
    const paddingX = parsePadding(padding, width);
    return {
      top: paddingY,
      right: paddingX,
      bottom: paddingY,
      left: paddingX,
      x: paddingX * 2,
      y: paddingY * 2
    };
  }
  if (typeof padding === "object") {
    const top = parsePadding(padding.top ?? padding.y ?? 0, height);
    const bottom = parsePadding(padding.bottom ?? padding.y ?? 0, height);
    const left = parsePadding(padding.left ?? padding.x ?? 0, width);
    const right = parsePadding(padding.right ?? padding.x ?? 0, width);
    return { top, right, bottom, left, x: left + right, y: top + bottom };
  }
  return { top: 0, right: 0, bottom: 0, left: 0, x: 0, y: 0 };
}
function calculateAppliedPaddings(bounds, x, y, zoom, width, height) {
  const { x: left, y: top } = rendererPointToPoint(bounds, [x, y, zoom]);
  const { x: boundRight, y: boundBottom } = rendererPointToPoint({ x: bounds.x + bounds.width, y: bounds.y + bounds.height }, [x, y, zoom]);
  const right = width - boundRight;
  const bottom = height - boundBottom;
  return {
    left: Math.floor(left),
    top: Math.floor(top),
    right: Math.floor(right),
    bottom: Math.floor(bottom)
  };
}
var getViewportForBounds = (bounds, width, height, minZoom, maxZoom, padding) => {
  const p = parsePaddings(padding, width, height);
  const xZoom = (width - p.x) / bounds.width;
  const yZoom = (height - p.y) / bounds.height;
  const zoom = Math.min(xZoom, yZoom);
  const clampedZoom = clamp(zoom, minZoom, maxZoom);
  const boundsCenterX = bounds.x + bounds.width / 2;
  const boundsCenterY = bounds.y + bounds.height / 2;
  const x = width / 2 - boundsCenterX * clampedZoom;
  const y = height / 2 - boundsCenterY * clampedZoom;
  const newPadding = calculateAppliedPaddings(bounds, x, y, clampedZoom, width, height);
  const offset = {
    left: Math.min(newPadding.left - p.left, 0),
    top: Math.min(newPadding.top - p.top, 0),
    right: Math.min(newPadding.right - p.right, 0),
    bottom: Math.min(newPadding.bottom - p.bottom, 0)
  };
  return {
    x: x - offset.left + offset.right,
    y: y - offset.top + offset.bottom,
    zoom: clampedZoom
  };
};
var isMacOs = () => typeof navigator !== "undefined" && navigator?.userAgent?.indexOf("Mac") >= 0;
function isCoordinateExtent(extent) {
  return extent !== void 0 && extent !== null && extent !== "parent";
}
function getNodeDimensions(node) {
  return {
    width: node.measured?.width ?? node.width ?? node.initialWidth ?? 0,
    height: node.measured?.height ?? node.height ?? node.initialHeight ?? 0
  };
}
function nodeHasDimensions(node) {
  return (node.measured?.width ?? node.width ?? node.initialWidth) !== void 0 && (node.measured?.height ?? node.height ?? node.initialHeight) !== void 0;
}
function evaluateAbsolutePosition(position, dimensions = { width: 0, height: 0 }, parentId, nodeLookup, nodeOrigin) {
  const positionAbsolute = { ...position };
  const parent = nodeLookup.get(parentId);
  if (parent) {
    const origin = parent.origin || nodeOrigin;
    positionAbsolute.x += parent.internals.positionAbsolute.x - (dimensions.width ?? 0) * origin[0];
    positionAbsolute.y += parent.internals.positionAbsolute.y - (dimensions.height ?? 0) * origin[1];
  }
  return positionAbsolute;
}
function areSetsEqual(a, b) {
  if (a.size !== b.size) {
    return false;
  }
  for (const item of a) {
    if (!b.has(item)) {
      return false;
    }
  }
  return true;
}
function withResolvers() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
function mergeAriaLabelConfig(partial) {
  return { ...defaultAriaLabelConfig, ...partial || {} };
}
function isAttributionVisible(library) {
  if (typeof document === "undefined")
    return true;
  const pane = document.querySelector(`.${library}-flow__pane`);
  if (!pane || !pane.isConnected)
    return true;
  const paneStyle = getComputedStyle(pane);
  if (paneStyle.display === "none")
    return true;
  if (paneStyle.visibility === "hidden" || paneStyle.visibility === "collapse")
    return true;
  if (paneStyle.opacity === "0")
    return true;
  if (paneStyle.width === "0" && paneStyle.height === "0")
    return true;
  const paneRect = pane.getBoundingClientRect();
  if (paneRect.width === 0 && paneRect.height === 0)
    return true;
  const attr = document.querySelector(`.${library}-flow__attribution`);
  if (!attr || !attr.isConnected)
    return false;
  const style2 = getComputedStyle(attr);
  if (style2.display === "none")
    return false;
  if (style2.visibility === "hidden" || style2.visibility === "collapse")
    return false;
  if (style2.opacity === "0")
    return false;
  const rect = attr.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0)
    return false;
  return true;
}
var warningDisplayed = false;
function handleAttributionWarning(library) {
  if (warningDisplayed || false) {
    return;
  }
  warningDisplayed = true;
  const framework = `${library.charAt(0).toUpperCase() + library.slice(1)} Flow`;
  setTimeout(() => {
    if (!isAttributionVisible(library)) {
      console.warn(`${framework}: It seems like you are hiding the attribution. Please only do this when you are subscribed to ${framework} Pro: https://${library}flow.dev/remove-attr
%cYou can ignore this warning if you are subscribed.`, "font-style: italic;");
    }
  }, 1e3);
}
function getConnectionStatus(isValid) {
  return isValid === null ? null : isValid ? "valid" : "invalid";
}
function getPointerPosition(event, { snapGrid = [0, 0], snapToGrid = false, transform: transform2, containerBounds }) {
  const { x, y } = getEventPosition(event);
  const pointerPos = pointToRendererPoint({ x: x - (containerBounds?.left ?? 0), y: y - (containerBounds?.top ?? 0) }, transform2);
  const { x: xSnapped, y: ySnapped } = snapToGrid ? snapPosition(pointerPos, snapGrid) : pointerPos;
  return {
    xSnapped,
    ySnapped,
    ...pointerPos
  };
}
var getDimensions = (node) => ({
  width: node.offsetWidth,
  height: node.offsetHeight
});
var getHostForElement = (element) => element?.getRootNode?.() || window?.document;
var inputTags = ["INPUT", "SELECT", "TEXTAREA"];
function isInputDOMNode(event) {
  const target = event.composedPath?.()?.[0] || event.target;
  if (target?.nodeType !== 1)
    return false;
  const isInput = inputTags.includes(target.nodeName) || target.hasAttribute("contenteditable");
  return isInput || !!target.closest(".nokey");
}
var isMouseEvent = (event) => "clientX" in event;
var getEventPosition = (event, bounds) => {
  const isMouse = isMouseEvent(event);
  const evtX = isMouse ? event.clientX : event.touches?.[0].clientX;
  const evtY = isMouse ? event.clientY : event.touches?.[0].clientY;
  return {
    x: evtX - (bounds?.left ?? 0),
    y: evtY - (bounds?.top ?? 0)
  };
};
var getHandleBounds = (type, nodeElement, nodeBounds, zoom, nodeId) => {
  const handles2 = nodeElement.querySelectorAll(`.${type}`);
  if (!handles2 || !handles2.length) {
    return null;
  }
  return Array.from(handles2).map((handle) => {
    const handleBounds = handle.getBoundingClientRect();
    return {
      id: handle.getAttribute("data-handleid"),
      type,
      nodeId,
      position: handle.getAttribute("data-handlepos"),
      x: (handleBounds.left - nodeBounds.left) / zoom,
      y: (handleBounds.top - nodeBounds.top) / zoom,
      ...getDimensions(handle)
    };
  });
};
function getBezierEdgeCenter({ sourceX, sourceY, targetX, targetY, sourceControlX, sourceControlY, targetControlX, targetControlY }) {
  const centerX = sourceX * 0.125 + sourceControlX * 0.375 + targetControlX * 0.375 + targetX * 0.125;
  const centerY = sourceY * 0.125 + sourceControlY * 0.375 + targetControlY * 0.375 + targetY * 0.125;
  const offsetX = Math.abs(centerX - sourceX);
  const offsetY = Math.abs(centerY - sourceY);
  return [centerX, centerY, offsetX, offsetY];
}
function calculateControlOffset(distance2, curvature) {
  if (distance2 >= 0) {
    return 0.5 * distance2;
  }
  return curvature * 25 * Math.sqrt(-distance2);
}
function getControlWithCurvature({ pos, x1, y1, x2, y2, c }) {
  switch (pos) {
    case Position.Left:
      return [x1 - calculateControlOffset(x1 - x2, c), y1];
    case Position.Right:
      return [x1 + calculateControlOffset(x2 - x1, c), y1];
    case Position.Top:
      return [x1, y1 - calculateControlOffset(y1 - y2, c)];
    case Position.Bottom:
      return [x1, y1 + calculateControlOffset(y2 - y1, c)];
  }
}
function getBezierPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top, curvature = 0.25 }) {
  const [sourceControlX, sourceControlY] = getControlWithCurvature({
    pos: sourcePosition,
    x1: sourceX,
    y1: sourceY,
    x2: targetX,
    y2: targetY,
    c: curvature
  });
  const [targetControlX, targetControlY] = getControlWithCurvature({
    pos: targetPosition,
    x1: targetX,
    y1: targetY,
    x2: sourceX,
    y2: sourceY,
    c: curvature
  });
  const [labelX, labelY, offsetX, offsetY] = getBezierEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceControlX,
    sourceControlY,
    targetControlX,
    targetControlY
  });
  return [
    `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
    labelX,
    labelY,
    offsetX,
    offsetY
  ];
}
function getEdgeCenter({ sourceX, sourceY, targetX, targetY }) {
  const xOffset = Math.abs(targetX - sourceX) / 2;
  const centerX = targetX < sourceX ? targetX + xOffset : targetX - xOffset;
  const yOffset = Math.abs(targetY - sourceY) / 2;
  const centerY = targetY < sourceY ? targetY + yOffset : targetY - yOffset;
  return [centerX, centerY, xOffset, yOffset];
}
function getElevatedEdgeZIndex({ sourceNode, targetNode, selected: selected3 = false, zIndex = 0, elevateOnSelect = false, zIndexMode = "basic" }) {
  if (zIndexMode === "manual") {
    return zIndex;
  }
  const edgeZ = elevateOnSelect && selected3 ? zIndex + 1e3 : zIndex;
  const nodeZ = Math.max(sourceNode.parentId || elevateOnSelect && sourceNode.selected ? sourceNode.internals.z : 0, targetNode.parentId || elevateOnSelect && targetNode.selected ? targetNode.internals.z : 0);
  return edgeZ + nodeZ;
}
function isEdgeVisible({ sourceNode, targetNode, width, height, transform: transform2 }) {
  const edgeBox = getBoundsOfBoxes(nodeToBox(sourceNode), nodeToBox(targetNode));
  if (edgeBox.x === edgeBox.x2) {
    edgeBox.x2 += 1;
  }
  if (edgeBox.y === edgeBox.y2) {
    edgeBox.y2 += 1;
  }
  const viewRect = {
    x: -transform2[0] / transform2[2],
    y: -transform2[1] / transform2[2],
    width: width / transform2[2],
    height: height / transform2[2]
  };
  return getOverlappingArea(viewRect, boxToRect(edgeBox)) > 0;
}
var getEdgeId = ({ source, sourceHandle, target, targetHandle }) => `xy-edge__${source}${sourceHandle || ""}-${target}${targetHandle || ""}`;
var connectionExists = (edge, edges) => {
  return edges.some((el) => el.source === edge.source && el.target === edge.target && (el.sourceHandle === edge.sourceHandle || !el.sourceHandle && !edge.sourceHandle) && (el.targetHandle === edge.targetHandle || !el.targetHandle && !edge.targetHandle));
};
var addEdge = (edgeParams, edges, options = {}) => {
  if (!edgeParams.source || !edgeParams.target) {
    options.onError?.("006", errorMessages["error006"]());
    return edges;
  }
  const edgeIdGenerator = options.getEdgeId || getEdgeId;
  let edge;
  if (isEdgeBase(edgeParams)) {
    edge = { ...edgeParams };
  } else {
    edge = {
      ...edgeParams,
      id: edgeIdGenerator(edgeParams)
    };
  }
  if (connectionExists(edge, edges)) {
    return edges;
  }
  if (edge.sourceHandle === null) {
    delete edge.sourceHandle;
  }
  if (edge.targetHandle === null) {
    delete edge.targetHandle;
  }
  return edges.concat(edge);
};
function getStraightPath({ sourceX, sourceY, targetX, targetY }) {
  const [labelX, labelY, offsetX, offsetY] = getEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY
  });
  return [`M ${sourceX},${sourceY}L ${targetX},${targetY}`, labelX, labelY, offsetX, offsetY];
}
var handleDirections = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 }
};
var getDirection = ({ source, sourcePosition = Position.Bottom, target }) => {
  if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
    return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  }
  return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
};
var distance = (a, b) => Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
function getPoints({ source, sourcePosition = Position.Bottom, target, targetPosition = Position.Top, center, offset, stepPosition }) {
  const sourceDir = handleDirections[sourcePosition];
  const targetDir = handleDirections[targetPosition];
  const sourceGapped = { x: source.x + sourceDir.x * offset, y: source.y + sourceDir.y * offset };
  const targetGapped = { x: target.x + targetDir.x * offset, y: target.y + targetDir.y * offset };
  const dir = getDirection({
    source: sourceGapped,
    sourcePosition,
    target: targetGapped
  });
  const dirAccessor = dir.x !== 0 ? "x" : "y";
  const currDir = dir[dirAccessor];
  let points = [];
  let centerX, centerY;
  const sourceGapOffset = { x: 0, y: 0 };
  const targetGapOffset = { x: 0, y: 0 };
  const [, , defaultOffsetX, defaultOffsetY] = getEdgeCenter({
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y
  });
  if (sourceDir[dirAccessor] * targetDir[dirAccessor] === -1) {
    if (dirAccessor === "x") {
      centerX = center.x ?? sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition;
      centerY = center.y ?? (sourceGapped.y + targetGapped.y) / 2;
    } else {
      centerX = center.x ?? (sourceGapped.x + targetGapped.x) / 2;
      centerY = center.y ?? sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition;
    }
    const verticalSplit = [
      { x: centerX, y: sourceGapped.y },
      { x: centerX, y: targetGapped.y }
    ];
    const horizontalSplit = [
      { x: sourceGapped.x, y: centerY },
      { x: targetGapped.x, y: centerY }
    ];
    if (sourceDir[dirAccessor] === currDir) {
      points = dirAccessor === "x" ? verticalSplit : horizontalSplit;
    } else {
      points = dirAccessor === "x" ? horizontalSplit : verticalSplit;
    }
  } else {
    const sourceTarget = [{ x: sourceGapped.x, y: targetGapped.y }];
    const targetSource = [{ x: targetGapped.x, y: sourceGapped.y }];
    if (dirAccessor === "x") {
      points = sourceDir.x === currDir ? targetSource : sourceTarget;
    } else {
      points = sourceDir.y === currDir ? sourceTarget : targetSource;
    }
    if (sourcePosition === targetPosition) {
      const diff = Math.abs(source[dirAccessor] - target[dirAccessor]);
      if (diff <= offset) {
        const gapOffset = Math.min(offset - 1, offset - diff);
        if (sourceDir[dirAccessor] === currDir) {
          sourceGapOffset[dirAccessor] = (sourceGapped[dirAccessor] > source[dirAccessor] ? -1 : 1) * gapOffset;
        } else {
          targetGapOffset[dirAccessor] = (targetGapped[dirAccessor] > target[dirAccessor] ? -1 : 1) * gapOffset;
        }
      }
    }
    if (sourcePosition !== targetPosition) {
      const dirAccessorOpposite = dirAccessor === "x" ? "y" : "x";
      const isSameDir = sourceDir[dirAccessor] === targetDir[dirAccessorOpposite];
      const sourceGtTargetOppo = sourceGapped[dirAccessorOpposite] > targetGapped[dirAccessorOpposite];
      const sourceLtTargetOppo = sourceGapped[dirAccessorOpposite] < targetGapped[dirAccessorOpposite];
      const flipSourceTarget = sourceDir[dirAccessor] === 1 && (!isSameDir && sourceGtTargetOppo || isSameDir && sourceLtTargetOppo) || sourceDir[dirAccessor] !== 1 && (!isSameDir && sourceLtTargetOppo || isSameDir && sourceGtTargetOppo);
      if (flipSourceTarget) {
        points = dirAccessor === "x" ? sourceTarget : targetSource;
      }
    }
    const sourceGapPoint = { x: sourceGapped.x + sourceGapOffset.x, y: sourceGapped.y + sourceGapOffset.y };
    const targetGapPoint = { x: targetGapped.x + targetGapOffset.x, y: targetGapped.y + targetGapOffset.y };
    const maxXDistance = Math.max(Math.abs(sourceGapPoint.x - points[0].x), Math.abs(targetGapPoint.x - points[0].x));
    const maxYDistance = Math.max(Math.abs(sourceGapPoint.y - points[0].y), Math.abs(targetGapPoint.y - points[0].y));
    if (maxXDistance >= maxYDistance) {
      centerX = (sourceGapPoint.x + targetGapPoint.x) / 2;
      centerY = points[0].y;
    } else {
      centerX = points[0].x;
      centerY = (sourceGapPoint.y + targetGapPoint.y) / 2;
    }
  }
  const gappedSource = { x: sourceGapped.x + sourceGapOffset.x, y: sourceGapped.y + sourceGapOffset.y };
  const gappedTarget = { x: targetGapped.x + targetGapOffset.x, y: targetGapped.y + targetGapOffset.y };
  const pathPoints = [
    source,
    // we only want to add the gapped source/target if they are different from the first/last point to avoid duplicates which can cause issues with the bends
    ...gappedSource.x !== points[0].x || gappedSource.y !== points[0].y ? [gappedSource] : [],
    ...points,
    ...gappedTarget.x !== points[points.length - 1].x || gappedTarget.y !== points[points.length - 1].y ? [gappedTarget] : [],
    target
  ];
  return [pathPoints, centerX, centerY, defaultOffsetX, defaultOffsetY];
}
function getBend(a, b, c, size) {
  const bendSize = Math.min(distance(a, b) / 2, distance(b, c) / 2, size);
  const { x, y } = b;
  if (a.x === x && x === c.x || a.y === y && y === c.y) {
    return `L${x} ${y}`;
  }
  if (a.y === y) {
    const xDir2 = a.x < c.x ? -1 : 1;
    const yDir2 = a.y < c.y ? 1 : -1;
    return `L ${x + bendSize * xDir2},${y}Q ${x},${y} ${x},${y + bendSize * yDir2}`;
  }
  const xDir = a.x < c.x ? 1 : -1;
  const yDir = a.y < c.y ? -1 : 1;
  return `L ${x},${y + bendSize * yDir}Q ${x},${y} ${x + bendSize * xDir},${y}`;
}
function getSmoothStepPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top, borderRadius = 5, centerX, centerY, offset = 20, stepPosition = 0.5 }) {
  const [points, labelX, labelY, offsetX, offsetY] = getPoints({
    source: { x: sourceX, y: sourceY },
    sourcePosition,
    target: { x: targetX, y: targetY },
    targetPosition,
    center: { x: centerX, y: centerY },
    offset,
    stepPosition
  });
  let path = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    path += getBend(points[i - 1], points[i], points[i + 1], borderRadius);
  }
  path += `L${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return [path, labelX, labelY, offsetX, offsetY];
}
function isNodeInitialized(node) {
  return node && !!(node.internals.handleBounds || node.handles?.length) && !!(node.measured.width || node.width || node.initialWidth);
}
function getEdgePosition(params) {
  const { sourceNode, targetNode } = params;
  if (!isNodeInitialized(sourceNode) || !isNodeInitialized(targetNode)) {
    return null;
  }
  const sourceHandleBounds = sourceNode.internals.handleBounds || toHandleBounds(sourceNode.handles);
  const targetHandleBounds = targetNode.internals.handleBounds || toHandleBounds(targetNode.handles);
  const sourceHandle = getHandle$1(sourceHandleBounds?.source ?? [], params.sourceHandle);
  const targetHandle = getHandle$1(
    // when connection type is loose we can define all handles as sources and connect source -> source
    params.connectionMode === ConnectionMode.Strict ? targetHandleBounds?.target ?? [] : (targetHandleBounds?.target ?? []).concat(targetHandleBounds?.source ?? []),
    params.targetHandle
  );
  if (!sourceHandle || !targetHandle) {
    params.onError?.("008", errorMessages["error008"](!sourceHandle ? "source" : "target", {
      id: params.id,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle
    }));
    return null;
  }
  const sourcePosition = sourceHandle?.position || Position.Bottom;
  const targetPosition = targetHandle?.position || Position.Top;
  const source = getHandlePosition(sourceNode, sourceHandle, sourcePosition);
  const target = getHandlePosition(targetNode, targetHandle, targetPosition);
  return {
    sourceX: source.x,
    sourceY: source.y,
    targetX: target.x,
    targetY: target.y,
    sourcePosition,
    targetPosition
  };
}
function toHandleBounds(handles2) {
  if (!handles2) {
    return null;
  }
  const source = [];
  const target = [];
  for (const handle of handles2) {
    handle.width = handle.width ?? 1;
    handle.height = handle.height ?? 1;
    if (handle.type === "source") {
      source.push(handle);
    } else if (handle.type === "target") {
      target.push(handle);
    }
  }
  return {
    source,
    target
  };
}
function getHandlePosition(node, handle, fallbackPosition = Position.Left, center = false) {
  const x = (handle?.x ?? 0) + node.internals.positionAbsolute.x;
  const y = (handle?.y ?? 0) + node.internals.positionAbsolute.y;
  const { width, height } = handle ?? getNodeDimensions(node);
  if (center) {
    return { x: x + width / 2, y: y + height / 2 };
  }
  const position = handle?.position ?? fallbackPosition;
  switch (position) {
    case Position.Top:
      return { x: x + width / 2, y };
    case Position.Right:
      return { x: x + width, y: y + height / 2 };
    case Position.Bottom:
      return { x: x + width / 2, y: y + height };
    case Position.Left:
      return { x, y: y + height / 2 };
  }
}
function getHandle$1(bounds, handleId) {
  if (!bounds) {
    return null;
  }
  return (!handleId ? bounds[0] : bounds.find((d) => d.id === handleId)) || null;
}
function getMarkerId(marker, id2) {
  if (!marker) {
    return "";
  }
  if (typeof marker === "string") {
    return marker;
  }
  const idPrefix = id2 ? `${id2}__` : "";
  return `${idPrefix}${Object.keys(marker).sort().map((key) => `${key}=${marker[key]}`).join("&")}`;
}
function createMarkerIds(edges, { id: id2, defaultColor, defaultMarkerStart, defaultMarkerEnd }) {
  const ids = /* @__PURE__ */ new Set();
  return edges.reduce((markers, edge) => {
    [edge.markerStart || defaultMarkerStart, edge.markerEnd || defaultMarkerEnd].forEach((marker) => {
      if (marker && typeof marker === "object") {
        const markerId = getMarkerId(marker, id2);
        if (!ids.has(markerId)) {
          markers.push({ id: markerId, color: marker.color || defaultColor, ...marker });
          ids.add(markerId);
        }
      }
    });
    return markers;
  }, []).sort((a, b) => a.id.localeCompare(b.id));
}
var SELECTED_NODE_Z = 1e3;
var ROOT_PARENT_Z_INCREMENT = 10;
var defaultOptions = {
  nodeOrigin: [0, 0],
  nodeExtent: infiniteExtent,
  elevateNodesOnSelect: true,
  zIndexMode: "basic",
  defaults: {}
};
var adoptUserNodesDefaultOptions = {
  ...defaultOptions,
  checkEquality: true
};
function mergeObjects(base, incoming) {
  const result = { ...base };
  for (const key in incoming) {
    if (incoming[key] !== void 0) {
      result[key] = incoming[key];
    }
  }
  return result;
}
function updateAbsolutePositions(nodeLookup, parentLookup, options) {
  const _options = mergeObjects(defaultOptions, options);
  for (const node of nodeLookup.values()) {
    if (node.parentId) {
      updateChildNode(node, nodeLookup, parentLookup, _options);
    } else {
      const positionWithOrigin = getNodePositionWithOrigin(node, _options.nodeOrigin);
      const extent = isCoordinateExtent(node.extent) ? node.extent : _options.nodeExtent;
      const clampedPosition = clampPosition(positionWithOrigin, extent, getNodeDimensions(node));
      node.internals.positionAbsolute = clampedPosition;
    }
  }
}
function parseHandles(userNode, internalNode) {
  if (!userNode.handles) {
    return !userNode.measured ? void 0 : internalNode?.internals.handleBounds;
  }
  const source = [];
  const target = [];
  for (const handle of userNode.handles) {
    const handleBounds = {
      id: handle.id,
      width: handle.width ?? 1,
      height: handle.height ?? 1,
      nodeId: userNode.id,
      x: handle.x,
      y: handle.y,
      position: handle.position,
      type: handle.type
    };
    if (handle.type === "source") {
      source.push(handleBounds);
    } else if (handle.type === "target") {
      target.push(handleBounds);
    }
  }
  return {
    source,
    target
  };
}
function isManualZIndexMode(zIndexMode) {
  return zIndexMode === "manual";
}
function adoptUserNodes(nodes, nodeLookup, parentLookup, options = {}) {
  const _options = mergeObjects(adoptUserNodesDefaultOptions, options);
  const rootParentIndex = { i: 0 };
  const tmpLookup = new Map(nodeLookup);
  const selectedNodeZ = _options?.elevateNodesOnSelect && !isManualZIndexMode(_options.zIndexMode) ? SELECTED_NODE_Z : 0;
  let nodesInitialized = nodes.length > 0;
  let hasSelectedNodes = false;
  nodeLookup.clear();
  parentLookup.clear();
  for (const userNode of nodes) {
    let internalNode = tmpLookup.get(userNode.id);
    if (_options.checkEquality && userNode === internalNode?.internals.userNode) {
      nodeLookup.set(userNode.id, internalNode);
    } else {
      const positionWithOrigin = getNodePositionWithOrigin(userNode, _options.nodeOrigin);
      const extent = isCoordinateExtent(userNode.extent) ? userNode.extent : _options.nodeExtent;
      const clampedPosition = clampPosition(positionWithOrigin, extent, getNodeDimensions(userNode));
      internalNode = {
        ..._options.defaults,
        ...userNode,
        measured: {
          width: userNode.measured?.width,
          height: userNode.measured?.height
        },
        internals: {
          positionAbsolute: clampedPosition,
          // if user re-initializes the node or removes `measured` for whatever reason, we reset the handleBounds so that the node gets re-measured
          handleBounds: parseHandles(userNode, internalNode),
          z: calculateZ(userNode, selectedNodeZ, _options.zIndexMode),
          userNode
        }
      };
      nodeLookup.set(userNode.id, internalNode);
    }
    if ((internalNode.measured === void 0 || internalNode.measured.width === void 0 || internalNode.measured.height === void 0) && !internalNode.hidden) {
      nodesInitialized = false;
    }
    if (userNode.parentId) {
      updateChildNode(internalNode, nodeLookup, parentLookup, options, rootParentIndex);
    }
    hasSelectedNodes ||= userNode.selected ?? false;
  }
  return { nodesInitialized, hasSelectedNodes };
}
function updateParentLookup(node, parentLookup) {
  if (!node.parentId) {
    return;
  }
  const childNodes = parentLookup.get(node.parentId);
  if (childNodes) {
    childNodes.set(node.id, node);
  } else {
    parentLookup.set(node.parentId, /* @__PURE__ */ new Map([[node.id, node]]));
  }
}
function updateChildNode(node, nodeLookup, parentLookup, options, rootParentIndex) {
  const { elevateNodesOnSelect, nodeOrigin, nodeExtent, zIndexMode } = mergeObjects(defaultOptions, options);
  const parentId = node.parentId;
  const parentNode = nodeLookup.get(parentId);
  if (!parentNode) {
    console.warn(`Parent node ${parentId} not found. Please make sure that parent nodes are in front of their child nodes in the nodes array.`);
    return;
  }
  updateParentLookup(node, parentLookup);
  if (rootParentIndex && !parentNode.parentId && parentNode.internals.rootParentIndex === void 0 && zIndexMode === "auto") {
    parentNode.internals.rootParentIndex = ++rootParentIndex.i;
    parentNode.internals.z = parentNode.internals.z + rootParentIndex.i * ROOT_PARENT_Z_INCREMENT;
  }
  if (rootParentIndex && parentNode.internals.rootParentIndex !== void 0) {
    rootParentIndex.i = parentNode.internals.rootParentIndex;
  }
  const selectedNodeZ = elevateNodesOnSelect && !isManualZIndexMode(zIndexMode) ? SELECTED_NODE_Z : 0;
  const { x, y, z } = calculateChildXYZ(node, parentNode, nodeOrigin, nodeExtent, selectedNodeZ, zIndexMode);
  const { positionAbsolute } = node.internals;
  const positionChanged = x !== positionAbsolute.x || y !== positionAbsolute.y;
  if (positionChanged || z !== node.internals.z) {
    nodeLookup.set(node.id, {
      ...node,
      internals: {
        ...node.internals,
        positionAbsolute: positionChanged ? { x, y } : positionAbsolute,
        z
      }
    });
  }
}
function calculateZ(node, selectedNodeZ, zIndexMode) {
  const zIndex = isNumeric(node.zIndex) ? node.zIndex : 0;
  if (isManualZIndexMode(zIndexMode)) {
    return zIndex;
  }
  return zIndex + (node.selected ? selectedNodeZ : 0);
}
function calculateChildXYZ(childNode, parentNode, nodeOrigin, nodeExtent, selectedNodeZ, zIndexMode) {
  const { x: parentX, y: parentY } = parentNode.internals.positionAbsolute;
  const childDimensions = getNodeDimensions(childNode);
  const positionWithOrigin = getNodePositionWithOrigin(childNode, nodeOrigin);
  const clampedPosition = isCoordinateExtent(childNode.extent) ? clampPosition(positionWithOrigin, childNode.extent, childDimensions) : positionWithOrigin;
  let absolutePosition = clampPosition({ x: parentX + clampedPosition.x, y: parentY + clampedPosition.y }, nodeExtent, childDimensions);
  if (childNode.extent === "parent") {
    absolutePosition = clampPositionToParent(absolutePosition, childDimensions, parentNode);
  }
  const childZ = calculateZ(childNode, selectedNodeZ, zIndexMode);
  const parentZ = parentNode.internals.z ?? 0;
  return {
    x: absolutePosition.x,
    y: absolutePosition.y,
    z: parentZ >= childZ ? parentZ + 1 : childZ
  };
}
function handleExpandParent(children2, nodeLookup, parentLookup, nodeOrigin = [0, 0]) {
  const changes = [];
  const parentExpansions = /* @__PURE__ */ new Map();
  for (const child of children2) {
    const parent = nodeLookup.get(child.parentId);
    if (!parent) {
      continue;
    }
    const parentRect = parentExpansions.get(child.parentId)?.expandedRect ?? nodeToRect(parent);
    const expandedRect = getBoundsOfRects(parentRect, child.rect);
    parentExpansions.set(child.parentId, { expandedRect, parent });
  }
  if (parentExpansions.size > 0) {
    parentExpansions.forEach(({ expandedRect, parent }, parentId) => {
      const positionAbsolute = parent.internals.positionAbsolute;
      const dimensions = getNodeDimensions(parent);
      const origin = parent.origin ?? nodeOrigin;
      const xChange = expandedRect.x < positionAbsolute.x ? Math.round(Math.abs(positionAbsolute.x - expandedRect.x)) : 0;
      const yChange = expandedRect.y < positionAbsolute.y ? Math.round(Math.abs(positionAbsolute.y - expandedRect.y)) : 0;
      const newWidth = Math.max(dimensions.width, Math.round(expandedRect.width));
      const newHeight = Math.max(dimensions.height, Math.round(expandedRect.height));
      const widthChange = (newWidth - dimensions.width) * origin[0];
      const heightChange = (newHeight - dimensions.height) * origin[1];
      if (xChange > 0 || yChange > 0 || widthChange || heightChange) {
        changes.push({
          id: parentId,
          type: "position",
          position: {
            x: parent.position.x - xChange + widthChange,
            y: parent.position.y - yChange + heightChange
          }
        });
        parentLookup.get(parentId)?.forEach((childNode) => {
          if (!children2.some((child) => child.id === childNode.id)) {
            changes.push({
              id: childNode.id,
              type: "position",
              position: {
                x: childNode.position.x + xChange,
                y: childNode.position.y + yChange
              }
            });
          }
        });
      }
      if (dimensions.width < expandedRect.width || dimensions.height < expandedRect.height || xChange || yChange) {
        changes.push({
          id: parentId,
          type: "dimensions",
          setAttributes: true,
          dimensions: {
            width: newWidth + (xChange ? origin[0] * xChange - widthChange : 0),
            height: newHeight + (yChange ? origin[1] * yChange - heightChange : 0)
          }
        });
      }
    });
  }
  return changes;
}
function updateNodeInternals(updates, nodeLookup, parentLookup, domNode, nodeOrigin, nodeExtent, zIndexMode) {
  const viewportNode = domNode?.querySelector(".xyflow__viewport");
  let updatedInternals = false;
  if (!viewportNode) {
    return { changes: [], updatedInternals };
  }
  const changes = [];
  const style2 = window.getComputedStyle(viewportNode);
  const { m22: zoom } = new window.DOMMatrixReadOnly(style2.transform);
  const parentExpandChildren = [];
  for (const update of updates.values()) {
    const node = nodeLookup.get(update.id);
    if (!node) {
      continue;
    }
    if (node.hidden) {
      nodeLookup.set(node.id, {
        ...node,
        internals: {
          ...node.internals,
          handleBounds: void 0
        }
      });
      updatedInternals = true;
      continue;
    }
    const dimensions = getDimensions(update.nodeElement);
    const dimensionChanged = node.measured.width !== dimensions.width || node.measured.height !== dimensions.height;
    const doUpdate = !!(dimensions.width && dimensions.height && (dimensionChanged || !node.internals.handleBounds || update.force));
    if (doUpdate) {
      const nodeBounds = update.nodeElement.getBoundingClientRect();
      const extent = isCoordinateExtent(node.extent) ? node.extent : nodeExtent;
      let { positionAbsolute } = node.internals;
      if (node.parentId && node.extent === "parent") {
        const parentNode = nodeLookup.get(node.parentId);
        if (parentNode) {
          positionAbsolute = clampPositionToParent(positionAbsolute, dimensions, parentNode);
        }
      } else if (extent) {
        positionAbsolute = clampPosition(positionAbsolute, extent, dimensions);
      }
      const newNode = {
        ...node,
        measured: dimensions,
        internals: {
          ...node.internals,
          positionAbsolute,
          handleBounds: {
            source: getHandleBounds("source", update.nodeElement, nodeBounds, zoom, node.id),
            target: getHandleBounds("target", update.nodeElement, nodeBounds, zoom, node.id)
          }
        }
      };
      nodeLookup.set(node.id, newNode);
      if (node.parentId) {
        updateChildNode(newNode, nodeLookup, parentLookup, { nodeOrigin, zIndexMode });
      }
      updatedInternals = true;
      if (dimensionChanged) {
        changes.push({
          id: node.id,
          type: "dimensions",
          dimensions
        });
        if (node.expandParent && node.parentId) {
          parentExpandChildren.push({
            id: node.id,
            parentId: node.parentId,
            rect: nodeToRect(newNode, nodeOrigin)
          });
        }
      }
    }
  }
  if (parentExpandChildren.length > 0) {
    const parentExpandChanges = handleExpandParent(parentExpandChildren, nodeLookup, parentLookup, nodeOrigin);
    changes.push(...parentExpandChanges);
  }
  return { changes, updatedInternals };
}
async function panBy({ delta, panZoom, transform: transform2, translateExtent, width, height }) {
  if (!panZoom || !delta.x && !delta.y) {
    return false;
  }
  const nextViewport = await panZoom.setViewportConstrained({
    x: transform2[0] + delta.x,
    y: transform2[1] + delta.y,
    zoom: transform2[2]
  }, [
    [0, 0],
    [width, height]
  ], translateExtent);
  const transformChanged = !!nextViewport && (nextViewport.x !== transform2[0] || nextViewport.y !== transform2[1] || nextViewport.k !== transform2[2]);
  return transformChanged;
}
function addConnectionToLookup(type, connection, connectionKey, connectionLookup, nodeId, handleId) {
  let key = nodeId;
  const nodeMap = connectionLookup.get(key) || /* @__PURE__ */ new Map();
  connectionLookup.set(key, nodeMap.set(connectionKey, connection));
  key = `${nodeId}-${type}`;
  const typeMap = connectionLookup.get(key) || /* @__PURE__ */ new Map();
  connectionLookup.set(key, typeMap.set(connectionKey, connection));
  if (handleId) {
    key = `${nodeId}-${type}-${handleId}`;
    const handleMap = connectionLookup.get(key) || /* @__PURE__ */ new Map();
    connectionLookup.set(key, handleMap.set(connectionKey, connection));
  }
}
function updateConnectionLookup(connectionLookup, edgeLookup, edges) {
  connectionLookup.clear();
  edgeLookup.clear();
  for (const edge of edges) {
    const { source: sourceNode, target: targetNode, sourceHandle = null, targetHandle = null } = edge;
    const connection = { edgeId: edge.id, source: sourceNode, target: targetNode, sourceHandle, targetHandle };
    const sourceKey = `${sourceNode}-${sourceHandle}--${targetNode}-${targetHandle}`;
    const targetKey = `${targetNode}-${targetHandle}--${sourceNode}-${sourceHandle}`;
    addConnectionToLookup("source", connection, targetKey, connectionLookup, sourceNode, sourceHandle);
    addConnectionToLookup("target", connection, sourceKey, connectionLookup, targetNode, targetHandle);
    edgeLookup.set(edge.id, edge);
  }
}
function isParentSelected(node, nodeLookup) {
  if (!node.parentId) {
    return false;
  }
  const parentNode = nodeLookup.get(node.parentId);
  if (!parentNode) {
    return false;
  }
  if (parentNode.selected) {
    return true;
  }
  return isParentSelected(parentNode, nodeLookup);
}
function hasSelector(target, selector, domNode) {
  let current = target;
  do {
    if (current?.matches?.(selector))
      return true;
    if (current === domNode)
      return false;
    current = current?.parentElement;
  } while (current);
  return false;
}
function getDragItems(nodeLookup, nodesDraggable, mousePos, nodeId) {
  const dragItems = /* @__PURE__ */ new Map();
  for (const [id2, node] of nodeLookup) {
    if ((node.selected || node.id === nodeId) && (!node.parentId || !isParentSelected(node, nodeLookup)) && (node.draggable || nodesDraggable && typeof node.draggable === "undefined")) {
      const internalNode = nodeLookup.get(id2);
      if (internalNode) {
        dragItems.set(id2, {
          id: id2,
          position: internalNode.position || { x: 0, y: 0 },
          distance: {
            x: mousePos.x - internalNode.internals.positionAbsolute.x,
            y: mousePos.y - internalNode.internals.positionAbsolute.y
          },
          extent: internalNode.extent,
          parentId: internalNode.parentId,
          origin: internalNode.origin,
          expandParent: internalNode.expandParent,
          internals: {
            positionAbsolute: internalNode.internals.positionAbsolute || { x: 0, y: 0 }
          },
          measured: {
            width: internalNode.measured.width ?? 0,
            height: internalNode.measured.height ?? 0
          }
        });
      }
    }
  }
  return dragItems;
}
function getEventHandlerParams({ nodeId, dragItems, nodeLookup, dragging = true }) {
  const nodesFromDragItems = [];
  for (const [id2, dragItem] of dragItems) {
    const node2 = nodeLookup.get(id2)?.internals.userNode;
    if (node2) {
      nodesFromDragItems.push({
        ...node2,
        position: dragItem.position,
        dragging
      });
    }
  }
  if (!nodeId) {
    return [nodesFromDragItems[0], nodesFromDragItems];
  }
  const node = nodeLookup.get(nodeId)?.internals.userNode;
  return [
    !node ? nodesFromDragItems[0] : {
      ...node,
      position: dragItems.get(nodeId)?.position || node.position,
      dragging
    },
    nodesFromDragItems
  ];
}
function calculateSnapOffset({ dragItems, snapGrid, x, y }) {
  const refDragItem = dragItems.values().next().value;
  if (!refDragItem) {
    return null;
  }
  const refPos = {
    x: x - refDragItem.distance.x,
    y: y - refDragItem.distance.y
  };
  const refPosSnapped = snapPosition(refPos, snapGrid);
  return {
    x: refPosSnapped.x - refPos.x,
    y: refPosSnapped.y - refPos.y
  };
}
function XYDrag({ onNodeMouseDown, getStoreItems, onDragStart, onDrag, onDragStop }) {
  let lastPos = { x: null, y: null };
  let autoPanId = 0;
  let dragItems = /* @__PURE__ */ new Map();
  let autoPanStarted = false;
  let mousePosition = { x: 0, y: 0 };
  let containerBounds = null;
  let dragStarted = false;
  let d3Selection = null;
  let abortDrag = false;
  let nodePositionsChanged = false;
  let dragEvent = null;
  function update({ noDragClassName, handleSelector, domNode, isSelectable, nodeId, nodeClickDistance = 0 }) {
    d3Selection = select_default2(domNode);
    function updateNodes({ x, y }) {
      const { nodeLookup, nodeExtent, snapGrid, snapToGrid, nodeOrigin, onNodeDrag, onSelectionDrag, onError, updateNodePositions } = getStoreItems();
      lastPos = { x, y };
      let hasChange = false;
      const isMultiDrag = dragItems.size > 1;
      const nodesBox = isMultiDrag && nodeExtent ? rectToBox(getInternalNodesBounds(dragItems)) : null;
      const multiDragSnapOffset = isMultiDrag && snapToGrid ? calculateSnapOffset({
        dragItems,
        snapGrid,
        x,
        y
      }) : null;
      for (const [id2, dragItem] of dragItems) {
        if (!nodeLookup.has(id2)) {
          continue;
        }
        let nextPosition = { x: x - dragItem.distance.x, y: y - dragItem.distance.y };
        if (snapToGrid) {
          nextPosition = multiDragSnapOffset ? {
            x: Math.round(nextPosition.x + multiDragSnapOffset.x),
            y: Math.round(nextPosition.y + multiDragSnapOffset.y)
          } : snapPosition(nextPosition, snapGrid);
        }
        let adjustedNodeExtent = null;
        if (isMultiDrag && nodeExtent && !dragItem.extent && nodesBox) {
          const { positionAbsolute: positionAbsolute2 } = dragItem.internals;
          const x1 = positionAbsolute2.x - nodesBox.x + nodeExtent[0][0];
          const x2 = positionAbsolute2.x + dragItem.measured.width - nodesBox.x2 + nodeExtent[1][0];
          const y1 = positionAbsolute2.y - nodesBox.y + nodeExtent[0][1];
          const y2 = positionAbsolute2.y + dragItem.measured.height - nodesBox.y2 + nodeExtent[1][1];
          adjustedNodeExtent = [
            [x1, y1],
            [x2, y2]
          ];
        }
        const { position, positionAbsolute } = calculateNodePosition({
          nodeId: id2,
          nextPosition,
          nodeLookup,
          nodeExtent: adjustedNodeExtent ? adjustedNodeExtent : nodeExtent,
          nodeOrigin,
          onError
        });
        hasChange = hasChange || dragItem.position.x !== position.x || dragItem.position.y !== position.y;
        dragItem.position = position;
        dragItem.internals.positionAbsolute = positionAbsolute;
      }
      nodePositionsChanged = nodePositionsChanged || hasChange;
      if (!hasChange) {
        return;
      }
      updateNodePositions(dragItems, true);
      if (dragEvent && (onDrag || onNodeDrag || !nodeId && onSelectionDrag)) {
        const [currentNode, currentNodes] = getEventHandlerParams({
          nodeId,
          dragItems,
          nodeLookup
        });
        onDrag?.(dragEvent, dragItems, currentNode, currentNodes);
        onNodeDrag?.(dragEvent, currentNode, currentNodes);
        if (!nodeId) {
          onSelectionDrag?.(dragEvent, currentNodes);
        }
      }
    }
    async function autoPan() {
      if (!containerBounds) {
        return;
      }
      const { transform: transform2, panBy: panBy2, autoPanSpeed, autoPanOnNodeDrag } = getStoreItems();
      if (!autoPanOnNodeDrag) {
        autoPanStarted = false;
        cancelAnimationFrame(autoPanId);
        return;
      }
      const [xMovement, yMovement] = calcAutoPan(mousePosition, containerBounds, autoPanSpeed);
      if (xMovement !== 0 || yMovement !== 0) {
        lastPos.x = (lastPos.x ?? 0) - xMovement / transform2[2];
        lastPos.y = (lastPos.y ?? 0) - yMovement / transform2[2];
        if (await panBy2({ x: xMovement, y: yMovement })) {
          updateNodes(lastPos);
        }
      }
      autoPanId = requestAnimationFrame(autoPan);
    }
    function startDrag(event) {
      const { nodeLookup, multiSelectionActive, nodesDraggable, transform: transform2, snapGrid, snapToGrid, selectNodesOnDrag, onNodeDragStart, onSelectionDragStart, unselectNodesAndEdges } = getStoreItems();
      dragStarted = true;
      if ((!selectNodesOnDrag || !isSelectable) && !multiSelectionActive && nodeId) {
        if (!nodeLookup.get(nodeId)?.selected) {
          unselectNodesAndEdges();
        }
      }
      if (isSelectable && selectNodesOnDrag && nodeId) {
        onNodeMouseDown?.(nodeId);
      }
      const pointerPos = getPointerPosition(event.sourceEvent, { transform: transform2, snapGrid, snapToGrid, containerBounds });
      lastPos = pointerPos;
      dragItems = getDragItems(nodeLookup, nodesDraggable, pointerPos, nodeId);
      if (dragItems.size > 0 && (onDragStart || onNodeDragStart || !nodeId && onSelectionDragStart)) {
        const [currentNode, currentNodes] = getEventHandlerParams({
          nodeId,
          dragItems,
          nodeLookup
        });
        onDragStart?.(event.sourceEvent, dragItems, currentNode, currentNodes);
        onNodeDragStart?.(event.sourceEvent, currentNode, currentNodes);
        if (!nodeId) {
          onSelectionDragStart?.(event.sourceEvent, currentNodes);
        }
      }
    }
    const d3DragInstance = drag_default().clickDistance(nodeClickDistance).on("start", (event) => {
      const { domNode: domNode2, nodeDragThreshold, transform: transform2, snapGrid, snapToGrid } = getStoreItems();
      containerBounds = domNode2?.getBoundingClientRect() || null;
      abortDrag = false;
      nodePositionsChanged = false;
      dragEvent = event.sourceEvent;
      if (nodeDragThreshold === 0) {
        startDrag(event);
      }
      const pointerPos = getPointerPosition(event.sourceEvent, { transform: transform2, snapGrid, snapToGrid, containerBounds });
      lastPos = pointerPos;
      mousePosition = getEventPosition(event.sourceEvent, containerBounds);
    }).on("drag", (event) => {
      const { autoPanOnNodeDrag, transform: transform2, snapGrid, snapToGrid, nodeDragThreshold, nodeLookup } = getStoreItems();
      const pointerPos = getPointerPosition(event.sourceEvent, { transform: transform2, snapGrid, snapToGrid, containerBounds });
      dragEvent = event.sourceEvent;
      if (event.sourceEvent.type === "touchmove" && event.sourceEvent.touches.length > 1 || // if user deletes a node while dragging, we need to abort the drag to prevent errors
      nodeId && !nodeLookup.has(nodeId)) {
        abortDrag = true;
      }
      if (abortDrag) {
        return;
      }
      if (!autoPanStarted && autoPanOnNodeDrag && dragStarted) {
        autoPanStarted = true;
        autoPan();
      }
      if (!dragStarted) {
        const currentMousePosition = getEventPosition(event.sourceEvent, containerBounds);
        const x = currentMousePosition.x - mousePosition.x;
        const y = currentMousePosition.y - mousePosition.y;
        const distance2 = Math.sqrt(x * x + y * y);
        if (distance2 > nodeDragThreshold) {
          startDrag(event);
        }
      }
      if ((lastPos.x !== pointerPos.xSnapped || lastPos.y !== pointerPos.ySnapped) && dragItems && dragStarted) {
        mousePosition = getEventPosition(event.sourceEvent, containerBounds);
        updateNodes(pointerPos);
      }
    }).on("end", (event) => {
      if (!dragStarted || abortDrag) {
        if (abortDrag && dragItems.size > 0) {
          getStoreItems().updateNodePositions(dragItems, false);
        }
        return;
      }
      autoPanStarted = false;
      dragStarted = false;
      cancelAnimationFrame(autoPanId);
      if (dragItems.size > 0) {
        const { nodeLookup, updateNodePositions, onNodeDragStop, onSelectionDragStop } = getStoreItems();
        if (nodePositionsChanged) {
          updateNodePositions(dragItems, false);
          nodePositionsChanged = false;
        }
        if (onDragStop || onNodeDragStop || !nodeId && onSelectionDragStop) {
          const [currentNode, currentNodes] = getEventHandlerParams({
            nodeId,
            dragItems,
            nodeLookup,
            dragging: false
          });
          onDragStop?.(event.sourceEvent, dragItems, currentNode, currentNodes);
          onNodeDragStop?.(event.sourceEvent, currentNode, currentNodes);
          if (!nodeId) {
            onSelectionDragStop?.(event.sourceEvent, currentNodes);
          }
        }
      }
    }).filter((event) => {
      const target = event.target;
      const isDraggable = !event.button && (!noDragClassName || !hasSelector(target, `.${noDragClassName}`, domNode)) && (!handleSelector || hasSelector(target, handleSelector, domNode));
      return isDraggable;
    });
    d3Selection.call(d3DragInstance);
  }
  function destroy() {
    d3Selection?.on(".drag", null);
  }
  return {
    update,
    destroy
  };
}
function getNodesWithinDistance(position, nodeLookup, distance2) {
  const nodes = [];
  const rect = {
    x: position.x - distance2,
    y: position.y - distance2,
    width: distance2 * 2,
    height: distance2 * 2
  };
  for (const node of nodeLookup.values()) {
    if (getOverlappingArea(rect, nodeToRect(node)) > 0) {
      nodes.push(node);
    }
  }
  return nodes;
}
var ADDITIONAL_DISTANCE = 250;
function getClosestHandle(position, connectionRadius, nodeLookup, fromHandle) {
  let closestHandles = [];
  let minDistance = Infinity;
  const closeNodes = getNodesWithinDistance(position, nodeLookup, connectionRadius + ADDITIONAL_DISTANCE);
  for (const node of closeNodes) {
    const allHandles = [...node.internals.handleBounds?.source ?? [], ...node.internals.handleBounds?.target ?? []];
    for (const handle of allHandles) {
      if (fromHandle.nodeId === handle.nodeId && fromHandle.type === handle.type && fromHandle.id === handle.id) {
        continue;
      }
      const { x, y } = getHandlePosition(node, handle, handle.position, true);
      const distance2 = Math.sqrt(Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2));
      if (distance2 > connectionRadius) {
        continue;
      }
      if (distance2 < minDistance) {
        closestHandles = [{ ...handle, x, y }];
        minDistance = distance2;
      } else if (distance2 === minDistance) {
        closestHandles.push({ ...handle, x, y });
      }
    }
  }
  if (!closestHandles.length) {
    return null;
  }
  if (closestHandles.length > 1) {
    const oppositeHandleType = fromHandle.type === "source" ? "target" : "source";
    return closestHandles.find((handle) => handle.type === oppositeHandleType) ?? closestHandles[0];
  }
  return closestHandles[0];
}
function getHandle(nodeId, handleType, handleId, nodeLookup, connectionMode, withAbsolutePosition = false) {
  const node = nodeLookup.get(nodeId);
  if (!node) {
    return null;
  }
  const handles2 = connectionMode === "strict" ? node.internals.handleBounds?.[handleType] : [...node.internals.handleBounds?.source ?? [], ...node.internals.handleBounds?.target ?? []];
  const handle = (handleId ? handles2?.find((h7) => h7.id === handleId) : handles2?.[0]) ?? null;
  return handle && withAbsolutePosition ? { ...handle, ...getHandlePosition(node, handle, handle.position, true) } : handle;
}
function getHandleType(edgeUpdaterType, handleDomNode) {
  if (edgeUpdaterType) {
    return edgeUpdaterType;
  } else if (handleDomNode?.classList.contains("target")) {
    return "target";
  } else if (handleDomNode?.classList.contains("source")) {
    return "source";
  }
  return null;
}
function isConnectionValid(isInsideConnectionRadius, isHandleValid) {
  let isValid = null;
  if (isHandleValid) {
    isValid = true;
  } else if (isInsideConnectionRadius && !isHandleValid) {
    isValid = false;
  }
  return isValid;
}
var alwaysValid = () => true;
function onPointerDown(event, { connectionMode, connectionRadius, handleId, nodeId, edgeUpdaterType, isTarget, domNode, nodeLookup, lib, autoPanOnConnect, flowId, panBy: panBy2, cancelConnection, onConnectStart, onConnect, onConnectEnd, isValidConnection = alwaysValid, onReconnectEnd, updateConnection, getTransform, getFromHandle, autoPanSpeed, dragThreshold = 1, handleDomNode }) {
  const doc = getHostForElement(event.target);
  let autoPanId = 0;
  let closestHandle;
  const { x, y } = getEventPosition(event);
  const handleType = getHandleType(edgeUpdaterType, handleDomNode);
  const containerBounds = domNode?.getBoundingClientRect();
  let connectionStarted = false;
  if (!containerBounds || !handleType) {
    return;
  }
  const fromHandleInternal = getHandle(nodeId, handleType, handleId, nodeLookup, connectionMode);
  if (!fromHandleInternal) {
    return;
  }
  let position = getEventPosition(event, containerBounds);
  let autoPanStarted = false;
  let connection = null;
  let isValid = false;
  let resultHandleDomNode = null;
  function autoPan() {
    if (!autoPanOnConnect || !containerBounds) {
      return;
    }
    const [x2, y2] = calcAutoPan(position, containerBounds, autoPanSpeed);
    panBy2({ x: x2, y: y2 });
    autoPanId = requestAnimationFrame(autoPan);
  }
  const fromHandle = {
    ...fromHandleInternal,
    nodeId,
    type: handleType,
    position: fromHandleInternal.position
  };
  const fromInternalNode = nodeLookup.get(nodeId);
  const from = getHandlePosition(fromInternalNode, fromHandle, Position.Left, true);
  let previousConnection = {
    inProgress: true,
    isValid: null,
    from,
    fromHandle,
    fromPosition: fromHandle.position,
    fromNode: fromInternalNode,
    to: position,
    toHandle: null,
    toPosition: oppositePosition[fromHandle.position],
    toNode: null,
    pointer: position
  };
  function startConnection() {
    connectionStarted = true;
    updateConnection(previousConnection);
    onConnectStart?.(event, { nodeId, handleId, handleType });
  }
  if (dragThreshold === 0) {
    startConnection();
  }
  function onPointerMove(event2) {
    if (!connectionStarted) {
      const { x: evtX, y: evtY } = getEventPosition(event2);
      const dx = evtX - x;
      const dy = evtY - y;
      const nextConnectionStarted = dx * dx + dy * dy > dragThreshold * dragThreshold;
      if (!nextConnectionStarted) {
        return;
      }
      startConnection();
    }
    if (!getFromHandle() || !fromHandle) {
      onPointerUp(event2);
      return;
    }
    const transform2 = getTransform();
    position = getEventPosition(event2, containerBounds);
    closestHandle = getClosestHandle(pointToRendererPoint(position, transform2, false, [1, 1]), connectionRadius, nodeLookup, fromHandle);
    if (!autoPanStarted) {
      autoPan();
      autoPanStarted = true;
    }
    const result = isValidHandle(event2, {
      handle: closestHandle,
      connectionMode,
      fromNodeId: nodeId,
      fromHandleId: handleId,
      fromType: isTarget ? "target" : "source",
      isValidConnection,
      doc,
      lib,
      flowId,
      nodeLookup
    });
    resultHandleDomNode = result.handleDomNode;
    connection = result.connection;
    isValid = isConnectionValid(!!closestHandle, result.isValid);
    const fromInternalNode2 = nodeLookup.get(nodeId);
    const from2 = fromInternalNode2 ? getHandlePosition(fromInternalNode2, fromHandle, Position.Left, true) : previousConnection.from;
    const newConnection = {
      ...previousConnection,
      from: from2,
      isValid,
      to: result.toHandle && isValid ? rendererPointToPoint({ x: result.toHandle.x, y: result.toHandle.y }, transform2) : position,
      toHandle: result.toHandle,
      toPosition: isValid && result.toHandle ? result.toHandle.position : oppositePosition[fromHandle.position],
      toNode: result.toHandle ? nodeLookup.get(result.toHandle.nodeId) : null,
      pointer: position
    };
    updateConnection(newConnection);
    previousConnection = newConnection;
  }
  function onPointerUp(event2) {
    if ("touches" in event2 && event2.touches.length > 0) {
      return;
    }
    if (connectionStarted) {
      if ((closestHandle || resultHandleDomNode) && connection && isValid) {
        onConnect?.(connection);
      }
      const { inProgress, ...connectionState } = previousConnection;
      const finalConnectionState = {
        ...connectionState,
        toPosition: previousConnection.toHandle ? previousConnection.toPosition : null
      };
      onConnectEnd?.(event2, finalConnectionState);
      if (edgeUpdaterType) {
        onReconnectEnd?.(event2, finalConnectionState);
      }
    }
    cancelConnection();
    cancelAnimationFrame(autoPanId);
    autoPanStarted = false;
    isValid = false;
    connection = null;
    resultHandleDomNode = null;
    doc.removeEventListener("mousemove", onPointerMove);
    doc.removeEventListener("mouseup", onPointerUp);
    doc.removeEventListener("touchmove", onPointerMove);
    doc.removeEventListener("touchend", onPointerUp);
  }
  doc.addEventListener("mousemove", onPointerMove);
  doc.addEventListener("mouseup", onPointerUp);
  doc.addEventListener("touchmove", onPointerMove);
  doc.addEventListener("touchend", onPointerUp);
}
function isValidHandle(event, { handle, connectionMode, fromNodeId, fromHandleId, fromType, doc, lib, flowId, isValidConnection = alwaysValid, nodeLookup }) {
  const isTarget = fromType === "target";
  const handleDomNode = handle ? doc.querySelector(`.${lib}-flow__handle[data-id="${flowId}-${handle?.nodeId}-${handle?.id}-${handle?.type}"]`) : null;
  const { x, y } = getEventPosition(event);
  const handleBelow = doc.elementFromPoint(x, y);
  const handleToCheck = handleBelow?.classList.contains(`${lib}-flow__handle`) ? handleBelow : handleDomNode;
  const result = {
    handleDomNode: handleToCheck,
    isValid: false,
    connection: null,
    toHandle: null
  };
  if (handleToCheck) {
    const handleType = getHandleType(void 0, handleToCheck);
    const handleNodeId = handleToCheck.getAttribute("data-nodeid");
    const handleId = handleToCheck.getAttribute("data-handleid");
    const connectable = handleToCheck.classList.contains("connectable");
    const connectableEnd = handleToCheck.classList.contains("connectableend");
    if (!handleNodeId || !handleType) {
      return result;
    }
    const connection = {
      source: isTarget ? handleNodeId : fromNodeId,
      sourceHandle: isTarget ? handleId : fromHandleId,
      target: isTarget ? fromNodeId : handleNodeId,
      targetHandle: isTarget ? fromHandleId : handleId
    };
    result.connection = connection;
    const isConnectable = connectable && connectableEnd;
    const isValid = isConnectable && (connectionMode === ConnectionMode.Strict ? isTarget && handleType === "source" || !isTarget && handleType === "target" : handleNodeId !== fromNodeId || handleId !== fromHandleId);
    result.isValid = isValid && isValidConnection(connection);
    result.toHandle = getHandle(handleNodeId, handleType, handleId, nodeLookup, connectionMode, true);
  }
  return result;
}
var XYHandle = {
  onPointerDown,
  isValid: isValidHandle
};
function XYMinimap({ domNode, panZoom, getTransform, getViewScale }) {
  const selection2 = select_default2(domNode);
  function update({ translateExtent, width, height, zoomStep = 1, pannable = true, zoomable = true, inversePan = false }) {
    const zoomHandler = (event) => {
      if (event.sourceEvent.type !== "wheel" || !panZoom) {
        return;
      }
      const transform2 = getTransform();
      const factor = event.sourceEvent.ctrlKey && isMacOs() ? 10 : 1;
      const pinchDelta = -event.sourceEvent.deltaY * (event.sourceEvent.deltaMode === 1 ? 0.05 : event.sourceEvent.deltaMode ? 1 : 2e-3) * zoomStep;
      const nextZoom = transform2[2] * Math.pow(2, pinchDelta * factor);
      panZoom.scaleTo(nextZoom);
    };
    let panStart = [0, 0];
    const panStartHandler = (event) => {
      if (event.sourceEvent.type === "mousedown" || event.sourceEvent.type === "touchstart") {
        panStart = [
          event.sourceEvent.clientX ?? event.sourceEvent.touches[0].clientX,
          event.sourceEvent.clientY ?? event.sourceEvent.touches[0].clientY
        ];
      }
    };
    const panHandler = (event) => {
      const transform2 = getTransform();
      if (event.sourceEvent.type !== "mousemove" && event.sourceEvent.type !== "touchmove" || !panZoom) {
        return;
      }
      const panCurrent = [
        event.sourceEvent.clientX ?? event.sourceEvent.touches[0].clientX,
        event.sourceEvent.clientY ?? event.sourceEvent.touches[0].clientY
      ];
      const panDelta = [panCurrent[0] - panStart[0], panCurrent[1] - panStart[1]];
      panStart = panCurrent;
      const moveScale = getViewScale() * Math.max(transform2[2], Math.log(transform2[2])) * (inversePan ? -1 : 1);
      const position = {
        x: transform2[0] - panDelta[0] * moveScale,
        y: transform2[1] - panDelta[1] * moveScale
      };
      const extent = [
        [0, 0],
        [width, height]
      ];
      panZoom.setViewportConstrained({
        x: position.x,
        y: position.y,
        zoom: transform2[2]
      }, extent, translateExtent);
    };
    const zoomAndPanHandler = zoom_default2().on("start", panStartHandler).on("zoom", pannable ? panHandler : null).on("zoom.wheel", zoomable ? zoomHandler : null);
    selection2.call(zoomAndPanHandler, {});
  }
  function destroy() {
    selection2.on("zoom", null);
  }
  return {
    update,
    destroy,
    pointer: pointer_default
  };
}
var transformToViewport = (transform2) => ({
  x: transform2.x,
  y: transform2.y,
  zoom: transform2.k
});
var viewportToTransform = ({ x, y, zoom }) => identity2.translate(x, y).scale(zoom);
var isWrappedWithClass = (event, className) => event.target.closest(`.${className}`);
var isRightClickPan = (panOnDrag, usedButton) => usedButton === 2 && Array.isArray(panOnDrag) && panOnDrag.includes(2);
var defaultEase = (t) => ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
var getD3Transition = (selection2, duration = 0, ease = defaultEase, onEnd = () => {
}) => {
  const hasDuration = typeof duration === "number" && duration > 0;
  if (!hasDuration) {
    onEnd();
  }
  return hasDuration ? selection2.transition().duration(duration).ease(ease).on("end", onEnd) : selection2;
};
var wheelDelta = (event) => {
  const factor = event.ctrlKey && isMacOs() ? 10 : 1;
  return -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 2e-3) * factor;
};
function createPanOnScrollHandler({ zoomPanValues, noWheelClassName, d3Selection, d3Zoom, panOnScrollMode, panOnScrollSpeed, zoomOnPinch, onPanZoomStart, onPanZoom, onPanZoomEnd }) {
  return (event) => {
    if (isWrappedWithClass(event, noWheelClassName)) {
      if (event.ctrlKey) {
        event.preventDefault();
      }
      return false;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    const currentZoom = d3Selection.property("__zoom").k || 1;
    if (event.ctrlKey && zoomOnPinch) {
      const point = pointer_default(event);
      const pinchDelta = wheelDelta(event);
      const zoom = currentZoom * Math.pow(2, pinchDelta);
      d3Zoom.scaleTo(d3Selection, zoom, point, event);
      return;
    }
    const deltaNormalize = event.deltaMode === 1 ? 20 : 1;
    let deltaX = panOnScrollMode === PanOnScrollMode.Vertical ? 0 : event.deltaX * deltaNormalize;
    let deltaY = panOnScrollMode === PanOnScrollMode.Horizontal ? 0 : event.deltaY * deltaNormalize;
    if (!isMacOs() && event.shiftKey && panOnScrollMode !== PanOnScrollMode.Vertical) {
      deltaX = event.deltaY * deltaNormalize;
      deltaY = 0;
    }
    d3Zoom.translateBy(
      d3Selection,
      -(deltaX / currentZoom) * panOnScrollSpeed,
      -(deltaY / currentZoom) * panOnScrollSpeed,
      // @ts-ignore
      { internal: true }
    );
    const nextViewport = transformToViewport(d3Selection.property("__zoom"));
    clearTimeout(zoomPanValues.panScrollTimeout);
    if (!zoomPanValues.isPanScrolling) {
      zoomPanValues.isPanScrolling = true;
      onPanZoomStart?.(event, nextViewport);
    } else {
      onPanZoom?.(event, nextViewport);
    }
    zoomPanValues.panScrollTimeout = setTimeout(() => {
      onPanZoomEnd?.(event, nextViewport);
      zoomPanValues.isPanScrolling = false;
    }, 150);
  };
}
function createZoomOnScrollHandler({ noWheelClassName, preventScrolling, d3ZoomHandler }) {
  return function(event, d) {
    const isWheel = event.type === "wheel";
    const preventZoom = !preventScrolling && isWheel && !event.ctrlKey;
    const hasNoWheelClass = isWrappedWithClass(event, noWheelClassName);
    if (event.ctrlKey && isWheel && hasNoWheelClass) {
      event.preventDefault();
    }
    if (preventZoom || hasNoWheelClass) {
      return null;
    }
    event.preventDefault();
    d3ZoomHandler.call(this, event, d);
  };
}
function createPanZoomStartHandler({ zoomPanValues, onDraggingChange, onPanZoomStart }) {
  return (event) => {
    if (event.sourceEvent?.internal) {
      return;
    }
    const viewport = transformToViewport(event.transform);
    zoomPanValues.mouseButton = event.sourceEvent?.button || 0;
    zoomPanValues.isZoomingOrPanning = true;
    zoomPanValues.prevViewport = viewport;
    if (event.sourceEvent?.type === "mousedown") {
      onDraggingChange(true);
    }
    if (onPanZoomStart) {
      onPanZoomStart?.(event.sourceEvent, viewport);
    }
  };
}
function createPanZoomHandler({ zoomPanValues, panOnDrag, onPaneContextMenu, onTransformChange, onPanZoom }) {
  return (event) => {
    zoomPanValues.usedRightMouseButton = !!(onPaneContextMenu && isRightClickPan(panOnDrag, zoomPanValues.mouseButton ?? 0));
    if (!event.sourceEvent?.sync) {
      onTransformChange([event.transform.x, event.transform.y, event.transform.k]);
    }
    if (onPanZoom && !event.sourceEvent?.internal) {
      onPanZoom?.(event.sourceEvent, transformToViewport(event.transform));
    }
  };
}
function createPanZoomEndHandler({ zoomPanValues, panOnDrag, panOnScroll, onDraggingChange, onPanZoomEnd, onPaneContextMenu }) {
  return (event) => {
    if (event.sourceEvent?.internal) {
      return;
    }
    zoomPanValues.isZoomingOrPanning = false;
    if (onPaneContextMenu && isRightClickPan(panOnDrag, zoomPanValues.mouseButton ?? 0) && !zoomPanValues.usedRightMouseButton && event.sourceEvent) {
      onPaneContextMenu(event.sourceEvent);
    }
    zoomPanValues.usedRightMouseButton = false;
    onDraggingChange(false);
    if (onPanZoomEnd) {
      const viewport = transformToViewport(event.transform);
      zoomPanValues.prevViewport = viewport;
      clearTimeout(zoomPanValues.timerId);
      zoomPanValues.timerId = setTimeout(
        () => {
          onPanZoomEnd?.(event.sourceEvent, viewport);
        },
        // we need a setTimeout for panOnScroll to suppress multiple end events fired during scroll
        panOnScroll ? 150 : 0
      );
    }
  };
}
function createFilter({ panActivationKeyPressed, zoomActivationKeyPressed, zoomOnScroll, zoomOnPinch, panOnDrag, panOnScroll, zoomOnDoubleClick, userSelectionActive, noWheelClassName, noPanClassName, lib, connectionInProgress }) {
  return (event) => {
    const zoomScroll = zoomActivationKeyPressed || zoomOnScroll;
    const pinchZoom = zoomOnPinch && event.ctrlKey;
    const isWheelEvent = event.type === "wheel";
    if (event.button === 1 && event.type === "mousedown" && (isWrappedWithClass(event, `${lib}-flow__node`) || isWrappedWithClass(event, `${lib}-flow__edge`) || isWrappedWithClass(event, `${lib}-flow__selection`) || isWrappedWithClass(event, `${lib}-flow__nodesselection`))) {
      return true;
    }
    if (!panOnDrag && !zoomScroll && !panOnScroll && !zoomOnDoubleClick && !zoomOnPinch) {
      return false;
    }
    if (userSelectionActive) {
      return false;
    }
    if (connectionInProgress && !isWheelEvent) {
      return false;
    }
    if (isWrappedWithClass(event, noWheelClassName) && isWheelEvent) {
      return false;
    }
    if (isWrappedWithClass(event, noPanClassName) && (!isWheelEvent || panOnScroll && isWheelEvent && !zoomActivationKeyPressed)) {
      return false;
    }
    if (!zoomOnPinch && event.ctrlKey && isWheelEvent) {
      return false;
    }
    if (!zoomOnPinch && event.type === "touchstart" && event.touches?.length > 1) {
      event.preventDefault();
      return false;
    }
    if (!zoomScroll && !panOnScroll && !pinchZoom && isWheelEvent) {
      return false;
    }
    if (!panOnDrag && (event.type === "mousedown" || event.type === "touchstart")) {
      return false;
    }
    if (Array.isArray(panOnDrag) && !panOnDrag.includes(event.button) && event.type === "mousedown") {
      return false;
    }
    const buttonAllowed = Array.isArray(panOnDrag) && panOnDrag.includes(event.button) || !event.button || event.button <= 1;
    return (!event.ctrlKey || isWheelEvent || panActivationKeyPressed) && buttonAllowed;
  };
}
function XYPanZoom({ domNode, minZoom, maxZoom, translateExtent, viewport, onPanZoom, onPanZoomStart, onPanZoomEnd, onDraggingChange }) {
  const zoomPanValues = {
    isZoomingOrPanning: false,
    usedRightMouseButton: false,
    prevViewport: {},
    mouseButton: 0,
    timerId: void 0,
    panScrollTimeout: void 0,
    isPanScrolling: false
  };
  const bbox = domNode.getBoundingClientRect();
  let cachedExtent = [
    [0, 0],
    [bbox.width, bbox.height]
  ];
  const extentResizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      cachedExtent = [
        [0, 0],
        [entry.contentRect.width, entry.contentRect.height]
      ];
    }
  }) : null;
  extentResizeObserver?.observe(domNode);
  const d3ZoomInstance = zoom_default2().extent(() => cachedExtent).scaleExtent([minZoom, maxZoom]).translateExtent(translateExtent);
  const d3Selection = select_default2(domNode).call(d3ZoomInstance);
  setViewportConstrained({
    x: viewport.x,
    y: viewport.y,
    zoom: clamp(viewport.zoom, minZoom, maxZoom)
  }, [
    [0, 0],
    [bbox.width, bbox.height]
  ], translateExtent);
  const d3ZoomHandler = d3Selection.on("wheel.zoom");
  const d3DblClickZoomHandler = d3Selection.on("dblclick.zoom");
  d3ZoomInstance.wheelDelta(wheelDelta);
  async function setTransform(transform2, options) {
    if (d3Selection) {
      return new Promise((resolve) => {
        d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value_default : zoom_default).transform(getD3Transition(d3Selection, options?.duration, options?.ease, () => resolve(true)), transform2);
      });
    }
    return false;
  }
  function update({ noWheelClassName, noPanClassName, onPaneContextMenu, userSelectionActive, panOnScroll, panOnDrag, panOnScrollMode, panOnScrollSpeed, preventScrolling, zoomOnPinch, zoomOnScroll, zoomOnDoubleClick, panActivationKeyPressed = false, zoomActivationKeyPressed, lib, onTransformChange, connectionInProgress, paneClickDistance, selectionOnDrag }) {
    if (userSelectionActive && !zoomPanValues.isZoomingOrPanning) {
      destroy();
    }
    const isPanOnScroll = panOnScroll && !zoomActivationKeyPressed && !userSelectionActive;
    d3ZoomInstance.clickDistance(selectionOnDrag ? Infinity : !isNumeric(paneClickDistance) || paneClickDistance < 0 ? 0 : paneClickDistance);
    const wheelHandler = isPanOnScroll ? createPanOnScrollHandler({
      zoomPanValues,
      noWheelClassName,
      d3Selection,
      d3Zoom: d3ZoomInstance,
      panOnScrollMode,
      panOnScrollSpeed,
      zoomOnPinch,
      onPanZoomStart,
      onPanZoom,
      onPanZoomEnd
    }) : createZoomOnScrollHandler({
      noWheelClassName,
      preventScrolling,
      d3ZoomHandler
    });
    d3Selection.on("wheel.zoom", wheelHandler, { passive: false });
    const startHandler = createPanZoomStartHandler({
      zoomPanValues,
      onDraggingChange,
      onPanZoomStart
    });
    d3ZoomInstance.on("start", startHandler);
    const panZoomHandler = createPanZoomHandler({
      zoomPanValues,
      panOnDrag,
      onPaneContextMenu: !!onPaneContextMenu,
      onPanZoom,
      onTransformChange
    });
    d3ZoomInstance.on("zoom", panZoomHandler);
    const panZoomEndHandler = createPanZoomEndHandler({
      zoomPanValues,
      panOnDrag,
      panOnScroll,
      onPaneContextMenu,
      onPanZoomEnd,
      onDraggingChange
    });
    d3ZoomInstance.on("end", panZoomEndHandler);
    const filter2 = createFilter({
      panActivationKeyPressed,
      zoomActivationKeyPressed,
      panOnDrag,
      zoomOnScroll,
      panOnScroll,
      zoomOnDoubleClick,
      zoomOnPinch,
      userSelectionActive,
      noPanClassName,
      noWheelClassName,
      lib,
      connectionInProgress
    });
    d3ZoomInstance.filter(filter2);
    if (zoomOnDoubleClick) {
      d3Selection.on("dblclick.zoom", d3DblClickZoomHandler);
    } else {
      d3Selection.on("dblclick.zoom", null);
    }
  }
  function destroy() {
    d3ZoomInstance.on("zoom", null);
  }
  async function setViewportConstrained(viewport2, extent, translateExtent2) {
    const nextTransform = viewportToTransform(viewport2);
    const contrainedTransform = d3ZoomInstance?.constrain()(nextTransform, extent, translateExtent2);
    if (contrainedTransform) {
      await setTransform(contrainedTransform);
    }
    return contrainedTransform;
  }
  async function setViewport(viewport2, options) {
    const nextTransform = viewportToTransform(viewport2);
    await setTransform(nextTransform, options);
    return nextTransform;
  }
  function syncViewport(viewport2) {
    if (d3Selection) {
      const nextTransform = viewportToTransform(viewport2);
      const currentTransform = d3Selection.property("__zoom");
      if (currentTransform.k !== viewport2.zoom || currentTransform.x !== viewport2.x || currentTransform.y !== viewport2.y) {
        d3ZoomInstance?.transform(d3Selection, nextTransform, null, { sync: true });
      }
    }
  }
  function getViewport() {
    const transform2 = d3Selection ? transform(d3Selection.node()) : { x: 0, y: 0, k: 1 };
    return { x: transform2.x, y: transform2.y, zoom: transform2.k };
  }
  async function scaleTo(zoom, options) {
    if (d3Selection) {
      return new Promise((resolve) => {
        d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value_default : zoom_default).scaleTo(getD3Transition(d3Selection, options?.duration, options?.ease, () => resolve(true)), zoom);
      });
    }
    return false;
  }
  async function scaleBy(factor, options) {
    if (d3Selection) {
      return new Promise((resolve) => {
        d3ZoomInstance?.interpolate(options?.interpolate === "linear" ? value_default : zoom_default).scaleBy(getD3Transition(d3Selection, options?.duration, options?.ease, () => resolve(true)), factor);
      });
    }
    return false;
  }
  function setScaleExtent(scaleExtent) {
    d3ZoomInstance?.scaleExtent(scaleExtent);
  }
  function setTranslateExtent(translateExtent2) {
    d3ZoomInstance?.translateExtent(translateExtent2);
  }
  function setClickDistance(distance2) {
    const validDistance = !isNumeric(distance2) || distance2 < 0 ? 0 : distance2;
    d3ZoomInstance?.clickDistance(validDistance);
  }
  return {
    update,
    destroy,
    setViewport,
    setViewportConstrained,
    getViewport,
    scaleTo,
    scaleBy,
    setScaleExtent,
    setTranslateExtent,
    syncViewport,
    setClickDistance
  };
}
var ResizeControlVariant;
(function(ResizeControlVariant2) {
  ResizeControlVariant2["Line"] = "line";
  ResizeControlVariant2["Handle"] = "handle";
})(ResizeControlVariant || (ResizeControlVariant = {}));
function getResizeDirection({ width, prevWidth, height, prevHeight, affectsX, affectsY }) {
  const deltaWidth = width - prevWidth;
  const deltaHeight = height - prevHeight;
  const direction = [deltaWidth > 0 ? 1 : deltaWidth < 0 ? -1 : 0, deltaHeight > 0 ? 1 : deltaHeight < 0 ? -1 : 0];
  if (deltaWidth && affectsX) {
    direction[0] = direction[0] * -1;
  }
  if (deltaHeight && affectsY) {
    direction[1] = direction[1] * -1;
  }
  return direction;
}
function getControlDirection(controlPosition) {
  const isHorizontal = controlPosition.includes("right") || controlPosition.includes("left");
  const isVertical = controlPosition.includes("bottom") || controlPosition.includes("top");
  const affectsX = controlPosition.includes("left");
  const affectsY = controlPosition.includes("top");
  return {
    isHorizontal,
    isVertical,
    affectsX,
    affectsY
  };
}
function getLowerExtentClamp(lowerExtent, lowerBound) {
  return Math.max(0, lowerBound - lowerExtent);
}
function getUpperExtentClamp(upperExtent, upperBound) {
  return Math.max(0, upperExtent - upperBound);
}
function getSizeClamp(size, minSize, maxSize) {
  return Math.max(0, minSize - size, size - maxSize);
}
function xor(a, b) {
  return a ? !b : b;
}
function getDimensionsAfterResize(startValues, controlDirection, pointerPosition, boundaries, keepAspectRatio, nodeOrigin, extent, childExtent) {
  let { affectsX, affectsY } = controlDirection;
  const { isHorizontal, isVertical } = controlDirection;
  const isDiagonal = isHorizontal && isVertical;
  const { xSnapped, ySnapped } = pointerPosition;
  const { minWidth, maxWidth, minHeight, maxHeight } = boundaries;
  const { x: startX, y: startY, width: startWidth, height: startHeight, aspectRatio } = startValues;
  let distX = Math.floor(isHorizontal ? xSnapped - startValues.pointerX : 0);
  let distY = Math.floor(isVertical ? ySnapped - startValues.pointerY : 0);
  const newWidth = startWidth + (affectsX ? -distX : distX);
  const newHeight = startHeight + (affectsY ? -distY : distY);
  const originOffsetX = -nodeOrigin[0] * startWidth;
  const originOffsetY = -nodeOrigin[1] * startHeight;
  let clampX = getSizeClamp(newWidth, minWidth, maxWidth);
  let clampY = getSizeClamp(newHeight, minHeight, maxHeight);
  if (extent) {
    let xExtentClamp = 0;
    let yExtentClamp = 0;
    if (affectsX && distX < 0) {
      xExtentClamp = getLowerExtentClamp(startX + distX + originOffsetX, extent[0][0]);
    } else if (!affectsX && distX > 0) {
      xExtentClamp = getUpperExtentClamp(startX + newWidth + originOffsetX, extent[1][0]);
    }
    if (affectsY && distY < 0) {
      yExtentClamp = getLowerExtentClamp(startY + distY + originOffsetY, extent[0][1]);
    } else if (!affectsY && distY > 0) {
      yExtentClamp = getUpperExtentClamp(startY + newHeight + originOffsetY, extent[1][1]);
    }
    clampX = Math.max(clampX, xExtentClamp);
    clampY = Math.max(clampY, yExtentClamp);
  }
  if (childExtent) {
    let xExtentClamp = 0;
    let yExtentClamp = 0;
    if (affectsX && distX > 0) {
      xExtentClamp = getUpperExtentClamp(startX + distX, childExtent[0][0]);
    } else if (!affectsX && distX < 0) {
      xExtentClamp = getLowerExtentClamp(startX + newWidth, childExtent[1][0]);
    }
    if (affectsY && distY > 0) {
      yExtentClamp = getUpperExtentClamp(startY + distY, childExtent[0][1]);
    } else if (!affectsY && distY < 0) {
      yExtentClamp = getLowerExtentClamp(startY + newHeight, childExtent[1][1]);
    }
    clampX = Math.max(clampX, xExtentClamp);
    clampY = Math.max(clampY, yExtentClamp);
  }
  if (keepAspectRatio) {
    if (isHorizontal) {
      const aspectHeightClamp = getSizeClamp(newWidth / aspectRatio, minHeight, maxHeight) * aspectRatio;
      clampX = Math.max(clampX, aspectHeightClamp);
      if (extent) {
        let aspectExtentClamp = 0;
        if (!affectsX && !affectsY || affectsX && !affectsY && isDiagonal) {
          aspectExtentClamp = getUpperExtentClamp(startY + originOffsetY + newWidth / aspectRatio, extent[1][1]) * aspectRatio;
        } else {
          aspectExtentClamp = getLowerExtentClamp(startY + originOffsetY + (affectsX ? distX : -distX) / aspectRatio, extent[0][1]) * aspectRatio;
        }
        clampX = Math.max(clampX, aspectExtentClamp);
      }
      if (childExtent) {
        let aspectExtentClamp = 0;
        if (!affectsX && !affectsY || affectsX && !affectsY && isDiagonal) {
          aspectExtentClamp = getLowerExtentClamp(startY + newWidth / aspectRatio, childExtent[1][1]) * aspectRatio;
        } else {
          aspectExtentClamp = getUpperExtentClamp(startY + (affectsX ? distX : -distX) / aspectRatio, childExtent[0][1]) * aspectRatio;
        }
        clampX = Math.max(clampX, aspectExtentClamp);
      }
    }
    if (isVertical) {
      const aspectWidthClamp = getSizeClamp(newHeight * aspectRatio, minWidth, maxWidth) / aspectRatio;
      clampY = Math.max(clampY, aspectWidthClamp);
      if (extent) {
        let aspectExtentClamp = 0;
        if (!affectsX && !affectsY || affectsY && !affectsX && isDiagonal) {
          aspectExtentClamp = getUpperExtentClamp(startX + newHeight * aspectRatio + originOffsetX, extent[1][0]) / aspectRatio;
        } else {
          aspectExtentClamp = getLowerExtentClamp(startX + (affectsY ? distY : -distY) * aspectRatio + originOffsetX, extent[0][0]) / aspectRatio;
        }
        clampY = Math.max(clampY, aspectExtentClamp);
      }
      if (childExtent) {
        let aspectExtentClamp = 0;
        if (!affectsX && !affectsY || affectsY && !affectsX && isDiagonal) {
          aspectExtentClamp = getLowerExtentClamp(startX + newHeight * aspectRatio, childExtent[1][0]) / aspectRatio;
        } else {
          aspectExtentClamp = getUpperExtentClamp(startX + (affectsY ? distY : -distY) * aspectRatio, childExtent[0][0]) / aspectRatio;
        }
        clampY = Math.max(clampY, aspectExtentClamp);
      }
    }
  }
  distY = distY + (distY < 0 ? clampY : -clampY);
  distX = distX + (distX < 0 ? clampX : -clampX);
  if (keepAspectRatio) {
    if (isDiagonal) {
      if (newWidth > newHeight * aspectRatio) {
        distY = (xor(affectsX, affectsY) ? -distX : distX) / aspectRatio;
      } else {
        distX = (xor(affectsX, affectsY) ? -distY : distY) * aspectRatio;
      }
    } else {
      if (isHorizontal) {
        distY = distX / aspectRatio;
        affectsY = affectsX;
      } else {
        distX = distY * aspectRatio;
        affectsX = affectsY;
      }
    }
  }
  const x = affectsX ? startX + distX : startX;
  const y = affectsY ? startY + distY : startY;
  return {
    width: startWidth + (affectsX ? -distX : distX),
    height: startHeight + (affectsY ? -distY : distY),
    x: nodeOrigin[0] * distX * (!affectsX ? 1 : -1) + x,
    y: nodeOrigin[1] * distY * (!affectsY ? 1 : -1) + y
  };
}
var initPrevValues = { width: 0, height: 0, x: 0, y: 0 };
var initStartValues = {
  ...initPrevValues,
  pointerX: 0,
  pointerY: 0,
  aspectRatio: 1
};
function nodeToChildExtent(child, parent, nodeOrigin) {
  const x = parent.position.x + child.position.x;
  const y = parent.position.y + child.position.y;
  const width = child.measured.width ?? 0;
  const height = child.measured.height ?? 0;
  const originOffsetX = nodeOrigin[0] * width;
  const originOffsetY = nodeOrigin[1] * height;
  return [
    [x - originOffsetX, y - originOffsetY],
    [x + width - originOffsetX, y + height - originOffsetY]
  ];
}
function XYResizer({ domNode, nodeId, getStoreItems, onChange, onEnd }) {
  const selection2 = select_default2(domNode);
  let params = {
    controlDirection: getControlDirection("bottom-right"),
    boundaries: {
      minWidth: 0,
      minHeight: 0,
      maxWidth: Number.MAX_VALUE,
      maxHeight: Number.MAX_VALUE
    },
    resizeDirection: void 0,
    keepAspectRatio: false
  };
  function update({ controlPosition, boundaries, keepAspectRatio, resizeDirection, onResizeStart, onResize, onResizeEnd, shouldResize }) {
    let prevValues = { ...initPrevValues };
    let startValues = { ...initStartValues };
    params = {
      boundaries,
      resizeDirection,
      keepAspectRatio,
      controlDirection: getControlDirection(controlPosition)
    };
    let node = void 0;
    let containerBounds = null;
    let childNodes = [];
    let parentNode = void 0;
    let nodeExtent = void 0;
    let childExtent = void 0;
    let resizeDetected = false;
    const dragHandler = drag_default().on("start", (event) => {
      const { nodeLookup, transform: transform2, snapGrid, snapToGrid, nodeOrigin, paneDomNode } = getStoreItems();
      node = nodeLookup.get(nodeId);
      if (!node) {
        return;
      }
      containerBounds = paneDomNode?.getBoundingClientRect() ?? null;
      const { xSnapped, ySnapped } = getPointerPosition(event.sourceEvent, {
        transform: transform2,
        snapGrid,
        snapToGrid,
        containerBounds
      });
      prevValues = {
        width: node.measured.width ?? 0,
        height: node.measured.height ?? 0,
        x: node.position.x ?? 0,
        y: node.position.y ?? 0
      };
      startValues = {
        ...prevValues,
        pointerX: xSnapped,
        pointerY: ySnapped,
        aspectRatio: prevValues.width / prevValues.height
      };
      parentNode = void 0;
      nodeExtent = isCoordinateExtent(node.extent) ? node.extent : void 0;
      if (node.parentId && (node.extent === "parent" || node.expandParent)) {
        parentNode = nodeLookup.get(node.parentId);
      }
      if (parentNode && node.extent === "parent") {
        nodeExtent = [
          [0, 0],
          [parentNode.measured.width, parentNode.measured.height]
        ];
      }
      childNodes = [];
      childExtent = void 0;
      for (const [childId, child] of nodeLookup) {
        if (child.parentId === nodeId) {
          childNodes.push({
            id: childId,
            position: { ...child.position },
            extent: child.extent
          });
          if (child.extent === "parent" || child.expandParent) {
            const extent = nodeToChildExtent(child, node, child.origin ?? nodeOrigin);
            if (childExtent) {
              childExtent = [
                [Math.min(extent[0][0], childExtent[0][0]), Math.min(extent[0][1], childExtent[0][1])],
                [Math.max(extent[1][0], childExtent[1][0]), Math.max(extent[1][1], childExtent[1][1])]
              ];
            } else {
              childExtent = extent;
            }
          }
        }
      }
      onResizeStart?.(event, { ...prevValues });
    }).on("drag", (event) => {
      const { transform: transform2, snapGrid, snapToGrid, nodeOrigin: storeNodeOrigin } = getStoreItems();
      const pointerPosition = getPointerPosition(event.sourceEvent, {
        transform: transform2,
        snapGrid,
        snapToGrid,
        containerBounds
      });
      const childChanges = [];
      if (!node) {
        return;
      }
      const { x: prevX, y: prevY, width: prevWidth, height: prevHeight } = prevValues;
      const change = {};
      const nodeOrigin = node.origin ?? storeNodeOrigin;
      const { width, height, x, y } = getDimensionsAfterResize(startValues, params.controlDirection, pointerPosition, params.boundaries, params.keepAspectRatio, nodeOrigin, nodeExtent, childExtent);
      const isWidthChange = width !== prevWidth;
      const isHeightChange = height !== prevHeight;
      const isXPosChange = x !== prevX && isWidthChange;
      const isYPosChange = y !== prevY && isHeightChange;
      if (!isXPosChange && !isYPosChange && !isWidthChange && !isHeightChange) {
        return;
      }
      if (isXPosChange || isYPosChange || nodeOrigin[0] === 1 || nodeOrigin[1] === 1) {
        change.x = isXPosChange ? x : prevValues.x;
        change.y = isYPosChange ? y : prevValues.y;
        prevValues.x = change.x;
        prevValues.y = change.y;
        if (childNodes.length > 0) {
          const xChange = x - prevX;
          const yChange = y - prevY;
          for (const childNode of childNodes) {
            childNode.position = {
              x: childNode.position.x - xChange + nodeOrigin[0] * (width - prevWidth),
              y: childNode.position.y - yChange + nodeOrigin[1] * (height - prevHeight)
            };
            childChanges.push(childNode);
          }
        }
      }
      if (isWidthChange || isHeightChange) {
        change.width = isWidthChange && (!params.resizeDirection || params.resizeDirection === "horizontal") ? width : prevValues.width;
        change.height = isHeightChange && (!params.resizeDirection || params.resizeDirection === "vertical") ? height : prevValues.height;
        prevValues.width = change.width;
        prevValues.height = change.height;
      }
      if (parentNode && node.expandParent) {
        const xLimit = nodeOrigin[0] * (change.width ?? 0);
        if (change.x && change.x < xLimit) {
          prevValues.x = xLimit;
          startValues.x = startValues.x - (change.x - xLimit);
        }
        const yLimit = nodeOrigin[1] * (change.height ?? 0);
        if (change.y && change.y < yLimit) {
          prevValues.y = yLimit;
          startValues.y = startValues.y - (change.y - yLimit);
        }
      }
      const direction = getResizeDirection({
        width: prevValues.width,
        prevWidth,
        height: prevValues.height,
        prevHeight,
        affectsX: params.controlDirection.affectsX,
        affectsY: params.controlDirection.affectsY
      });
      const nextValues = { ...prevValues, direction };
      const callResize = shouldResize?.(event, nextValues);
      if (callResize === false) {
        return;
      }
      resizeDetected = true;
      onResize?.(event, nextValues);
      onChange(change, childChanges);
    }).on("end", (event) => {
      if (!resizeDetected) {
        return;
      }
      onResizeEnd?.(event, { ...prevValues });
      onEnd?.({ ...prevValues });
      resizeDetected = false;
    });
    selection2.call(dragHandler);
  }
  function destroy() {
    selection2.on(".drag", null);
  }
  return {
    update,
    destroy
  };
}

// ../../node_modules/.pnpm/zustand@4.5.7_react@19.2.8/node_modules/zustand/esm/traditional.mjs
var import_react3 = __toESM(require("react"), 1);
var import_with_selector = __toESM(require_with_selector(), 1);

// ../../node_modules/.pnpm/zustand@4.5.7_react@19.2.8/node_modules/zustand/esm/vanilla.mjs
var import_meta = {};
var createStoreImpl = (createState) => {
  let state;
  const listeners2 = /* @__PURE__ */ new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === "function" ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = (replace != null ? replace : typeof nextState !== "object" || nextState === null) ? nextState : Object.assign({}, state, nextState);
      listeners2.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const getInitialState2 = () => initialState;
  const subscribe = (listener) => {
    listeners2.add(listener);
    return () => listeners2.delete(listener);
  };
  const destroy = () => {
    if ((import_meta.env ? import_meta.env.MODE : void 0) !== "production") {
      console.warn(
        "[DEPRECATED] The `destroy` method will be unsupported in a future version. Instead use unsubscribe function returned by subscribe. Everything will be garbage-collected if store is garbage-collected."
      );
    }
    listeners2.clear();
  };
  const api = { setState, getState, getInitialState: getInitialState2, subscribe, destroy };
  const initialState = state = createState(setState, getState, api);
  return api;
};
var createStore = (createState) => createState ? createStoreImpl(createState) : createStoreImpl;

// ../../node_modules/.pnpm/zustand@4.5.7_react@19.2.8/node_modules/zustand/esm/traditional.mjs
var { useDebugValue } = import_react3.default;
var { useSyncExternalStoreWithSelector } = import_with_selector.default;
var identity3 = (arg) => arg;
function useStoreWithEqualityFn(api, selector = identity3, equalityFn) {
  const slice = useSyncExternalStoreWithSelector(
    api.subscribe,
    api.getState,
    api.getServerState || api.getInitialState,
    selector,
    equalityFn
  );
  useDebugValue(slice);
  return slice;
}
var createWithEqualityFnImpl = (createState, defaultEqualityFn) => {
  const api = createStore(createState);
  const useBoundStoreWithEqualityFn = (selector, equalityFn = defaultEqualityFn) => useStoreWithEqualityFn(api, selector, equalityFn);
  Object.assign(useBoundStoreWithEqualityFn, api);
  return useBoundStoreWithEqualityFn;
};
var createWithEqualityFn = (createState, defaultEqualityFn) => createState ? createWithEqualityFnImpl(createState, defaultEqualityFn) : createWithEqualityFnImpl;

// ../../node_modules/.pnpm/zustand@4.5.7_react@19.2.8/node_modules/zustand/esm/shallow.mjs
function shallow$1(objA, objB) {
  if (Object.is(objA, objB)) {
    return true;
  }
  if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
    return false;
  }
  if (objA instanceof Map && objB instanceof Map) {
    if (objA.size !== objB.size) return false;
    for (const [key, value] of objA) {
      if (!Object.is(value, objB.get(key))) {
        return false;
      }
    }
    return true;
  }
  if (objA instanceof Set && objB instanceof Set) {
    if (objA.size !== objB.size) return false;
    for (const value of objA) {
      if (!objB.has(value)) {
        return false;
      }
    }
    return true;
  }
  const keysA = Object.keys(objA);
  if (keysA.length !== Object.keys(objB).length) {
    return false;
  }
  for (const keyA of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, keyA) || !Object.is(objA[keyA], objB[keyA])) {
      return false;
    }
  }
  return true;
}

// ../../node_modules/.pnpm/@xyflow+react@12.11.6_react_c2c6b2ffa45210201bfebe3ffbf25aee/node_modules/@xyflow/react/dist/esm/index.js
var import_react_dom = require("react-dom");
var StoreContext = (0, import_react4.createContext)(null);
var Provider$1 = StoreContext.Provider;
var zustandErrorMessage = errorMessages["error001"]("react");
function useStore(selector, equalityFn) {
  const store = (0, import_react4.useContext)(StoreContext);
  if (store === null) {
    throw new Error(zustandErrorMessage);
  }
  return useStoreWithEqualityFn(store, selector, equalityFn);
}
function useStoreApi() {
  const store = (0, import_react4.useContext)(StoreContext);
  if (store === null) {
    throw new Error(zustandErrorMessage);
  }
  return (0, import_react4.useMemo)(() => ({
    getState: store.getState,
    setState: store.setState,
    subscribe: store.subscribe
  }), [store]);
}
var style = { display: "none" };
var ariaLiveStyle = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  border: 0,
  padding: 0,
  overflow: "hidden",
  clip: "rect(0px, 0px, 0px, 0px)",
  clipPath: "inset(100%)"
};
var ARIA_NODE_DESC_KEY = "react-flow__node-desc";
var ARIA_EDGE_DESC_KEY = "react-flow__edge-desc";
var ARIA_LIVE_MESSAGE = "react-flow__aria-live";
var ariaLiveSelector = (s) => s.ariaLiveMessage;
var ariaLabelConfigSelector = (s) => s.ariaLabelConfig;
function AriaLiveMessage({ rfId }) {
  const ariaLiveMessage = useStore(ariaLiveSelector);
  return (0, import_jsx_runtime.jsx)("div", { id: `${ARIA_LIVE_MESSAGE}-${rfId}`, "aria-live": "assertive", "aria-atomic": "true", style: ariaLiveStyle, children: ariaLiveMessage });
}
function A11yDescriptions({ rfId, disableKeyboardA11y }) {
  const ariaLabelConfig = useStore(ariaLabelConfigSelector);
  return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)("div", { id: `${ARIA_NODE_DESC_KEY}-${rfId}`, style, children: disableKeyboardA11y ? ariaLabelConfig["node.a11yDescription.default"] : ariaLabelConfig["node.a11yDescription.keyboardDisabled"] }), (0, import_jsx_runtime.jsx)("div", { id: `${ARIA_EDGE_DESC_KEY}-${rfId}`, style, children: ariaLabelConfig["edge.a11yDescription.default"] }), !disableKeyboardA11y && (0, import_jsx_runtime.jsx)(AriaLiveMessage, { rfId })] });
}
var Panel = (0, import_react4.forwardRef)(({ position = "top-left", children: children2, className, style: style2, ...rest }, ref) => {
  const positionClasses = `${position}`.split("-");
  return (0, import_jsx_runtime.jsx)("div", { className: cc(["react-flow__panel", className, ...positionClasses]), style: style2, ref, ...rest, children: children2 });
});
Panel.displayName = "Panel";
var link = `https://reactflow.dev${false ? "?utm_source=attribution" : "/attribution"}`;
function Attribution({ proOptions, position = "bottom-right" }) {
  (0, import_react4.useEffect)(() => {
    if (false) {
      return;
    }
    handleAttributionWarning("react");
  }, []);
  if (proOptions?.hideAttribution) {
    return null;
  }
  return (0, import_jsx_runtime.jsx)(Panel, { position, className: "react-flow__attribution", "data-message": `Please only hide this attribution when you are subscribed to React Flow Pro: ${link}`, children: (0, import_jsx_runtime.jsx)("a", { href: link, target: "_blank", rel: "noopener noreferrer", "aria-label": "React Flow attribution", children: "React Flow" }) });
}
var selector$l = (s) => {
  const selectedNodes = [];
  const selectedEdges = [];
  for (const [, node] of s.nodeLookup) {
    if (node.selected) {
      selectedNodes.push(node.internals.userNode);
    }
  }
  for (const [, edge] of s.edgeLookup) {
    if (edge.selected) {
      selectedEdges.push(edge);
    }
  }
  return { selectedNodes, selectedEdges };
};
var selectId = (obj) => obj.id;
function areEqual$1(a, b) {
  return shallow$1(a.selectedNodes.map(selectId), b.selectedNodes.map(selectId)) && shallow$1(a.selectedEdges.map(selectId), b.selectedEdges.map(selectId));
}
function SelectionListenerInner({ onSelectionChange }) {
  const store = useStoreApi();
  const { selectedNodes, selectedEdges } = useStore(selector$l, areEqual$1);
  (0, import_react4.useEffect)(() => {
    const params = { nodes: selectedNodes, edges: selectedEdges };
    onSelectionChange?.(params);
    store.getState().onSelectionChangeHandlers.forEach((fn) => fn(params));
  }, [selectedNodes, selectedEdges, onSelectionChange]);
  return null;
}
var changeSelector = (s) => !!s.onSelectionChangeHandlers;
function SelectionListener({ onSelectionChange }) {
  const storeHasSelectionChangeHandlers = useStore(changeSelector);
  if (onSelectionChange || storeHasSelectionChangeHandlers) {
    return (0, import_jsx_runtime.jsx)(SelectionListenerInner, { onSelectionChange });
  }
  return null;
}
var defaultNodeOrigin = [0, 0];
var defaultViewport = { x: 0, y: 0, zoom: 1 };
var reactFlowFieldsToTrack = [
  "nodes",
  "edges",
  "defaultNodes",
  "defaultEdges",
  "onConnect",
  "onConnectStart",
  "onConnectEnd",
  "onClickConnectStart",
  "onClickConnectEnd",
  "nodesDraggable",
  "autoPanOnNodeFocus",
  "nodesConnectable",
  "nodesFocusable",
  "edgesFocusable",
  "edgesReconnectable",
  "elevateNodesOnSelect",
  "elevateEdgesOnSelect",
  "minZoom",
  "maxZoom",
  "nodeExtent",
  "onNodesChange",
  "onEdgesChange",
  "elementsSelectable",
  "connectionMode",
  "snapGrid",
  "snapToGrid",
  "translateExtent",
  "connectOnClick",
  "defaultEdgeOptions",
  "fitView",
  "fitViewOptions",
  "onNodesDelete",
  "onEdgesDelete",
  "onDelete",
  "onNodeDrag",
  "onNodeDragStart",
  "onNodeDragStop",
  "onSelectionDrag",
  "onSelectionDragStart",
  "onSelectionDragStop",
  "onMoveStart",
  "onMove",
  "onMoveEnd",
  "noPanClassName",
  "nodeOrigin",
  "autoPanOnConnect",
  "autoPanOnNodeDrag",
  "onError",
  "connectionRadius",
  "isValidConnection",
  "selectNodesOnDrag",
  "nodeDragThreshold",
  "connectionDragThreshold",
  "onBeforeDelete",
  "debug",
  "autoPanSpeed",
  "ariaLabelConfig",
  "zIndexMode"
];
var fieldsToTrack = [...reactFlowFieldsToTrack, "rfId"];
var selector$k = (s) => ({
  setNodes: s.setNodes,
  setEdges: s.setEdges,
  setMinZoom: s.setMinZoom,
  setMaxZoom: s.setMaxZoom,
  setTranslateExtent: s.setTranslateExtent,
  setNodeExtent: s.setNodeExtent,
  reset: s.reset,
  setDefaultNodesAndEdges: s.setDefaultNodesAndEdges
});
var initPrevValues2 = {
  /*
   * these are values that are also passed directly to other components
   * than the StoreUpdater. We can reduce the number of setStore calls
   * by setting the same values here as prev fields.
   */
  translateExtent: infiniteExtent,
  nodeOrigin: defaultNodeOrigin,
  minZoom: 0.5,
  maxZoom: 2,
  elementsSelectable: true,
  noPanClassName: "nopan",
  rfId: "1"
};
function StoreUpdater(props) {
  const { setNodes, setEdges, setMinZoom, setMaxZoom, setTranslateExtent, setNodeExtent, reset, setDefaultNodesAndEdges } = useStore(selector$k, shallow$1);
  const store = useStoreApi();
  (0, import_react4.useEffect)(() => {
    setDefaultNodesAndEdges(props.defaultNodes, props.defaultEdges);
    return () => {
      previousFields.current = initPrevValues2;
      reset();
    };
  }, []);
  const previousFields = (0, import_react4.useRef)(initPrevValues2);
  (0, import_react4.useEffect)(
    () => {
      for (const fieldName of fieldsToTrack) {
        const fieldValue = props[fieldName];
        const previousFieldValue = previousFields.current[fieldName];
        if (fieldValue === previousFieldValue)
          continue;
        if (typeof props[fieldName] === "undefined")
          continue;
        if (fieldName === "nodes")
          setNodes(fieldValue);
        else if (fieldName === "edges")
          setEdges(fieldValue);
        else if (fieldName === "minZoom")
          setMinZoom(fieldValue);
        else if (fieldName === "maxZoom")
          setMaxZoom(fieldValue);
        else if (fieldName === "translateExtent")
          setTranslateExtent(fieldValue);
        else if (fieldName === "nodeExtent")
          setNodeExtent(fieldValue);
        else if (fieldName === "ariaLabelConfig")
          store.setState({ ariaLabelConfig: mergeAriaLabelConfig(fieldValue) });
        else if (fieldName === "fitView")
          store.setState({ fitViewQueued: fieldValue });
        else if (fieldName === "fitViewOptions")
          store.setState({ fitViewOptions: fieldValue });
        else
          store.setState({ [fieldName]: fieldValue });
      }
      previousFields.current = props;
    },
    // Only re-run the effect if one of the fields we track changes
    fieldsToTrack.map((fieldName) => props[fieldName])
  );
  return null;
}
function getMediaQuery() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return null;
  }
  return window.matchMedia("(prefers-color-scheme: dark)");
}
function useColorModeClass(colorMode) {
  const [colorModeClass, setColorModeClass] = (0, import_react4.useState)(colorMode === "system" ? null : colorMode);
  (0, import_react4.useEffect)(() => {
    if (colorMode !== "system") {
      setColorModeClass(colorMode);
      return;
    }
    const mediaQuery = getMediaQuery();
    const updateColorModeClass = () => setColorModeClass(mediaQuery?.matches ? "dark" : "light");
    updateColorModeClass();
    mediaQuery?.addEventListener("change", updateColorModeClass);
    return () => {
      mediaQuery?.removeEventListener("change", updateColorModeClass);
    };
  }, [colorMode]);
  return colorModeClass !== null ? colorModeClass : getMediaQuery()?.matches ? "dark" : "light";
}
var defaultDoc = typeof document !== "undefined" ? document : null;
function useKeyPress(keyCode = null, options = { target: defaultDoc, actInsideInputWithModifier: true }) {
  const [keyPressed, setKeyPressed] = (0, import_react4.useState)(false);
  const modifierPressed = (0, import_react4.useRef)(false);
  const pressedKeys = (0, import_react4.useRef)(/* @__PURE__ */ new Set([]));
  const [keyCodes, keysToWatch] = (0, import_react4.useMemo)(() => {
    if (keyCode !== null) {
      const keyCodeArr = Array.isArray(keyCode) ? keyCode : [keyCode];
      const keys = keyCodeArr.filter((kc) => typeof kc === "string").map((kc) => kc.replace(/\+/g, "\n").replace("\n\n", "\n+").split("\n"));
      const keysFlat = keys.reduce((res, item) => res.concat(...item), []);
      return [keys, keysFlat];
    }
    return [[], []];
  }, [keyCode]);
  (0, import_react4.useEffect)(() => {
    const target = options?.target ?? defaultDoc;
    const actInsideInputWithModifier = options?.actInsideInputWithModifier ?? true;
    if (keyCode !== null) {
      const downHandler = (event) => {
        modifierPressed.current = event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
        const preventAction = (!modifierPressed.current || modifierPressed.current && !actInsideInputWithModifier) && isInputDOMNode(event);
        if (preventAction) {
          return false;
        }
        const keyOrCode = useKeyOrCode(event.code, keysToWatch);
        pressedKeys.current.add(event[keyOrCode]);
        if (isMatchingKey(keyCodes, pressedKeys.current, false)) {
          const target2 = event.composedPath?.()?.[0] || event.target;
          const isInteractiveElement = target2?.nodeName === "BUTTON" || target2?.nodeName === "A";
          if (options.preventDefault !== false && (modifierPressed.current || !isInteractiveElement)) {
            event.preventDefault();
          }
          setKeyPressed(true);
        }
      };
      const upHandler = (event) => {
        const keyOrCode = useKeyOrCode(event.code, keysToWatch);
        if (isMatchingKey(keyCodes, pressedKeys.current, true)) {
          setKeyPressed(false);
          pressedKeys.current.clear();
        } else {
          pressedKeys.current.delete(event[keyOrCode]);
        }
        if (event.key === "Meta") {
          pressedKeys.current.clear();
        }
        modifierPressed.current = false;
      };
      const resetHandler = () => {
        pressedKeys.current.clear();
        setKeyPressed(false);
      };
      target?.addEventListener("keydown", downHandler);
      target?.addEventListener("keyup", upHandler);
      window.addEventListener("blur", resetHandler);
      window.addEventListener("contextmenu", resetHandler);
      return () => {
        target?.removeEventListener("keydown", downHandler);
        target?.removeEventListener("keyup", upHandler);
        window.removeEventListener("blur", resetHandler);
        window.removeEventListener("contextmenu", resetHandler);
      };
    }
  }, [keyCode, setKeyPressed]);
  return keyPressed;
}
function isMatchingKey(keyCodes, pressedKeys, isUp) {
  return keyCodes.filter((keys) => isUp || keys.length === pressedKeys.size).some((keys) => keys.every((k) => pressedKeys.has(k)));
}
function useKeyOrCode(eventCode, keysToWatch) {
  return keysToWatch.includes(eventCode) ? "code" : "key";
}
var useViewportHelper = () => {
  const store = useStoreApi();
  return (0, import_react4.useMemo)(() => {
    return {
      zoomIn: async (options) => {
        const { panZoom } = store.getState();
        return panZoom ? panZoom.scaleBy(1.2, options) : false;
      },
      zoomOut: async (options) => {
        const { panZoom } = store.getState();
        return panZoom ? panZoom.scaleBy(1 / 1.2, options) : false;
      },
      zoomTo: async (zoomLevel, options) => {
        const { panZoom } = store.getState();
        return panZoom ? panZoom.scaleTo(zoomLevel, options) : false;
      },
      getZoom: () => store.getState().transform[2],
      setViewport: async (viewport, options) => {
        const { transform: [tX, tY, tZoom], panZoom } = store.getState();
        if (!panZoom) {
          return false;
        }
        await panZoom.setViewport({
          x: viewport.x ?? tX,
          y: viewport.y ?? tY,
          zoom: viewport.zoom ?? tZoom
        }, options);
        return true;
      },
      getViewport: () => {
        const [x, y, zoom] = store.getState().transform;
        return { x, y, zoom };
      },
      setCenter: async (x, y, options) => {
        return store.getState().setCenter(x, y, options);
      },
      fitBounds: async (bounds, options) => {
        const { width, height, minZoom, maxZoom, panZoom } = store.getState();
        const viewport = getViewportForBounds(bounds, width, height, minZoom, maxZoom, options?.padding ?? 0.1);
        if (!panZoom) {
          return false;
        }
        await panZoom.setViewport(viewport, {
          duration: options?.duration,
          ease: options?.ease,
          interpolate: options?.interpolate
        });
        return true;
      },
      screenToFlowPosition: (clientPosition, options = {}) => {
        const { transform: transform2, snapGrid, snapToGrid, domNode } = store.getState();
        if (!domNode) {
          return clientPosition;
        }
        const { x: domX, y: domY } = domNode.getBoundingClientRect();
        const correctedPosition = {
          x: clientPosition.x - domX,
          y: clientPosition.y - domY
        };
        const _snapGrid = options.snapGrid ?? snapGrid;
        const _snapToGrid = options.snapToGrid ?? snapToGrid;
        return pointToRendererPoint(correctedPosition, transform2, _snapToGrid, _snapGrid);
      },
      flowToScreenPosition: (flowPosition) => {
        const { transform: transform2, domNode } = store.getState();
        if (!domNode) {
          return flowPosition;
        }
        const { x: domX, y: domY } = domNode.getBoundingClientRect();
        const rendererPosition = rendererPointToPoint(flowPosition, transform2);
        return {
          x: rendererPosition.x + domX,
          y: rendererPosition.y + domY
        };
      }
    };
  }, []);
};
function applyChanges(changes, elements) {
  const updatedElements = [];
  const changesMap = /* @__PURE__ */ new Map();
  const addItemChanges = [];
  for (const change of changes) {
    if (change.type === "add") {
      addItemChanges.push(change);
      continue;
    } else if (change.type === "remove" || change.type === "replace") {
      changesMap.set(change.id, [change]);
    } else {
      const elementChanges = changesMap.get(change.id);
      if (elementChanges) {
        elementChanges.push(change);
      } else {
        changesMap.set(change.id, [change]);
      }
    }
  }
  for (const element of elements) {
    const changes2 = changesMap.get(element.id);
    if (!changes2) {
      updatedElements.push(element);
      continue;
    }
    if (changes2[0].type === "remove") {
      continue;
    }
    if (changes2[0].type === "replace") {
      updatedElements.push({ ...changes2[0].item });
      continue;
    }
    const updatedElement = { ...element };
    for (const change of changes2) {
      applyChange(change, updatedElement);
    }
    updatedElements.push(updatedElement);
  }
  if (addItemChanges.length) {
    addItemChanges.forEach((change) => {
      if (change.index !== void 0) {
        updatedElements.splice(change.index, 0, { ...change.item });
      } else {
        updatedElements.push({ ...change.item });
      }
    });
  }
  return updatedElements;
}
function applyChange(change, element) {
  switch (change.type) {
    case "select": {
      element.selected = change.selected;
      break;
    }
    case "position": {
      if (typeof change.position !== "undefined") {
        element.position = change.position;
      }
      if (typeof change.dragging !== "undefined") {
        element.dragging = change.dragging;
      }
      break;
    }
    case "dimensions": {
      if (typeof change.dimensions !== "undefined") {
        element.measured = {
          ...change.dimensions
        };
        if (change.setAttributes) {
          if (change.setAttributes === true || change.setAttributes === "width") {
            element.width = change.dimensions.width;
          }
          if (change.setAttributes === true || change.setAttributes === "height") {
            element.height = change.dimensions.height;
          }
        }
      }
      if (typeof change.resizing === "boolean") {
        element.resizing = change.resizing;
      }
      break;
    }
  }
}
function applyNodeChanges(changes, nodes) {
  return applyChanges(changes, nodes);
}
function applyEdgeChanges(changes, edges) {
  return applyChanges(changes, edges);
}
function createSelectionChange(id2, selected3) {
  return {
    id: id2,
    type: "select",
    selected: selected3
  };
}
function getSelectionChanges(items, selectedIds = /* @__PURE__ */ new Set(), mutateItem = false) {
  const changes = [];
  for (const [id2, item] of items) {
    const willBeSelected = selectedIds.has(id2);
    if (!(item.selected === void 0 && !willBeSelected) && item.selected !== willBeSelected) {
      if (mutateItem) {
        item.selected = willBeSelected;
      }
      changes.push(createSelectionChange(item.id, willBeSelected));
    }
  }
  return changes;
}
function getElementsDiffChanges({ items = [], lookup }) {
  const changes = [];
  const itemsLookup = new Map(items.map((item) => [item.id, item]));
  for (const [index2, item] of items.entries()) {
    const lookupItem = lookup.get(item.id);
    const storeItem = lookupItem?.internals?.userNode ?? lookupItem;
    if (storeItem !== void 0 && storeItem !== item) {
      changes.push({ id: item.id, item, type: "replace" });
    }
    if (storeItem === void 0) {
      changes.push({ item, type: "add", index: index2 });
    }
  }
  for (const [id2] of lookup) {
    const nextNode = itemsLookup.get(id2);
    if (nextNode === void 0) {
      changes.push({ id: id2, type: "remove" });
    }
  }
  return changes;
}
function elementToRemoveChange(item) {
  return {
    id: item.id,
    type: "remove"
  };
}
var defaultOnError = createDevWarn("React Flow", "https://reactflow.dev/");
function addEdge2(edgeParams, edges, options = {}) {
  return addEdge(edgeParams, edges, {
    ...options,
    onError: options.onError ?? defaultOnError
  });
}
var isNode = (element) => isNodeBase(element);
var isEdge = (element) => isEdgeBase(element);
function fixedForwardRef(render) {
  return (0, import_react4.forwardRef)(render);
}
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? import_react4.useLayoutEffect : import_react4.useEffect;
function useQueue(runQueue) {
  const [serial, setSerial] = (0, import_react4.useState)(BigInt(0));
  const [queue] = (0, import_react4.useState)(() => createQueue(() => setSerial((n) => n + BigInt(1))));
  useIsomorphicLayoutEffect(() => {
    const queueItems = queue.get();
    if (queueItems.length) {
      runQueue(queueItems);
      queue.reset();
    }
  }, [serial]);
  return queue;
}
function createQueue(cb) {
  let queue = [];
  return {
    get: () => queue,
    reset: () => {
      queue = [];
    },
    push: (item) => {
      queue.push(item);
      cb();
    }
  };
}
var BatchContext = (0, import_react4.createContext)(null);
function BatchProvider({ children: children2 }) {
  const store = useStoreApi();
  const nodeQueueHandler = (0, import_react4.useCallback)((queueItems) => {
    const { nodes = [], setNodes, hasDefaultNodes, onNodesChange, nodeLookup, fitViewQueued, onNodesChangeMiddlewareMap } = store.getState();
    let next = nodes;
    for (const payload of queueItems) {
      next = typeof payload === "function" ? payload(next) : payload;
    }
    let changes = getElementsDiffChanges({
      items: next,
      lookup: nodeLookup
    });
    for (const middleware of onNodesChangeMiddlewareMap.values()) {
      changes = middleware(changes);
    }
    if (hasDefaultNodes) {
      setNodes(next);
    }
    if (changes.length > 0) {
      onNodesChange?.(changes);
    } else if (fitViewQueued) {
      window.requestAnimationFrame(() => {
        const { fitViewQueued: fitViewQueued2, nodes: nodes2, setNodes: setNodes2 } = store.getState();
        if (fitViewQueued2) {
          setNodes2(nodes2);
        }
      });
    }
  }, []);
  const nodeQueue = useQueue(nodeQueueHandler);
  const edgeQueueHandler = (0, import_react4.useCallback)((queueItems) => {
    const { edges = [], setEdges, hasDefaultEdges, onEdgesChange, edgeLookup } = store.getState();
    let next = edges;
    for (const payload of queueItems) {
      next = typeof payload === "function" ? payload(next) : payload;
    }
    if (hasDefaultEdges) {
      setEdges(next);
    } else if (onEdgesChange) {
      onEdgesChange(getElementsDiffChanges({
        items: next,
        lookup: edgeLookup
      }));
    }
  }, []);
  const edgeQueue = useQueue(edgeQueueHandler);
  const value = (0, import_react4.useMemo)(() => ({ nodeQueue, edgeQueue }), []);
  return (0, import_jsx_runtime.jsx)(BatchContext.Provider, { value, children: children2 });
}
function useBatchContext() {
  const batchContext = (0, import_react4.useContext)(BatchContext);
  if (!batchContext) {
    throw new Error("useBatchContext must be used within a BatchProvider");
  }
  return batchContext;
}
var selector$j = (s) => !!s.panZoom;
function useReactFlow() {
  const viewportHelper = useViewportHelper();
  const store = useStoreApi();
  const batchContext = useBatchContext();
  const viewportInitialized = useStore(selector$j);
  const generalHelper = (0, import_react4.useMemo)(() => {
    const getInternalNode = (id2) => store.getState().nodeLookup.get(id2);
    const setNodes = (payload) => {
      batchContext.nodeQueue.push(payload);
    };
    const setEdges = (payload) => {
      batchContext.edgeQueue.push(payload);
    };
    const getNodeRect = (node) => {
      const { nodeLookup, nodeOrigin } = store.getState();
      const nodeToUse = isNode(node) ? node : nodeLookup.get(node.id);
      const position = nodeToUse.parentId ? evaluateAbsolutePosition(nodeToUse.position, nodeToUse.measured, nodeToUse.parentId, nodeLookup, nodeOrigin) : nodeToUse.position;
      const nodeWithPosition = {
        ...nodeToUse,
        position,
        width: nodeToUse.measured?.width ?? nodeToUse.width,
        height: nodeToUse.measured?.height ?? nodeToUse.height
      };
      return nodeToRect(nodeWithPosition);
    };
    const updateNode = (id2, nodeUpdate, options = { replace: false }) => {
      setNodes((prevNodes) => prevNodes.map((node) => {
        if (node.id === id2) {
          const nextNode = typeof nodeUpdate === "function" ? nodeUpdate(node) : nodeUpdate;
          return options.replace && isNode(nextNode) ? nextNode : { ...node, ...nextNode };
        }
        return node;
      }));
    };
    const updateEdge = (id2, edgeUpdate, options = { replace: false }) => {
      setEdges((prevEdges) => prevEdges.map((edge) => {
        if (edge.id === id2) {
          const nextEdge = typeof edgeUpdate === "function" ? edgeUpdate(edge) : edgeUpdate;
          return options.replace && isEdge(nextEdge) ? nextEdge : { ...edge, ...nextEdge };
        }
        return edge;
      }));
    };
    return {
      getNodes: () => store.getState().nodes.map((n) => ({ ...n })),
      getNode: (id2) => getInternalNode(id2)?.internals.userNode,
      getInternalNode,
      getEdges: () => {
        const { edges = [] } = store.getState();
        return edges.map((e) => ({ ...e }));
      },
      getEdge: (id2) => store.getState().edgeLookup.get(id2),
      setNodes,
      setEdges,
      addNodes: (payload) => {
        const newNodes = Array.isArray(payload) ? payload : [payload];
        batchContext.nodeQueue.push((nodes) => [...nodes, ...newNodes]);
      },
      addEdges: (payload) => {
        const newEdges = Array.isArray(payload) ? payload : [payload];
        batchContext.edgeQueue.push((edges) => [...edges, ...newEdges]);
      },
      toObject: () => {
        const { nodes = [], edges = [], transform: transform2 } = store.getState();
        const [x, y, zoom] = transform2;
        return {
          nodes: nodes.map((n) => ({ ...n })),
          edges: edges.map((e) => ({ ...e })),
          viewport: {
            x,
            y,
            zoom
          }
        };
      },
      deleteElements: async ({ nodes: nodesToRemove = [], edges: edgesToRemove = [] }) => {
        const { nodes, edges, onNodesDelete, onEdgesDelete, triggerNodeChanges, triggerEdgeChanges, onDelete, onBeforeDelete } = store.getState();
        const { nodes: matchingNodes, edges: matchingEdges } = await getElementsToRemove({
          nodesToRemove,
          edgesToRemove,
          nodes,
          edges,
          onBeforeDelete
        });
        const hasMatchingEdges = matchingEdges.length > 0;
        const hasMatchingNodes = matchingNodes.length > 0;
        if (hasMatchingEdges) {
          const edgeChanges = matchingEdges.map(elementToRemoveChange);
          onEdgesDelete?.(matchingEdges);
          triggerEdgeChanges(edgeChanges);
        }
        if (hasMatchingNodes) {
          const nodeChanges = matchingNodes.map(elementToRemoveChange);
          onNodesDelete?.(matchingNodes);
          triggerNodeChanges(nodeChanges);
        }
        if (hasMatchingNodes || hasMatchingEdges) {
          onDelete?.({ nodes: matchingNodes, edges: matchingEdges });
        }
        return { deletedNodes: matchingNodes, deletedEdges: matchingEdges };
      },
      /**
       * Partial is defined as "the 2 nodes/areas are intersecting partially".
       * If a is contained in b or b is contained in a, they are both
       * considered fully intersecting.
       */
      getIntersectingNodes: (nodeOrRect, partially = true, nodes) => {
        const isRect = isRectObject(nodeOrRect);
        const nodeRect = isRect ? nodeOrRect : getNodeRect(nodeOrRect);
        const hasNodesOption = nodes !== void 0;
        if (!nodeRect) {
          return [];
        }
        return (nodes || store.getState().nodes).filter((n) => {
          const internalNode = store.getState().nodeLookup.get(n.id);
          if (internalNode && !isRect && (n.id === nodeOrRect.id || !internalNode.internals.positionAbsolute)) {
            return false;
          }
          const currNodeRect = nodeToRect(hasNodesOption ? n : internalNode);
          const overlappingArea = getOverlappingArea(currNodeRect, nodeRect);
          const partiallyVisible = partially && overlappingArea > 0;
          return partiallyVisible || overlappingArea >= currNodeRect.width * currNodeRect.height || overlappingArea >= nodeRect.width * nodeRect.height;
        });
      },
      isNodeIntersecting: (nodeOrRect, area, partially = true) => {
        const isRect = isRectObject(nodeOrRect);
        const nodeRect = isRect ? nodeOrRect : getNodeRect(nodeOrRect);
        if (!nodeRect) {
          return false;
        }
        const overlappingArea = getOverlappingArea(nodeRect, area);
        const partiallyVisible = partially && overlappingArea > 0;
        return partiallyVisible || overlappingArea >= area.width * area.height || overlappingArea >= nodeRect.width * nodeRect.height;
      },
      updateNode,
      updateNodeData: (id2, dataUpdate, options = { replace: false }) => {
        updateNode(id2, (node) => {
          const nextData = typeof dataUpdate === "function" ? dataUpdate(node) : dataUpdate;
          return options.replace ? { ...node, data: nextData } : { ...node, data: { ...node.data, ...nextData } };
        }, options);
      },
      updateEdge,
      updateEdgeData: (id2, dataUpdate, options = { replace: false }) => {
        updateEdge(id2, (edge) => {
          const nextData = typeof dataUpdate === "function" ? dataUpdate(edge) : dataUpdate;
          return options.replace ? { ...edge, data: nextData } : { ...edge, data: { ...edge.data, ...nextData } };
        }, options);
      },
      getNodesBounds: (nodes) => {
        const { nodeLookup, nodeOrigin } = store.getState();
        return getNodesBounds(nodes, { nodeLookup, nodeOrigin });
      },
      getHandleConnections: ({ type, id: id2, nodeId }) => Array.from(store.getState().connectionLookup.get(`${nodeId}-${type}${id2 ? `-${id2}` : ""}`)?.values() ?? []),
      getNodeConnections: ({ type, handleId, nodeId }) => Array.from(store.getState().connectionLookup.get(`${nodeId}${type ? handleId ? `-${type}-${handleId}` : `-${type}` : ""}`)?.values() ?? []),
      fitView: async (options) => {
        const fitViewResolver = store.getState().fitViewResolver ?? withResolvers();
        store.setState({ fitViewQueued: true, fitViewOptions: options, fitViewResolver });
        batchContext.nodeQueue.push((nodes) => [...nodes]);
        return fitViewResolver.promise;
      }
    };
  }, []);
  return (0, import_react4.useMemo)(() => {
    return {
      ...generalHelper,
      ...viewportHelper,
      viewportInitialized
    };
  }, [viewportInitialized]);
}
var selected2 = (item) => item.selected;
var win$1 = typeof window !== "undefined" ? window : void 0;
function useGlobalKeyHandler({ deleteKeyCode, multiSelectionKeyCode }) {
  const store = useStoreApi();
  const { deleteElements } = useReactFlow();
  const deleteKeyPressed = useKeyPress(deleteKeyCode, { actInsideInputWithModifier: false });
  const multiSelectionKeyPressed = useKeyPress(multiSelectionKeyCode, { target: win$1 });
  (0, import_react4.useEffect)(() => {
    if (deleteKeyPressed) {
      const { edges, nodes } = store.getState();
      deleteElements({ nodes: nodes.filter(selected2), edges: edges.filter(selected2) });
      store.setState({ nodesSelectionActive: false });
    }
  }, [deleteKeyPressed]);
  (0, import_react4.useEffect)(() => {
    store.setState({ multiSelectionActive: multiSelectionKeyPressed });
  }, [multiSelectionKeyPressed]);
}
function useResizeHandler(domNode) {
  const store = useStoreApi();
  (0, import_react4.useEffect)(() => {
    const updateDimensions = () => {
      if (!domNode.current || !(domNode.current.checkVisibility?.() ?? true)) {
        return false;
      }
      const size = getDimensions(domNode.current);
      if (size.height === 0 || size.width === 0) {
        store.getState().onError?.("004", errorMessages["error004"]());
      }
      store.setState({ width: size.width || 500, height: size.height || 500 });
    };
    if (domNode.current) {
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      const resizeObserver = new ResizeObserver(() => updateDimensions());
      resizeObserver.observe(domNode.current);
      return () => {
        window.removeEventListener("resize", updateDimensions);
        if (resizeObserver && domNode.current) {
          resizeObserver.unobserve(domNode.current);
        }
      };
    }
  }, []);
}
var containerStyle = {
  position: "absolute",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0
};
var selector$i = (s) => ({
  userSelectionActive: s.userSelectionActive,
  lib: s.lib,
  connectionInProgress: s.connection.inProgress
});
function ZoomPane({ onPaneContextMenu, zoomOnScroll = true, zoomOnPinch = true, panOnScroll = false, panActivationKeyPressed, panOnScrollSpeed = 0.5, panOnScrollMode = PanOnScrollMode.Free, zoomOnDoubleClick = true, panOnDrag = true, defaultViewport: defaultViewport2, translateExtent, minZoom, maxZoom, zoomActivationKeyCode, preventScrolling = true, children: children2, noWheelClassName, noPanClassName, onViewportChange, isControlledViewport, paneClickDistance, selectionOnDrag }) {
  const store = useStoreApi();
  const zoomPane = (0, import_react4.useRef)(null);
  const { userSelectionActive, lib, connectionInProgress } = useStore(selector$i, shallow$1);
  const zoomActivationKeyPressed = useKeyPress(zoomActivationKeyCode);
  const panZoom = (0, import_react4.useRef)();
  useResizeHandler(zoomPane);
  const onTransformChange = (0, import_react4.useCallback)((transform2) => {
    onViewportChange?.({ x: transform2[0], y: transform2[1], zoom: transform2[2] });
    if (!isControlledViewport) {
      store.setState({ transform: transform2 });
    }
  }, [onViewportChange, isControlledViewport]);
  (0, import_react4.useEffect)(() => {
    if (zoomPane.current) {
      panZoom.current = XYPanZoom({
        domNode: zoomPane.current,
        minZoom,
        maxZoom,
        translateExtent,
        viewport: defaultViewport2,
        onDraggingChange: (paneDragging) => store.setState((prevState) => prevState.paneDragging === paneDragging ? prevState : { paneDragging }),
        onPanZoomStart: (event, vp) => {
          const { onViewportChangeStart, onMoveStart } = store.getState();
          onMoveStart?.(event, vp);
          onViewportChangeStart?.(vp);
        },
        onPanZoom: (event, vp) => {
          const { onViewportChange: onViewportChange2, onMove } = store.getState();
          onMove?.(event, vp);
          onViewportChange2?.(vp);
        },
        onPanZoomEnd: (event, vp) => {
          const { onViewportChangeEnd, onMoveEnd } = store.getState();
          onMoveEnd?.(event, vp);
          onViewportChangeEnd?.(vp);
        }
      });
      const { x, y, zoom } = panZoom.current.getViewport();
      store.setState({
        panZoom: panZoom.current,
        transform: [x, y, zoom],
        domNode: zoomPane.current.closest(".react-flow")
      });
      return () => {
        panZoom.current?.destroy();
      };
    }
  }, []);
  (0, import_react4.useEffect)(() => {
    panZoom.current?.update({
      onPaneContextMenu,
      zoomOnScroll,
      zoomOnPinch,
      panOnScroll,
      panActivationKeyPressed,
      panOnScrollSpeed,
      panOnScrollMode,
      zoomOnDoubleClick,
      panOnDrag,
      zoomActivationKeyPressed,
      preventScrolling,
      noPanClassName,
      userSelectionActive,
      noWheelClassName,
      lib,
      onTransformChange,
      connectionInProgress,
      selectionOnDrag,
      paneClickDistance
    });
  }, [
    onPaneContextMenu,
    zoomOnScroll,
    zoomOnPinch,
    panOnScroll,
    panActivationKeyPressed,
    panOnScrollSpeed,
    panOnScrollMode,
    zoomOnDoubleClick,
    panOnDrag,
    zoomActivationKeyPressed,
    preventScrolling,
    noPanClassName,
    userSelectionActive,
    noWheelClassName,
    lib,
    onTransformChange,
    connectionInProgress,
    selectionOnDrag,
    paneClickDistance
  ]);
  return (0, import_jsx_runtime.jsx)("div", { className: "react-flow__renderer", ref: zoomPane, style: containerStyle, children: children2 });
}
var selector$h = (s) => ({
  userSelectionActive: s.userSelectionActive,
  userSelectionRect: s.userSelectionRect
});
function UserSelection() {
  const { userSelectionActive, userSelectionRect } = useStore(selector$h, shallow$1);
  const isActive = userSelectionActive && userSelectionRect;
  if (!isActive) {
    return null;
  }
  return (0, import_jsx_runtime.jsx)("div", { className: "react-flow__selection react-flow__container", style: {
    width: userSelectionRect.width,
    height: userSelectionRect.height,
    transform: `translate(${userSelectionRect.x}px, ${userSelectionRect.y}px)`
  } });
}
var wrapHandler = (handler, containerRef) => {
  return (event) => {
    if (event.target !== containerRef.current) {
      return;
    }
    handler?.(event);
  };
};
var selector$g = (s) => ({
  userSelectionActive: s.userSelectionActive,
  elementsSelectable: s.elementsSelectable,
  dragging: s.paneDragging,
  panBy: s.panBy,
  autoPanSpeed: s.autoPanSpeed
});
function Pane({ isSelecting, selectionKeyPressed, selectionMode = SelectionMode.Full, panOnDrag, autoPanOnSelection, paneClickDistance, selectionOnDrag, onSelectionStart, onSelectionEnd, onPaneClick, onPaneContextMenu, onPaneScroll, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, children: children2 }) {
  const autoPanId = (0, import_react4.useRef)(0);
  const store = useStoreApi();
  const { userSelectionActive, elementsSelectable, dragging, panBy: panBy2, autoPanSpeed } = useStore(selector$g, shallow$1);
  const isSelectionEnabled = elementsSelectable && (isSelecting || userSelectionActive);
  const container = (0, import_react4.useRef)(null);
  const containerBounds = (0, import_react4.useRef)();
  const selectedNodeIds = (0, import_react4.useRef)(/* @__PURE__ */ new Set());
  const selectedEdgeIds = (0, import_react4.useRef)(/* @__PURE__ */ new Set());
  const connectionEndedOnPane = (0, import_react4.useRef)(false);
  const selectionInProgress = (0, import_react4.useRef)(false);
  const position = (0, import_react4.useRef)({ x: 0, y: 0 });
  const autoPanStarted = (0, import_react4.useRef)(false);
  const onClick = (event) => {
    if (selectionInProgress.current || connectionEndedOnPane.current || store.getState().connection.inProgress) {
      selectionInProgress.current = false;
      connectionEndedOnPane.current = false;
      return;
    }
    onPaneClick?.(event);
    store.getState().resetSelectedElements();
    store.setState({ nodesSelectionActive: false });
  };
  const onContextMenu = (event) => {
    if (Array.isArray(panOnDrag) && panOnDrag?.includes(2)) {
      event.preventDefault();
      return;
    }
    onPaneContextMenu?.(event);
  };
  const onWheel = onPaneScroll ? (event) => onPaneScroll(event) : void 0;
  const onClickCapture = (event) => {
    if (selectionInProgress.current) {
      event.stopPropagation();
      selectionInProgress.current = false;
    }
  };
  const onPointerDownCapture = (event) => {
    if (event.pointerType === "touch" && panOnDrag !== false && !selectionKeyPressed) {
      return;
    }
    const { domNode, transform: transform2 } = store.getState();
    containerBounds.current = domNode?.getBoundingClientRect();
    if (!containerBounds.current)
      return;
    const eventTargetIsContainer = event.target === container.current;
    const isNoKeyEvent = !eventTargetIsContainer && !!event.target.closest(".nokey");
    const isSelectionActive = selectionOnDrag && eventTargetIsContainer || selectionKeyPressed;
    if (isNoKeyEvent || !isSelecting || !isSelectionActive || event.button !== 0 || !event.isPrimary) {
      return;
    }
    event.target?.setPointerCapture?.(event.pointerId);
    selectionInProgress.current = false;
    const { x, y } = getEventPosition(event.nativeEvent, containerBounds.current);
    const userSelectionStartPosition = pointToRendererPoint({ x, y }, transform2);
    store.setState({
      userSelectionRect: {
        width: 0,
        height: 0,
        startX: userSelectionStartPosition.x,
        startY: userSelectionStartPosition.y,
        x,
        y
      }
    });
    if (!eventTargetIsContainer) {
      event.stopPropagation();
      event.preventDefault();
    }
  };
  function commitUserSelectionRect(mouseX, mouseY) {
    const { userSelectionRect } = store.getState();
    if (!userSelectionRect) {
      return;
    }
    const { transform: transform2, nodeLookup, edgeLookup, connectionLookup, triggerNodeChanges, triggerEdgeChanges, defaultEdgeOptions } = store.getState();
    const userStartPosition = { x: userSelectionRect.startX, y: userSelectionRect.startY };
    const { x: screenStartX, y: screenStartY } = rendererPointToPoint(userStartPosition, transform2);
    const nextUserSelectRect = {
      startX: userStartPosition.x,
      startY: userStartPosition.y,
      x: mouseX < screenStartX ? mouseX : screenStartX,
      y: mouseY < screenStartY ? mouseY : screenStartY,
      width: Math.abs(mouseX - screenStartX),
      height: Math.abs(mouseY - screenStartY)
    };
    const prevSelectedNodeIds = selectedNodeIds.current;
    const prevSelectedEdgeIds = selectedEdgeIds.current;
    selectedNodeIds.current = new Set(getNodesInside(nodeLookup, nextUserSelectRect, transform2, selectionMode === SelectionMode.Partial, true).map((node) => node.id));
    selectedEdgeIds.current = /* @__PURE__ */ new Set();
    const edgesSelectable = defaultEdgeOptions?.selectable ?? true;
    for (const nodeId of selectedNodeIds.current) {
      const connections = connectionLookup.get(nodeId);
      if (!connections)
        continue;
      for (const { edgeId } of connections.values()) {
        const edge = edgeLookup.get(edgeId);
        if (edge && (edge.selectable ?? edgesSelectable)) {
          selectedEdgeIds.current.add(edgeId);
        }
      }
    }
    if (!areSetsEqual(prevSelectedNodeIds, selectedNodeIds.current)) {
      const changes = getSelectionChanges(nodeLookup, selectedNodeIds.current, true);
      triggerNodeChanges(changes);
    }
    if (!areSetsEqual(prevSelectedEdgeIds, selectedEdgeIds.current)) {
      const changes = getSelectionChanges(edgeLookup, selectedEdgeIds.current);
      triggerEdgeChanges(changes);
    }
    store.setState({
      userSelectionRect: nextUserSelectRect,
      userSelectionActive: true,
      nodesSelectionActive: false
    });
  }
  function autoPan() {
    if (!autoPanOnSelection || !containerBounds.current) {
      return;
    }
    const [x, y] = calcAutoPan(position.current, containerBounds.current, autoPanSpeed);
    panBy2({ x, y }).then((panned) => {
      if (!selectionInProgress.current || !panned) {
        autoPanId.current = requestAnimationFrame(autoPan);
        return;
      }
      const { x: mx, y: my } = position.current;
      commitUserSelectionRect(mx, my);
      autoPanId.current = requestAnimationFrame(autoPan);
    });
  }
  const cleanupAutoPan = () => {
    cancelAnimationFrame(autoPanId.current);
    autoPanId.current = 0;
    autoPanStarted.current = false;
  };
  (0, import_react4.useEffect)(() => {
    return () => cleanupAutoPan();
  }, []);
  const onPointerMove = (event) => {
    const { userSelectionRect, transform: transform2, resetSelectedElements } = store.getState();
    if (!containerBounds.current || !userSelectionRect) {
      return;
    }
    const { x: mouseX, y: mouseY } = getEventPosition(event.nativeEvent, containerBounds.current);
    position.current = { x: mouseX, y: mouseY };
    const screenStart = rendererPointToPoint({ x: userSelectionRect.startX, y: userSelectionRect.startY }, transform2);
    if (!selectionInProgress.current) {
      const requiredDistance = selectionKeyPressed ? 0 : paneClickDistance;
      const distance2 = Math.hypot(mouseX - screenStart.x, mouseY - screenStart.y);
      if (distance2 <= requiredDistance) {
        return;
      }
      resetSelectedElements();
      onSelectionStart?.(event);
    }
    selectionInProgress.current = true;
    if (!autoPanStarted.current) {
      autoPan();
      autoPanStarted.current = true;
    }
    commitUserSelectionRect(mouseX, mouseY);
  };
  const onPointerUp = (event) => {
    if (!isSelectionEnabled) {
      if (event.target === container.current && store.getState().connection.inProgress) {
        connectionEndedOnPane.current = true;
      }
      return;
    }
    if (event.button !== 0) {
      return;
    }
    event.target?.releasePointerCapture?.(event.pointerId);
    if (!userSelectionActive && event.target === container.current && store.getState().userSelectionRect) {
      onClick?.(event);
    }
    store.setState({
      userSelectionActive: false,
      userSelectionRect: null
    });
    if (selectionInProgress.current) {
      onSelectionEnd?.(event);
      store.setState({
        nodesSelectionActive: selectedNodeIds.current.size > 0
      });
    }
    cleanupAutoPan();
  };
  const onPointerCancel = (event) => {
    event.target?.releasePointerCapture?.(event.pointerId);
    cleanupAutoPan();
  };
  const draggable = panOnDrag === true || Array.isArray(panOnDrag) && panOnDrag.includes(0);
  return (0, import_jsx_runtime.jsxs)("div", { className: cc(["react-flow__pane", { draggable, dragging, selection: isSelecting }]), onClick: isSelectionEnabled ? void 0 : wrapHandler(onClick, container), onContextMenu: wrapHandler(onContextMenu, container), onWheel: wrapHandler(onWheel, container), onPointerEnter: isSelectionEnabled ? void 0 : onPaneMouseEnter, onPointerMove: isSelectionEnabled ? onPointerMove : onPaneMouseMove, onPointerUp, onPointerCancel: isSelectionEnabled ? onPointerCancel : void 0, onPointerDownCapture: isSelectionEnabled ? onPointerDownCapture : void 0, onClickCapture: isSelectionEnabled ? onClickCapture : void 0, onPointerLeave: onPaneMouseLeave, ref: container, style: containerStyle, children: [children2, (0, import_jsx_runtime.jsx)(UserSelection, {})] });
}
function handleNodeClick({ id: id2, store, unselect = false, nodeRef }) {
  const { addSelectedNodes, unselectNodesAndEdges, multiSelectionActive, nodeLookup, onError } = store.getState();
  const node = nodeLookup.get(id2);
  if (!node) {
    onError?.("012", errorMessages["error012"](id2));
    return;
  }
  store.setState({ nodesSelectionActive: false });
  if (!node.selected) {
    addSelectedNodes([id2]);
  } else if (unselect || node.selected && multiSelectionActive) {
    unselectNodesAndEdges({ nodes: [node], edges: [] });
    requestAnimationFrame(() => nodeRef?.current?.blur());
  }
}
function useDrag({ nodeRef, disabled = false, noDragClassName, handleSelector, nodeId, isSelectable, nodeClickDistance }) {
  const store = useStoreApi();
  const [dragging, setDragging] = (0, import_react4.useState)(false);
  const xyDrag = (0, import_react4.useRef)();
  (0, import_react4.useEffect)(() => {
    if (disabled) {
      return;
    }
    xyDrag.current = XYDrag({
      getStoreItems: () => store.getState(),
      onNodeMouseDown: (id2) => {
        handleNodeClick({
          id: id2,
          store,
          nodeRef
        });
      },
      onDragStart: () => {
        setDragging(true);
      },
      onDragStop: () => {
        setDragging(false);
      }
    });
    return () => {
      xyDrag.current?.destroy();
      xyDrag.current = void 0;
    };
  }, [disabled, store, nodeRef]);
  (0, import_react4.useEffect)(() => {
    if (disabled || !nodeRef.current || !xyDrag.current) {
      return;
    }
    xyDrag.current.update({
      noDragClassName,
      handleSelector,
      domNode: nodeRef.current,
      isSelectable,
      nodeId,
      nodeClickDistance
    });
  }, [noDragClassName, handleSelector, disabled, isSelectable, nodeRef, nodeId, nodeClickDistance]);
  return dragging;
}
var selectedAndDraggable = (nodesDraggable) => (n) => n.selected && (n.draggable || nodesDraggable && typeof n.draggable === "undefined");
function useMoveSelectedNodes() {
  const store = useStoreApi();
  const moveSelectedNodes = (0, import_react4.useCallback)((params) => {
    const { nodeExtent, snapToGrid, snapGrid, nodesDraggable, onError, updateNodePositions, nodeLookup, nodeOrigin } = store.getState();
    const nodeUpdates = /* @__PURE__ */ new Map();
    const isSelected = selectedAndDraggable(nodesDraggable);
    const xVelo = snapToGrid ? snapGrid[0] : 5;
    const yVelo = snapToGrid ? snapGrid[1] : 5;
    const xDiff = params.direction.x * xVelo * params.factor;
    const yDiff = params.direction.y * yVelo * params.factor;
    for (const [, node] of nodeLookup) {
      if (!isSelected(node)) {
        continue;
      }
      let nextPosition = {
        x: node.internals.positionAbsolute.x + xDiff,
        y: node.internals.positionAbsolute.y + yDiff
      };
      if (snapToGrid) {
        nextPosition = snapPosition(nextPosition, snapGrid);
      }
      const { position, positionAbsolute } = calculateNodePosition({
        nodeId: node.id,
        nextPosition,
        nodeLookup,
        nodeExtent,
        nodeOrigin,
        onError
      });
      node.position = position;
      node.internals.positionAbsolute = positionAbsolute;
      nodeUpdates.set(node.id, node);
    }
    updateNodePositions(nodeUpdates);
  }, []);
  return moveSelectedNodes;
}
var NodeIdContext = (0, import_react4.createContext)(null);
var Provider = NodeIdContext.Provider;
NodeIdContext.Consumer;
var useNodeId = () => {
  const nodeId = (0, import_react4.useContext)(NodeIdContext);
  return nodeId;
};
var selector$f = (s) => ({
  connectOnClick: s.connectOnClick,
  noPanClassName: s.noPanClassName,
  rfId: s.rfId
});
var HandleConfigContext = (0, import_react4.createContext)(null);
function HandleConfigProvider({ children: children2 }) {
  const config = useStore(selector$f, shallow$1);
  return (0, import_jsx_runtime.jsx)(HandleConfigContext.Provider, { value: config, children: children2 });
}
function useHandleConfig() {
  const config = (0, import_react4.useContext)(HandleConfigContext);
  if (!config) {
    throw new Error("useHandleConfig must be used within a HandleConfigProvider");
  }
  return config;
}
var idleConnectingState = {
  connectingFrom: false,
  connectingTo: false,
  clickConnecting: false,
  isPossibleEndHandle: true,
  connectionInProcess: false,
  clickConnectionInProcess: false,
  valid: false
};
var connectingSelector = (nodeId, handleId, type) => (state) => {
  const { connectionClickStartHandle: clickHandle, connectionMode, connection } = state;
  const { fromHandle, toHandle, isValid } = connection;
  if (!fromHandle && !clickHandle) {
    return idleConnectingState;
  }
  const connectingTo = toHandle?.nodeId === nodeId && toHandle?.id === handleId && toHandle?.type === type;
  return {
    connectingFrom: fromHandle?.nodeId === nodeId && fromHandle?.id === handleId && fromHandle?.type === type,
    connectingTo,
    clickConnecting: clickHandle?.nodeId === nodeId && clickHandle?.id === handleId && clickHandle?.type === type,
    isPossibleEndHandle: connectionMode === ConnectionMode.Strict ? fromHandle?.type !== type : nodeId !== fromHandle?.nodeId || handleId !== fromHandle?.id,
    connectionInProcess: !!fromHandle,
    clickConnectionInProcess: !!clickHandle,
    valid: connectingTo && isValid
  };
};
function HandleComponent({ type = "source", position = Position.Top, isValidConnection, isConnectable = true, isConnectableStart = true, isConnectableEnd = true, id: id2, onConnect, children: children2, className, onMouseDown, onTouchStart, ...rest }, ref) {
  const handleId = id2 || null;
  const isTarget = type === "target";
  const store = useStoreApi();
  const nodeId = useNodeId();
  const { connectOnClick, noPanClassName, rfId } = useHandleConfig();
  const { connectingFrom, connectingTo, clickConnecting, isPossibleEndHandle, connectionInProcess, clickConnectionInProcess, valid } = useStore(connectingSelector(nodeId, handleId, type), shallow$1);
  if (!nodeId) {
    store.getState().onError?.("010", errorMessages["error010"]());
  }
  const onConnectExtended = (params) => {
    const { defaultEdgeOptions, onConnect: onConnectAction, hasDefaultEdges } = store.getState();
    const edgeParams = {
      ...defaultEdgeOptions,
      ...params
    };
    if (hasDefaultEdges) {
      const { edges, setEdges, onError } = store.getState();
      setEdges(addEdge2(edgeParams, edges, { onError }));
    }
    onConnectAction?.(edgeParams);
    onConnect?.(edgeParams);
  };
  const onPointerDown2 = (event) => {
    if (!nodeId) {
      return;
    }
    const isMouseTriggered = isMouseEvent(event.nativeEvent);
    if (isConnectableStart && (isMouseTriggered && event.button === 0 || !isMouseTriggered)) {
      const currentStore = store.getState();
      XYHandle.onPointerDown(event.nativeEvent, {
        handleDomNode: event.currentTarget,
        autoPanOnConnect: currentStore.autoPanOnConnect,
        connectionMode: currentStore.connectionMode,
        connectionRadius: currentStore.connectionRadius,
        domNode: currentStore.domNode,
        nodeLookup: currentStore.nodeLookup,
        lib: currentStore.lib,
        isTarget,
        handleId,
        nodeId,
        flowId: currentStore.rfId,
        panBy: currentStore.panBy,
        cancelConnection: currentStore.cancelConnection,
        onConnectStart: currentStore.onConnectStart,
        onConnectEnd: (...args) => store.getState().onConnectEnd?.(...args),
        updateConnection: currentStore.updateConnection,
        onConnect: onConnectExtended,
        isValidConnection: isValidConnection || ((...args) => store.getState().isValidConnection?.(...args) ?? true),
        getTransform: () => store.getState().transform,
        getFromHandle: () => store.getState().connection.fromHandle,
        autoPanSpeed: currentStore.autoPanSpeed,
        dragThreshold: currentStore.connectionDragThreshold
      });
    }
    if (isMouseTriggered) {
      onMouseDown?.(event);
    } else {
      onTouchStart?.(event);
    }
  };
  const onClick = (event) => {
    const { onClickConnectStart, onClickConnectEnd, connectionClickStartHandle, connectionMode, isValidConnection: isValidConnectionStore, lib, rfId: flowId, nodeLookup, connection: connectionState } = store.getState();
    if (!nodeId || !connectionClickStartHandle && !isConnectableStart) {
      return;
    }
    if (!connectionClickStartHandle) {
      onClickConnectStart?.(event.nativeEvent, { nodeId, handleId, handleType: type });
      store.setState({ connectionClickStartHandle: { nodeId, type, id: handleId } });
      return;
    }
    const doc = getHostForElement(event.target);
    const isValidConnectionHandler = isValidConnection || isValidConnectionStore;
    const { connection, isValid } = XYHandle.isValid(event.nativeEvent, {
      handle: {
        nodeId,
        id: handleId,
        type
      },
      connectionMode,
      fromNodeId: connectionClickStartHandle.nodeId,
      fromHandleId: connectionClickStartHandle.id || null,
      fromType: connectionClickStartHandle.type,
      isValidConnection: isValidConnectionHandler,
      flowId,
      doc,
      lib,
      nodeLookup
    });
    if (isValid && connection) {
      onConnectExtended(connection);
    }
    const connectionClone = structuredClone(connectionState);
    delete connectionClone.inProgress;
    connectionClone.toPosition = connectionClone.toHandle ? connectionClone.toHandle.position : null;
    onClickConnectEnd?.(event, connectionClone);
    store.setState({ connectionClickStartHandle: null });
  };
  return (0, import_jsx_runtime.jsx)("div", { "data-handleid": handleId, "data-nodeid": nodeId, "data-handlepos": position, "data-id": `${rfId}-${nodeId}-${handleId}-${type}`, className: cc([
    "react-flow__handle",
    `react-flow__handle-${position}`,
    "nodrag",
    noPanClassName,
    className,
    {
      source: !isTarget,
      target: isTarget,
      connectable: isConnectable,
      connectablestart: isConnectableStart,
      connectableend: isConnectableEnd,
      clickconnecting: clickConnecting,
      connectingfrom: connectingFrom,
      connectingto: connectingTo,
      valid,
      /*
       * shows where you can start a connection from
       * and where you can end it while connecting
       */
      connectionindicator: isConnectable && (!connectionInProcess || isPossibleEndHandle) && (connectionInProcess || clickConnectionInProcess ? isConnectableEnd : isConnectableStart)
    }
  ]), onMouseDown: onPointerDown2, onTouchStart: onPointerDown2, onClick: connectOnClick ? onClick : void 0, ref, ...rest, children: children2 });
}
var Handle = (0, import_react4.memo)(fixedForwardRef(HandleComponent));
function InputNode({ data, isConnectable, sourcePosition = Position.Bottom }) {
  return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [data?.label, (0, import_jsx_runtime.jsx)(Handle, { type: "source", position: sourcePosition, isConnectable })] });
}
function DefaultNode({ data, isConnectable, targetPosition = Position.Top, sourcePosition = Position.Bottom }) {
  return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)(Handle, { type: "target", position: targetPosition, isConnectable }), data?.label, (0, import_jsx_runtime.jsx)(Handle, { type: "source", position: sourcePosition, isConnectable })] });
}
function GroupNode() {
  return null;
}
function OutputNode({ data, isConnectable, targetPosition = Position.Top }) {
  return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)(Handle, { type: "target", position: targetPosition, isConnectable }), data?.label] });
}
var arrowKeyDiffs = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};
var builtinNodeTypes = {
  input: InputNode,
  default: DefaultNode,
  output: OutputNode,
  group: GroupNode
};
function getNodeInlineStyleDimensions(node) {
  if (node.internals.handleBounds === void 0) {
    return {
      width: node.width ?? node.initialWidth ?? node.style?.width,
      height: node.height ?? node.initialHeight ?? node.style?.height
    };
  }
  return {
    width: node.width ?? node.style?.width,
    height: node.height ?? node.style?.height
  };
}
var selector$e = (s) => {
  const { width, height, x, y } = getInternalNodesBounds(s.nodeLookup, {
    filter: (node) => !!node.selected
  });
  return {
    width: isNumeric(width) ? width : null,
    height: isNumeric(height) ? height : null,
    userSelectionActive: s.userSelectionActive,
    transformString: `translate(${s.transform[0]}px,${s.transform[1]}px) scale(${s.transform[2]}) translate(${x}px,${y}px)`
  };
};
function NodesSelection({ onSelectionContextMenu, noPanClassName, disableKeyboardA11y }) {
  const store = useStoreApi();
  const { width, height, transformString, userSelectionActive } = useStore(selector$e, shallow$1);
  const moveSelectedNodes = useMoveSelectedNodes();
  const nodeRef = (0, import_react4.useRef)(null);
  (0, import_react4.useEffect)(() => {
    if (!disableKeyboardA11y) {
      nodeRef.current?.focus({
        preventScroll: true
      });
    }
  }, [disableKeyboardA11y]);
  const shouldRender = !userSelectionActive && width !== null && height !== null;
  useDrag({
    nodeRef,
    disabled: !shouldRender
  });
  if (!shouldRender) {
    return null;
  }
  const onContextMenu = onSelectionContextMenu ? (event) => {
    const selectedNodes = store.getState().nodes.filter((n) => n.selected);
    onSelectionContextMenu(event, selectedNodes);
  } : void 0;
  const onKeyDown = (event) => {
    if (Object.prototype.hasOwnProperty.call(arrowKeyDiffs, event.key)) {
      event.preventDefault();
      moveSelectedNodes({
        direction: arrowKeyDiffs[event.key],
        factor: event.shiftKey ? 4 : 1
      });
    }
  };
  return (0, import_jsx_runtime.jsx)("div", { className: cc(["react-flow__nodesselection", "react-flow__container", noPanClassName]), style: {
    transform: transformString
  }, children: (0, import_jsx_runtime.jsx)("div", { ref: nodeRef, className: "react-flow__nodesselection-rect", onContextMenu, tabIndex: disableKeyboardA11y ? void 0 : -1, onKeyDown: disableKeyboardA11y ? void 0 : onKeyDown, style: {
    width,
    height
  } }) });
}
var win = typeof window !== "undefined" ? window : void 0;
var selector$d = (s) => {
  return { nodesSelectionActive: s.nodesSelectionActive, userSelectionActive: s.userSelectionActive };
};
function FlowRendererComponent({ children: children2, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneContextMenu, onPaneScroll, paneClickDistance, deleteKeyCode, selectionKeyCode, selectionOnDrag, selectionMode, onSelectionStart, onSelectionEnd, multiSelectionKeyCode, panActivationKeyCode, zoomActivationKeyCode, elementsSelectable, zoomOnScroll, zoomOnPinch, panOnScroll: _panOnScroll, panOnScrollSpeed, panOnScrollMode, zoomOnDoubleClick, panOnDrag: _panOnDrag, autoPanOnSelection, defaultViewport: defaultViewport2, translateExtent, minZoom, maxZoom, preventScrolling, onSelectionContextMenu, noWheelClassName, noPanClassName, disableKeyboardA11y, onViewportChange, isControlledViewport }) {
  const { nodesSelectionActive, userSelectionActive } = useStore(selector$d, shallow$1);
  const selectionKeyPressed = useKeyPress(selectionKeyCode, { target: win });
  const panActivationKeyPressed = useKeyPress(panActivationKeyCode, { target: win });
  const panOnDrag = panActivationKeyPressed || _panOnDrag;
  const panOnScroll = panActivationKeyPressed || _panOnScroll;
  const _selectionOnDrag = selectionOnDrag && panOnDrag !== true;
  const isSelecting = selectionKeyPressed || userSelectionActive || _selectionOnDrag;
  useGlobalKeyHandler({ deleteKeyCode, multiSelectionKeyCode });
  return (0, import_jsx_runtime.jsx)(ZoomPane, { onPaneContextMenu, elementsSelectable, zoomOnScroll, zoomOnPinch, panOnScroll, panActivationKeyPressed, panOnScrollSpeed, panOnScrollMode, zoomOnDoubleClick, panOnDrag: !selectionKeyPressed && panOnDrag, defaultViewport: defaultViewport2, translateExtent, minZoom, maxZoom, zoomActivationKeyCode, preventScrolling, noWheelClassName, noPanClassName, onViewportChange, isControlledViewport, paneClickDistance, selectionOnDrag: _selectionOnDrag, children: (0, import_jsx_runtime.jsxs)(Pane, { onSelectionStart, onSelectionEnd, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneContextMenu, onPaneScroll, panOnDrag, autoPanOnSelection, isSelecting: !!isSelecting, selectionMode, selectionKeyPressed, paneClickDistance, selectionOnDrag: _selectionOnDrag, children: [children2, nodesSelectionActive && (0, import_jsx_runtime.jsx)(NodesSelection, { onSelectionContextMenu, noPanClassName, disableKeyboardA11y })] }) });
}
FlowRendererComponent.displayName = "FlowRenderer";
var FlowRenderer = (0, import_react4.memo)(FlowRendererComponent);
var selector$c = (onlyRenderVisible) => (s) => {
  return onlyRenderVisible ? getNodesInside(s.nodeLookup, { x: 0, y: 0, width: s.width, height: s.height }, s.transform, true).map((node) => node.id) : Array.from(s.nodeLookup.keys());
};
function useVisibleNodeIds(onlyRenderVisible) {
  const nodeIds = useStore((0, import_react4.useCallback)(selector$c(onlyRenderVisible), [onlyRenderVisible]), shallow$1);
  return nodeIds;
}
var selector$b = (s) => s.updateNodeInternals;
function useResizeObserver() {
  const updateNodeInternals2 = useStore(selector$b);
  const [resizeObserver] = (0, import_react4.useState)(() => {
    if (typeof ResizeObserver === "undefined") {
      return null;
    }
    return new ResizeObserver((entries) => {
      const updates = /* @__PURE__ */ new Map();
      entries.forEach((entry) => {
        const id2 = entry.target.getAttribute("data-id");
        updates.set(id2, {
          id: id2,
          nodeElement: entry.target,
          force: true
        });
      });
      updateNodeInternals2(updates);
    });
  });
  (0, import_react4.useEffect)(() => {
    return () => {
      resizeObserver?.disconnect();
    };
  }, [resizeObserver]);
  return resizeObserver;
}
function useNodeObserver({ node, nodeType, hasDimensions, resizeObserver }) {
  const store = useStoreApi();
  const nodeRef = (0, import_react4.useRef)(null);
  const observedNode = (0, import_react4.useRef)(null);
  const prevSourcePosition = (0, import_react4.useRef)(node.sourcePosition);
  const prevTargetPosition = (0, import_react4.useRef)(node.targetPosition);
  const prevType = (0, import_react4.useRef)(nodeType);
  const isInitialized = hasDimensions && !!node.internals.handleBounds;
  (0, import_react4.useEffect)(() => {
    if (nodeRef.current && !node.hidden && (!isInitialized || observedNode.current !== nodeRef.current)) {
      if (observedNode.current) {
        resizeObserver?.unobserve(observedNode.current);
      }
      resizeObserver?.observe(nodeRef.current);
      observedNode.current = nodeRef.current;
    }
  }, [isInitialized, node.hidden]);
  (0, import_react4.useEffect)(() => {
    return () => {
      if (observedNode.current) {
        resizeObserver?.unobserve(observedNode.current);
        observedNode.current = null;
      }
    };
  }, []);
  (0, import_react4.useEffect)(() => {
    if (nodeRef.current) {
      const typeChanged = prevType.current !== nodeType;
      const sourcePosChanged = prevSourcePosition.current !== node.sourcePosition;
      const targetPosChanged = prevTargetPosition.current !== node.targetPosition;
      if (typeChanged || sourcePosChanged || targetPosChanged) {
        prevType.current = nodeType;
        prevSourcePosition.current = node.sourcePosition;
        prevTargetPosition.current = node.targetPosition;
        store.getState().updateNodeInternals(/* @__PURE__ */ new Map([[node.id, { id: node.id, nodeElement: nodeRef.current, force: true }]]));
      }
    }
  }, [node.id, nodeType, node.sourcePosition, node.targetPosition]);
  return nodeRef;
}
function NodeWrapper({ id: id2, onClick, onMouseEnter, onMouseMove, onMouseLeave, onContextMenu, onDoubleClick, nodesDraggable, elementsSelectable, nodesConnectable, nodesFocusable, resizeObserver, noDragClassName, noPanClassName, disableKeyboardA11y, rfId, nodeTypes: nodeTypes2, nodeClickDistance, onError }) {
  const { node, internals, isParent } = useStore((s) => {
    const node2 = s.nodeLookup.get(id2);
    const isParent2 = s.parentLookup.has(id2);
    return {
      node: node2,
      internals: node2.internals,
      isParent: isParent2
    };
  }, shallow$1);
  let nodeType = node.type || "default";
  let NodeComponent = nodeTypes2?.[nodeType] || builtinNodeTypes[nodeType];
  if (NodeComponent === void 0) {
    onError?.("003", errorMessages["error003"](nodeType));
    nodeType = "default";
    NodeComponent = nodeTypes2?.["default"] || builtinNodeTypes.default;
  }
  const isDraggable = !!(node.draggable || nodesDraggable && typeof node.draggable === "undefined");
  const isSelectable = !!(node.selectable || elementsSelectable && typeof node.selectable === "undefined");
  const isConnectable = !!(node.connectable || nodesConnectable && typeof node.connectable === "undefined");
  const isFocusable = !!(node.focusable || nodesFocusable && typeof node.focusable === "undefined");
  const store = useStoreApi();
  const hasDimensions = nodeHasDimensions(node);
  const nodeRef = useNodeObserver({ node, nodeType, hasDimensions, resizeObserver });
  const dragging = useDrag({
    nodeRef,
    disabled: node.hidden || !isDraggable,
    noDragClassName,
    handleSelector: node.dragHandle,
    nodeId: id2,
    isSelectable,
    nodeClickDistance
  });
  const moveSelectedNodes = useMoveSelectedNodes();
  if (node.hidden) {
    return null;
  }
  const nodeDimensions = getNodeDimensions(node);
  const inlineDimensions = getNodeInlineStyleDimensions(node);
  const hasPointerEvents = isSelectable || isDraggable || onClick || onMouseEnter || onMouseMove || onMouseLeave;
  const onMouseEnterHandler = onMouseEnter ? (event) => onMouseEnter(event, { ...internals.userNode }) : void 0;
  const onMouseMoveHandler = onMouseMove ? (event) => onMouseMove(event, { ...internals.userNode }) : void 0;
  const onMouseLeaveHandler = onMouseLeave ? (event) => onMouseLeave(event, { ...internals.userNode }) : void 0;
  const onContextMenuHandler = onContextMenu ? (event) => onContextMenu(event, { ...internals.userNode }) : void 0;
  const onDoubleClickHandler = onDoubleClick ? (event) => onDoubleClick(event, { ...internals.userNode }) : void 0;
  const onSelectNodeHandler = (event) => {
    const { selectNodesOnDrag, nodeDragThreshold } = store.getState();
    if (isSelectable && (!selectNodesOnDrag || !isDraggable || nodeDragThreshold > 0)) {
      handleNodeClick({
        id: id2,
        store,
        nodeRef
      });
    }
    if (onClick) {
      onClick(event, { ...internals.userNode });
    }
  };
  const onKeyDown = (event) => {
    if (isInputDOMNode(event.nativeEvent) || disableKeyboardA11y) {
      return;
    }
    if (elementSelectionKeys.includes(event.key) && isSelectable) {
      const unselect = event.key === "Escape";
      handleNodeClick({
        id: id2,
        store,
        unselect,
        nodeRef
      });
    } else if (isDraggable && node.selected && Object.prototype.hasOwnProperty.call(arrowKeyDiffs, event.key)) {
      event.preventDefault();
      const { ariaLabelConfig } = store.getState();
      store.setState({
        ariaLiveMessage: ariaLabelConfig["node.a11yDescription.ariaLiveMessage"]({
          direction: event.key.replace("Arrow", "").toLowerCase(),
          x: ~~internals.positionAbsolute.x,
          y: ~~internals.positionAbsolute.y
        })
      });
      moveSelectedNodes({
        direction: arrowKeyDiffs[event.key],
        factor: event.shiftKey ? 4 : 1
      });
    }
  };
  const onFocus = () => {
    if (disableKeyboardA11y || !nodeRef.current?.matches(":focus-visible")) {
      return;
    }
    const { transform: transform2, width, height, autoPanOnNodeFocus, setCenter } = store.getState();
    if (!autoPanOnNodeFocus) {
      return;
    }
    const withinViewport = getNodesInside(/* @__PURE__ */ new Map([[id2, node]]), { x: 0, y: 0, width, height }, transform2, true).length > 0;
    if (!withinViewport) {
      setCenter(node.position.x + nodeDimensions.width / 2, node.position.y + nodeDimensions.height / 2, {
        zoom: transform2[2]
      });
    }
  };
  return (0, import_jsx_runtime.jsx)("div", { className: cc([
    "react-flow__node",
    `react-flow__node-${nodeType}`,
    {
      // this is overwritable by passing `nopan` as a class name
      [noPanClassName]: isDraggable
    },
    node.className,
    {
      selected: node.selected,
      selectable: isSelectable,
      parent: isParent,
      draggable: isDraggable,
      dragging
    }
  ]), ref: nodeRef, style: {
    zIndex: internals.z,
    transform: `translate(${internals.positionAbsolute.x}px,${internals.positionAbsolute.y}px)`,
    pointerEvents: hasPointerEvents ? "all" : "none",
    visibility: hasDimensions ? "visible" : "hidden",
    ...node.style,
    ...inlineDimensions
  }, "data-id": id2, "data-testid": `rf__node-${id2}`, onMouseEnter: onMouseEnterHandler, onMouseMove: onMouseMoveHandler, onMouseLeave: onMouseLeaveHandler, onContextMenu: onContextMenuHandler, onClick: onSelectNodeHandler, onDoubleClick: onDoubleClickHandler, onKeyDown: isFocusable ? onKeyDown : void 0, tabIndex: isFocusable ? 0 : void 0, onFocus: isFocusable ? onFocus : void 0, role: node.ariaRole ?? (isFocusable ? "group" : void 0), "aria-roledescription": "node", "aria-describedby": disableKeyboardA11y ? void 0 : `${ARIA_NODE_DESC_KEY}-${rfId}`, "aria-label": node.ariaLabel, ...node.domAttributes, children: (0, import_jsx_runtime.jsx)(Provider, { value: id2, children: (0, import_jsx_runtime.jsx)(NodeComponent, { id: id2, data: node.data, type: nodeType, positionAbsoluteX: internals.positionAbsolute.x, positionAbsoluteY: internals.positionAbsolute.y, selected: node.selected ?? false, selectable: isSelectable, draggable: isDraggable, deletable: node.deletable ?? true, isConnectable, sourcePosition: node.sourcePosition, targetPosition: node.targetPosition, dragging, dragHandle: node.dragHandle, zIndex: internals.z, parentId: node.parentId, ...nodeDimensions }) }) });
}
var NodeWrapper$1 = (0, import_react4.memo)(NodeWrapper);
var selector$a = (s) => ({
  nodesConnectable: s.nodesConnectable,
  nodesFocusable: s.nodesFocusable,
  elementsSelectable: s.elementsSelectable,
  onError: s.onError
});
function NodeRendererComponent(props) {
  const { nodesConnectable, nodesFocusable, elementsSelectable, onError } = useStore(selector$a, shallow$1);
  const nodeIds = useVisibleNodeIds(props.onlyRenderVisibleElements);
  const resizeObserver = useResizeObserver();
  return (0, import_jsx_runtime.jsx)("div", { className: "react-flow__nodes", style: containerStyle, children: nodeIds.map((nodeId) => {
    return (
      /*
       * The split of responsibilities between NodeRenderer and
       * NodeComponentWrapper may appear weird. However, it’s designed to
       * minimize the cost of updates when individual nodes change.
       *
       * For example, when you’re dragging a single node, that node gets
       * updated multiple times per second. If `NodeRenderer` were to update
       * every time, it would have to re-run the `nodes.map()` loop every
       * time. This gets pricey with hundreds of nodes, especially if every
       * loop cycle does more than just rendering a JSX element!
       *
       * As a result of this choice, we took the following implementation
       * decisions:
       * - NodeRenderer subscribes *only* to node IDs – and therefore
       *   rerender *only* when visible nodes are added or removed.
       * - NodeRenderer performs all operations the result of which can be
       *   shared between nodes (such as creating the `ResizeObserver`
       *   instance, or subscribing to `selector`). This means extra prop
       *   drilling into `NodeComponentWrapper`, but it means we need to run
       *   these operations only once – instead of once per node.
       * - Any operations that you’d normally write inside `nodes.map` are
       *   moved into `NodeComponentWrapper`. This ensures they are
       *   memorized – so if `NodeRenderer` *has* to rerender, it only
       *   needs to regenerate the list of nodes, nothing else.
       */
      (0, import_jsx_runtime.jsx)(NodeWrapper$1, { id: nodeId, nodeTypes: props.nodeTypes, nodeExtent: props.nodeExtent, onClick: props.onNodeClick, onMouseEnter: props.onNodeMouseEnter, onMouseMove: props.onNodeMouseMove, onMouseLeave: props.onNodeMouseLeave, onContextMenu: props.onNodeContextMenu, onDoubleClick: props.onNodeDoubleClick, noDragClassName: props.noDragClassName, noPanClassName: props.noPanClassName, rfId: props.rfId, disableKeyboardA11y: props.disableKeyboardA11y, resizeObserver, nodesDraggable: props.nodesDraggable ?? true, nodesConnectable, nodesFocusable, elementsSelectable, nodeClickDistance: props.nodeClickDistance, onError }, nodeId)
    );
  }) });
}
NodeRendererComponent.displayName = "NodeRenderer";
var NodeRenderer = (0, import_react4.memo)(NodeRendererComponent);
function useVisibleEdgeIds(onlyRenderVisible) {
  const edgeIds = useStore((0, import_react4.useCallback)((s) => {
    if (!onlyRenderVisible) {
      return s.edges.map((edge) => edge.id);
    }
    const visibleEdgeIds = [];
    if (s.width && s.height) {
      for (const edge of s.edges) {
        const sourceNode = s.nodeLookup.get(edge.source);
        const targetNode = s.nodeLookup.get(edge.target);
        if (sourceNode && targetNode && isEdgeVisible({
          sourceNode,
          targetNode,
          width: s.width,
          height: s.height,
          transform: s.transform
        })) {
          visibleEdgeIds.push(edge.id);
        }
      }
    }
    return visibleEdgeIds;
  }, [onlyRenderVisible]), shallow$1);
  return edgeIds;
}
var ArrowSymbol = ({ color: color2 = "none", strokeWidth = 1 }) => {
  const style2 = {
    strokeWidth,
    ...color2 && { stroke: color2 }
  };
  return (0, import_jsx_runtime.jsx)("polyline", { className: "arrow", style: style2, strokeLinecap: "round", fill: "none", strokeLinejoin: "round", points: "-5,-4 0,0 -5,4" });
};
var ArrowClosedSymbol = ({ color: color2 = "none", strokeWidth = 1 }) => {
  const style2 = {
    strokeWidth,
    ...color2 && { stroke: color2, fill: color2 }
  };
  return (0, import_jsx_runtime.jsx)("polyline", { className: "arrowclosed", style: style2, strokeLinecap: "round", strokeLinejoin: "round", points: "-5,-4 0,0 -5,4 -5,-4" });
};
var MarkerSymbols = {
  [MarkerType.Arrow]: ArrowSymbol,
  [MarkerType.ArrowClosed]: ArrowClosedSymbol
};
function useMarkerSymbol(type) {
  const store = useStoreApi();
  const symbol = (0, import_react4.useMemo)(() => {
    const symbolExists = Object.prototype.hasOwnProperty.call(MarkerSymbols, type);
    if (!symbolExists) {
      store.getState().onError?.("009", errorMessages["error009"](type));
      return null;
    }
    return MarkerSymbols[type];
  }, [type]);
  return symbol;
}
var Marker = ({ id: id2, type, color: color2, width = 12.5, height = 12.5, markerUnits = "strokeWidth", strokeWidth, orient = "auto-start-reverse" }) => {
  const Symbol2 = useMarkerSymbol(type);
  if (!Symbol2) {
    return null;
  }
  return (0, import_jsx_runtime.jsx)("marker", { className: "react-flow__arrowhead", id: id2, markerWidth: `${width}`, markerHeight: `${height}`, viewBox: "-10 -10 20 20", markerUnits, orient, refX: "0", refY: "0", children: (0, import_jsx_runtime.jsx)(Symbol2, { color: color2, strokeWidth }) });
};
var MarkerDefinitions = ({ defaultColor, rfId }) => {
  const edges = useStore((s) => s.edges);
  const defaultEdgeOptions = useStore((s) => s.defaultEdgeOptions);
  const markers = (0, import_react4.useMemo)(() => {
    const markers2 = createMarkerIds(edges, {
      id: rfId,
      defaultColor,
      defaultMarkerStart: defaultEdgeOptions?.markerStart,
      defaultMarkerEnd: defaultEdgeOptions?.markerEnd
    });
    return markers2;
  }, [edges, defaultEdgeOptions, rfId, defaultColor]);
  if (!markers.length) {
    return null;
  }
  return (0, import_jsx_runtime.jsx)("svg", { className: "react-flow__marker", "aria-hidden": "true", children: (0, import_jsx_runtime.jsx)("defs", { children: markers.map((marker) => (0, import_jsx_runtime.jsx)(Marker, { id: marker.id, type: marker.type, color: marker.color, width: marker.width, height: marker.height, markerUnits: marker.markerUnits, strokeWidth: marker.strokeWidth, orient: marker.orient }, marker.id)) }) });
};
MarkerDefinitions.displayName = "MarkerDefinitions";
var MarkerDefinitions$1 = (0, import_react4.memo)(MarkerDefinitions);
function EdgeTextComponent({ x, y, label, labelStyle, labelShowBg = true, labelBgStyle, labelBgPadding = [2, 4], labelBgBorderRadius = 2, children: children2, className, ...rest }) {
  const [edgeTextBbox, setEdgeTextBbox] = (0, import_react4.useState)({ x: 1, y: 0, width: 0, height: 0 });
  const edgeTextClasses = cc(["react-flow__edge-textwrapper", className]);
  const edgeTextRef = (0, import_react4.useRef)(null);
  (0, import_react4.useEffect)(() => {
    if (edgeTextRef.current) {
      const textBbox = edgeTextRef.current.getBBox();
      setEdgeTextBbox({
        x: textBbox.x,
        y: textBbox.y,
        width: textBbox.width,
        height: textBbox.height
      });
    }
  }, [label]);
  if (!label) {
    return null;
  }
  return (0, import_jsx_runtime.jsxs)("g", { transform: `translate(${x - edgeTextBbox.width / 2} ${y - edgeTextBbox.height / 2})`, className: edgeTextClasses, visibility: edgeTextBbox.width ? "visible" : "hidden", ...rest, children: [labelShowBg && (0, import_jsx_runtime.jsx)("rect", { width: edgeTextBbox.width + 2 * labelBgPadding[0], x: -labelBgPadding[0], y: -labelBgPadding[1], height: edgeTextBbox.height + 2 * labelBgPadding[1], className: "react-flow__edge-textbg", style: labelBgStyle, rx: labelBgBorderRadius, ry: labelBgBorderRadius }), (0, import_jsx_runtime.jsx)("text", { className: "react-flow__edge-text", y: edgeTextBbox.height / 2, dy: "0.3em", ref: edgeTextRef, style: labelStyle, children: label }), children2] });
}
EdgeTextComponent.displayName = "EdgeText";
var EdgeText = (0, import_react4.memo)(EdgeTextComponent);
function BaseEdge({ path, labelX, labelY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, interactionWidth = 20, ...props }) {
  return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)("path", { ...props, d: path, fill: "none", className: cc(["react-flow__edge-path", props.className]) }), interactionWidth ? (0, import_jsx_runtime.jsx)("path", { d: path, fill: "none", strokeOpacity: 0, strokeWidth: interactionWidth, className: "react-flow__edge-interaction" }) : null, label && isNumeric(labelX) && isNumeric(labelY) ? (0, import_jsx_runtime.jsx)(EdgeText, { x: labelX, y: labelY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius }) : null] });
}
function getControl({ pos, x1, y1, x2, y2 }) {
  if (pos === Position.Left || pos === Position.Right) {
    return [0.5 * (x1 + x2), y1];
  }
  return [x1, 0.5 * (y1 + y2)];
}
function getSimpleBezierPath({ sourceX, sourceY, sourcePosition = Position.Bottom, targetX, targetY, targetPosition = Position.Top }) {
  const [sourceControlX, sourceControlY] = getControl({
    pos: sourcePosition,
    x1: sourceX,
    y1: sourceY,
    x2: targetX,
    y2: targetY
  });
  const [targetControlX, targetControlY] = getControl({
    pos: targetPosition,
    x1: targetX,
    y1: targetY,
    x2: sourceX,
    y2: sourceY
  });
  const [labelX, labelY, offsetX, offsetY] = getBezierEdgeCenter({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourceControlX,
    sourceControlY,
    targetControlX,
    targetControlY
  });
  return [
    `M${sourceX},${sourceY} C${sourceControlX},${sourceControlY} ${targetControlX},${targetControlY} ${targetX},${targetY}`,
    labelX,
    labelY,
    offsetX,
    offsetY
  ];
}
function createSimpleBezierEdge(params) {
  return (0, import_react4.memo)(({ id: id2, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style: style2, markerEnd, markerStart, interactionWidth }) => {
    const [path, labelX, labelY] = getSimpleBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition
    });
    const _id = params.isInternal ? void 0 : id2;
    return (0, import_jsx_runtime.jsx)(BaseEdge, { id: _id, path, labelX, labelY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style: style2, markerEnd, markerStart, interactionWidth });
  });
}
var SimpleBezierEdge = createSimpleBezierEdge({ isInternal: false });
var SimpleBezierEdgeInternal = createSimpleBezierEdge({ isInternal: true });
SimpleBezierEdge.displayName = "SimpleBezierEdge";
SimpleBezierEdgeInternal.displayName = "SimpleBezierEdgeInternal";
function createSmoothStepEdge(params) {
  return (0, import_react4.memo)(({ id: id2, sourceX, sourceY, targetX, targetY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style: style2, sourcePosition = Position.Bottom, targetPosition = Position.Top, markerEnd, markerStart, pathOptions, interactionWidth }) => {
    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: pathOptions?.borderRadius,
      offset: pathOptions?.offset,
      stepPosition: pathOptions?.stepPosition
    });
    const _id = params.isInternal ? void 0 : id2;
    return (0, import_jsx_runtime.jsx)(BaseEdge, { id: _id, path, labelX, labelY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style: style2, markerEnd, markerStart, interactionWidth });
  });
}
var SmoothStepEdge = createSmoothStepEdge({ isInternal: false });
var SmoothStepEdgeInternal = createSmoothStepEdge({ isInternal: true });
SmoothStepEdge.displayName = "SmoothStepEdge";
SmoothStepEdgeInternal.displayName = "SmoothStepEdgeInternal";
function createStepEdge(params) {
  return (0, import_react4.memo)(({ id: id2, ...props }) => {
    const _id = params.isInternal ? void 0 : id2;
    return (0, import_jsx_runtime.jsx)(SmoothStepEdge, { ...props, id: _id, pathOptions: (0, import_react4.useMemo)(() => ({ borderRadius: 0, offset: props.pathOptions?.offset }), [props.pathOptions?.offset]) });
  });
}
var StepEdge = createStepEdge({ isInternal: false });
var StepEdgeInternal = createStepEdge({ isInternal: true });
StepEdge.displayName = "StepEdge";
StepEdgeInternal.displayName = "StepEdgeInternal";
function createStraightEdge(params) {
  return (0, import_react4.memo)(({ id: id2, sourceX, sourceY, targetX, targetY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style: style2, markerEnd, markerStart, interactionWidth }) => {
    const [path, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
    const _id = params.isInternal ? void 0 : id2;
    return (0, import_jsx_runtime.jsx)(BaseEdge, { id: _id, path, labelX, labelY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style: style2, markerEnd, markerStart, interactionWidth });
  });
}
var StraightEdge = createStraightEdge({ isInternal: false });
var StraightEdgeInternal = createStraightEdge({ isInternal: true });
StraightEdge.displayName = "StraightEdge";
StraightEdgeInternal.displayName = "StraightEdgeInternal";
function createBezierEdge(params) {
  return (0, import_react4.memo)(({ id: id2, sourceX, sourceY, targetX, targetY, sourcePosition = Position.Bottom, targetPosition = Position.Top, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style: style2, markerEnd, markerStart, pathOptions, interactionWidth }) => {
    const [path, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: pathOptions?.curvature
    });
    const _id = params.isInternal ? void 0 : id2;
    return (0, import_jsx_runtime.jsx)(BaseEdge, { id: _id, path, labelX, labelY, label, labelStyle, labelShowBg, labelBgStyle, labelBgPadding, labelBgBorderRadius, style: style2, markerEnd, markerStart, interactionWidth });
  });
}
var BezierEdge = createBezierEdge({ isInternal: false });
var BezierEdgeInternal = createBezierEdge({ isInternal: true });
BezierEdge.displayName = "BezierEdge";
BezierEdgeInternal.displayName = "BezierEdgeInternal";
var builtinEdgeTypes = {
  default: BezierEdgeInternal,
  straight: StraightEdgeInternal,
  step: StepEdgeInternal,
  smoothstep: SmoothStepEdgeInternal,
  simplebezier: SimpleBezierEdgeInternal
};
var nullPosition = {
  sourceX: null,
  sourceY: null,
  targetX: null,
  targetY: null,
  sourcePosition: null,
  targetPosition: null,
  zIndex: void 0
};
var shiftX = (x, shift, position) => {
  if (position === Position.Left)
    return x - shift;
  if (position === Position.Right)
    return x + shift;
  return x;
};
var shiftY = (y, shift, position) => {
  if (position === Position.Top)
    return y - shift;
  if (position === Position.Bottom)
    return y + shift;
  return y;
};
var EdgeUpdaterClassName = "react-flow__edgeupdater";
function EdgeAnchor({ position, centerX, centerY, radius = 10, onMouseDown, onMouseEnter, onMouseOut, type }) {
  return (0, import_jsx_runtime.jsx)("circle", { onMouseDown, onMouseEnter, onMouseOut, className: cc([EdgeUpdaterClassName, `${EdgeUpdaterClassName}-${type}`]), cx: shiftX(centerX, radius, position), cy: shiftY(centerY, radius, position), r: radius, stroke: "transparent", fill: "transparent" });
}
function EdgeUpdateAnchors({ isReconnectable, reconnectRadius, edge, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, onReconnect, onReconnectStart, onReconnectEnd, setReconnecting, setUpdateHover }) {
  const store = useStoreApi();
  const handleEdgeUpdater = (event, oppositeHandle) => {
    if (event.button !== 0) {
      return;
    }
    const { autoPanOnConnect, domNode, connectionMode, connectionRadius, lib, onConnectStart, cancelConnection, nodeLookup, rfId: flowId, panBy: panBy2, updateConnection } = store.getState();
    const isTarget = oppositeHandle.type === "target";
    const _onReconnectEnd = (evt, connectionState) => {
      setReconnecting(false);
      onReconnectEnd?.(evt, edge, oppositeHandle.type, connectionState);
    };
    const onConnectEdge = (connection) => onReconnect?.(edge, connection);
    const _onConnectStart = (_event, params) => {
      setReconnecting(true);
      onReconnectStart?.(event, edge, oppositeHandle.type);
      onConnectStart?.(_event, params);
    };
    XYHandle.onPointerDown(event.nativeEvent, {
      autoPanOnConnect,
      connectionMode,
      connectionRadius,
      domNode,
      handleId: oppositeHandle.id,
      nodeId: oppositeHandle.nodeId,
      nodeLookup,
      isTarget,
      edgeUpdaterType: oppositeHandle.type,
      lib,
      flowId,
      cancelConnection,
      panBy: panBy2,
      isValidConnection: (...args) => store.getState().isValidConnection?.(...args) ?? true,
      onConnect: onConnectEdge,
      onConnectStart: _onConnectStart,
      onConnectEnd: (...args) => store.getState().onConnectEnd?.(...args),
      onReconnectEnd: _onReconnectEnd,
      updateConnection,
      getTransform: () => store.getState().transform,
      getFromHandle: () => store.getState().connection.fromHandle,
      dragThreshold: store.getState().connectionDragThreshold,
      handleDomNode: event.currentTarget
    });
  };
  const onReconnectSourceMouseDown = (event) => handleEdgeUpdater(event, { nodeId: edge.target, id: edge.targetHandle ?? null, type: "target" });
  const onReconnectTargetMouseDown = (event) => handleEdgeUpdater(event, { nodeId: edge.source, id: edge.sourceHandle ?? null, type: "source" });
  const onReconnectMouseEnter = () => setUpdateHover(true);
  const onReconnectMouseOut = () => setUpdateHover(false);
  return (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(isReconnectable === true || isReconnectable === "source") && (0, import_jsx_runtime.jsx)(EdgeAnchor, { position: sourcePosition, centerX: sourceX, centerY: sourceY, radius: reconnectRadius, onMouseDown: onReconnectSourceMouseDown, onMouseEnter: onReconnectMouseEnter, onMouseOut: onReconnectMouseOut, type: "source" }), (isReconnectable === true || isReconnectable === "target") && (0, import_jsx_runtime.jsx)(EdgeAnchor, { position: targetPosition, centerX: targetX, centerY: targetY, radius: reconnectRadius, onMouseDown: onReconnectTargetMouseDown, onMouseEnter: onReconnectMouseEnter, onMouseOut: onReconnectMouseOut, type: "target" })] });
}
function EdgeWrapper({ id: id2, edgesFocusable, edgesReconnectable, elementsSelectable, onClick, onDoubleClick, onContextMenu, onMouseEnter, onMouseMove, onMouseLeave, reconnectRadius, onReconnect, onReconnectStart, onReconnectEnd, rfId, edgeTypes: edgeTypes2, noPanClassName, onError, disableKeyboardA11y }) {
  let edge = useStore((s) => s.edgeLookup.get(id2));
  const defaultEdgeOptions = useStore((s) => s.defaultEdgeOptions);
  edge = defaultEdgeOptions ? { ...defaultEdgeOptions, ...edge } : edge;
  let edgeType = edge.type || "default";
  let EdgeComponent = edgeTypes2?.[edgeType] || builtinEdgeTypes[edgeType];
  if (EdgeComponent === void 0) {
    onError?.("011", errorMessages["error011"](edgeType));
    edgeType = "default";
    EdgeComponent = edgeTypes2?.["default"] || builtinEdgeTypes.default;
  }
  const isFocusable = !!(edge.focusable || edgesFocusable && typeof edge.focusable === "undefined");
  const isReconnectable = typeof onReconnect !== "undefined" && (edge.reconnectable || edgesReconnectable && typeof edge.reconnectable === "undefined");
  const isSelectable = !!(edge.selectable || elementsSelectable && typeof edge.selectable === "undefined");
  const edgeRef = (0, import_react4.useRef)(null);
  const [updateHover, setUpdateHover] = (0, import_react4.useState)(false);
  const [reconnecting, setReconnecting] = (0, import_react4.useState)(false);
  const store = useStoreApi();
  const { zIndex = edge.zIndex, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = useStore((0, import_react4.useCallback)((store2) => {
    const sourceNode = store2.nodeLookup.get(edge.source);
    const targetNode = store2.nodeLookup.get(edge.target);
    if (!sourceNode || !targetNode) {
      return nullPosition;
    }
    const edgePosition = getEdgePosition({
      id: id2,
      sourceNode,
      targetNode,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
      connectionMode: store2.connectionMode,
      onError
    });
    const zIndex2 = getElevatedEdgeZIndex({
      selected: edge.selected,
      zIndex: edge.zIndex,
      sourceNode,
      targetNode,
      elevateOnSelect: store2.elevateEdgesOnSelect,
      zIndexMode: store2.zIndexMode
    });
    return {
      ...edgePosition || nullPosition,
      zIndex: zIndex2
    };
  }, [edge.source, edge.target, edge.sourceHandle, edge.targetHandle, edge.selected, edge.zIndex, onError]), shallow$1);
  const markerStartUrl = (0, import_react4.useMemo)(() => edge.markerStart ? `url('#${getMarkerId(edge.markerStart, rfId)}')` : void 0, [edge.markerStart, rfId]);
  const markerEndUrl = (0, import_react4.useMemo)(() => edge.markerEnd ? `url('#${getMarkerId(edge.markerEnd, rfId)}')` : void 0, [edge.markerEnd, rfId]);
  if (edge.hidden || sourceX === null || sourceY === null || targetX === null || targetY === null) {
    return null;
  }
  const onEdgeClick = (event) => {
    const { addSelectedEdges, unselectNodesAndEdges, multiSelectionActive } = store.getState();
    if (isSelectable) {
      store.setState({ nodesSelectionActive: false });
      if (edge.selected && multiSelectionActive) {
        unselectNodesAndEdges({ nodes: [], edges: [edge] });
        edgeRef.current?.blur();
      } else {
        addSelectedEdges([id2]);
      }
    }
    if (onClick) {
      onClick(event, edge);
    }
  };
  const onEdgeDoubleClick = onDoubleClick ? (event) => {
    onDoubleClick(event, { ...edge });
  } : void 0;
  const onEdgeContextMenu = onContextMenu ? (event) => {
    onContextMenu(event, { ...edge });
  } : void 0;
  const onEdgeMouseEnter = onMouseEnter ? (event) => {
    onMouseEnter(event, { ...edge });
  } : void 0;
  const onEdgeMouseMove = onMouseMove ? (event) => {
    onMouseMove(event, { ...edge });
  } : void 0;
  const onEdgeMouseLeave = onMouseLeave ? (event) => {
    onMouseLeave(event, { ...edge });
  } : void 0;
  const onKeyDown = (event) => {
    if (!disableKeyboardA11y && elementSelectionKeys.includes(event.key) && isSelectable) {
      const { unselectNodesAndEdges, addSelectedEdges } = store.getState();
      const unselect = event.key === "Escape";
      if (unselect) {
        edgeRef.current?.blur();
        unselectNodesAndEdges({ edges: [edge] });
      } else {
        addSelectedEdges([id2]);
      }
    }
  };
  return (0, import_jsx_runtime.jsx)("svg", { style: { zIndex }, children: (0, import_jsx_runtime.jsxs)("g", { className: cc([
    "react-flow__edge",
    `react-flow__edge-${edgeType}`,
    edge.className,
    noPanClassName,
    {
      selected: edge.selected,
      animated: edge.animated,
      inactive: !isSelectable && !onClick,
      updating: updateHover,
      selectable: isSelectable
    }
  ]), onClick: onEdgeClick, onDoubleClick: onEdgeDoubleClick, onContextMenu: onEdgeContextMenu, onMouseEnter: onEdgeMouseEnter, onMouseMove: onEdgeMouseMove, onMouseLeave: onEdgeMouseLeave, onKeyDown: isFocusable ? onKeyDown : void 0, tabIndex: isFocusable ? 0 : void 0, role: edge.ariaRole ?? (isFocusable ? "group" : "img"), "aria-roledescription": "edge", "data-id": id2, "data-testid": `rf__edge-${id2}`, "aria-label": edge.ariaLabel === null ? void 0 : edge.ariaLabel || `Edge from ${edge.source} to ${edge.target}`, "aria-describedby": isFocusable ? `${ARIA_EDGE_DESC_KEY}-${rfId}` : void 0, ref: edgeRef, ...edge.domAttributes, children: [!reconnecting && (0, import_jsx_runtime.jsx)(EdgeComponent, { id: id2, source: edge.source, target: edge.target, type: edge.type, selected: edge.selected, animated: edge.animated, selectable: isSelectable, deletable: edge.deletable ?? true, label: edge.label, labelStyle: edge.labelStyle, labelShowBg: edge.labelShowBg, labelBgStyle: edge.labelBgStyle, labelBgPadding: edge.labelBgPadding, labelBgBorderRadius: edge.labelBgBorderRadius, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data: edge.data, style: edge.style, sourceHandleId: edge.sourceHandle, targetHandleId: edge.targetHandle, markerStart: markerStartUrl, markerEnd: markerEndUrl, pathOptions: "pathOptions" in edge ? edge.pathOptions : void 0, interactionWidth: edge.interactionWidth }), isReconnectable && (0, import_jsx_runtime.jsx)(EdgeUpdateAnchors, { edge, isReconnectable, reconnectRadius, onReconnect, onReconnectStart, onReconnectEnd, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, setUpdateHover, setReconnecting })] }) });
}
var EdgeWrapper$1 = (0, import_react4.memo)(EdgeWrapper);
var selector$9 = (s) => ({
  edgesFocusable: s.edgesFocusable,
  edgesReconnectable: s.edgesReconnectable,
  elementsSelectable: s.elementsSelectable,
  connectionMode: s.connectionMode,
  onError: s.onError
});
function EdgeRendererComponent({ defaultMarkerColor, onlyRenderVisibleElements, rfId, edgeTypes: edgeTypes2, noPanClassName, onReconnect, onEdgeContextMenu, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, onEdgeClick, reconnectRadius, onEdgeDoubleClick, onReconnectStart, onReconnectEnd, disableKeyboardA11y }) {
  const { edgesFocusable, edgesReconnectable, elementsSelectable, onError } = useStore(selector$9, shallow$1);
  const edgeIds = useVisibleEdgeIds(onlyRenderVisibleElements);
  return (0, import_jsx_runtime.jsxs)("div", { className: "react-flow__edges", children: [(0, import_jsx_runtime.jsx)(MarkerDefinitions$1, { defaultColor: defaultMarkerColor, rfId }), edgeIds.map((id2) => {
    return (0, import_jsx_runtime.jsx)(EdgeWrapper$1, { id: id2, edgesFocusable, edgesReconnectable, elementsSelectable, noPanClassName, onReconnect, onContextMenu: onEdgeContextMenu, onMouseEnter: onEdgeMouseEnter, onMouseMove: onEdgeMouseMove, onMouseLeave: onEdgeMouseLeave, onClick: onEdgeClick, reconnectRadius, onDoubleClick: onEdgeDoubleClick, onReconnectStart, onReconnectEnd, rfId, onError, edgeTypes: edgeTypes2, disableKeyboardA11y }, id2);
  })] });
}
EdgeRendererComponent.displayName = "EdgeRenderer";
var EdgeRenderer = (0, import_react4.memo)(EdgeRendererComponent);
var toTransformString = (transform2) => `translate(${transform2[0]}px,${transform2[1]}px) scale(${transform2[2]})`;
function Viewport({ children: children2 }) {
  const store = useStoreApi();
  const viewportRef = (0, import_react4.useRef)(null);
  const [initialTransform] = (0, import_react4.useState)(() => store.getState().transform);
  useIsomorphicLayoutEffect(() => {
    let prevTransform = null;
    const applyTransform = () => {
      const transform2 = store.getState().transform;
      if (prevTransform && transform2[0] === prevTransform[0] && transform2[1] === prevTransform[1] && transform2[2] === prevTransform[2]) {
        return;
      }
      prevTransform = transform2;
      if (viewportRef.current) {
        viewportRef.current.style.transform = toTransformString(transform2);
      }
    };
    applyTransform();
    return store.subscribe(applyTransform);
  }, [store]);
  return (0, import_jsx_runtime.jsx)("div", { ref: viewportRef, className: "react-flow__viewport xyflow__viewport react-flow__container", style: { transform: toTransformString(initialTransform) }, children: children2 });
}
function useOnInitHandler(onInit) {
  const rfInstance = useReactFlow();
  const isInitialized = (0, import_react4.useRef)(false);
  (0, import_react4.useEffect)(() => {
    if (!isInitialized.current && rfInstance.viewportInitialized && onInit) {
      setTimeout(() => onInit(rfInstance), 1);
      isInitialized.current = true;
    }
  }, [onInit, rfInstance.viewportInitialized]);
}
var selector$8 = (state) => state.panZoom?.syncViewport;
function useViewportSync(viewport) {
  const syncViewport = useStore(selector$8);
  const store = useStoreApi();
  (0, import_react4.useEffect)(() => {
    if (viewport) {
      syncViewport?.(viewport);
      store.setState({ transform: [viewport.x, viewport.y, viewport.zoom] });
    }
  }, [viewport, syncViewport]);
  return null;
}
function storeSelector$1(s) {
  return s.connection.inProgress ? { ...s.connection, to: pointToRendererPoint(s.connection.to, s.transform) } : { ...s.connection };
}
function getSelector(connectionSelector) {
  if (connectionSelector) {
    const combinedSelector = (s) => {
      const connection = storeSelector$1(s);
      return connectionSelector(connection);
    };
    return combinedSelector;
  }
  return storeSelector$1;
}
function useConnection(connectionSelector) {
  const combinedSelector = getSelector(connectionSelector);
  return useStore(combinedSelector, shallow$1);
}
var selector$7 = (s) => ({
  nodesConnectable: s.nodesConnectable,
  isValid: s.connection.isValid,
  inProgress: s.connection.inProgress,
  width: s.width,
  height: s.height
});
function ConnectionLineWrapper({ containerStyle: containerStyle2, style: style2, type, component }) {
  const { nodesConnectable, width, height, isValid, inProgress } = useStore(selector$7, shallow$1);
  const renderConnection = !!(width && nodesConnectable && inProgress);
  if (!renderConnection) {
    return null;
  }
  return (0, import_jsx_runtime.jsx)("svg", { style: containerStyle2, width, height, className: "react-flow__connectionline react-flow__container", children: (0, import_jsx_runtime.jsx)("g", { className: cc(["react-flow__connection", getConnectionStatus(isValid)]), children: (0, import_jsx_runtime.jsx)(ConnectionLine, { style: style2, type, CustomComponent: component, isValid }) }) });
}
var ConnectionLine = ({ style: style2, type = ConnectionLineType.Bezier, CustomComponent, isValid }) => {
  const { inProgress, from, fromNode, fromHandle, fromPosition, to, toNode, toHandle, toPosition, pointer } = useConnection();
  if (!inProgress) {
    return;
  }
  if (CustomComponent) {
    return (0, import_jsx_runtime.jsx)(CustomComponent, { connectionLineType: type, connectionLineStyle: style2, fromNode, fromHandle, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, fromPosition, toPosition, connectionStatus: getConnectionStatus(isValid), toNode, toHandle, pointer });
  }
  let path = "";
  const pathParams = {
    sourceX: from.x,
    sourceY: from.y,
    sourcePosition: fromPosition,
    targetX: to.x,
    targetY: to.y,
    targetPosition: toPosition
  };
  switch (type) {
    case ConnectionLineType.Bezier:
      [path] = getBezierPath(pathParams);
      break;
    case ConnectionLineType.SimpleBezier:
      [path] = getSimpleBezierPath(pathParams);
      break;
    case ConnectionLineType.Step:
      [path] = getSmoothStepPath({
        ...pathParams,
        borderRadius: 0
      });
      break;
    case ConnectionLineType.SmoothStep:
      [path] = getSmoothStepPath(pathParams);
      break;
    default:
      [path] = getStraightPath(pathParams);
  }
  return (0, import_jsx_runtime.jsx)("path", { d: path, fill: "none", className: "react-flow__connection-path", style: style2 });
};
ConnectionLine.displayName = "ConnectionLine";
var emptyTypes = {};
function useNodeOrEdgeTypesWarning(nodeOrEdgeTypes = emptyTypes) {
  const typesRef = (0, import_react4.useRef)(nodeOrEdgeTypes);
  const store = useStoreApi();
  (0, import_react4.useEffect)(() => {
    if (true) {
      const usedKeys = /* @__PURE__ */ new Set([...Object.keys(typesRef.current), ...Object.keys(nodeOrEdgeTypes)]);
      for (const key of usedKeys) {
        if (typesRef.current[key] !== nodeOrEdgeTypes[key]) {
          store.getState().onError?.("002", errorMessages["error002"]());
          break;
        }
      }
      typesRef.current = nodeOrEdgeTypes;
    }
  }, [nodeOrEdgeTypes]);
}
function useStylesLoadedWarning() {
  const store = useStoreApi();
  const checked = (0, import_react4.useRef)(false);
  (0, import_react4.useEffect)(() => {
    if (true) {
      if (!checked.current) {
        const pane = document.querySelector(".react-flow__pane");
        if (pane && !(window.getComputedStyle(pane).zIndex === "1")) {
          store.getState().onError?.("013", errorMessages["error013"]("react"));
        }
        checked.current = true;
      }
    }
  }, []);
}
function GraphViewComponent({ nodeTypes: nodeTypes2, edgeTypes: edgeTypes2, onInit, onNodeClick, onEdgeClick, onNodeDoubleClick, onEdgeDoubleClick, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu, onSelectionContextMenu, onSelectionStart, onSelectionEnd, connectionLineType, connectionLineStyle, connectionLineComponent, connectionLineContainerStyle, selectionKeyCode, selectionOnDrag, selectionMode, multiSelectionKeyCode, panActivationKeyCode, zoomActivationKeyCode, deleteKeyCode, onlyRenderVisibleElements, elementsSelectable, defaultViewport: defaultViewport2, translateExtent, minZoom, maxZoom, preventScrolling, defaultMarkerColor, zoomOnScroll, zoomOnPinch, panOnScroll, panOnScrollSpeed, panOnScrollMode, zoomOnDoubleClick, panOnDrag, autoPanOnSelection, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneScroll, onPaneContextMenu, paneClickDistance, nodeClickDistance, onEdgeContextMenu, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, reconnectRadius, onReconnect, onReconnectStart, onReconnectEnd, noDragClassName, noWheelClassName, noPanClassName, disableKeyboardA11y, nodeExtent, rfId, viewport, onViewportChange, nodesDraggable }) {
  useNodeOrEdgeTypesWarning(nodeTypes2);
  useNodeOrEdgeTypesWarning(edgeTypes2);
  useStylesLoadedWarning();
  useOnInitHandler(onInit);
  useViewportSync(viewport);
  return (0, import_jsx_runtime.jsx)(FlowRenderer, { onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneContextMenu, onPaneScroll, paneClickDistance, deleteKeyCode, selectionKeyCode, selectionOnDrag, selectionMode, onSelectionStart, onSelectionEnd, multiSelectionKeyCode, panActivationKeyCode, zoomActivationKeyCode, elementsSelectable, zoomOnScroll, zoomOnPinch, zoomOnDoubleClick, panOnScroll, panOnScrollSpeed, panOnScrollMode, panOnDrag, autoPanOnSelection, defaultViewport: defaultViewport2, translateExtent, minZoom, maxZoom, onSelectionContextMenu, preventScrolling, noDragClassName, noWheelClassName, noPanClassName, disableKeyboardA11y, onViewportChange, isControlledViewport: !!viewport, children: (0, import_jsx_runtime.jsxs)(Viewport, { children: [(0, import_jsx_runtime.jsx)(EdgeRenderer, { edgeTypes: edgeTypes2, onEdgeClick, onEdgeDoubleClick, onReconnect, onReconnectStart, onReconnectEnd, onlyRenderVisibleElements, onEdgeContextMenu, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, reconnectRadius, defaultMarkerColor, noPanClassName, disableKeyboardA11y, rfId }), (0, import_jsx_runtime.jsx)(ConnectionLineWrapper, { style: connectionLineStyle, type: connectionLineType, component: connectionLineComponent, containerStyle: connectionLineContainerStyle }), (0, import_jsx_runtime.jsx)("div", { className: "react-flow__edgelabel-renderer" }), (0, import_jsx_runtime.jsx)(NodeRenderer, { nodeTypes: nodeTypes2, onNodeClick, onNodeDoubleClick, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu, nodeClickDistance, onlyRenderVisibleElements, noPanClassName, noDragClassName, disableKeyboardA11y, nodeExtent, rfId, nodesDraggable }), (0, import_jsx_runtime.jsx)("div", { className: "react-flow__viewport-portal" })] }) });
}
GraphViewComponent.displayName = "GraphView";
var GraphView = (0, import_react4.memo)(GraphViewComponent);
var devWarn = createDevWarn("React Flow", "https://reactflow.dev/");
var getInitialState = ({ nodes, edges, defaultNodes, defaultEdges, width, height, fitView, fitViewOptions, minZoom = 0.5, maxZoom = 2, nodeOrigin, nodeExtent, zIndexMode = "basic" } = {}) => {
  const nodeLookup = /* @__PURE__ */ new Map();
  const parentLookup = /* @__PURE__ */ new Map();
  const connectionLookup = /* @__PURE__ */ new Map();
  const edgeLookup = /* @__PURE__ */ new Map();
  const storeEdges = defaultEdges ?? edges ?? [];
  const storeNodes = defaultNodes ?? nodes ?? [];
  const storeNodeOrigin = nodeOrigin ?? [0, 0];
  const storeNodeExtent = nodeExtent ?? infiniteExtent;
  updateConnectionLookup(connectionLookup, edgeLookup, storeEdges);
  const { nodesInitialized } = adoptUserNodes(storeNodes, nodeLookup, parentLookup, {
    nodeOrigin: storeNodeOrigin,
    nodeExtent: storeNodeExtent,
    zIndexMode
  });
  let transform2 = [0, 0, 1];
  if (fitView && width && height) {
    const bounds = getInternalNodesBounds(nodeLookup, {
      filter: (node) => !!((node.width || node.initialWidth) && (node.height || node.initialHeight))
    });
    const { x, y, zoom } = getViewportForBounds(bounds, width, height, minZoom, maxZoom, fitViewOptions?.padding ?? 0.1);
    transform2 = [x, y, zoom];
  }
  return {
    rfId: "1",
    width: width ?? 0,
    height: height ?? 0,
    transform: transform2,
    nodes: storeNodes,
    nodesInitialized,
    nodeLookup,
    parentLookup,
    edges: storeEdges,
    edgeLookup,
    connectionLookup,
    onNodesChange: null,
    onEdgesChange: null,
    hasDefaultNodes: defaultNodes !== void 0,
    hasDefaultEdges: defaultEdges !== void 0,
    panZoom: null,
    minZoom,
    maxZoom,
    translateExtent: infiniteExtent,
    nodeExtent: storeNodeExtent,
    nodesSelectionActive: false,
    userSelectionActive: false,
    userSelectionRect: null,
    connectionMode: ConnectionMode.Strict,
    domNode: null,
    paneDragging: false,
    noPanClassName: "nopan",
    nodeOrigin: storeNodeOrigin,
    nodeDragThreshold: 1,
    connectionDragThreshold: 1,
    snapGrid: [15, 15],
    snapToGrid: false,
    nodesDraggable: true,
    nodesConnectable: true,
    nodesFocusable: true,
    edgesFocusable: true,
    edgesReconnectable: true,
    elementsSelectable: true,
    elevateNodesOnSelect: true,
    elevateEdgesOnSelect: true,
    selectNodesOnDrag: true,
    multiSelectionActive: false,
    fitViewQueued: fitView ?? false,
    fitViewOptions,
    fitViewResolver: null,
    connection: { ...initialConnection },
    connectionClickStartHandle: null,
    connectOnClick: true,
    ariaLiveMessage: "",
    autoPanOnConnect: true,
    autoPanOnNodeDrag: true,
    autoPanOnNodeFocus: true,
    autoPanSpeed: 15,
    connectionRadius: 20,
    onError: devWarn,
    isValidConnection: void 0,
    onSelectionChangeHandlers: [],
    lib: "react",
    debug: false,
    ariaLabelConfig: defaultAriaLabelConfig,
    zIndexMode,
    defaultEdgeOptions: void 0,
    onNodesChangeMiddlewareMap: /* @__PURE__ */ new Map(),
    onEdgesChangeMiddlewareMap: /* @__PURE__ */ new Map(),
    onNodesDelete: void 0,
    onEdgesDelete: void 0,
    onDelete: void 0,
    onBeforeDelete: void 0,
    onViewportChangeStart: void 0,
    onViewportChange: void 0,
    onViewportChangeEnd: void 0,
    onNodeDragStart: void 0,
    onNodeDrag: void 0,
    onNodeDragStop: void 0,
    onSelectionDragStart: void 0,
    onSelectionDrag: void 0,
    onSelectionDragStop: void 0,
    onMoveStart: void 0,
    onMove: void 0,
    onMoveEnd: void 0,
    onConnect: void 0,
    onConnectStart: void 0,
    onConnectEnd: void 0,
    onClickConnectStart: void 0,
    onClickConnectEnd: void 0
  };
};
var createStore2 = ({ nodes, edges, defaultNodes, defaultEdges, width, height, fitView, fitViewOptions, minZoom, maxZoom, nodeOrigin, nodeExtent, zIndexMode }) => createWithEqualityFn((set3, get3) => {
  async function resolveFitView() {
    const { nodeLookup, panZoom, fitViewOptions: fitViewOptions2, fitViewResolver, width: width2, height: height2, minZoom: minZoom2, maxZoom: maxZoom2 } = get3();
    if (!panZoom) {
      return;
    }
    await fitViewport({
      nodes: nodeLookup,
      width: width2,
      height: height2,
      panZoom,
      minZoom: minZoom2,
      maxZoom: maxZoom2
    }, fitViewOptions2);
    fitViewResolver?.resolve(true);
    set3({ fitViewResolver: null });
  }
  return {
    ...getInitialState({
      nodes,
      edges,
      width,
      height,
      fitView,
      fitViewOptions,
      minZoom,
      maxZoom,
      nodeOrigin,
      nodeExtent,
      defaultNodes,
      defaultEdges,
      zIndexMode
    }),
    setNodes: (nodes2) => {
      const { nodeLookup, parentLookup, nodeOrigin: nodeOrigin2, nodeExtent: nodeExtent2, elevateNodesOnSelect, fitViewQueued, zIndexMode: zIndexMode2, nodesSelectionActive } = get3();
      const { nodesInitialized, hasSelectedNodes } = adoptUserNodes(nodes2, nodeLookup, parentLookup, {
        nodeOrigin: nodeOrigin2,
        nodeExtent: nodeExtent2,
        elevateNodesOnSelect,
        checkEquality: true,
        zIndexMode: zIndexMode2
      });
      const nextNodesSelectionActive = nodesSelectionActive && hasSelectedNodes;
      if (fitViewQueued && nodesInitialized) {
        resolveFitView();
        set3({
          nodes: nodes2,
          nodesInitialized,
          fitViewQueued: false,
          fitViewOptions: void 0,
          nodesSelectionActive: nextNodesSelectionActive
        });
      } else {
        set3({ nodes: nodes2, nodesInitialized, nodesSelectionActive: nextNodesSelectionActive });
      }
    },
    setEdges: (edges2) => {
      const { connectionLookup, edgeLookup } = get3();
      updateConnectionLookup(connectionLookup, edgeLookup, edges2);
      set3({ edges: edges2 });
    },
    setDefaultNodesAndEdges: (nodes2, edges2) => {
      if (nodes2) {
        const { setNodes } = get3();
        setNodes(nodes2);
        set3({ hasDefaultNodes: true });
      }
      if (edges2) {
        const { setEdges } = get3();
        setEdges(edges2);
        set3({ hasDefaultEdges: true });
      }
    },
    /*
     * Every node gets registered at a ResizeObserver. Whenever a node
     * changes its dimensions, this function is called to measure the
     * new dimensions and update the nodes.
     */
    updateNodeInternals: (updates) => {
      const { triggerNodeChanges, nodeLookup, parentLookup, domNode, nodeOrigin: nodeOrigin2, nodeExtent: nodeExtent2, debug, fitViewQueued, zIndexMode: zIndexMode2 } = get3();
      const { changes, updatedInternals } = updateNodeInternals(updates, nodeLookup, parentLookup, domNode, nodeOrigin2, nodeExtent2, zIndexMode2);
      if (!updatedInternals) {
        return;
      }
      updateAbsolutePositions(nodeLookup, parentLookup, { nodeOrigin: nodeOrigin2, nodeExtent: nodeExtent2, zIndexMode: zIndexMode2 });
      if (fitViewQueued) {
        resolveFitView();
        set3({ fitViewQueued: false, fitViewOptions: void 0 });
      } else {
        set3({});
      }
      if (changes?.length > 0) {
        if (debug) {
          console.log("React Flow: trigger node changes", changes);
        }
        triggerNodeChanges?.(changes);
      }
    },
    updateNodePositions: (nodeDragItems, dragging = false) => {
      const parentExpandChildren = [];
      let changes = [];
      const { nodeLookup, triggerNodeChanges, connection, updateConnection, onNodesChangeMiddlewareMap } = get3();
      for (const [id2, dragItem] of nodeDragItems) {
        const node = nodeLookup.get(id2);
        const expandParent = !!(node?.expandParent && node?.parentId && dragItem?.position);
        const change = {
          id: id2,
          type: "position",
          position: expandParent ? {
            x: Math.max(0, dragItem.position.x),
            y: Math.max(0, dragItem.position.y)
          } : dragItem.position,
          dragging
        };
        if (node && connection.inProgress && connection.fromNode.id === node.id) {
          const updatedFrom = getHandlePosition(node, connection.fromHandle, Position.Left, true);
          updateConnection({ ...connection, from: updatedFrom });
        }
        if (expandParent && node.parentId) {
          parentExpandChildren.push({
            id: id2,
            parentId: node.parentId,
            rect: {
              ...dragItem.internals.positionAbsolute,
              width: dragItem.measured.width ?? 0,
              height: dragItem.measured.height ?? 0
            }
          });
        }
        changes.push(change);
      }
      if (parentExpandChildren.length > 0) {
        const { parentLookup, nodeOrigin: nodeOrigin2 } = get3();
        const parentExpandChanges = handleExpandParent(parentExpandChildren, nodeLookup, parentLookup, nodeOrigin2);
        changes.push(...parentExpandChanges);
      }
      for (const middleware of onNodesChangeMiddlewareMap.values()) {
        changes = middleware(changes);
      }
      triggerNodeChanges(changes);
    },
    triggerNodeChanges: (changes) => {
      const { onNodesChange, setNodes, nodes: nodes2, hasDefaultNodes, debug } = get3();
      if (changes?.length) {
        if (hasDefaultNodes) {
          const updatedNodes = applyNodeChanges(changes, nodes2);
          setNodes(updatedNodes);
        }
        if (debug) {
          console.log("React Flow: trigger node changes", changes);
        }
        onNodesChange?.(changes);
      }
    },
    triggerEdgeChanges: (changes) => {
      const { onEdgesChange, setEdges, edges: edges2, hasDefaultEdges, debug } = get3();
      if (changes?.length) {
        if (hasDefaultEdges) {
          const updatedEdges = applyEdgeChanges(changes, edges2);
          setEdges(updatedEdges);
        }
        if (debug) {
          console.log("React Flow: trigger edge changes", changes);
        }
        onEdgesChange?.(changes);
      }
    },
    addSelectedNodes: (selectedNodeIds) => {
      const { multiSelectionActive, edgeLookup, nodeLookup, triggerNodeChanges, triggerEdgeChanges } = get3();
      if (multiSelectionActive) {
        const nodeChanges = selectedNodeIds.map((nodeId) => createSelectionChange(nodeId, true));
        triggerNodeChanges(nodeChanges);
        return;
      }
      triggerNodeChanges(getSelectionChanges(nodeLookup, /* @__PURE__ */ new Set([...selectedNodeIds]), true));
      triggerEdgeChanges(getSelectionChanges(edgeLookup));
    },
    addSelectedEdges: (selectedEdgeIds) => {
      const { multiSelectionActive, edgeLookup, nodeLookup, triggerNodeChanges, triggerEdgeChanges } = get3();
      if (multiSelectionActive) {
        const changedEdges = selectedEdgeIds.map((edgeId) => createSelectionChange(edgeId, true));
        triggerEdgeChanges(changedEdges);
        return;
      }
      triggerEdgeChanges(getSelectionChanges(edgeLookup, /* @__PURE__ */ new Set([...selectedEdgeIds])));
      triggerNodeChanges(getSelectionChanges(nodeLookup, /* @__PURE__ */ new Set(), true));
    },
    unselectNodesAndEdges: ({ nodes: nodes2, edges: edges2 } = {}) => {
      const { edges: storeEdges, nodes: storeNodes, nodeLookup, triggerNodeChanges, triggerEdgeChanges } = get3();
      const nodesToUnselect = nodes2 ? nodes2 : storeNodes;
      const edgesToUnselect = edges2 ? edges2 : storeEdges;
      const nodeChanges = [];
      for (const node of nodesToUnselect) {
        if (!node.selected) {
          continue;
        }
        const internalNode = nodeLookup.get(node.id);
        if (internalNode) {
          internalNode.selected = false;
        }
        nodeChanges.push(createSelectionChange(node.id, false));
      }
      const edgeChanges = [];
      for (const edge of edgesToUnselect) {
        if (!edge.selected) {
          continue;
        }
        edgeChanges.push(createSelectionChange(edge.id, false));
      }
      triggerNodeChanges(nodeChanges);
      triggerEdgeChanges(edgeChanges);
    },
    setMinZoom: (minZoom2) => {
      const { panZoom, maxZoom: maxZoom2 } = get3();
      panZoom?.setScaleExtent([minZoom2, maxZoom2]);
      set3({ minZoom: minZoom2 });
    },
    setMaxZoom: (maxZoom2) => {
      const { panZoom, minZoom: minZoom2 } = get3();
      panZoom?.setScaleExtent([minZoom2, maxZoom2]);
      set3({ maxZoom: maxZoom2 });
    },
    setTranslateExtent: (translateExtent) => {
      get3().panZoom?.setTranslateExtent(translateExtent);
      set3({ translateExtent });
    },
    resetSelectedElements: () => {
      const { edges: edges2, nodes: nodes2, triggerNodeChanges, triggerEdgeChanges, elementsSelectable } = get3();
      if (!elementsSelectable) {
        return;
      }
      const nodeChanges = nodes2.reduce((res, node) => node.selected ? [...res, createSelectionChange(node.id, false)] : res, []);
      const edgeChanges = edges2.reduce((res, edge) => edge.selected ? [...res, createSelectionChange(edge.id, false)] : res, []);
      triggerNodeChanges(nodeChanges);
      triggerEdgeChanges(edgeChanges);
    },
    setNodeExtent: (nextNodeExtent) => {
      const { nodes: nodes2, nodeLookup, parentLookup, nodeOrigin: nodeOrigin2, elevateNodesOnSelect, nodeExtent: nodeExtent2, zIndexMode: zIndexMode2 } = get3();
      if (nextNodeExtent[0][0] === nodeExtent2[0][0] && nextNodeExtent[0][1] === nodeExtent2[0][1] && nextNodeExtent[1][0] === nodeExtent2[1][0] && nextNodeExtent[1][1] === nodeExtent2[1][1]) {
        return;
      }
      adoptUserNodes(nodes2, nodeLookup, parentLookup, {
        nodeOrigin: nodeOrigin2,
        nodeExtent: nextNodeExtent,
        elevateNodesOnSelect,
        checkEquality: false,
        zIndexMode: zIndexMode2
      });
      set3({ nodeExtent: nextNodeExtent });
    },
    panBy: (delta) => {
      const { transform: transform2, width: width2, height: height2, panZoom, translateExtent } = get3();
      return panBy({ delta, panZoom, transform: transform2, translateExtent, width: width2, height: height2 });
    },
    setCenter: async (x, y, options) => {
      const { width: width2, height: height2, maxZoom: maxZoom2, panZoom } = get3();
      if (!panZoom) {
        return false;
      }
      const nextZoom = typeof options?.zoom !== "undefined" ? options.zoom : maxZoom2;
      await panZoom.setViewport({
        x: width2 / 2 - x * nextZoom,
        y: height2 / 2 - y * nextZoom,
        zoom: nextZoom
      }, { duration: options?.duration, ease: options?.ease, interpolate: options?.interpolate });
      return true;
    },
    cancelConnection: () => {
      set3({
        connection: { ...initialConnection }
      });
    },
    updateConnection: (connection) => {
      set3({ connection });
    },
    reset: () => set3({ ...getInitialState() })
  };
}, Object.is);
function ReactFlowProvider({ initialNodes: nodes, initialEdges: edges, defaultNodes, defaultEdges, initialWidth: width, initialHeight: height, initialMinZoom: minZoom, initialMaxZoom: maxZoom, initialFitViewOptions: fitViewOptions, fitView, nodeOrigin, nodeExtent, zIndexMode, children: children2 }) {
  const [store] = (0, import_react4.useState)(() => createStore2({
    nodes,
    edges,
    defaultNodes,
    defaultEdges,
    width,
    height,
    fitView,
    minZoom,
    maxZoom,
    fitViewOptions,
    nodeOrigin,
    nodeExtent,
    zIndexMode
  }));
  return (0, import_jsx_runtime.jsx)(Provider$1, { value: store, children: (0, import_jsx_runtime.jsx)(BatchProvider, { children: (0, import_jsx_runtime.jsx)(HandleConfigProvider, { children: children2 }) }) });
}
function Wrapper({ children: children2, nodes, edges, defaultNodes, defaultEdges, width, height, fitView, fitViewOptions, minZoom, maxZoom, nodeOrigin, nodeExtent, zIndexMode }) {
  const isWrapped = (0, import_react4.useContext)(StoreContext);
  if (isWrapped) {
    return (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: children2 });
  }
  return (0, import_jsx_runtime.jsx)(ReactFlowProvider, { initialNodes: nodes, initialEdges: edges, defaultNodes, defaultEdges, initialWidth: width, initialHeight: height, fitView, initialFitViewOptions: fitViewOptions, initialMinZoom: minZoom, initialMaxZoom: maxZoom, nodeOrigin, nodeExtent, zIndexMode, children: children2 });
}
var wrapperStyle = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  position: "relative",
  zIndex: 0
};
function ReactFlow({ nodes, edges, defaultNodes, defaultEdges, className, nodeTypes: nodeTypes2, edgeTypes: edgeTypes2, onNodeClick, onEdgeClick, onInit, onMove, onMoveStart, onMoveEnd, onConnect, onConnectStart, onConnectEnd, onClickConnectStart, onClickConnectEnd, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu, onNodeDoubleClick, onNodeDragStart, onNodeDrag, onNodeDragStop, onNodesDelete, onEdgesDelete, onDelete, onSelectionChange, onSelectionDragStart, onSelectionDrag, onSelectionDragStop, onSelectionContextMenu, onSelectionStart, onSelectionEnd, onBeforeDelete, connectionMode, connectionLineType = ConnectionLineType.Bezier, connectionLineStyle, connectionLineComponent, connectionLineContainerStyle, deleteKeyCode = "Backspace", selectionKeyCode = "Shift", selectionOnDrag = false, selectionMode = SelectionMode.Full, panActivationKeyCode = "Space", multiSelectionKeyCode = isMacOs() ? "Meta" : "Control", zoomActivationKeyCode = isMacOs() ? "Meta" : "Control", snapToGrid, snapGrid, onlyRenderVisibleElements = false, selectNodesOnDrag, nodesDraggable, autoPanOnNodeFocus, nodesConnectable, nodesFocusable, nodeOrigin = defaultNodeOrigin, edgesFocusable, edgesReconnectable, elementsSelectable = true, defaultViewport: defaultViewport$1 = defaultViewport, minZoom = 0.5, maxZoom = 2, translateExtent = infiniteExtent, preventScrolling = true, nodeExtent, defaultMarkerColor = "#b1b1b7", zoomOnScroll = true, zoomOnPinch = true, panOnScroll = false, panOnScrollSpeed = 0.5, panOnScrollMode = PanOnScrollMode.Free, zoomOnDoubleClick = true, panOnDrag = true, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneScroll, onPaneContextMenu, paneClickDistance = 1, nodeClickDistance = 0, children: children2, onReconnect, onReconnectStart, onReconnectEnd, onEdgeContextMenu, onEdgeDoubleClick, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, reconnectRadius = 10, onNodesChange, onEdgesChange, noDragClassName = "nodrag", noWheelClassName = "nowheel", noPanClassName = "nopan", fitView, fitViewOptions, connectOnClick, attributionPosition, proOptions, defaultEdgeOptions, elevateNodesOnSelect = true, elevateEdgesOnSelect = false, disableKeyboardA11y = false, autoPanOnConnect, autoPanOnNodeDrag, autoPanOnSelection = true, autoPanSpeed, connectionRadius, isValidConnection, onError, style: style2, id: id2, nodeDragThreshold, connectionDragThreshold, viewport, onViewportChange, width, height, colorMode = "light", debug, onScroll, ariaLabelConfig, zIndexMode = "basic", ...rest }, ref) {
  const rfId = id2 || "1";
  const colorModeClassName = useColorModeClass(colorMode);
  const wrapperOnScroll = (0, import_react4.useCallback)((e) => {
    e.currentTarget.scrollTo({ top: 0, left: 0, behavior: "instant" });
    onScroll?.(e);
  }, [onScroll]);
  return (0, import_jsx_runtime.jsx)("div", { "data-testid": "rf__wrapper", ...rest, onScroll: wrapperOnScroll, style: { ...style2, ...wrapperStyle }, ref, className: cc(["react-flow", className, colorModeClassName]), id: id2, role: "application", children: (0, import_jsx_runtime.jsxs)(Wrapper, { nodes, edges, width, height, fitView, fitViewOptions, minZoom, maxZoom, nodeOrigin, nodeExtent, zIndexMode, children: [(0, import_jsx_runtime.jsx)(StoreUpdater, { nodes, edges, defaultNodes, defaultEdges, onConnect, onConnectStart, onConnectEnd, onClickConnectStart, onClickConnectEnd, nodesDraggable, autoPanOnNodeFocus, nodesConnectable, nodesFocusable, edgesFocusable, edgesReconnectable, elementsSelectable, elevateNodesOnSelect, elevateEdgesOnSelect, minZoom, maxZoom, nodeExtent, onNodesChange, onEdgesChange, snapToGrid, snapGrid, connectionMode, translateExtent, connectOnClick, defaultEdgeOptions, fitView, fitViewOptions, onNodesDelete, onEdgesDelete, onDelete, onNodeDragStart, onNodeDrag, onNodeDragStop, onSelectionDrag, onSelectionDragStart, onSelectionDragStop, onMove, onMoveStart, onMoveEnd, noPanClassName, nodeOrigin, rfId, autoPanOnConnect, autoPanOnNodeDrag, autoPanSpeed, onError, connectionRadius, isValidConnection, selectNodesOnDrag, nodeDragThreshold, connectionDragThreshold, onBeforeDelete, debug, ariaLabelConfig, zIndexMode }), (0, import_jsx_runtime.jsx)(GraphView, { onInit, onNodeClick, onEdgeClick, onNodeMouseEnter, onNodeMouseMove, onNodeMouseLeave, onNodeContextMenu, onNodeDoubleClick, nodeTypes: nodeTypes2, edgeTypes: edgeTypes2, connectionLineType, connectionLineStyle, connectionLineComponent, connectionLineContainerStyle, selectionKeyCode, selectionOnDrag, selectionMode, deleteKeyCode, multiSelectionKeyCode, panActivationKeyCode, zoomActivationKeyCode, onlyRenderVisibleElements, defaultViewport: defaultViewport$1, translateExtent, minZoom, maxZoom, preventScrolling, zoomOnScroll, zoomOnPinch, zoomOnDoubleClick, panOnScroll, panOnScrollSpeed, panOnScrollMode, panOnDrag, autoPanOnSelection, onPaneClick, onPaneMouseEnter, onPaneMouseMove, onPaneMouseLeave, onPaneScroll, onPaneContextMenu, paneClickDistance, nodeClickDistance, onSelectionContextMenu, onSelectionStart, onSelectionEnd, onReconnect, onReconnectStart, onReconnectEnd, onEdgeContextMenu, onEdgeDoubleClick, onEdgeMouseEnter, onEdgeMouseMove, onEdgeMouseLeave, reconnectRadius, defaultMarkerColor, noDragClassName, noWheelClassName, noPanClassName, rfId, disableKeyboardA11y, nodeExtent, viewport, onViewportChange, nodesDraggable }), (0, import_jsx_runtime.jsx)(SelectionListener, { onSelectionChange }), children2, (0, import_jsx_runtime.jsx)(Attribution, { proOptions, position: attributionPosition }), (0, import_jsx_runtime.jsx)(A11yDescriptions, { rfId, disableKeyboardA11y })] }) });
}
var index = fixedForwardRef(ReactFlow);
var selector$6 = (s) => s.domNode?.querySelector(".react-flow__edgelabel-renderer");
function EdgeLabelRenderer({ children: children2 }) {
  const edgeLabelRenderer = useStore(selector$6);
  if (!edgeLabelRenderer) {
    return null;
  }
  return (0, import_react_dom.createPortal)(children2, edgeLabelRenderer);
}
var selector$5 = (s) => s.domNode?.querySelector(".react-flow__viewport-portal");
function ViewportPortal({ children: children2 }) {
  const viewPortalDiv = useStore(selector$5);
  if (!viewPortalDiv) {
    return null;
  }
  return (0, import_react_dom.createPortal)(children2, viewPortalDiv);
}
var error014 = errorMessages["error014"]();
function LinePattern({ dimensions, lineWidth, variant, className }) {
  return (0, import_jsx_runtime.jsx)("path", { strokeWidth: lineWidth, d: `M${dimensions[0] / 2} 0 V${dimensions[1]} M0 ${dimensions[1] / 2} H${dimensions[0]}`, className: cc(["react-flow__background-pattern", variant, className]) });
}
function DotPattern({ radius, className }) {
  return (0, import_jsx_runtime.jsx)("circle", { cx: radius, cy: radius, r: radius, className: cc(["react-flow__background-pattern", "dots", className]) });
}
var BackgroundVariant;
(function(BackgroundVariant2) {
  BackgroundVariant2["Lines"] = "lines";
  BackgroundVariant2["Dots"] = "dots";
  BackgroundVariant2["Cross"] = "cross";
})(BackgroundVariant || (BackgroundVariant = {}));
var defaultSize = {
  [BackgroundVariant.Dots]: 1,
  [BackgroundVariant.Lines]: 1,
  [BackgroundVariant.Cross]: 6
};
var selector$3 = (s) => ({ transform: s.transform, patternId: `pattern-${s.rfId}` });
function BackgroundComponent({
  id: id2,
  variant = BackgroundVariant.Dots,
  // only used for dots and cross
  gap = 20,
  // only used for lines and cross
  size,
  lineWidth = 1,
  offset = 0,
  color: color2,
  bgColor,
  style: style2,
  className,
  patternClassName
}) {
  const ref = (0, import_react4.useRef)(null);
  const { transform: transform2, patternId } = useStore(selector$3, shallow$1);
  const patternSize = size || defaultSize[variant];
  const isDots = variant === BackgroundVariant.Dots;
  const isCross = variant === BackgroundVariant.Cross;
  const gapXY = Array.isArray(gap) ? gap : [gap, gap];
  const scaledGap = [gapXY[0] * transform2[2] || 1, gapXY[1] * transform2[2] || 1];
  const scaledSize = patternSize * transform2[2];
  const offsetXY = Array.isArray(offset) ? offset : [offset, offset];
  const patternDimensions = isCross ? [scaledSize, scaledSize] : scaledGap;
  const scaledOffset = [
    offsetXY[0] * transform2[2] + patternDimensions[0] / 2,
    offsetXY[1] * transform2[2] + patternDimensions[1] / 2
  ];
  const _patternId = `${patternId}${id2 ? id2 : ""}`;
  return (0, import_jsx_runtime.jsxs)("svg", { className: cc(["react-flow__background", className]), style: {
    ...style2,
    ...containerStyle,
    "--xy-background-color-props": bgColor,
    "--xy-background-pattern-color-props": color2
  }, ref, "data-testid": "rf__background", children: [(0, import_jsx_runtime.jsx)("pattern", { id: _patternId, x: transform2[0] % scaledGap[0], y: transform2[1] % scaledGap[1], width: scaledGap[0], height: scaledGap[1], patternUnits: "userSpaceOnUse", patternTransform: `translate(-${scaledOffset[0]},-${scaledOffset[1]})`, children: isDots ? (0, import_jsx_runtime.jsx)(DotPattern, { radius: scaledSize / 2, className: patternClassName }) : (0, import_jsx_runtime.jsx)(LinePattern, { dimensions: patternDimensions, lineWidth, variant, className: patternClassName }) }), (0, import_jsx_runtime.jsx)("rect", { x: "0", y: "0", width: "100%", height: "100%", fill: `url(#${_patternId})` })] });
}
BackgroundComponent.displayName = "Background";
var Background = (0, import_react4.memo)(BackgroundComponent);
function PlusIcon() {
  return (0, import_jsx_runtime.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 32", children: (0, import_jsx_runtime.jsx)("path", { d: "M32 18.133H18.133V32h-4.266V18.133H0v-4.266h13.867V0h4.266v13.867H32z" }) });
}
function MinusIcon() {
  return (0, import_jsx_runtime.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 5", children: (0, import_jsx_runtime.jsx)("path", { d: "M0 0h32v4.2H0z" }) });
}
function FitViewIcon() {
  return (0, import_jsx_runtime.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 32 30", children: (0, import_jsx_runtime.jsx)("path", { d: "M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" }) });
}
function LockIcon() {
  return (0, import_jsx_runtime.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32", children: (0, import_jsx_runtime.jsx)("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0 8 0 4.571 3.429 4.571 7.619v3.048H3.048A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047zm4.724-13.866H7.467V7.619c0-2.59 2.133-4.724 4.723-4.724 2.591 0 4.724 2.133 4.724 4.724v3.048z" }) });
}
function UnlockIcon() {
  return (0, import_jsx_runtime.jsx)("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 25 32", children: (0, import_jsx_runtime.jsx)("path", { d: "M21.333 10.667H19.81V7.619C19.81 3.429 16.38 0 12.19 0c-4.114 1.828-1.37 2.133.305 2.438 1.676.305 4.42 2.59 4.42 5.181v3.048H3.047A3.056 3.056 0 000 13.714v15.238A3.056 3.056 0 003.048 32h18.285a3.056 3.056 0 003.048-3.048V13.714a3.056 3.056 0 00-3.048-3.047zM12.19 24.533a3.056 3.056 0 01-3.047-3.047 3.056 3.056 0 013.047-3.048 3.056 3.056 0 013.048 3.048 3.056 3.056 0 01-3.048 3.047z" }) });
}
function ControlButton({ children: children2, className, ...rest }) {
  return (0, import_jsx_runtime.jsx)("button", { type: "button", className: cc(["react-flow__controls-button", className]), ...rest, children: children2 });
}
var selector$2 = (s) => ({
  isInteractive: s.nodesDraggable || s.nodesConnectable || s.elementsSelectable,
  minZoomReached: s.transform[2] <= s.minZoom,
  maxZoomReached: s.transform[2] >= s.maxZoom,
  ariaLabelConfig: s.ariaLabelConfig
});
function ControlsComponent({ style: style2, showZoom = true, showFitView = true, showInteractive = true, fitViewOptions, onZoomIn, onZoomOut, onFitView, onInteractiveChange, className, children: children2, position = "bottom-left", orientation = "vertical", "aria-label": ariaLabel }) {
  const store = useStoreApi();
  const { isInteractive, minZoomReached, maxZoomReached, ariaLabelConfig } = useStore(selector$2, shallow$1);
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const onZoomInHandler = () => {
    zoomIn();
    onZoomIn?.();
  };
  const onZoomOutHandler = () => {
    zoomOut();
    onZoomOut?.();
  };
  const onFitViewHandler = () => {
    fitView(fitViewOptions);
    onFitView?.();
  };
  const onToggleInteractivity = () => {
    store.setState({
      nodesDraggable: !isInteractive,
      nodesConnectable: !isInteractive,
      elementsSelectable: !isInteractive
    });
    onInteractiveChange?.(!isInteractive);
  };
  const orientationClass = orientation === "horizontal" ? "horizontal" : "vertical";
  return (0, import_jsx_runtime.jsxs)(Panel, { className: cc(["react-flow__controls", orientationClass, className]), position, style: style2, "data-testid": "rf__controls", "aria-label": ariaLabel ?? ariaLabelConfig["controls.ariaLabel"], children: [showZoom && (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [(0, import_jsx_runtime.jsx)(ControlButton, { onClick: onZoomInHandler, className: "react-flow__controls-zoomin", title: ariaLabelConfig["controls.zoomIn.ariaLabel"], "aria-label": ariaLabelConfig["controls.zoomIn.ariaLabel"], disabled: maxZoomReached, children: (0, import_jsx_runtime.jsx)(PlusIcon, {}) }), (0, import_jsx_runtime.jsx)(ControlButton, { onClick: onZoomOutHandler, className: "react-flow__controls-zoomout", title: ariaLabelConfig["controls.zoomOut.ariaLabel"], "aria-label": ariaLabelConfig["controls.zoomOut.ariaLabel"], disabled: minZoomReached, children: (0, import_jsx_runtime.jsx)(MinusIcon, {}) })] }), showFitView && (0, import_jsx_runtime.jsx)(ControlButton, { className: "react-flow__controls-fitview", onClick: onFitViewHandler, title: ariaLabelConfig["controls.fitView.ariaLabel"], "aria-label": ariaLabelConfig["controls.fitView.ariaLabel"], children: (0, import_jsx_runtime.jsx)(FitViewIcon, {}) }), showInteractive && (0, import_jsx_runtime.jsx)(ControlButton, { className: "react-flow__controls-interactive", onClick: onToggleInteractivity, title: ariaLabelConfig["controls.interactive.ariaLabel"], "aria-label": ariaLabelConfig["controls.interactive.ariaLabel"], children: isInteractive ? (0, import_jsx_runtime.jsx)(UnlockIcon, {}) : (0, import_jsx_runtime.jsx)(LockIcon, {}) }), children2] });
}
ControlsComponent.displayName = "Controls";
var Controls = (0, import_react4.memo)(ControlsComponent);
function MiniMapNodeComponent({ id: id2, x, y, width, height, style: style2, color: color2, strokeColor, strokeWidth, className, borderRadius, shapeRendering, selected: selected3, onClick }) {
  const { background, backgroundColor } = style2 || {};
  const fill = color2 || background || backgroundColor;
  return (0, import_jsx_runtime.jsx)("rect", { className: cc(["react-flow__minimap-node", { selected: selected3 }, className]), x, y, rx: borderRadius, ry: borderRadius, width, height, style: {
    fill,
    stroke: strokeColor,
    strokeWidth
  }, shapeRendering, onClick: onClick ? (event) => onClick(event, id2) : void 0 });
}
var MiniMapNode = (0, import_react4.memo)(MiniMapNodeComponent);
var selectorNodeIds = (s) => s.nodes.map((node) => node.id);
var getAttrFunction = (func) => func instanceof Function ? func : () => func;
function MiniMapNodes({
  nodeStrokeColor,
  nodeColor,
  nodeClassName = "",
  nodeBorderRadius = 5,
  nodeStrokeWidth,
  /*
   * We need to rename the prop to be `CapitalCase` so that JSX will render it as
   * a component properly.
   */
  nodeComponent: NodeComponent = MiniMapNode,
  onClick
}) {
  const nodeIds = useStore(selectorNodeIds, shallow$1);
  const nodeColorFunc = getAttrFunction(nodeColor);
  const nodeStrokeColorFunc = getAttrFunction(nodeStrokeColor);
  const nodeClassNameFunc = getAttrFunction(nodeClassName);
  const shapeRendering = typeof window === "undefined" || !!window.chrome ? "crispEdges" : "geometricPrecision";
  return (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: nodeIds.map((nodeId) => (
    /*
     * The split of responsibilities between MiniMapNodes and
     * NodeComponentWrapper may appear weird. However, it’s designed to
     * minimize the cost of updates when individual nodes change.
     *
     * For more details, see a similar commit in `NodeRenderer/index.tsx`.
     */
    (0, import_jsx_runtime.jsx)(NodeComponentWrapper, { id: nodeId, nodeColorFunc, nodeStrokeColorFunc, nodeClassNameFunc, nodeBorderRadius, nodeStrokeWidth, NodeComponent, onClick, shapeRendering }, nodeId)
  )) });
}
function NodeComponentWrapperInner({ id: id2, nodeColorFunc, nodeStrokeColorFunc, nodeClassNameFunc, nodeBorderRadius, nodeStrokeWidth, shapeRendering, NodeComponent, onClick }) {
  const { node, x, y, width, height } = useStore((s) => {
    const node2 = s.nodeLookup.get(id2);
    if (!node2) {
      return { node: void 0, x: 0, y: 0, width: 0, height: 0 };
    }
    const userNode = node2.internals.userNode;
    const { x: x2, y: y2 } = node2.internals.positionAbsolute;
    const { width: width2, height: height2 } = getNodeDimensions(userNode);
    return {
      node: userNode,
      x: x2,
      y: y2,
      width: width2,
      height: height2
    };
  }, shallow$1);
  if (!node || node.hidden || !nodeHasDimensions(node)) {
    return null;
  }
  return (0, import_jsx_runtime.jsx)(NodeComponent, { x, y, width, height, style: node.style, selected: !!node.selected, className: nodeClassNameFunc(node), color: nodeColorFunc(node), borderRadius: nodeBorderRadius, strokeColor: nodeStrokeColorFunc(node), strokeWidth: nodeStrokeWidth, shapeRendering, onClick, id: node.id });
}
var NodeComponentWrapper = (0, import_react4.memo)(NodeComponentWrapperInner);
var MiniMapNodes$1 = (0, import_react4.memo)(MiniMapNodes);
var defaultWidth = 200;
var defaultHeight = 150;
var filterHidden = (node) => !node.hidden;
var selector$1 = (s) => {
  const viewBB = {
    x: -s.transform[0] / s.transform[2],
    y: -s.transform[1] / s.transform[2],
    width: s.width / s.transform[2],
    height: s.height / s.transform[2]
  };
  let hasVisibleNode = false;
  for (const node of s.nodeLookup.values()) {
    if (!node.hidden) {
      hasVisibleNode = true;
      break;
    }
  }
  return {
    viewBB,
    boundingRect: hasVisibleNode ? getBoundsOfRects(getInternalNodesBounds(s.nodeLookup, { filter: filterHidden }), viewBB) : viewBB,
    rfId: s.rfId,
    panZoom: s.panZoom,
    translateExtent: s.translateExtent,
    flowWidth: s.width,
    flowHeight: s.height,
    ariaLabelConfig: s.ariaLabelConfig
  };
};
var rectEqual = (a, b) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
var areEqual = (a, b) => rectEqual(a.viewBB, b.viewBB) && rectEqual(a.boundingRect, b.boundingRect) && a.rfId === b.rfId && a.panZoom === b.panZoom && a.translateExtent === b.translateExtent && a.flowWidth === b.flowWidth && a.flowHeight === b.flowHeight && a.ariaLabelConfig === b.ariaLabelConfig;
var ARIA_LABEL_KEY = "react-flow__minimap-desc";
function MiniMapComponent({
  style: style2,
  className,
  nodeStrokeColor,
  nodeColor,
  nodeClassName = "",
  nodeBorderRadius = 5,
  nodeStrokeWidth,
  /*
   * We need to rename the prop to be `CapitalCase` so that JSX will render it as
   * a component properly.
   */
  nodeComponent,
  bgColor,
  maskColor,
  maskStrokeColor,
  maskStrokeWidth,
  position = "bottom-right",
  onClick,
  onNodeClick,
  pannable = false,
  zoomable = false,
  ariaLabel,
  inversePan,
  zoomStep = 1,
  offsetScale = 5
}) {
  const store = useStoreApi();
  const svg = (0, import_react4.useRef)(null);
  const { boundingRect, panZoom, viewBB, rfId, translateExtent, flowWidth, flowHeight, ariaLabelConfig } = useStore(selector$1, areEqual);
  const elementWidth = style2?.width ?? defaultWidth;
  const elementHeight = style2?.height ?? defaultHeight;
  const scaledWidth = boundingRect.width / elementWidth;
  const scaledHeight = boundingRect.height / elementHeight;
  const viewScale = Math.max(scaledWidth, scaledHeight);
  const viewWidth = viewScale * elementWidth;
  const viewHeight = viewScale * elementHeight;
  const offset = offsetScale * viewScale;
  const x = boundingRect.x - (viewWidth - boundingRect.width) / 2 - offset;
  const y = boundingRect.y - (viewHeight - boundingRect.height) / 2 - offset;
  const width = viewWidth + offset * 2;
  const height = viewHeight + offset * 2;
  const labelledBy = `${ARIA_LABEL_KEY}-${rfId}`;
  const viewScaleRef = (0, import_react4.useRef)(0);
  const minimapInstance = (0, import_react4.useRef)();
  viewScaleRef.current = viewScale;
  (0, import_react4.useEffect)(() => {
    const currentPanZoom = store.getState().panZoom;
    if (svg.current && currentPanZoom) {
      minimapInstance.current = XYMinimap({
        domNode: svg.current,
        panZoom: currentPanZoom,
        getTransform: () => store.getState().transform,
        getViewScale: () => viewScaleRef.current
      });
      return () => {
        minimapInstance.current?.destroy();
      };
    }
  }, [panZoom]);
  (0, import_react4.useEffect)(() => {
    minimapInstance.current?.update({
      translateExtent,
      width: flowWidth,
      height: flowHeight,
      inversePan,
      pannable,
      zoomStep,
      zoomable
    });
  }, [pannable, zoomable, inversePan, zoomStep, translateExtent, flowWidth, flowHeight]);
  const onSvgClick = onClick ? (event) => {
    const [x2, y2] = minimapInstance.current?.pointer(event) || [0, 0];
    onClick(event, { x: x2, y: y2 });
  } : void 0;
  const nodeClickHandler = (0, import_react4.useCallback)((event, nodeId) => {
    const node = store.getState().nodeLookup.get(nodeId).internals.userNode;
    onNodeClick?.(event, node);
  }, [onNodeClick]);
  const onSvgNodeClick = onNodeClick ? nodeClickHandler : void 0;
  const _ariaLabel = ariaLabel ?? ariaLabelConfig["minimap.ariaLabel"];
  return (0, import_jsx_runtime.jsx)(Panel, { position, style: {
    ...style2,
    "--xy-minimap-background-color-props": typeof bgColor === "string" ? bgColor : void 0,
    "--xy-minimap-mask-background-color-props": typeof maskColor === "string" ? maskColor : void 0,
    "--xy-minimap-mask-stroke-color-props": typeof maskStrokeColor === "string" ? maskStrokeColor : void 0,
    "--xy-minimap-mask-stroke-width-props": typeof maskStrokeWidth === "number" ? maskStrokeWidth * viewScale : void 0,
    "--xy-minimap-node-background-color-props": typeof nodeColor === "string" ? nodeColor : void 0,
    "--xy-minimap-node-stroke-color-props": typeof nodeStrokeColor === "string" ? nodeStrokeColor : void 0,
    "--xy-minimap-node-stroke-width-props": typeof nodeStrokeWidth === "number" ? nodeStrokeWidth : void 0
  }, className: cc(["react-flow__minimap", className]), "data-testid": "rf__minimap", children: (0, import_jsx_runtime.jsxs)("svg", { width: elementWidth, height: elementHeight, viewBox: `${x} ${y} ${width} ${height}`, className: "react-flow__minimap-svg", role: "img", "aria-labelledby": labelledBy, ref: svg, onClick: onSvgClick, children: [_ariaLabel && (0, import_jsx_runtime.jsx)("title", { id: labelledBy, children: _ariaLabel }), (0, import_jsx_runtime.jsx)(MiniMapNodes$1, { onClick: onSvgNodeClick, nodeColor, nodeStrokeColor, nodeBorderRadius, nodeClassName, nodeStrokeWidth, nodeComponent }), (0, import_jsx_runtime.jsx)("path", { className: "react-flow__minimap-mask", d: `M${x - offset},${y - offset}h${width + offset * 2}v${height + offset * 2}h${-width - offset * 2}z
        M${viewBB.x},${viewBB.y}h${viewBB.width}v${viewBB.height}h${-viewBB.width}z`, fillRule: "evenodd", pointerEvents: "none" })] }) });
}
MiniMapComponent.displayName = "MiniMap";
var MiniMap = (0, import_react4.memo)(MiniMapComponent);
var scaleSelector = (calculateScale) => (store) => calculateScale ? `${Math.max(1 / store.transform[2], 1)}` : void 0;
var defaultPositions = {
  [ResizeControlVariant.Line]: "right",
  [ResizeControlVariant.Handle]: "bottom-right"
};
function ResizeControl({ nodeId, position, variant = ResizeControlVariant.Handle, className, style: style2 = void 0, children: children2, color: color2, minWidth = 10, minHeight = 10, maxWidth = Number.MAX_VALUE, maxHeight = Number.MAX_VALUE, keepAspectRatio = false, resizeDirection, autoScale = true, shouldResize, onResizeStart, onResize, onResizeEnd }) {
  const contextNodeId = useNodeId();
  const id2 = typeof nodeId === "string" ? nodeId : contextNodeId;
  const store = useStoreApi();
  const resizeControlRef = (0, import_react4.useRef)(null);
  const isHandleControl = variant === ResizeControlVariant.Handle;
  const scale = useStore((0, import_react4.useCallback)(scaleSelector(isHandleControl && autoScale), [isHandleControl, autoScale]), shallow$1);
  const resizer = (0, import_react4.useRef)(null);
  const controlPosition = position ?? defaultPositions[variant];
  (0, import_react4.useEffect)(() => {
    if (!resizeControlRef.current || !id2) {
      return;
    }
    if (!resizer.current) {
      resizer.current = XYResizer({
        domNode: resizeControlRef.current,
        nodeId: id2,
        getStoreItems: () => {
          const { nodeLookup, transform: transform2, snapGrid, snapToGrid, nodeOrigin, domNode } = store.getState();
          return {
            nodeLookup,
            transform: transform2,
            snapGrid,
            snapToGrid,
            nodeOrigin,
            paneDomNode: domNode
          };
        },
        onChange: (change, childChanges) => {
          const { triggerNodeChanges, nodeLookup, parentLookup, nodeOrigin } = store.getState();
          const changes = [];
          const nextPosition = { x: change.x, y: change.y };
          const node = nodeLookup.get(id2);
          if (node && node.expandParent && node.parentId) {
            const origin = node.origin ?? nodeOrigin;
            const width = change.width ?? node.measured.width ?? 0;
            const height = change.height ?? node.measured.height ?? 0;
            const child = {
              id: node.id,
              parentId: node.parentId,
              rect: {
                width,
                height,
                ...evaluateAbsolutePosition({
                  x: change.x ?? node.position.x,
                  y: change.y ?? node.position.y
                }, { width, height }, node.parentId, nodeLookup, origin)
              }
            };
            const parentExpandChanges = handleExpandParent([child], nodeLookup, parentLookup, nodeOrigin);
            changes.push(...parentExpandChanges);
            nextPosition.x = change.x ? Math.max(origin[0] * width, change.x) : void 0;
            nextPosition.y = change.y ? Math.max(origin[1] * height, change.y) : void 0;
          }
          if (nextPosition.x !== void 0 && nextPosition.y !== void 0) {
            const positionChange = {
              id: id2,
              type: "position",
              position: { ...nextPosition }
            };
            changes.push(positionChange);
          }
          if (change.width !== void 0 && change.height !== void 0) {
            const setAttributes = !resizeDirection ? true : resizeDirection === "horizontal" ? "width" : "height";
            const dimensionChange = {
              id: id2,
              type: "dimensions",
              resizing: true,
              setAttributes,
              dimensions: {
                width: change.width,
                height: change.height
              }
            };
            changes.push(dimensionChange);
          }
          for (const childChange of childChanges) {
            const positionChange = {
              ...childChange,
              type: "position"
            };
            changes.push(positionChange);
          }
          triggerNodeChanges(changes);
        },
        onEnd: ({ width, height }) => {
          const dimensionChange = {
            id: id2,
            type: "dimensions",
            resizing: false,
            dimensions: {
              width,
              height
            }
          };
          store.getState().triggerNodeChanges([dimensionChange]);
        }
      });
    }
    resizer.current.update({
      controlPosition,
      boundaries: {
        minWidth,
        minHeight,
        maxWidth,
        maxHeight
      },
      keepAspectRatio,
      resizeDirection,
      onResizeStart,
      onResize,
      onResizeEnd,
      shouldResize
    });
    return () => {
      resizer.current?.destroy();
    };
  }, [
    controlPosition,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    keepAspectRatio,
    onResizeStart,
    onResize,
    onResizeEnd,
    shouldResize
  ]);
  const positionClassNames = controlPosition.split("-");
  return (0, import_jsx_runtime.jsx)("div", { className: cc(["react-flow__resize-control", "nodrag", ...positionClassNames, variant, className]), ref: resizeControlRef, style: {
    ...style2,
    scale,
    ...color2 && { [isHandleControl ? "backgroundColor" : "borderColor"]: color2 }
  }, children: children2 });
}
var NodeResizeControl = (0, import_react4.memo)(ResizeControl);

// ../../node_modules/.pnpm/@xyflow+react@12.11.6_react_c2c6b2ffa45210201bfebe3ffbf25aee/node_modules/@xyflow/react/dist/style.css
var style_default3 = "/* this gets exported as style.css and can be used for the default theming */\n/* these are the necessary styles for React/Svelte Flow, they get used by base.css and style.css */\n.react-flow {\n  direction: ltr;\n\n  --xy-edge-stroke-default: #b1b1b7;\n  --xy-edge-stroke-width-default: 1;\n  --xy-edge-stroke-selected-default: #555;\n\n  --xy-connectionline-stroke-default: #b1b1b7;\n  --xy-connectionline-stroke-width-default: 1;\n\n  --xy-attribution-background-color-default: rgba(255, 255, 255, 0.5);\n\n  --xy-minimap-background-color-default: #fff;\n  --xy-minimap-mask-background-color-default: rgba(240, 240, 240, 0.6);\n  --xy-minimap-mask-stroke-color-default: transparent;\n  --xy-minimap-mask-stroke-width-default: 1;\n  --xy-minimap-node-background-color-default: #e2e2e2;\n  --xy-minimap-node-stroke-color-default: transparent;\n  --xy-minimap-node-stroke-width-default: 2;\n\n  --xy-background-color-default: transparent;\n  --xy-background-pattern-dots-color-default: #91919a;\n  --xy-background-pattern-lines-color-default: #eee;\n  --xy-background-pattern-cross-color-default: #e2e2e2;\n  background-color: var(--xy-background-color, var(--xy-background-color-default));\n  --xy-node-color-default: inherit;\n  --xy-node-border-default: 1px solid #1a192b;\n  --xy-node-background-color-default: #fff;\n  --xy-node-group-background-color-default: rgba(240, 240, 240, 0.25);\n  --xy-node-boxshadow-hover-default: 0 1px 4px 1px rgba(0, 0, 0, 0.08);\n  --xy-node-boxshadow-selected-default: 0 0 0 0.5px #1a192b;\n  --xy-node-border-radius-default: 3px;\n\n  --xy-handle-background-color-default: #1a192b;\n  --xy-handle-border-color-default: #fff;\n\n  --xy-selection-background-color-default: rgba(0, 89, 220, 0.08);\n  --xy-selection-border-default: 1px dotted rgba(0, 89, 220, 0.8);\n\n  --xy-controls-button-background-color-default: #fefefe;\n  --xy-controls-button-background-color-hover-default: #f4f4f4;\n  --xy-controls-button-color-default: inherit;\n  --xy-controls-button-color-hover-default: inherit;\n  --xy-controls-button-border-color-default: #eee;\n  --xy-controls-box-shadow-default: 0 0 2px 1px rgba(0, 0, 0, 0.08);\n\n  --xy-edge-label-background-color-default: #ffffff;\n  --xy-edge-label-color-default: inherit;\n  --xy-resize-background-color-default: #3367d9;\n}\n.react-flow.dark {\n  --xy-edge-stroke-default: #3e3e3e;\n  --xy-edge-stroke-width-default: 1;\n  --xy-edge-stroke-selected-default: #727272;\n\n  --xy-connectionline-stroke-default: #b1b1b7;\n  --xy-connectionline-stroke-width-default: 1;\n\n  --xy-attribution-background-color-default: rgba(150, 150, 150, 0.25);\n\n  --xy-minimap-background-color-default: #141414;\n  --xy-minimap-mask-background-color-default: rgba(60, 60, 60, 0.6);\n  --xy-minimap-mask-stroke-color-default: transparent;\n  --xy-minimap-mask-stroke-width-default: 1;\n  --xy-minimap-node-background-color-default: #2b2b2b;\n  --xy-minimap-node-stroke-color-default: transparent;\n  --xy-minimap-node-stroke-width-default: 2;\n\n  --xy-background-color-default: #141414;\n  --xy-background-pattern-dots-color-default: #555;\n  --xy-background-pattern-lines-color-default: #333;\n  --xy-background-pattern-cross-color-default: #333;\n  --xy-node-color-default: #f8f8f8;\n  --xy-node-border-default: 1px solid #3c3c3c;\n  --xy-node-background-color-default: #1e1e1e;\n  --xy-node-group-background-color-default: rgba(240, 240, 240, 0.25);\n  --xy-node-boxshadow-hover-default: 0 1px 4px 1px rgba(255, 255, 255, 0.08);\n  --xy-node-boxshadow-selected-default: 0 0 0 0.5px #999;\n\n  --xy-handle-background-color-default: #bebebe;\n  --xy-handle-border-color-default: #1e1e1e;\n\n  --xy-selection-background-color-default: rgba(200, 200, 220, 0.08);\n  --xy-selection-border-default: 1px dotted rgba(200, 200, 220, 0.8);\n\n  --xy-controls-button-background-color-default: #2b2b2b;\n  --xy-controls-button-background-color-hover-default: #3e3e3e;\n  --xy-controls-button-color-default: #f8f8f8;\n  --xy-controls-button-color-hover-default: #fff;\n  --xy-controls-button-border-color-default: #5b5b5b;\n  --xy-controls-box-shadow-default: 0 0 2px 1px rgba(0, 0, 0, 0.08);\n\n  --xy-edge-label-background-color-default: #141414;\n  --xy-edge-label-color-default: #f8f8f8;\n}\n.react-flow__background {\n  background-color: var(--xy-background-color-props, var(--xy-background-color, var(--xy-background-color-default)));\n  pointer-events: none;\n  z-index: -1;\n}\n.react-flow__container {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  top: 0;\n  left: 0;\n}\n.react-flow__pane {\n  z-index: 1;\n  touch-action: none;\n}\n.react-flow__pane.draggable {\n    cursor: grab;\n  }\n.react-flow__pane.dragging {\n    cursor: grabbing;\n  }\n.react-flow__pane.selection {\n    cursor: pointer;\n  }\n.react-flow__viewport {\n  transform-origin: 0 0;\n  z-index: 2;\n  pointer-events: none;\n}\n.react-flow__renderer {\n  z-index: 4;\n}\n.react-flow__selection {\n  z-index: 6;\n}\n.react-flow__nodesselection-rect:focus,\n.react-flow__nodesselection-rect:focus-visible {\n  outline: none;\n}\n.react-flow__edge-path {\n  stroke: var(--xy-edge-stroke, var(--xy-edge-stroke-default));\n  stroke-width: var(--xy-edge-stroke-width, var(--xy-edge-stroke-width-default));\n  fill: none;\n}\n.react-flow__connection-path {\n  stroke: var(--xy-connectionline-stroke, var(--xy-connectionline-stroke-default));\n  stroke-width: var(--xy-connectionline-stroke-width, var(--xy-connectionline-stroke-width-default));\n  fill: none;\n}\n.react-flow .react-flow__edges {\n  position: absolute;\n}\n.react-flow .react-flow__edges svg {\n    overflow: visible;\n    position: absolute;\n    pointer-events: none;\n  }\n.react-flow__edge {\n  pointer-events: visibleStroke;\n}\n.react-flow__edge.selectable {\n    cursor: pointer;\n  }\n.react-flow__edge.animated path {\n    stroke-dasharray: 5;\n    animation: dashdraw 0.5s linear infinite;\n  }\n.react-flow__edge.animated path.react-flow__edge-interaction {\n    stroke-dasharray: none;\n    animation: none;\n  }\n.react-flow__edge.inactive {\n    pointer-events: none;\n  }\n.react-flow__edge.selected,\n  .react-flow__edge:focus,\n  .react-flow__edge:focus-visible {\n    outline: none;\n  }\n.react-flow__edge.selected .react-flow__edge-path,\n  .react-flow__edge.selectable:focus .react-flow__edge-path,\n  .react-flow__edge.selectable:focus-visible .react-flow__edge-path {\n    stroke: var(--xy-edge-stroke-selected, var(--xy-edge-stroke-selected-default));\n  }\n.react-flow__edge-textwrapper {\n    pointer-events: all;\n  }\n.react-flow__edge .react-flow__edge-text {\n    pointer-events: none;\n    -webkit-user-select: none;\n       -moz-user-select: none;\n            user-select: none;\n  }\n/* Arrowhead marker styles - use CSS custom properties as default */\n.react-flow__arrowhead polyline {\n  stroke: var(--xy-edge-stroke, var(--xy-edge-stroke-default));\n}\n.react-flow__arrowhead polyline.arrowclosed {\n  fill: var(--xy-edge-stroke, var(--xy-edge-stroke-default));\n}\n.react-flow__connection {\n  pointer-events: none;\n}\n.react-flow__connection .animated {\n    stroke-dasharray: 5;\n    animation: dashdraw 0.5s linear infinite;\n  }\nsvg.react-flow__connectionline {\n  z-index: 1001;\n  overflow: visible;\n  position: absolute;\n}\n.react-flow__nodes {\n  pointer-events: none;\n  transform-origin: 0 0;\n}\n.react-flow__node {\n  position: absolute;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  pointer-events: all;\n  transform-origin: 0 0;\n  box-sizing: border-box;\n  cursor: default;\n}\n.react-flow__node.selectable {\n    cursor: pointer;\n  }\n.react-flow__node.draggable {\n    cursor: grab;\n    pointer-events: all;\n  }\n.react-flow__node.draggable.dragging {\n      cursor: grabbing;\n    }\n.react-flow__nodesselection {\n  z-index: 3;\n  transform-origin: left top;\n  pointer-events: none;\n}\n.react-flow__nodesselection-rect {\n    position: absolute;\n    pointer-events: all;\n    cursor: grab;\n  }\n.react-flow__handle {\n  position: absolute;\n  pointer-events: none;\n  min-width: 5px;\n  min-height: 5px;\n  width: 6px;\n  height: 6px;\n  background-color: var(--xy-handle-background-color, var(--xy-handle-background-color-default));\n  border: 1px solid var(--xy-handle-border-color, var(--xy-handle-border-color-default));\n  border-radius: 100%;\n}\n.react-flow__handle.connectingfrom {\n    pointer-events: all;\n  }\n.react-flow__handle.connectionindicator {\n    pointer-events: all;\n    cursor: crosshair;\n  }\n.react-flow__handle-bottom {\n    top: auto;\n    left: 50%;\n    bottom: 0;\n    transform: translate(-50%, 50%);\n  }\n.react-flow__handle-top {\n    top: 0;\n    left: 50%;\n    transform: translate(-50%, -50%);\n  }\n.react-flow__handle-left {\n    top: 50%;\n    left: 0;\n    transform: translate(-50%, -50%);\n  }\n.react-flow__handle-right {\n    top: 50%;\n    right: 0;\n    transform: translate(50%, -50%);\n  }\n.react-flow__edgeupdater {\n  cursor: move;\n  pointer-events: all;\n}\n.react-flow__pane.selection .react-flow__panel {\n  pointer-events: none;\n}\n.react-flow__panel {\n  position: absolute;\n  z-index: 5;\n  margin: 15px;\n}\n.react-flow__panel.top {\n    top: 0;\n  }\n.react-flow__panel.bottom {\n    bottom: 0;\n  }\n.react-flow__panel.top.center, .react-flow__panel.bottom.center {\n      left: 50%;\n      transform: translateX(-15px) translateX(-50%);\n    }\n.react-flow__panel.left {\n    left: 0;\n  }\n.react-flow__panel.right {\n    right: 0;\n  }\n.react-flow__panel.left.center, .react-flow__panel.right.center {\n      top: 50%;\n      transform: translateY(-15px) translateY(-50%);\n    }\n.react-flow__attribution {\n  font-size: 10px;\n  background: var(--xy-attribution-background-color, var(--xy-attribution-background-color-default));\n  padding: 2px 3px;\n  margin: 0;\n}\n.react-flow__attribution a {\n    text-decoration: none;\n    color: #999;\n  }\n@keyframes dashdraw {\n  from {\n    stroke-dashoffset: 10;\n  }\n}\n.react-flow__edgelabel-renderer {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  pointer-events: none;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n  left: 0;\n  top: 0;\n}\n.react-flow__viewport-portal {\n  position: absolute;\n  width: 100%;\n  height: 100%;\n  left: 0;\n  top: 0;\n  -webkit-user-select: none;\n     -moz-user-select: none;\n          user-select: none;\n}\n.react-flow__minimap {\n  background: var(\n    --xy-minimap-background-color-props,\n    var(--xy-minimap-background-color, var(--xy-minimap-background-color-default))\n  );\n}\n.react-flow__minimap-svg {\n    display: block;\n  }\n.react-flow__minimap-mask {\n    fill: var(\n      --xy-minimap-mask-background-color-props,\n      var(--xy-minimap-mask-background-color, var(--xy-minimap-mask-background-color-default))\n    );\n    stroke: var(\n      --xy-minimap-mask-stroke-color-props,\n      var(--xy-minimap-mask-stroke-color, var(--xy-minimap-mask-stroke-color-default))\n    );\n    stroke-width: var(\n      --xy-minimap-mask-stroke-width-props,\n      var(--xy-minimap-mask-stroke-width, var(--xy-minimap-mask-stroke-width-default))\n    );\n  }\n.react-flow__minimap-node {\n    fill: var(\n      --xy-minimap-node-background-color-props,\n      var(--xy-minimap-node-background-color, var(--xy-minimap-node-background-color-default))\n    );\n    stroke: var(\n      --xy-minimap-node-stroke-color-props,\n      var(--xy-minimap-node-stroke-color, var(--xy-minimap-node-stroke-color-default))\n    );\n    stroke-width: var(\n      --xy-minimap-node-stroke-width-props,\n      var(--xy-minimap-node-stroke-width, var(--xy-minimap-node-stroke-width-default))\n    );\n  }\n.react-flow__background-pattern.dots {\n    fill: var(\n      --xy-background-pattern-color-props,\n      var(--xy-background-pattern-color, var(--xy-background-pattern-dots-color-default))\n    );\n  }\n.react-flow__background-pattern.lines {\n    stroke: var(\n      --xy-background-pattern-color-props,\n      var(--xy-background-pattern-color, var(--xy-background-pattern-lines-color-default))\n    );\n  }\n.react-flow__background-pattern.cross {\n    stroke: var(\n      --xy-background-pattern-color-props,\n      var(--xy-background-pattern-color, var(--xy-background-pattern-cross-color-default))\n    );\n  }\n.react-flow__controls {\n  display: flex;\n  flex-direction: column;\n  box-shadow: var(--xy-controls-box-shadow, var(--xy-controls-box-shadow-default));\n}\n.react-flow__controls.horizontal {\n    flex-direction: row;\n  }\n.react-flow__controls-button {\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    height: 26px;\n    width: 26px;\n    padding: 4px;\n    border: none;\n    background: var(--xy-controls-button-background-color, var(--xy-controls-button-background-color-default));\n    border-bottom: 1px solid\n      var(\n        --xy-controls-button-border-color-props,\n        var(--xy-controls-button-border-color, var(--xy-controls-button-border-color-default))\n      );\n    color: var(\n      --xy-controls-button-color-props,\n      var(--xy-controls-button-color, var(--xy-controls-button-color-default))\n    );\n    cursor: pointer;\n    -webkit-user-select: none;\n       -moz-user-select: none;\n            user-select: none;\n  }\n.react-flow__controls-button svg {\n      width: 100%;\n      max-width: 12px;\n      max-height: 12px;\n      fill: currentColor;\n    }\n.react-flow__edge.updating .react-flow__edge-path {\n      stroke: #777;\n    }\n.react-flow__edge-text {\n    font-size: 10px;\n  }\n.react-flow__node.selectable:focus,\n  .react-flow__node.selectable:focus-visible {\n    outline: none;\n  }\n.react-flow__node-input,\n.react-flow__node-default,\n.react-flow__node-output,\n.react-flow__node-group {\n  padding: 10px;\n  border-radius: var(--xy-node-border-radius, var(--xy-node-border-radius-default));\n  width: 150px;\n  font-size: 12px;\n  color: var(--xy-node-color, var(--xy-node-color-default));\n  text-align: center;\n  border: var(--xy-node-border, var(--xy-node-border-default));\n  background-color: var(--xy-node-background-color, var(--xy-node-background-color-default));\n}\n.react-flow__node-input.selectable:hover, .react-flow__node-default.selectable:hover, .react-flow__node-output.selectable:hover, .react-flow__node-group.selectable:hover {\n      box-shadow: var(--xy-node-boxshadow-hover, var(--xy-node-boxshadow-hover-default));\n    }\n.react-flow__node-input.selectable.selected,\n    .react-flow__node-input.selectable:focus,\n    .react-flow__node-input.selectable:focus-visible,\n    .react-flow__node-default.selectable.selected,\n    .react-flow__node-default.selectable:focus,\n    .react-flow__node-default.selectable:focus-visible,\n    .react-flow__node-output.selectable.selected,\n    .react-flow__node-output.selectable:focus,\n    .react-flow__node-output.selectable:focus-visible,\n    .react-flow__node-group.selectable.selected,\n    .react-flow__node-group.selectable:focus,\n    .react-flow__node-group.selectable:focus-visible {\n      box-shadow: var(--xy-node-boxshadow-selected, var(--xy-node-boxshadow-selected-default));\n    }\n.react-flow__node-group {\n  background-color: var(--xy-node-group-background-color, var(--xy-node-group-background-color-default));\n}\n.react-flow__nodesselection-rect,\n.react-flow__selection {\n  background: var(--xy-selection-background-color, var(--xy-selection-background-color-default));\n  border: var(--xy-selection-border, var(--xy-selection-border-default));\n}\n.react-flow__nodesselection-rect:focus,\n  .react-flow__nodesselection-rect:focus-visible,\n  .react-flow__selection:focus,\n  .react-flow__selection:focus-visible {\n    outline: none;\n  }\n.react-flow__controls-button:hover {\n      background: var(\n        --xy-controls-button-background-color-hover-props,\n        var(--xy-controls-button-background-color-hover, var(--xy-controls-button-background-color-hover-default))\n      );\n      color: var(\n        --xy-controls-button-color-hover-props,\n        var(--xy-controls-button-color-hover, var(--xy-controls-button-color-hover-default))\n      );\n    }\n.react-flow__controls-button:disabled {\n      pointer-events: none;\n    }\n.react-flow__controls-button:disabled svg {\n        fill-opacity: 0.4;\n      }\n.react-flow__controls-button:last-child {\n    border-bottom: none;\n  }\n.react-flow__controls.horizontal .react-flow__controls-button {\n    border-bottom: none;\n    border-right: 1px solid\n      var(\n        --xy-controls-button-border-color-props,\n        var(--xy-controls-button-border-color, var(--xy-controls-button-border-color-default))\n      );\n  }\n.react-flow__controls.horizontal .react-flow__controls-button:last-child {\n    border-right: none;\n  }\n.react-flow__resize-control {\n  position: absolute;\n}\n.react-flow__resize-control.left,\n.react-flow__resize-control.right {\n  cursor: ew-resize;\n}\n.react-flow__resize-control.top,\n.react-flow__resize-control.bottom {\n  cursor: ns-resize;\n}\n.react-flow__resize-control.top.left,\n.react-flow__resize-control.bottom.right {\n  cursor: nwse-resize;\n}\n.react-flow__resize-control.bottom.left,\n.react-flow__resize-control.top.right {\n  cursor: nesw-resize;\n}\n/* handle styles */\n.react-flow__resize-control.handle {\n  width: 5px;\n  height: 5px;\n  border: 1px solid #fff;\n  border-radius: 1px;\n  background-color: var(--xy-resize-background-color, var(--xy-resize-background-color-default));\n  translate: -50% -50%;\n}\n.react-flow__resize-control.handle.left {\n  left: 0;\n  top: 50%;\n}\n.react-flow__resize-control.handle.right {\n  left: 100%;\n  top: 50%;\n}\n.react-flow__resize-control.handle.top {\n  left: 50%;\n  top: 0;\n}\n.react-flow__resize-control.handle.bottom {\n  left: 50%;\n  top: 100%;\n}\n.react-flow__resize-control.handle.top.left {\n  left: 0;\n}\n.react-flow__resize-control.handle.bottom.left {\n  left: 0;\n}\n.react-flow__resize-control.handle.top.right {\n  left: 100%;\n}\n.react-flow__resize-control.handle.bottom.right {\n  left: 100%;\n}\n/* line styles */\n.react-flow__resize-control.line {\n  border-color: var(--xy-resize-background-color, var(--xy-resize-background-color-default));\n  border-width: 0;\n  border-style: solid;\n}\n.react-flow__resize-control.line.left,\n.react-flow__resize-control.line.right {\n  width: 1px;\n  transform: translate(-50%, 0);\n  top: 0;\n  height: 100%;\n}\n.react-flow__resize-control.line.left {\n  left: 0;\n  border-left-width: 1px;\n}\n.react-flow__resize-control.line.right {\n  left: 100%;\n  border-right-width: 1px;\n}\n.react-flow__resize-control.line.top,\n.react-flow__resize-control.line.bottom {\n  height: 1px;\n  transform: translate(0, -50%);\n  left: 0;\n  width: 100%;\n}\n.react-flow__resize-control.line.top {\n  top: 0;\n  border-top-width: 1px;\n}\n.react-flow__resize-control.line.bottom {\n  border-bottom-width: 1px;\n  top: 100%;\n}\n.react-flow__edge-textbg {\n  fill: var(--xy-edge-label-background-color, var(--xy-edge-label-background-color-default));\n}\n.react-flow__edge-text {\n  fill: var(--xy-edge-label-color, var(--xy-edge-label-color-default));\n}\n";

// src/flow.ts
var CEO_FLOW = {
  goal: { width: 210, height: 110 },
  member: { width: 210, height: 110 },
  ceo: { width: 210, height: 110 },
  columnGap: 40,
  rowGap: 16,
  padX: 24,
  padY: 36
};
function ceoFlowMemberId(callId) {
  return `member:${callId}`;
}
function ceoTeamSinkStatus(members) {
  const presentations = members.map(presentCeoMember);
  if (presentations.some((item) => item.viewStatus === "running")) return "running";
  if (presentations.some((item) => item.viewStatus === "queued")) return "queued";
  if (presentations.some((item) => item.needsDecision || item.viewStatus === "blocked")) return "blocked";
  if (presentations.some((item) => item.viewStatus === "error" || item.viewStatus === "failed")) return "failed";
  if (presentations.some((item) => item.viewStatus === "partial")) return "partial";
  if (presentations.some((item) => item.viewStatus === "unverified")) return "unverified";
  if (presentations.some((item) => item.viewStatus === "unknown_after_restart")) return "unknown_after_restart";
  if (presentations.length > 0 && presentations.every((item) => item.viewStatus === "completed")) {
    return "completed";
  }
  return "delegated";
}
function memberBySessionId(members, id2) {
  return members.find(
    (member) => member.runId === id2 || member.rawId === id2 || member.memberId === id2 || member.role === id2
  );
}
function columnOf(member, members, visiting, memo3) {
  const cached = memo3.get(member.callId);
  if (cached !== void 0) return cached;
  if (visiting.has(member.callId)) return 0;
  visiting.add(member.callId);
  const resolved = member.dependsOn.map((id2) => memberBySessionId(members, id2)).filter((item) => item !== void 0);
  const column = resolved.length === 0 ? 0 : Math.max(...resolved.map((item) => columnOf(item, members, visiting, memo3))) + 1;
  visiting.delete(member.callId);
  memo3.set(member.callId, column);
  return column;
}
function sizeOf(kind) {
  if (kind === "member") return CEO_FLOW.member;
  if (kind === "ceo") return CEO_FLOW.ceo;
  return CEO_FLOW.goal;
}
function stacked(count, nodeHeight, canvasHeight) {
  if (count <= 0) return [];
  const columnHeight = count * nodeHeight + (count - 1) * CEO_FLOW.rowGap;
  const top = CEO_FLOW.padY + Math.max(0, (canvasHeight - 2 * CEO_FLOW.padY - columnHeight) / 2);
  return Array.from({ length: count }, (_, index2) => top + index2 * (nodeHeight + CEO_FLOW.rowGap));
}
function layoutCeoTeamFlow(members) {
  if (members.length === 0) {
    return { width: 0, height: 0, nodes: [], edges: [], lanes: [] };
  }
  const memo3 = /* @__PURE__ */ new Map();
  const columns = members.map((member) => columnOf(member, members, /* @__PURE__ */ new Set(), memo3));
  const memberColumnCount = Math.max(0, ...columns) + 1;
  const byColumn = Array.from({ length: memberColumnCount }, () => []);
  for (const [index2, member] of members.entries()) {
    byColumn[columns[index2]].push(member);
  }
  const colWidths = [
    CEO_FLOW.goal.width,
    ...Array.from({ length: memberColumnCount }, () => CEO_FLOW.member.width),
    CEO_FLOW.ceo.width
  ];
  const colX = [];
  let cursor = CEO_FLOW.padX;
  for (const width2 of colWidths) {
    colX.push(cursor);
    cursor += width2 + CEO_FLOW.columnGap;
  }
  const width = cursor - CEO_FLOW.columnGap + CEO_FLOW.padX;
  const memberHeights = byColumn.map(
    (column) => column.length === 0 ? 0 : column.length * CEO_FLOW.member.height + (column.length - 1) * CEO_FLOW.rowGap
  );
  const contentHeight = Math.max(CEO_FLOW.goal.height, CEO_FLOW.ceo.height, ...memberHeights);
  const height = contentHeight + 2 * CEO_FLOW.padY;
  const nodes = [
    {
      id: "goal",
      kind: "goal",
      x: colX[0],
      y: stacked(1, CEO_FLOW.goal.height, height)[0],
      enterIndex: 0,
      ...sizeOf("goal")
    }
  ];
  for (const [column, columnMembers] of byColumn.entries()) {
    const ys = stacked(columnMembers.length, CEO_FLOW.member.height, height);
    for (const [index2, member] of columnMembers.entries()) {
      nodes.push({
        id: ceoFlowMemberId(member.callId),
        kind: "member",
        member,
        x: colX[column + 1],
        y: ys[index2],
        enterIndex: column + 1,
        ...sizeOf("member")
      });
    }
  }
  nodes.push({
    id: "ceo",
    kind: "ceo",
    x: colX[colX.length - 1],
    y: stacked(1, CEO_FLOW.ceo.height, height)[0],
    enterIndex: memberColumnCount + 1,
    ...sizeOf("ceo")
  });
  const dependedOn = /* @__PURE__ */ new Set();
  const edges = [];
  for (const member of members) {
    const to = ceoFlowMemberId(member.callId);
    const resolved = member.dependsOn.map((id2) => memberBySessionId(members, id2)).filter((item) => item !== void 0);
    if (resolved.length === 0) {
      edges.push({ id: `goal->${to}`, from: "goal", to, kind: "goal" });
    }
    for (const dependency of resolved) {
      const from = ceoFlowMemberId(dependency.callId);
      dependedOn.add(from);
      edges.push({
        id: `${from}->${to}`,
        from,
        to,
        kind: "depends"
      });
    }
  }
  for (const member of members) {
    const from = ceoFlowMemberId(member.callId);
    if (dependedOn.has(from)) continue;
    edges.push({ id: `${from}->ceo`, from, to: "ceo", kind: "report" });
  }
  const WAVE_PAD = 8;
  const lanes = [];
  for (const [column, columnMembers] of byColumn.entries()) {
    if (columnMembers.length === 0) continue;
    const columnNodes = nodes.filter(
      (node) => node.kind === "member" && columnMembers.some((item) => item.callId === node.member?.callId)
    );
    if (columnNodes.length === 0) continue;
    const x0 = colX[column + 1];
    const y0 = Math.min(...columnNodes.map((node) => node.y));
    const y1 = Math.max(...columnNodes.map((node) => node.y + node.height));
    lanes.push({
      id: `lane:${String(column)}`,
      label: `\u7B2C ${String(column + 1)} \u6CE2`,
      x: x0 - WAVE_PAD,
      y: y0 - WAVE_PAD,
      w: CEO_FLOW.member.width + WAVE_PAD * 2,
      h: y1 - y0 + WAVE_PAD * 2,
      labelX: x0 + 8,
      labelY: y0 - WAVE_PAD - 16
    });
  }
  return { width, height, nodes, edges, lanes };
}

// src/processView.ts
var TITLE_SUFFIX = /(?:\s[-|–—]\s|\s*[_｜·]\s*)[^-|_–—｜·\d]{2,20}$/;
function cleanSourceTitle(title) {
  const text = (title ?? "").trim();
  if (text.length < 8) return text;
  const stripped = text.replace(TITLE_SUFFIX, "").trim();
  return stripped.length >= 2 ? stripped : text;
}
var QUERY_LIMIT = 72;
function isRecord2(value) {
  return typeof value === "object" && value !== null && Array.isArray(value) === false;
}
function parseToolArgs(raw) {
  if (raw === void 0 || raw.trim() === "") return {};
  try {
    const parsed = JSON.parse(raw);
    return isRecord2(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function toolIconKind(name) {
  if (name === "web_search") return "search";
  if (name === "web_fetch" || name === "browser") return "globe";
  if (name === "read" || name === "file_read") return "file";
  if (name === "write" || name === "file_write" || name === "file_append") return "file";
  if (name === "edit" || name === "str_replace") return "edit";
  if (name === "glob" || name === "file_list" || name === "ls") return "folder";
  if (name === "bash" || name === "shell" || name === "terminal") return "terminal";
  if (name === "grep" || name === "code_search") return "code";
  return "wrench";
}
function toolDisplayName(name) {
  if (name === "web_search") return "Search web";
  if (name === "web_fetch") return "Read page";
  if (name === "bash" || name === "shell" || name === "terminal") return "Run terminal";
  if (name === "read" || name === "file_read") return "Read file";
  if (name === "write" || name === "file_write") return "Write file";
  if (name === "edit" || name === "str_replace") return "Edit file";
  if (name === "glob" || name === "file_list") return "List dir";
  if (name === "grep") return "Grep code";
  return name;
}
function firstString(value) {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (Array.isArray(value)) {
    const item = value.find((entry) => typeof entry === "string" && entry.trim() !== "");
    return item?.trim();
  }
  return void 0;
}
function queryParts(parsed) {
  if (Array.isArray(parsed.queries)) {
    return parsed.queries.filter((entry) => typeof entry === "string" && entry.trim() !== "").map((entry) => entry.trim());
  }
  const single = firstString(parsed.query) ?? firstString(parsed.q);
  return single === void 0 ? [] : [single];
}
function queryText(parsed) {
  return queryParts(parsed).join(", ");
}
function firstQuery(parsed) {
  return queryParts(parsed)[0] ?? "";
}
function clipTitle(text, limit = QUERY_LIMIT) {
  const line2 = text.split(/\r?\n/).find((item) => item.trim())?.trim() ?? "";
  if (line2.length <= limit) return line2;
  return `${line2.slice(0, limit)}\u2026`;
}
function toolQueryDetail(name, args) {
  const parsed = parseToolArgs(args);
  if (name === "web_search") return clipTitle(firstQuery(parsed));
  if (name === "web_fetch") return clipTitle(firstString(parsed.url) ?? "");
  return clipTitle(
    firstString(parsed.query) ?? firstString(parsed.path) ?? firstString(parsed.url) ?? firstString(parsed.pattern) ?? firstString(parsed.command) ?? ""
  );
}
function toolQueryFull(name, args) {
  const parsed = parseToolArgs(args);
  if (name === "web_search") return queryText(parsed);
  if (name === "web_fetch") return firstString(parsed.url) ?? "";
  return firstString(parsed.query) ?? firstString(parsed.url) ?? "";
}
var FETCHED_LINE = /^Fetched\s+(\S+)\s+\(HTTP\s+(\d+)\)/i;
var FETCH_PREVIEW_LIMIT = 1600;
var FETCH_SNIPPET_LIMIT = 180;
var FETCH_CHROME = /跳至内容|辅助功能反馈|国内版|国际版|在新选项卡中打开链接|时间不限|约\s*[\d,]+\s*个结果|External web content follows|^[-*]\s*\[(?:网页|图片|视频|学术|词典|地图|航班|新闻)\]|^(网页|图片|视频|学术|词典|地图|航班|新闻|Images|Videos|Maps|News)$/;
var CHROME_TITLE = /^(网页|图片|视频|学术|词典|地图|航班|新闻|Images|Videos|Maps|News|国内版|国际版|登录|更多|Home|Search)$/i;
var SEARCH_ENGINE_HOST = /(?:^|\.)(bing|google|baidu|duckduckgo|sogou|so|yahoo|yandex)\./i;
var SOURCE_LINE = /^(?:[-*+]|\d+[.)])\s+\[([^\]]+)\]\(([^)]+)\)(?:\s+[—–-]\s+(.*))?$/;
var BARE_LINK_LINE = /^\[([^\]]+)\]\((https?:[^)]+)\)(?:\s+[—–-]\s+(.*))?$/;
function isFetchChromeLine(line2) {
  const text = line2.trim();
  if (text === "") return false;
  if (FETCHED_LINE.test(text)) return true;
  if (/^!\[/.test(text)) return true;
  return FETCH_CHROME.test(text);
}
function isUsefulTitle(text) {
  const value = text.trim();
  if (value.length < 4) return false;
  if (CHROME_TITLE.test(value)) return false;
  if (/^https?:\/\//.test(value)) return false;
  return true;
}
function isSearchEngineUrl(url) {
  const host = siteOf(url) ?? "";
  if (host === "") return false;
  return SEARCH_ENGINE_HOST.test(host);
}
function titleFromUrl(url) {
  if (url.trim() === "") return void 0;
  try {
    const parsed = new URL(url);
    const query = parsed.searchParams.get("q") ?? parsed.searchParams.get("wd") ?? parsed.searchParams.get("query");
    if (query !== null && query.trim() !== "") return clipTitle(query.trim());
  } catch {
    return void 0;
  }
  return void 0;
}
function markdownToPlainText(markdown) {
  return markdown.replace(/```[\s\S]*?```/g, "").replace(/^#{1,6}\s+/gm, "").replace(/!\[[^\]]*]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_~`]+/g, "").replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function snippetOf(text) {
  const line2 = text.split(/\r?\n/).find((item) => item.trim().length >= 8)?.trim();
  if (line2 === void 0) return void 0;
  if (line2.length <= FETCH_SNIPPET_LIMIT) return line2;
  return `${line2.slice(0, FETCH_SNIPPET_LIMIT).trimEnd()}\u2026`;
}
function clipPreview(text) {
  if (text.length <= FETCH_PREVIEW_LIMIT) return text;
  return `${text.slice(0, FETCH_PREVIEW_LIMIT).trimEnd()}\u2026`;
}
function parseFetchPage(result, args) {
  const fromArgs = firstString(parseToolArgs(args).url) ?? "";
  const lines = (result ?? "").split(/\r?\n/);
  const header = FETCHED_LINE.exec(lines[0]?.trim() ?? "");
  const url = header?.[1] ?? fromArgs;
  const statusRaw = header?.[2];
  const statusCode = statusRaw === void 0 ? void 0 : Number(statusRaw);
  const kept = [];
  let headingTitle;
  for (const raw of lines.slice(header === null ? 0 : 1)) {
    if (isFetchChromeLine(raw)) continue;
    const line2 = raw.trim();
    if (headingTitle === void 0) {
      const heading = /^#{1,3}\s+(.+)$/.exec(line2);
      const candidate = heading?.[1] !== void 0 ? heading[1].replace(/[_\\]/g, "").trim() : line2;
      if (isUsefulTitle(candidate)) headingTitle = clipTitle(cleanSourceTitle(candidate));
    }
    kept.push(raw);
  }
  const extracted = markdownToPlainText(kept.join("\n"));
  const hits = parseMarkdownHits(kept.join("\n"));
  const searchHost = isSearchEngineUrl(url);
  const searchPage = searchHost && hits.length >= 2;
  const preview = clipPreview(searchPage ? hits[0]?.snippet ?? snippetOf(extracted) ?? "" : searchHost ? snippetOf(extracted) ?? "" : extracted);
  const title = searchHost ? titleFromUrl(url) ?? headingTitle : headingTitle ?? titleFromUrl(url);
  return {
    url,
    preview,
    ...statusCode === void 0 || Number.isNaN(statusCode) ? {} : { statusCode },
    ...title === void 0 || title === "" ? {} : { title },
    ...siteOf(url) === void 0 ? {} : { site: siteOf(url) },
    ...snippetOf(extracted) === void 0 ? {} : { snippet: snippetOf(extracted) },
    ...searchPage ? { hits } : {}
  };
}
function siteOf(url) {
  if (url === void 0 || url.trim() === "") return void 0;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return void 0;
  }
}
function faviconUrl(site) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site)}&sz=32`;
}
function hitFromSource(item) {
  if (!isRecord2(item)) return void 0;
  const url = typeof item.url === "string" ? item.url : void 0;
  const rawTitle = firstString(item.title) ?? firstString(item.url);
  if (rawTitle === void 0) return void 0;
  const title = cleanSourceTitle(rawTitle);
  if (title === "") return void 0;
  const site = firstString(item.site) ?? siteOf(url);
  return {
    title,
    ...url === void 0 ? {} : { url },
    ...typeof item.snippet === "string" && item.snippet.trim() !== "" ? { snippet: item.snippet } : {},
    ...site === void 0 ? {} : { site }
  };
}
function parseMarkdownHits(text) {
  const hits = [];
  const seen = /* @__PURE__ */ new Set();
  for (const raw of text.split("\n")) {
    const line2 = raw.trim();
    const match = SOURCE_LINE.exec(line2) ?? BARE_LINK_LINE.exec(line2);
    if (match === null) continue;
    const title = cleanSourceTitle(match[1]?.trim() ?? "");
    const url = match[2]?.trim();
    const snippet = match[3]?.trim();
    if (title === "" || CHROME_TITLE.test(title)) continue;
    const key = url || title;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      title,
      ...url === void 0 || url === "" ? {} : { url },
      ...snippet === void 0 || snippet === "" ? {} : { snippet },
      ...siteOf(url) === void 0 ? {} : { site: siteOf(url) }
    });
  }
  return hits;
}
function parseSearchHits(result, sources) {
  if (sources !== void 0 && sources.length > 0) {
    return sources.flatMap((item) => {
      const hit = hitFromSource(item);
      return hit === void 0 ? [] : [hit];
    });
  }
  if (result === void 0 || result.trim() === "") return [];
  const trimmed = result.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (isRecord2(parsed)) {
      const fromSources = Array.isArray(parsed.sources) || Array.isArray(parsed.results) ? parsed.sources ?? parsed.results : void 0;
      if (Array.isArray(fromSources)) {
        const hits = fromSources.flatMap((item) => {
          const hit = hitFromSource(item);
          return hit === void 0 ? [] : [hit];
        });
        if (hits.length > 0) return hits;
      }
    }
    if (Array.isArray(parsed)) {
      const hits = parsed.flatMap((item) => {
        const hit = hitFromSource(item);
        return hit === void 0 ? [] : [hit];
      });
      if (hits.length > 0) return hits;
    }
  } catch {
  }
  return parseMarkdownHits(trimmed);
}
function searchFailurePeek(result) {
  const line2 = result?.split(/\r?\n/).find((item) => item.trim())?.trim() ?? "";
  if (line2 === "") return "";
  if (/no API key|API[_ ]?KEY|missing .*key/i.test(line2)) return "MISSING_KEY";
  if (line2.length <= 140) return line2;
  return `${line2.slice(0, 140)}\u2026`;
}
function searchResultCount(result, sources) {
  if (result !== void 0 && /No results found/i.test(result)) {
    return { count: 0, empty: true };
  }
  const hits = parseSearchHits(result, sources);
  if (hits.length > 0) return { count: hits.length, empty: false };
  if (result === void 0 || result.trim() === "") return { count: 0, empty: false };
  return { count: 0, empty: false };
}

// src/client/CeoTeamGraph.ts
var GraphHoverContext = (0, import_react5.createContext)({
  hoveredNodeId: null,
  keepBrightIds: null
});
var ROLE_COLORS = [
  "oklch(0.55 0.13 95)",
  "oklch(0.55 0.13 145)",
  "oklch(0.55 0.13 200)",
  "oklch(0.55 0.13 240)",
  "oklch(0.55 0.13 285)",
  "oklch(0.55 0.13 320)",
  "oklch(0.55 0.13 20)",
  "oklch(0.55 0.13 60)"
];
function hashRole(role) {
  let hash = 2166136261;
  for (const char of role) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function roleColor(role) {
  const key = role.trim();
  if (key === "") return ROLE_COLORS[0];
  return ROLE_COLORS[hashRole(key) % ROLE_COLORS.length];
}
function roleGlyph(role) {
  const key = role.trim();
  if (key === "") return "?";
  return Array.from(key)[0] ?? "?";
}
function formatElapsed(seconds) {
  if (seconds < 60) return `${String(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${String(minutes)}m` : `${String(minutes)}m ${String(rest)}s`;
}
function memberPreview(member) {
  const output = debriefSummaryOf(member.report, member.lastMessage);
  if (output.trim() !== "") return clipOneLine(output);
  return clipOneLine(member.task);
}
function initiatorPreview(text) {
  const raw = text.trim();
  const withRoles = raw.match(/^\d+\s*个\s*workers?\s*[：:]\s*(.*)$/i);
  const base = withRoles ? (withRoles[1] ?? "").trim() : /^\d+\s*个\s*workers?$/i.test(raw) ? "" : raw;
  return clipOneLine(base);
}
var STATUS_COLOR = {
  queued: "var(--dsw-alias-label-tertiary, #9a9a9a)",
  running: "var(--dsw-alias-state-business-primary, #3b82f6)",
  delegated: "var(--dsw-alias-state-success, #16a34a)",
  completed: "var(--dsw-alias-state-success, #16a34a)",
  blocked: "var(--dsw-alias-state-danger, #dc2626)",
  failed: "var(--dsw-alias-state-danger, #dc2626)",
  partial: "var(--dsw-alias-state-warning, #d97706)",
  unverified: "var(--dsw-alias-state-warning, #d97706)",
  unknown_after_restart: "var(--dsw-alias-label-tertiary, #9a9a9a)",
  error: "var(--dsw-alias-state-danger, #dc2626)"
};
var EDGE_COLOR = {
  goal: "var(--dsw-alias-border-l3, #4a4a58)",
  depends: "var(--dsw-alias-label-tertiary, #9a9a9a)",
  report: "var(--dsw-alias-border-l3, #4a4a58)"
};
var CANVAS_CSS = `
${style_default3}
.magic-ceo-canvas .react-flow__node {
  background: transparent;
  border: 0;
  padding: 0;
  box-shadow: none;
  width: 210px;
  height: 110px;
}
.magic-ceo-canvas .react-flow__handle {
  width: 8px;
  height: 8px;
  border: 0;
  background: var(--dsw-alias-border-l4, #5a5a5a);
}
.magic-ceo-canvas .react-flow__attribution { display: none; }
.magic-ceo-node-face {
  animation: magic-ceo-node-enter 0.28s ease-out both;
}
@keyframes magic-ceo-node-enter {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
/* Running presence rides the status dot only: transform/opacity keep it on the
   compositor. An infinite card-level filter/drop-shadow repaints the whole
   card every frame and reads as jank with several running members. */
@keyframes magic-ceo-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.6; }
}
/* AgentCore terminal flash: one-shot scale + glow on settle. */
.magic-ceo-node-flash {
  animation: magic-ceo-node-flash 0.6s ease-out;
}
@keyframes magic-ceo-node-flash {
  0% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
  40% { transform: scale(1.035); box-shadow: 0 0 12px 3px var(--graph-flash-color, var(--dsw-alias-state-success, #16a34a)); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 transparent; }
}
@keyframes magic-ceo-spin {
  to { transform: rotate(360deg); }
}
@keyframes magic-ceo-pulse {
  0%, 100% { opacity: .45 }
  50% { opacity: 1 }
}
.magic-ceo-canvas .react-flow__node { transition: none; }
.magic-ceo-node-dim {
  opacity: 0.5;
  transition: opacity 0.15s ease;
}
.magic-ceo-node-bright {
  opacity: 1;
  transition: opacity 0.15s ease;
}
@media (prefers-reduced-motion: reduce) {
  .magic-ceo-node-face,
  .magic-ceo-node-flash {
    animation: none;
  }
  [data-magic-ceo-status-strip] span {
    animation: none !important;
  }
}
`;
var PARTICLE_BEGINS = ["0s", "0.5s", "1s"];
var PARTICLE_DUR = "1.5s";
function motionEnabled() {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches === false;
}
function enterDelay(index2) {
  return `${String(Math.min(Math.max(0, index2) * 35, 280))}ms`;
}
var canvasCssInjected = false;
function ensureCanvasCss() {
  if (canvasCssInjected || typeof document === "undefined") return;
  canvasCssInjected = true;
  const style2 = document.createElement("style");
  style2.setAttribute("data-magic-ceo-canvas", "true");
  style2.textContent = CANVAS_CSS;
  document.head.appendChild(style2);
}
function cardStyle(selected3, needsDecision, ring, muted = false) {
  return {
    boxSizing: "border-box",
    width: 210,
    height: 110,
    padding: "10px 12px",
    borderRadius: 12,
    background: muted ? "color-mix(in srgb, var(--dsw-alias-bg-layer-2, #ececf0) 40%, var(--dsw-alias-bg-base, #ffffff))" : "var(--dsw-alias-bg-base, #ffffff)",
    border: `1px solid ${ring ?? (selected3 ? ink.accent : needsDecision ? ink.warn : line.subtle)}`,
    // AgentCore weight: colored border carries status; a whisper of lift keeps
    // cards off the canvas without heavy halos.
    boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
    color: ink.primary,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    cursor: "pointer",
    textAlign: "left",
    overflow: "hidden"
  };
}
function faceStyle(enterIndex) {
  return {
    width: "100%",
    height: "100%",
    animationDelay: enterDelay(enterIndex)
  };
}
function FlowEdge({
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style: style2,
  data
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10
  });
  const animated = data?.animated === true && motionEnabled();
  const kind = data?.kind;
  const handoff = data?.handoff;
  const { hoveredNodeId, keepBrightIds } = (0, import_react5.useContext)(GraphHoverContext);
  const hoverActive = hoveredNodeId !== null;
  const hoverRelated = keepBrightIds?.has(source) === true && keepBrightIds.has(target) === true;
  let strokeOpacity;
  let strokeWidth;
  let strokeColor;
  if (animated) {
    strokeOpacity = 1;
    strokeWidth = 2;
    strokeColor = ink.accent;
  } else if (!hoverActive) {
    strokeOpacity = kind === "depends" ? 0.35 : 0.4;
    strokeWidth = 1.5;
    strokeColor = typeof style2?.stroke === "string" ? style2.stroke : EDGE_COLOR.goal;
  } else if (hoverRelated) {
    strokeOpacity = 1;
    strokeWidth = 2;
    strokeColor = ink.accent;
  } else {
    strokeOpacity = 0.1;
    strokeWidth = 1.5;
    strokeColor = typeof style2?.stroke === "string" ? style2.stroke : EDGE_COLOR.goal;
  }
  const dash = kind === "depends" ? "5 4" : void 0;
  const handoffShort = handoff === "summary" || handoff === "truncated" ? handoff === "summary" ? "\u6458\u8981" : "\u5DF2\u622A\u65AD" : null;
  return (0, import_react5.createElement)(
    import_react5.Fragment,
    null,
    (0, import_react5.createElement)(BaseEdge, {
      path: edgePath,
      markerEnd,
      style: {
        ...style2,
        stroke: strokeColor,
        strokeWidth,
        opacity: strokeOpacity,
        strokeDasharray: animated ? void 0 : dash
      }
    }),
    handoffShort !== null ? (0, import_react5.createElement)(
      EdgeLabelRenderer,
      null,
      (0, import_react5.createElement)("div", {
        className: "nodrag nopan",
        style: {
          position: "absolute",
          transform: `translate(-50%, -50%) translate(${String(labelX)}px,${String(labelY)}px)`,
          pointerEvents: "none",
          fontSize: 10,
          lineHeight: "14px",
          padding: "1px 6px",
          borderRadius: 999,
          border: `1px solid ${line.subtle}`,
          background: "var(--dsw-alias-bg-base, #ffffff)",
          color: ink.tertiary,
          whiteSpace: "nowrap"
        }
      }, handoffShort)
    ) : null,
    animated ? PARTICLE_BEGINS.map((begin) => (0, import_react5.createElement)("circle", {
      key: begin,
      r: 3,
      fill: ink.accent
    }, (0, import_react5.createElement)("animateMotion", {
      dur: PARTICLE_DUR,
      begin,
      repeatCount: "indefinite",
      path: edgePath
    }))) : null
  );
}
function clampPreview(text) {
  return {
    fontSize: 12,
    lineHeight: "16px",
    color: ink.tertiary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical"
  };
}
function parseCeoMemberReportHasSummary(member) {
  if (member === void 0) return false;
  const report = parseCeoMemberReport(member.lastMessage ?? "");
  return report?.status === "partial" || (report?.risksOrBlockers ?? "").trim() !== "";
}
function clipOneLine(text) {
  const chars = Array.from(text.trim());
  if (chars.length <= 24) return text.trim();
  return `${chars.slice(0, 24).join("")}\u2026`;
}
function useGraphNodeDimmed() {
  const nodeId = useNodeId();
  const { keepBrightIds } = (0, import_react5.useContext)(GraphHoverContext);
  if (keepBrightIds === null || nodeId == null) return false;
  return keepBrightIds.has(nodeId) === false;
}
function graphNodeDimClass(dimmed) {
  return dimmed ? "magic-ceo-node-dim" : "magic-ceo-node-bright";
}
function isTerminalStatus(status) {
  return status === "completed" || status === "failed" || status === "error";
}
function useTerminalFlash(status) {
  const [flashing, setFlashing] = (0, import_react5.useState)(false);
  const prev = (0, import_react5.useRef)(status);
  (0, import_react5.useEffect)(() => {
    const was = prev.current;
    prev.current = status;
    if (was === status) return void 0;
    if (isTerminalStatus(status) && isTerminalStatus(was) === false) {
      setFlashing(true);
      const timer2 = setTimeout(() => {
        setFlashing(false);
      }, 600);
      return () => {
        clearTimeout(timer2);
      };
    }
    setFlashing(false);
    return void 0;
  }, [status]);
  return flashing;
}
function endpointAvatar(kind, status) {
  const color2 = kind === "goal" ? ink.tertiary : STATUS_COLOR[status];
  return (0, import_react5.createElement)("span", {
    "aria-hidden": true,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 28,
      height: 28,
      borderRadius: 99,
      background: surface.layer3,
      color: color2,
      fontSize: 13,
      fontWeight: 600,
      flex: "0 0 auto"
    }
  }, kind === "goal" ? "\u4F60" : "\u6C47");
}
function handles(kind) {
  return [
    kind === "goal" ? null : (0, import_react5.createElement)(Handle, { key: "in", type: "target", position: Position.Left }),
    kind === "ceo" ? null : (0, import_react5.createElement)(Handle, { key: "out", type: "source", position: Position.Right })
  ];
}
function GoalNode({ data }) {
  const dimmed = useGraphNodeDimmed();
  return (0, import_react5.createElement)(
    "div",
    {
      "data-magic-ceo-node": "goal",
      className: `magic-ceo-node-face ${graphNodeDimClass(dimmed)}`,
      style: { ...cardStyle(false, false, void 0, true), cursor: "default", ...faceStyle(data.enterIndex) }
    },
    (0, import_react5.createElement)(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 10 } },
      endpointAvatar("goal", "queued"),
      (0, import_react5.createElement)("strong", {
        style: {
          fontSize: 13,
          fontWeight: 510,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, data.t("graph.goal"))
    ),
    (0, import_react5.createElement)("div", {
      style: { marginTop: 4, fontSize: 11, lineHeight: "16px", color: ink.tertiary }
    }, data.t("graph.goalHint")),
    data.preview.trim() === "" ? null : (0, import_react5.createElement)("div", { style: { ...clampPreview(data.preview), marginTop: 6 } }, data.preview),
    ...handles("goal")
  );
}
function MemberNode({ data }) {
  const member = data.member;
  const presentation = presentCeoMember(member);
  const activity = member.activity;
  const title = displayCeoSeat(member, data.roster);
  const identity4 = roleColor(title);
  const running = presentation.viewStatus === "running";
  const completed = presentation.viewStatus === "completed";
  const preview = memberPreview(data.member);
  const hoverDimmed = useGraphNodeDimmed();
  const flashing = useTerminalFlash(presentation.viewStatus);
  const face = running ? activity?.phase === "tool" ? `\u6B63\u5728\u751F\u6210 ${toolDisplayName(activity.toolName ?? "\u8FD0\u884C\u4E2D")}` : activity?.phase === "thinking" ? "\u6B63\u5728\u5206\u6790" : activity?.phase === "winding_down" ? "\u6B63\u5728\u6536\u5C3E" : data.t("status.running") : presentation.viewStatus === "queued" && data.member.dependsOn.length > 0 ? "\u7B49\u5F85\u4F9D\u8D56" : data.t(`status.${presentation.viewStatus}`);
  const flashColor = presentation.viewStatus === "failed" || presentation.viewStatus === "error" ? "var(--dsw-alias-state-danger, #dc2626)" : "var(--dsw-alias-state-success, #16a34a)";
  return (0, import_react5.createElement)(
    "div",
    {
      "data-magic-ceo-member": data.member.memberId ?? data.member.callId,
      "data-magic-ceo-node": "member",
      "data-status": presentation.viewStatus,
      "data-selected": data.selected ? "true" : void 0,
      className: `${graphNodeDimClass(hoverDimmed)}${running ? " magic-ceo-node-running" : ""}`
    },
    (0, import_react5.createElement)(
      "div",
      {
        className: `magic-ceo-node-face${flashing ? " magic-ceo-node-flash" : ""}`,
        style: {
          ["--graph-flash-color"]: flashColor,
          ...cardStyle(
            data.selected,
            presentation.needsDecision,
            completed ? "var(--dsw-alias-state-success, #16a34a)" : presentation.hasBlocker || presentation.viewStatus === "failed" || presentation.viewStatus === "error" ? "var(--dsw-alias-state-danger, #dc2626)" : presentation.viewStatus === "partial" || presentation.viewStatus === "unverified" ? "var(--dsw-alias-state-warning, #d97706)" : void 0
          ),
          ...faceStyle(data.enterIndex)
        }
      },
      (0, import_react5.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 10 } },
        (0, import_react5.createElement)(
          "span",
          {
            style: { position: "relative", flex: "0 0 auto", width: 28, height: 28 }
          },
          (0, import_react5.createElement)("span", {
            "aria-hidden": true,
            style: {
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 99,
              background: `color-mix(in oklab, ${identity4} 18%, transparent)`,
              color: identity4,
              fontSize: 14,
              fontWeight: 600
            }
          }, roleGlyph(title)),
          (0, import_react5.createElement)("span", {
            "aria-hidden": true,
            style: {
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 14,
              height: 14,
              borderRadius: 99,
              background: STATUS_COLOR[presentation.viewStatus],
              border: "2px solid var(--dsw-alias-bg-base, #ffffff)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              animation: running ? "magic-ceo-dot-pulse 2s ease-in-out infinite" : void 0
            }
          }, running ? (0, import_react5.createElement)("span", {
            "aria-hidden": true,
            style: {
              width: 6,
              height: 6,
              border: "1.5px solid rgba(255,255,255,0.95)",
              borderTopColor: "transparent",
              borderRadius: 99
            }
          }) : presentation.viewStatus === "completed" ? (0, import_react5.createElement)("span", { style: { fontSize: 8, lineHeight: "8px", color: "#fff", fontWeight: 700 } }, "\u2713") : null)
        ),
        (0, import_react5.createElement)("strong", {
          style: {
            minWidth: 0,
            flex: 1,
            fontSize: 14,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        }, title)
      ),
      // AgentCore AgentNodeMeta: badges left, status right on its own row.
      (0, import_react5.createElement)(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 4,
            fontSize: 12,
            lineHeight: "16px",
            color: ink.tertiary
          }
        },
        presentation.needsDecision ? (0, import_react5.createElement)("span", {
          "data-badge": "decision",
          style: {
            fontSize: 12,
            padding: "2px 6px",
            borderRadius: 8,
            background: "var(--dsw-alias-bg-layer-2, #f4f4f6)",
            color: ink.tertiary
          }
        }, data.t("badge.decision")) : presentation.hasBlocker ? (0, import_react5.createElement)("span", {
          "data-badge": "blocker",
          style: {
            fontSize: 12,
            padding: "2px 6px",
            borderRadius: 8,
            background: "var(--dsw-alias-bg-layer-2, #f4f4f6)",
            color: ink.tertiary
          }
        }, data.t("badge.blocker")) : null,
        member.halted === true ? (0, import_react5.createElement)("span", {
          "data-badge": "halted",
          title: data.t("halted.hint"),
          style: {
            fontSize: 12,
            padding: "2px 6px",
            borderRadius: 8,
            background: "color-mix(in srgb, var(--dsw-alias-state-danger, #dc2626) 10%, transparent)",
            color: "var(--dsw-alias-state-danger, #dc2626)"
          }
        }, data.t("halted.badge")) : null,
        member.usage !== void 0 ? (0, import_react5.createElement)("span", {
          "data-badge": "tokens",
          title: data.t("tokens.tooltip", {
            input: formatTokenCount(member.usage.inputTokens),
            output: formatTokenCount(member.usage.outputTokens)
          }),
          style: {
            fontVariantNumeric: "tabular-nums",
            fontSize: 11,
            color: ink.tertiary
          }
        }, data.t("tokens.badge", {
          tokens: formatTokenCount(
            member.usage.totalTokens ?? member.usage.inputTokens + member.usage.outputTokens
          )
        })) : null,
        (0, import_react5.createElement)("span", {
          style: {
            marginLeft: "auto",
            fontVariantNumeric: "tabular-nums",
            color: running ? ink.accent : ink.tertiary
          }
        }, face)
      ),
      preview === "" ? null : (0, import_react5.createElement)("div", { style: { ...clampPreview(preview), marginTop: 8 } }, preview),
      ...handles("member")
    )
  );
}
function CeoNode({ data }) {
  const dimmed = useGraphNodeDimmed();
  const flashing = useTerminalFlash(data.status);
  const caption = data.status === "running" ? data.t("graph.ceoRunning") : data.status === "completed" ? data.t("graph.ceoDone") : data.t("graph.ceoPending");
  const flashColor = data.status === "failed" || data.status === "error" ? "var(--dsw-alias-state-danger, #dc2626)" : "var(--dsw-alias-state-success, #16a34a)";
  return (0, import_react5.createElement)(
    "div",
    {
      "data-magic-ceo-node": "ceo",
      className: `${graphNodeDimClass(dimmed)}${data.status === "running" ? " magic-ceo-node-running" : ""}`
    },
    (0, import_react5.createElement)(
      "div",
      {
        className: `magic-ceo-node-face${flashing ? " magic-ceo-node-flash" : ""}`,
        style: {
          ["--graph-flash-color"]: flashColor,
          ...cardStyle(
            false,
            false,
            data.status === "completed" ? "var(--dsw-alias-state-success, #16a34a)" : data.status === "running" ? "var(--dsw-alias-state-business-primary, #3b82f6)" : void 0
          ),
          ...faceStyle(data.enterIndex)
        }
      },
      (0, import_react5.createElement)(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 10 } },
        endpointAvatar("ceo", data.status),
        (0, import_react5.createElement)("strong", { style: { fontSize: 13, fontWeight: 510 } }, data.t("graph.ceo"))
      ),
      (0, import_react5.createElement)("div", {
        style: {
          marginTop: 4,
          fontSize: 11,
          lineHeight: "16px",
          color: data.status === "running" ? ink.accent : ink.tertiary
        }
      }, caption),
      ...handles("ceo")
    )
  );
}
var nodeTypes = {
  goal: GoalNode,
  member: MemberNode,
  ceo: CeoNode
};
var edgeTypes = {
  flow: FlowEdge
};
function useElapsedSeconds(live) {
  const [, setTick] = (0, import_react5.useState)(0);
  const startedRef = (0, import_react5.useRef)(null);
  const frozenRef = (0, import_react5.useRef)(0);
  if (live && startedRef.current === null) startedRef.current = Date.now();
  if (!live && startedRef.current !== null) {
    frozenRef.current = Math.max(0, Math.floor((Date.now() - startedRef.current) / 1e3));
    startedRef.current = null;
  }
  (0, import_react5.useEffect)(() => {
    if (!live) return void 0;
    const id2 = setInterval(() => {
      setTick((value) => value + 1);
    }, 1e3);
    return () => {
      clearInterval(id2);
    };
  }, [live]);
  return live && startedRef.current !== null ? Math.max(0, Math.floor((Date.now() - startedRef.current) / 1e3)) : frozenRef.current;
}
function WaveLanes({ lanes }) {
  if (lanes.length === 0) return null;
  return (0, import_react5.createElement)(
    ViewportPortal,
    null,
    lanes.map((lane) => (0, import_react5.createElement)(
      import_react5.Fragment,
      { key: lane.id },
      (0, import_react5.createElement)("div", {
        "data-magic-ceo-lane": lane.id,
        style: {
          position: "absolute",
          transform: `translate(${String(lane.x)}px, ${String(lane.y)}px)`,
          width: lane.w,
          height: lane.h,
          borderRadius: 12,
          border: "1px solid color-mix(in srgb, var(--dsw-alias-border-l3, #4a4a58) 30%, transparent)",
          background: "color-mix(in srgb, var(--dsw-alias-bg-layer-2, #ececf0) 55%, transparent)",
          zIndex: -1,
          pointerEvents: "none"
        }
      }),
      (0, import_react5.createElement)("div", {
        style: {
          position: "absolute",
          transform: `translate(${String(lane.labelX)}px, ${String(lane.labelY)}px)`,
          zIndex: 1,
          pointerEvents: "none",
          whiteSpace: "nowrap",
          fontSize: 10,
          lineHeight: "14px",
          color: ink.tertiary,
          letterSpacing: "0.04em",
          padding: "1px 8px",
          borderRadius: 999,
          background: "color-mix(in srgb, var(--dsw-alias-bg-layer-2, #ececf0) 80%, transparent)"
        }
      }, lane.label)
    ))
  );
}
function hoverRelatedIds(hoveredNodeId, edges) {
  const upstream = /* @__PURE__ */ new Map();
  const downstream = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    const ups = upstream.get(edge.to);
    if (ups) ups.push(edge.from);
    else upstream.set(edge.to, [edge.from]);
    const downs = downstream.get(edge.from);
    if (downs) downs.push(edge.to);
    else downstream.set(edge.from, [edge.to]);
  }
  const related = /* @__PURE__ */ new Set([hoveredNodeId]);
  const walk = (adj) => {
    const stack = [hoveredNodeId];
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === void 0) break;
      for (const next of adj.get(current) ?? []) {
        if (related.has(next)) continue;
        related.add(next);
        stack.push(next);
      }
    }
  };
  walk(upstream);
  walk(downstream);
  return related;
}
var Canvas = (0, import_react5.memo)(function Canvas2(props) {
  const layout = layoutCeoTeamFlow(props.members);
  const sinkStatus = ceoTeamSinkStatus(props.members);
  const [hoveredId, setHoveredId] = (0, import_react5.useState)(null);
  const hoverState = (0, import_react5.useMemo)(() => ({
    hoveredNodeId: hoveredId,
    keepBrightIds: hoveredId === null ? null : hoverRelatedIds(hoveredId, layout.edges)
  }), [hoveredId, layout.edges]);
  const flow = (0, import_react5.useMemo)(() => {
    const nodes = layout.nodes.map((node) => {
      if (node.kind === "goal") {
        return {
          id: node.id,
          type: "goal",
          position: { x: node.x, y: node.y },
          data: { preview: props.goalPreview, enterIndex: node.enterIndex, t: props.t },
          width: node.width,
          height: node.height,
          style: { width: node.width, height: node.height },
          draggable: false,
          selectable: false
        };
      }
      if (node.kind === "ceo") {
        return {
          id: node.id,
          type: "ceo",
          position: { x: node.x, y: node.y },
          data: { status: sinkStatus, enterIndex: node.enterIndex, t: props.t },
          width: node.width,
          height: node.height,
          style: { width: node.width, height: node.height },
          draggable: false,
          selectable: false
        };
      }
      const member = node.member;
      return {
        id: ceoFlowMemberId(member.callId),
        type: "member",
        position: { x: node.x, y: node.y },
        data: {
          member,
          roster: props.members,
          selected: member.callId === props.selectedCallId,
          enterIndex: node.enterIndex,
          t: props.t
        },
        width: node.width,
        height: node.height,
        style: { width: node.width, height: node.height },
        draggable: false,
        selectable: false
      };
    });
    const runningIds = new Set(
      props.members.filter((item) => presentCeoMember(item).viewStatus === "running").map((item) => ceoFlowMemberId(item.callId))
    );
    if (sinkStatus === "running") runningIds.add("ceo");
    const edges = layout.edges.map((edge) => {
      const live = runningIds.has(edge.to);
      const upstreamMember = edge.kind === "depends" ? props.members.find((item) => ceoFlowMemberId(item.callId) === edge.from) : void 0;
      const upstreamOutput = upstreamMember?.lastMessage ?? "";
      const handoff = edge.kind === "depends" ? upstreamOutput.length > 2e3 ? "truncated" : parseCeoMemberReportHasSummary(upstreamMember) === true ? "summary" : void 0 : void 0;
      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: "flow",
        data: { animated: live, kind: edge.kind, ...handoff === void 0 ? {} : { handoff } },
        selectable: false,
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        style: {
          stroke: EDGE_COLOR[edge.kind],
          strokeWidth: 1.5
        }
      };
    });
    return { nodes, edges };
  }, [layout, props.goalPreview, props.selectedCallId, props.t, sinkStatus, props.members]);
  const height = Math.min(520, Math.max(300, layout.height + 72));
  return (0, import_react5.createElement)(
    "div",
    {
      className: "magic-ceo-canvas",
      "data-magic-ceo-flow": true,
      style: {
        position: "relative",
        width: "100%",
        height,
        minWidth: 0,
        overflow: "hidden",
        borderRadius: 12,
        border: `1px solid ${line.subtle}`,
        background: "var(--dsw-alias-bg-layer-1, #f7f7f9)"
      }
    },
    (0, import_react5.createElement)(
      GraphHoverContext.Provider,
      { value: hoverState },
      (0, import_react5.createElement)(
        index,
        {
          nodes: flow.nodes,
          edges: flow.edges,
          nodeTypes,
          edgeTypes,
          fitView: true,
          fitViewOptions: { padding: 0.2, minZoom: 0.35, maxZoom: 1.6 },
          minZoom: 0.35,
          maxZoom: 1.6,
          panOnDrag: true,
          zoomOnScroll: true,
          zoomOnPinch: true,
          zoomOnDoubleClick: true,
          preventScrolling: true,
          nodesDraggable: false,
          nodesConnectable: false,
          nodesFocusable: false,
          elementsSelectable: false,
          proOptions: { hideAttribution: true },
          onNodeMouseEnter: (_event, node) => {
            setHoveredId(node.id);
          },
          onNodeMouseLeave: () => {
            setHoveredId(null);
          },
          onNodeClick: (_event, node) => {
            if (node.type === "member") {
              const member = node.data.member;
              selectCeoMember(member);
              props.openDetails();
              return;
            }
            if (node.type === "ceo") {
              selectCeoMember(null);
              props.openDetails();
            }
          }
        },
        (0, import_react5.createElement)(Background, { gap: 20, size: 1, color: "color-mix(in srgb, var(--dsw-alias-border-l2, #3a3a48) 45%, transparent)" }),
        (0, import_react5.createElement)(WaveLanes, { lanes: layout.lanes })
      )
    )
  );
});
function StatusIcon({ status }) {
  const running = status === "running";
  return (0, import_react5.createElement)("span", {
    "aria-hidden": true,
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 16,
      height: 16,
      color: STATUS_COLOR[status]
    }
  }, running ? (0, import_react5.createElement)("span", {
    style: {
      width: 12,
      height: 12,
      border: `2px solid ${STATUS_COLOR.running}`,
      borderTopColor: "transparent",
      borderRadius: 99,
      animation: "magic-ceo-spin 0.8s linear infinite"
    }
  }) : status === "completed" ? "\u2713" : status === "blocked" || status === "failed" || status === "error" ? "!" : "\u25CB");
}
function CeoTeamGraph(props) {
  const selected3 = (0, import_react5.useSyncExternalStore)(subscribeCeoSelection, getSelectedCeoMember, getSelectedCeoMember);
  const roster2 = (0, import_react5.useSyncExternalStore)(subscribeCeoSelection, getCeoRoster, getCeoRoster);
  const turnMembers = props.node.data.members;
  const members = turnMembers.map(
    (member) => roster2.find((item) => item.callId === member.callId) ?? member
  );
  const sinkStatus = ceoTeamSinkStatus(members);
  const live = sinkStatus === "running" || sinkStatus === "queued";
  const [expanded, setExpanded] = (0, import_react5.useState)(true);
  const elapsed = useElapsedSeconds(live);
  (0, import_react5.useEffect)(() => {
    ensureCanvasCss();
  }, []);
  (0, import_react5.useEffect)(() => {
    publishCeoTeam(turnMembers, props.sessionId);
  }, [turnMembers, props.sessionId]);
  const progress = props.node.data.progress;
  const progressLabel = `${String(progress.completed)}/${String(progress.total)}`;
  const duration = elapsed >= 1 ? props.t("graph.elapsed", { duration: formatElapsed(elapsed) }) : "";
  const goalPreview = initiatorPreview(props.node.data.plan?.summary ?? members[0]?.task ?? "");
  return (0, import_react5.createElement)(
    "section",
    {
      "data-magic-ceo-team": true,
      style: {
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        margin: "8px 0 12px",
        border: `1px solid ${line.subtle}`,
        borderRadius: 12,
        background: surface.layer2
      }
    },
    (0, import_react5.createElement)(
      "header",
      {
        "data-magic-ceo-status-strip": true,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderBottom: expanded ? `1px solid ${line.subtle}` : 0,
          color: ink.secondary,
          fontSize: 13
        }
      },
      (0, import_react5.createElement)(StatusIcon, { status: sinkStatus }),
      (0, import_react5.createElement)("span", {
        style: { minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
      }, [progressLabel, duration].filter((item) => item !== "").join(" \xB7 ")),
      (0, import_react5.createElement)("button", {
        type: "button",
        title: expanded ? props.t("graph.fold") : props.t("graph.expand"),
        "aria-label": expanded ? props.t("graph.fold") : props.t("graph.expand"),
        onClick: () => {
          setExpanded((current) => !current);
        },
        style: {
          border: 0,
          background: "transparent",
          color: ink.secondary,
          cursor: "pointer",
          fontSize: 14,
          lineHeight: "18px",
          padding: "2px 6px"
        }
      }, expanded ? "\u25B4" : "\u25BE"),
      (0, import_react5.createElement)("button", {
        type: "button",
        onClick: props.openDetails,
        title: props.t("graph.openCanvas"),
        "aria-label": props.t("graph.openCanvas"),
        style: {
          flex: "0 0 auto",
          border: 0,
          borderRadius: 8,
          background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 14%, transparent)",
          color: ink.accent,
          cursor: "pointer",
          fontSize: 12,
          lineHeight: "18px",
          padding: "4px 8px",
          fontWeight: 510
        }
      }, props.t("graph.openCanvas"))
    ),
    expanded ? (0, import_react5.createElement)(
      "div",
      { style: { display: "flex", flexDirection: "column" } },
      props.node.data.plan ? (0, import_react5.createElement)(
        "div",
        {
          "data-magic-ceo-plan": true,
          style: {
            padding: "8px 12px",
            borderBottom: `1px solid ${line.subtle}`,
            background: surface.layer2
          }
        },
        (0, import_react5.createElement)("strong", { style: { display: "block", fontSize: 12, marginBottom: 2, color: ink.secondary } }, `${props.t("plan.title")} \xB7 v${props.node.data.plan.version}`),
        (0, import_react5.createElement)("div", { style: { fontSize: 12, lineHeight: "18px", color: ink.tertiary } }, props.node.data.plan.summary)
      ) : null,
      members.length > 0 ? (0, import_react5.createElement)(
        ReactFlowProvider,
        null,
        (0, import_react5.createElement)(Canvas, {
          members,
          selectedCallId: selected3?.callId,
          goalPreview,
          openDetails: props.openDetails,
          t: props.t
        })
      ) : (0, import_react5.createElement)("div", {
        "data-magic-ceo-plan-status": true,
        style: {
          padding: "18px 12px",
          color: ink.secondary,
          fontSize: 12
        }
      }, props.t("plan.ready"))
    ) : null
  );
}

// src/client/CeoWorkspace.ts
var import_react9 = require("react");

// src/client/CeoMemberInspector.ts
var import_react8 = require("react");

// src/client/CeoProcessTimeline.ts
var import_react7 = require("react");
var MUTED = ink.tertiary;
var PRIMARY = ink.primary;
var DANGER = ink.danger;
var ACCENT = ink.accent;
var pulseCssInjected = false;
function ensurePulseCss() {
  if (pulseCssInjected || typeof document === "undefined") return;
  pulseCssInjected = true;
  const style2 = document.createElement("style");
  style2.setAttribute("data-magic-ceo-process", "true");
  style2.textContent = `
@keyframes magic-ceo-pulse { 0%, 100% { opacity: .35 } 50% { opacity: 1 } }
@keyframes magic-ceo-shimmer { 0% { opacity: .4 } 50% { opacity: .85 } 100% { opacity: .4 } }
`;
  document.head.appendChild(style2);
}
function svgIcon(paths) {
  return (0, import_react7.createElement)("svg", {
    "aria-hidden": true,
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flex: "0 0 auto",
      marginTop: 3,
      color: MUTED
    }
  }, paths);
}
function ToolGlyph({ kind }) {
  if (kind === "search") {
    return svgIcon([
      (0, import_react7.createElement)("circle", { key: "c", cx: 11, cy: 11, r: 7 }),
      (0, import_react7.createElement)("path", { key: "p", d: "M21 21l-4.35-4.35" })
    ]);
  }
  if (kind === "globe") {
    return svgIcon([
      (0, import_react7.createElement)("circle", { key: "c", cx: 12, cy: 12, r: 10 }),
      (0, import_react7.createElement)("path", { key: "m", d: "M2 12h20" }),
      (0, import_react7.createElement)("path", { key: "e", d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" })
    ]);
  }
  if (kind === "file") {
    return svgIcon([
      (0, import_react7.createElement)("path", { key: "p", d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }),
      (0, import_react7.createElement)("path", { key: "f", d: "M14 2v6h6" })
    ]);
  }
  if (kind === "edit") {
    return svgIcon([
      (0, import_react7.createElement)("path", { key: "p", d: "M12 20h9" }),
      (0, import_react7.createElement)("path", { key: "e", d: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" })
    ]);
  }
  if (kind === "folder") {
    return svgIcon([
      (0, import_react7.createElement)("path", { key: "p", d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" })
    ]);
  }
  if (kind === "terminal") {
    return svgIcon([
      (0, import_react7.createElement)("path", { key: "b", d: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" }),
      (0, import_react7.createElement)("path", { key: "c", d: "m7 10 3 2-3 2" }),
      (0, import_react7.createElement)("path", { key: "l", d: "M13 14h4" })
    ]);
  }
  if (kind === "code") {
    return svgIcon([
      (0, import_react7.createElement)("path", { key: "l", d: "m16 18 6-6-6-6" }),
      (0, import_react7.createElement)("path", { key: "r", d: "m8 6-6 6 6 6" })
    ]);
  }
  return svgIcon([
    (0, import_react7.createElement)("path", { key: "p", d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" })
  ]);
}
function Chevron({ open }) {
  return (0, import_react7.createElement)("svg", {
    "aria-hidden": true,
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { flex: "0 0 auto", color: MUTED }
  }, open ? (0, import_react7.createElement)("path", { d: "m6 9 6 6 6-6" }) : (0, import_react7.createElement)("path", { d: "m9 6 6 6-6 6" }));
}
function ErrorMark() {
  return (0, import_react7.createElement)(
    "svg",
    {
      "aria-hidden": true,
      width: 14,
      height: 14,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { flex: "0 0 auto", marginLeft: 4, color: DANGER }
    },
    (0, import_react7.createElement)("path", { d: "M18 6L6 18" }),
    (0, import_react7.createElement)("path", { d: "M6 6l12 12" })
  );
}
function ThinkingDots() {
  return (0, import_react7.createElement)("span", {
    "aria-hidden": true,
    style: { display: "inline-flex", gap: 4, alignItems: "center" }
  }, [0, 150, 300].map((delay) => (0, import_react7.createElement)("span", {
    key: String(delay),
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: "color-mix(in srgb, var(--dsw-alias-label-tertiary, #9a9a9a) 70%, transparent)",
      animation: "magic-ceo-pulse 1.2s ease-in-out infinite",
      animationDelay: `${String(delay)}ms`
    }
  })));
}
function RunningDot() {
  return (0, import_react7.createElement)("span", {
    "aria-hidden": true,
    style: {
      display: "inline-block",
      width: 6,
      height: 6,
      marginLeft: 6,
      borderRadius: 99,
      background: ACCENT,
      animation: "magic-ceo-pulse 1.2s ease-in-out infinite",
      flex: "0 0 auto"
    }
  });
}
function useRunningElapsed(running) {
  const started = (0, import_react7.useRef)(null);
  const [, force] = (0, import_react7.useState)(0);
  if (running && started.current === null) started.current = Date.now();
  if (!running) started.current = null;
  (0, import_react7.useEffect)(() => {
    if (!running) return void 0;
    const id2 = setInterval(() => {
      force((n) => n + 1);
    }, 1e3);
    return () => {
      clearInterval(id2);
    };
  }, [running]);
  if (!running || started.current === null) return 0;
  return Math.max(0, Math.floor((Date.now() - started.current) / 1e3));
}
function WebSearchSkeleton() {
  return (0, import_react7.createElement)("div", {
    "aria-hidden": true,
    style: { display: "flex", flexDirection: "column", gap: 6, marginTop: 4, paddingLeft: 22 }
  }, [0, 1, 2].map((index2) => (0, import_react7.createElement)(
    "div",
    {
      key: String(index2),
      style: { display: "flex", alignItems: "flex-start", gap: 8, padding: "4px 8px" }
    },
    (0, import_react7.createElement)("div", {
      style: {
        width: 16,
        height: 16,
        marginTop: 2,
        borderRadius: 4,
        background: surface.layer2,
        animation: "magic-ceo-shimmer 1.4s ease-in-out infinite",
        flex: "0 0 auto"
      }
    }),
    (0, import_react7.createElement)(
      "div",
      { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 } },
      (0, import_react7.createElement)("div", {
        style: {
          height: 12,
          width: "50%",
          borderRadius: 4,
          background: surface.layer2,
          animation: "magic-ceo-shimmer 1.4s ease-in-out infinite"
        }
      }),
      (0, import_react7.createElement)("div", {
        style: {
          height: 12,
          width: "80%",
          borderRadius: 4,
          background: "color-mix(in srgb, var(--dsw-alias-bg-layer-2, #24242e) 70%, transparent)",
          animation: "magic-ceo-shimmer 1.4s ease-in-out infinite"
        }
      })
    )
  )));
}
function SearchHitCard({
  hit,
  index: index2
}) {
  const [hover, setHover] = (0, import_react7.useState)(false);
  const href = hit.url === void 0 ? void 0 : safeHref(hit.url);
  const title = cleanSourceTitle(hit.title) || hit.site || hit.url || hit.title;
  const body = [
    (0, import_react7.createElement)("span", {
      key: "n",
      style: {
        flex: "0 0 auto",
        width: 16,
        marginTop: 2,
        fontSize: 12,
        lineHeight: "16px",
        textAlign: "right",
        color: MUTED,
        fontVariantNumeric: "tabular-nums"
      }
    }, String(index2 + 1)),
    (0, import_react7.createElement)(SiteMark, { key: "m", site: hit.site, title }),
    (0, import_react7.createElement)(
      "span",
      { key: "t", style: { ...wrap, minWidth: 0, flex: 1 } },
      (0, import_react7.createElement)("span", {
        style: {
          display: "block",
          overflow: "hidden",
          fontSize: 12,
          lineHeight: "18px",
          fontWeight: 510,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: PRIMARY
        }
      }, title),
      hit.snippet !== void 0 ? (0, import_react7.createElement)("span", {
        style: {
          ...wrap,
          display: "-webkit-box",
          overflow: "hidden",
          marginTop: 2,
          fontSize: 12,
          lineHeight: "16px",
          color: MUTED,
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical"
        }
      }, hit.snippet) : null
    )
  ];
  const style2 = {
    ...wrap,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "6px 8px",
    borderRadius: 8,
    background: hover ? surface.layer2 : "transparent",
    color: "inherit",
    textDecoration: "none"
  };
  if (href === void 0) {
    return (0, import_react7.createElement)("div", { style: style2 }, ...body);
  }
  return (0, import_react7.createElement)("a", {
    href,
    target: "_blank",
    rel: "noreferrer",
    onMouseEnter: () => {
      setHover(true);
    },
    onMouseLeave: () => {
      setHover(false);
    },
    style: style2
  }, ...body);
}
function safeHref(url) {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:" ? url : void 0;
  } catch {
    return void 0;
  }
}
function sourceHeader(title, site, href) {
  const inner = [
    (0, import_react7.createElement)(SiteMark, { key: "m", site, title }),
    (0, import_react7.createElement)(
      "span",
      { key: "t", style: { ...wrap, minWidth: 0, flex: 1 } },
      (0, import_react7.createElement)("span", {
        style: {
          display: "block",
          overflow: "hidden",
          fontSize: 12,
          lineHeight: "18px",
          fontWeight: 510,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: PRIMARY
        }
      }, title),
      site !== void 0 ? (0, import_react7.createElement)("span", {
        style: {
          display: "block",
          overflow: "hidden",
          marginTop: 2,
          fontSize: 12,
          lineHeight: "16px",
          color: MUTED,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, site) : null
    )
  ];
  const style2 = {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "8px 10px",
    background: "color-mix(in srgb, var(--dsw-alias-bg-layer-2, #24242e) 55%, transparent)",
    color: "inherit",
    textDecoration: "none",
    borderBottom: `0.5px solid ${line.subtle}`
  };
  if (href === void 0) return (0, import_react7.createElement)("div", { style: style2 }, ...inner);
  return (0, import_react7.createElement)("a", { href, target: "_blank", rel: "noreferrer", style: style2 }, ...inner);
}
function FetchPageCard({
  page,
  t
}) {
  const title = cleanSourceTitle(page.title) || page.site || page.url;
  const href = page.url === "" ? void 0 : safeHref(page.url);
  const hits = page.hits ?? [];
  const body = page.preview.replace(/\n+$/, "");
  return (0, import_react7.createElement)(
    "div",
    {
      "data-magic-ceo-fetch-page": true,
      style: {
        ...wrap,
        overflow: "hidden",
        marginTop: 4,
        marginLeft: 22,
        border: `0.5px solid ${line.subtle}`,
        borderRadius: 10,
        background: surface.layer2
      }
    },
    sourceHeader(title, page.site, href),
    hits.length > 0 ? (0, import_react7.createElement)("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxHeight: 288,
        overflowY: "auto",
        padding: "4px 4px 8px"
      }
    }, hits.map((hit, index2) => (0, import_react7.createElement)(SearchHitCard, {
      key: `${hit.url ?? hit.title}-${String(index2)}`,
      hit,
      index: index2
    }))) : (0, import_react7.createElement)("div", {
      style: {
        ...wrap,
        maxHeight: 288,
        overflow: "auto",
        padding: "8px 12px 10px",
        fontSize: 12,
        lineHeight: "18px",
        color: ink.secondary,
        background: "color-mix(in srgb, var(--dsw-alias-bg-layer-1, #1c1c24) 70%, transparent)"
      }
    }, body === "" ? (0, import_react7.createElement)("span", { style: { color: MUTED } }, t("process.fetch.empty")) : (0, import_react7.createElement)("pre", {
      style: {
        margin: 0,
        fontFamily: "inherit",
        fontSize: "inherit",
        lineHeight: "inherit",
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
        color: "inherit"
      }
    }, body))
  );
}
function FetchSourceCollection({
  steps,
  t
}) {
  const running = steps.some((step) => step.status === "running");
  const [open, setOpen] = (0, import_react7.useState)(running);
  const errors = steps.filter((step) => step.status === "error").length;
  const elapsed = useRunningElapsed(running);
  const pages = steps.map((step) => parseFetchPage(step.result, step.args));
  const title = t("process.fetch.collection", { count: steps.length });
  const runningHint = running ? [t("process.tool.running"), elapsed >= 1 ? `${String(elapsed)}s` : null].filter((item) => item !== null && item !== "").join(" \xB7 ") : "";
  return (0, import_react7.createElement)(
    "div",
    {
      "data-magic-ceo-fetch-collection": true,
      style: { ...wrap, display: "flex", flexDirection: "column", gap: 2 }
    },
    (0, import_react7.createElement)(
      "button",
      {
        type: "button",
        onClick: () => {
          setOpen((current) => !current);
        },
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          width: "100%",
          minWidth: 0,
          padding: 0,
          border: 0,
          background: "transparent",
          color: MUTED,
          cursor: "pointer",
          fontSize: 13,
          lineHeight: "20px",
          fontWeight: 400,
          textAlign: "left"
        }
      },
      (0, import_react7.createElement)(ToolGlyph, { kind: "globe" }),
      (0, import_react7.createElement)(
        "span",
        { style: { minWidth: 0, flex: 1, overflow: "hidden" } },
        (0, import_react7.createElement)(
          "span",
          {
            style: {
              display: "flex",
              alignItems: "center",
              minWidth: 0,
              overflow: "hidden"
            }
          },
          (0, import_react7.createElement)("span", {
            style: {
              flex: 1,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }
          }, title),
          errors > 0 ? (0, import_react7.createElement)("span", { style: { marginLeft: 6, color: DANGER } }, `${String(errors)} failed`) : null,
          running ? (0, import_react7.createElement)(RunningDot) : null,
          (0, import_react7.createElement)(Chevron, { open })
        ),
        runningHint !== "" ? (0, import_react7.createElement)("span", {
          style: {
            display: "block",
            overflow: "hidden",
            fontSize: 12,
            lineHeight: "16px",
            color: MUTED,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        }, runningHint) : null
      )
    ),
    open ? (0, import_react7.createElement)("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxHeight: 384,
        overflowY: "auto",
        padding: "0 4px 4px 8px"
      }
    }, pages.map((page, index2) => (0, import_react7.createElement)(SearchHitCard, {
      key: `${page.url}-${String(index2)}`,
      hit: {
        title: cleanSourceTitle(page.title) || page.site || page.url,
        url: page.url === "" ? void 0 : page.url,
        snippet: page.snippet ?? (page.hits === void 0 ? page.preview : void 0),
        site: page.site
      },
      index: index2
    }))) : null
  );
}
function SiteMark({ site, title }) {
  const domain = site?.trim();
  const letter = (domain || title || "?").charAt(0).toUpperCase() || "?";
  const [failedDomain, setFailedDomain] = (0, import_react7.useState)(null);
  const showImg = domain !== void 0 && domain !== "" && failedDomain !== domain;
  return (0, import_react7.createElement)("span", {
    "aria-hidden": true,
    style: {
      display: "inline-flex",
      flex: "0 0 auto",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      width: 16,
      height: 16,
      marginTop: 2,
      borderRadius: 99,
      background: surface.layer3,
      color: MUTED,
      fontSize: 10,
      fontWeight: 510
    }
  }, showImg && domain !== void 0 ? (0, import_react7.createElement)("img", {
    src: faviconUrl(domain),
    alt: "",
    width: 16,
    height: 16,
    style: { width: 16, height: 16, objectFit: "contain" },
    onError: () => {
      setFailedDomain(domain);
    }
  }) : letter);
}
function ToolStep({
  step,
  t
}) {
  const isSearch = step.name === "web_search";
  const isFetch = step.name === "web_fetch";
  const [open, setOpen] = (0, import_react7.useState)(isSearch || isFetch);
  const running = step.status === "running";
  const elapsed = useRunningElapsed(running);
  const label = toolDisplayName(step.name);
  const page = isFetch ? parseFetchPage(step.result, step.args) : void 0;
  const detail = page?.title || toolQueryDetail(step.name, step.args);
  const query = toolQueryFull(step.name, step.args);
  const hits = isSearch ? parseSearchHits(step.result, step.sources) : [];
  const search = isSearch ? searchResultCount(step.result, step.sources) : void 0;
  const failed = step.status === "error";
  const failurePeek = failed ? isSearch && searchFailurePeek(step.result) === "MISSING_KEY" ? t("process.search.noKey") : (isSearch ? searchFailurePeek(step.result) : "") || t("process.tool.error") : void 0;
  const hasBody = isSearch ? step.status !== "running" && (query !== "" || hits.length > 0 || step.result !== void 0 && step.result.trim() !== "") : isFetch ? page !== void 0 && (page.url !== "" || page.preview !== "") : step.result !== void 0 && step.result.trim() !== "" && looksLikeStructuredDump(step.result) === false;
  const meta = running || failed ? void 0 : search?.empty === true ? t("process.search.none") : search !== void 0 && search.count > 0 ? t("process.search.results", { count: search.count }) : page?.statusCode !== void 0 ? `${t("process.fetch.http")} ${String(page.statusCode)}` : void 0;
  const runningHint = running ? [isSearch ? t("process.search.searching") : t("process.tool.running"), elapsed >= 1 ? `${String(elapsed)}s` : null].filter((item) => item !== null && item !== "").join(" \xB7 ") : "";
  return (0, import_react7.createElement)(
    "div",
    {
      "data-magic-ceo-process-tool": step.toolCallId,
      "data-status": step.status,
      style: { ...wrap, display: "flex", flexDirection: "column", gap: 2 }
    },
    (0, import_react7.createElement)(
      "button",
      {
        type: "button",
        disabled: !hasBody,
        onClick: () => {
          if (hasBody) setOpen((current) => !current);
        },
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          width: "100%",
          minWidth: 0,
          padding: 0,
          border: 0,
          background: "transparent",
          color: MUTED,
          cursor: hasBody ? "pointer" : "default",
          fontSize: 13,
          lineHeight: "20px",
          fontWeight: 400,
          textAlign: "left"
        }
      },
      (0, import_react7.createElement)(ToolGlyph, { kind: toolIconKind(step.name) }),
      (0, import_react7.createElement)(
        "span",
        { style: { minWidth: 0, flex: 1, overflow: "hidden" } },
        (0, import_react7.createElement)(
          "span",
          {
            style: {
              display: "flex",
              alignItems: "center",
              minWidth: 0,
              overflow: "hidden"
            }
          },
          (0, import_react7.createElement)(
            "span",
            {
              style: {
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }
            },
            (0, import_react7.createElement)("span", null, label),
            detail !== "" ? (0, import_react7.createElement)("span", { style: { marginLeft: 6, color: MUTED } }, detail) : null
          ),
          meta !== void 0 ? (0, import_react7.createElement)("span", {
            style: {
              flex: "0 0 auto",
              maxWidth: "40%",
              marginLeft: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: MUTED,
              opacity: 0.85
            }
          }, `\xB7 ${meta}`) : null,
          running ? (0, import_react7.createElement)(RunningDot) : null,
          failed ? (0, import_react7.createElement)(ErrorMark) : null,
          hasBody ? (0, import_react7.createElement)(Chevron, { open }) : null
        ),
        runningHint !== "" ? (0, import_react7.createElement)("span", {
          style: {
            display: "block",
            overflow: "hidden",
            fontSize: 12,
            lineHeight: "16px",
            color: MUTED,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        }, runningHint) : null
      )
    ),
    !open && failurePeek !== void 0 ? (0, import_react7.createElement)("span", {
      style: {
        ...wrap,
        display: "block",
        paddingLeft: 22,
        fontSize: 12,
        lineHeight: "16px",
        color: DANGER,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, failurePeek) : null,
    running && isSearch ? (0, import_react7.createElement)(WebSearchSkeleton) : null,
    open && isSearch && query !== "" ? (0, import_react7.createElement)("div", {
      style: {
        ...wrap,
        padding: "4px 4px 6px 22px",
        fontSize: 12,
        lineHeight: "18px",
        color: MUTED
      }
    }, `${t("process.search.query")}${query}`) : null,
    open && isSearch && hits.length > 0 ? (0, import_react7.createElement)("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxHeight: 288,
        minWidth: 0,
        overflowX: "hidden",
        overflowY: "auto",
        padding: "0 4px 4px 8px"
      }
    }, hits.map((hit, index2) => (0, import_react7.createElement)(SearchHitCard, {
      key: `${hit.url ?? hit.title}-${String(index2)}`,
      hit,
      index: index2
    }))) : open && isFetch && page !== void 0 ? (0, import_react7.createElement)(FetchPageCard, { page, t }) : open && step.result && isSearch === false && isFetch === false && looksLikeStructuredDump(step.result) === false ? (0, import_react7.createElement)("div", {
      style: {
        ...wrap,
        maxHeight: 288,
        overflow: "auto",
        paddingLeft: 22,
        fontSize: 12,
        lineHeight: "18px",
        color: failed ? DANGER : ink.secondary,
        whiteSpace: "pre-wrap"
      }
    }, step.result) : null
  );
}
function ReasoningBlock({
  texts,
  streaming,
  t
}) {
  const [userOpen, setUserOpen] = (0, import_react7.useState)(void 0);
  const open = userOpen ?? streaming;
  const body = texts.join("\n\n");
  return (0, import_react7.createElement)(
    "div",
    {
      "data-magic-ceo-process-thought": true,
      "data-open": open ? "true" : void 0,
      style: { ...wrap, display: "flex", flexDirection: "column", gap: 6 }
    },
    (0, import_react7.createElement)(
      "button",
      {
        type: "button",
        onClick: () => {
          setUserOpen(!(userOpen ?? streaming));
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 8,
          padding: 0,
          border: 0,
          background: "transparent",
          color: MUTED,
          cursor: "pointer",
          fontSize: 13,
          lineHeight: "20px",
          fontWeight: 400
        }
      },
      streaming ? (0, import_react7.createElement)(ThinkingDots) : null,
      t(streaming ? "process.thinking" : "process.thought.show"),
      streaming ? null : (0, import_react7.createElement)(Chevron, { open })
    ),
    open ? (0, import_react7.createElement)("div", {
      style: {
        ...wrap,
        fontSize: 13,
        lineHeight: "20px",
        color: MUTED,
        whiteSpace: "pre-wrap"
      }
    }, body) : null
  );
}
function ThinkingTail({ t }) {
  return (0, import_react7.createElement)("div", {
    "data-magic-ceo-process-thinking-tail": true,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      lineHeight: "20px",
      color: MUTED
    }
  }, (0, import_react7.createElement)(ThinkingDots), t("process.thinking"));
}
function shouldShowThinkingTail(steps, live) {
  if (!live) return false;
  const last = steps.at(-1);
  if (last === void 0) return true;
  if (last.kind === "reasoning" || last.kind === "content") return false;
  if (last.kind === "tool") return last.status !== "running";
  return true;
}
function CeoProcessTimeline({
  steps,
  live,
  hideReportContent = false,
  t
}) {
  (0, import_react7.useEffect)(() => {
    ensurePulseCss();
  }, []);
  if (steps.length === 0 && !live) return null;
  const nodes = [];
  let reasoning = [];
  const flushReasoning = (streaming) => {
    if (reasoning.length === 0) return;
    nodes.push((0, import_react7.createElement)(ReasoningBlock, {
      key: `thought-${String(nodes.length)}`,
      texts: reasoning,
      streaming,
      t
    }));
    reasoning = [];
  };
  for (let index2 = 0; index2 < steps.length; index2 += 1) {
    const step = steps[index2];
    if (step.kind === "reasoning") {
      reasoning.push(step.text);
      continue;
    }
    flushReasoning(false);
    if (step.kind === "tool") {
      if (step.name === "web_fetch") {
        const grouped = [step];
        while (index2 + 1 < steps.length) {
          const next = steps[index2 + 1];
          if (next === void 0 || next.kind !== "tool" || next.name !== "web_fetch") break;
          index2 += 1;
          grouped.push(next);
        }
        nodes.push(grouped.length >= 2 ? (0, import_react7.createElement)(FetchSourceCollection, {
          key: `fetch-group-${grouped[0].toolCallId}`,
          steps: grouped,
          t
        }) : (0, import_react7.createElement)(ToolStep, { key: `tool-${step.toolCallId}-${String(index2)}`, step, t }));
        continue;
      }
      nodes.push((0, import_react7.createElement)(ToolStep, { key: `tool-${step.toolCallId}-${String(index2)}`, step, t }));
      continue;
    }
    if (hideReportContent && looksLikeMemberReport(step.text)) continue;
    if (hideReportContent && looksLikeStructuredDump(step.text)) continue;
    nodes.push((0, import_react7.createElement)("div", {
      key: `content-${String(index2)}`,
      "data-magic-ceo-process-content": true,
      style: {
        ...wrap,
        fontSize: 13,
        lineHeight: "20px",
        color: PRIMARY,
        whiteSpace: "pre-wrap"
      }
    }, step.text));
  }
  flushReasoning(live && steps.at(-1)?.kind === "reasoning");
  if (shouldShowThinkingTail(steps, live)) {
    nodes.push((0, import_react7.createElement)(ThinkingTail, { key: "thinking-tail", t }));
  }
  if (nodes.length === 0) return null;
  return (0, import_react7.createElement)("div", {
    "data-magic-ceo-process": true,
    style: { ...wrap, display: "flex", flexDirection: "column", gap: 10 }
  }, ...nodes);
}

// src/client/CeoMemberInspector.ts
var TASK_COLLAPSE_H = 144;
var FIELD_COLLAPSE_H = 168;
var MUTED2 = ink.tertiary;
var PRIMARY2 = ink.primary;
var SECONDARY = ink.secondary;
var DANGER2 = ink.danger;
var WARN = ink.warn;
var SUCCESS = ink.success;
var ACCENT2 = ink.accent;
var REPORT_FIELDS = [
  { key: "done", label: "field.done" },
  { key: "notDone", label: "field.notDone" },
  { key: "artifacts", label: "field.artifacts" },
  { key: "evidence", label: "field.evidence" },
  { key: "risksOrBlockers", label: "field.risks" },
  { key: "next", label: "field.next" },
  { key: "userDecisions", label: "field.decisions" }
];
function badgeStyle(status) {
  const tone = status === "running" ? ACCENT2 : status === "completed" || status === "delegated" ? SUCCESS : status === "failed" || status === "error" || status === "blocked" ? DANGER2 : status === "partial" || status === "unverified" ? WARN : MUTED2;
  const fill = status === "running" ? "color-mix(in srgb, var(--dsw-alias-state-business-primary, #7aa2ff) 16%, transparent)" : status === "completed" || status === "delegated" ? "color-mix(in srgb, var(--dsw-alias-state-success, #4ade80) 16%, transparent)" : status === "failed" || status === "error" || status === "blocked" ? "color-mix(in srgb, var(--dsw-alias-state-danger, #f87171) 16%, transparent)" : status === "partial" || status === "unverified" ? "color-mix(in srgb, var(--dsw-alias-state-warning, #fbbf24) 16%, transparent)" : surface.layer2;
  return {
    flex: "0 0 auto",
    padding: "2px 8px",
    borderRadius: 99,
    background: fill,
    color: tone,
    fontSize: 12,
    lineHeight: "16px"
  };
}
function sectionTitle(label, tone) {
  const color2 = tone === "danger" ? DANGER2 : tone === "warn" ? WARN : MUTED2;
  return (0, import_react8.createElement)("h3", {
    style: { margin: 0, fontSize: 12, fontWeight: 510, color: color2, lineHeight: "16px" }
  }, label);
}
function section(label, body, tone) {
  return (0, import_react8.createElement)(
    "section",
    {
      style: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0, marginBottom: 16 }
    },
    sectionTitle(label, tone),
    (0, import_react8.createElement)("div", {
      style: {
        ...wrap,
        fontSize: 13,
        lineHeight: "20px",
        color: SECONDARY,
        whiteSpace: "pre-wrap"
      }
    }, body)
  );
}
function CollapsibleTask({
  text,
  t
}) {
  const [open, setOpen] = (0, import_react8.useState)(false);
  const [overflow, setOverflow] = (0, import_react8.useState)(false);
  const measure = (0, import_react8.useRef)(null);
  (0, import_react8.useLayoutEffect)(() => {
    const el = measure.current;
    if (el === null) return;
    const check = () => {
      setOverflow(el.scrollHeight > TASK_COLLAPSE_H + 4);
    };
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [text]);
  return (0, import_react8.createElement)(
    "section",
    {
      "data-magic-ceo-task": true,
      style: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0, marginBottom: 16 }
    },
    sectionTitle(t("field.task")),
    (0, import_react8.createElement)(
      "div",
      { style: { position: "relative", minWidth: 0 } },
      (0, import_react8.createElement)(
        "div",
        {
          style: open || overflow === false ? void 0 : { maxHeight: TASK_COLLAPSE_H, overflow: "hidden" }
        },
        (0, import_react8.createElement)("div", {
          ref: measure,
          style: {
            ...wrap,
            fontSize: 13,
            lineHeight: "20px",
            color: PRIMARY2,
            whiteSpace: "pre-wrap"
          }
        }, text)
      ),
      overflow && open === false ? (0, import_react8.createElement)("div", {
        "aria-hidden": true,
        style: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 32,
          background: `linear-gradient(to top, ${surface.base}, transparent)`,
          pointerEvents: "none"
        }
      }) : null
    ),
    overflow ? (0, import_react8.createElement)("button", {
      type: "button",
      onClick: () => {
        setOpen((current) => !current);
      },
      style: {
        alignSelf: "flex-start",
        padding: 0,
        border: 0,
        background: "transparent",
        color: MUTED2,
        cursor: "pointer",
        fontSize: 12
      }
    }, t(open ? "task.collapse" : "task.expand")) : null
  );
}
function CollapsibleField({
  label,
  body,
  tone,
  t
}) {
  const [open, setOpen] = (0, import_react8.useState)(false);
  const [overflow, setOverflow] = (0, import_react8.useState)(false);
  const measure = (0, import_react8.useRef)(null);
  (0, import_react8.useLayoutEffect)(() => {
    const el = measure.current;
    if (el === null) return;
    const check = () => {
      setOverflow(el.scrollHeight > FIELD_COLLAPSE_H + 4);
    };
    check();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [body]);
  return (0, import_react8.createElement)(
    "div",
    {
      style: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }
    },
    (0, import_react8.createElement)("div", {
      style: {
        fontSize: 12,
        fontWeight: 510,
        color: tone === "danger" ? DANGER2 : tone === "warn" ? WARN : MUTED2
      }
    }, label),
    (0, import_react8.createElement)(
      "div",
      { style: { position: "relative", minWidth: 0 } },
      (0, import_react8.createElement)(
        "div",
        {
          style: open || overflow === false ? void 0 : { maxHeight: FIELD_COLLAPSE_H, overflow: "hidden" }
        },
        (0, import_react8.createElement)("div", {
          ref: measure,
          style: {
            ...wrap,
            fontSize: 13,
            lineHeight: "20px",
            color: PRIMARY2,
            whiteSpace: "pre-wrap"
          }
        }, body)
      ),
      overflow && open === false ? (0, import_react8.createElement)("div", {
        "aria-hidden": true,
        style: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 28,
          background: `linear-gradient(to top, ${surface.layer2}, transparent)`,
          pointerEvents: "none"
        }
      }) : null
    ),
    overflow ? (0, import_react8.createElement)("button", {
      type: "button",
      onClick: () => {
        setOpen((current) => !current);
      },
      style: {
        alignSelf: "flex-start",
        padding: 0,
        border: 0,
        background: "transparent",
        color: MUTED2,
        cursor: "pointer",
        fontSize: 12
      }
    }, t(open ? "task.collapse" : "task.expand")) : null
  );
}
function DebriefCard({
  summary,
  details,
  t
}) {
  const [open, setOpen] = (0, import_react8.useState)(false);
  const hasDetails = details.length > 0;
  return (0, import_react8.createElement)(
    "section",
    {
      "data-magic-ceo-debrief": true,
      style: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0, marginBottom: 16 }
    },
    sectionTitle(t("debrief.title")),
    (0, import_react8.createElement)(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "12px 14px",
          borderRadius: 12,
          border: `0.5px solid ${line.subtle}`,
          background: surface.layer2
        }
      },
      (0, import_react8.createElement)("div", {
        style: {
          ...wrap,
          fontSize: 14,
          lineHeight: "22px",
          fontWeight: 510,
          color: PRIMARY2,
          whiteSpace: "pre-wrap"
        }
      }, summary),
      hasDetails && open ? details.map((item) => (0, import_react8.createElement)(CollapsibleField, {
        key: item.label,
        label: item.label,
        body: item.body,
        tone: item.tone,
        t
      })) : null,
      hasDetails ? (0, import_react8.createElement)("button", {
        type: "button",
        onClick: () => {
          setOpen((current) => !current);
        },
        style: {
          alignSelf: "flex-start",
          padding: 0,
          border: 0,
          background: "transparent",
          color: MUTED2,
          cursor: "pointer",
          fontSize: 12
        }
      }, t(open ? "debrief.collapse" : "debrief.expand")) : null
    )
  );
}
function InterveneControls({
  member,
  send,
  t
}) {
  const running = member.status === "running";
  const [note, setNote] = (0, import_react8.useState)("");
  const draft = note.trim();
  const runId = member.runId ?? member.rawId ?? member.callId;
  const button = (label, message, tone, disabled) => (0, import_react8.createElement)("button", {
    type: "button",
    disabled,
    onClick: () => {
      send(message);
    },
    style: {
      flex: "1 1 0",
      padding: "5px 8px",
      borderRadius: 8,
      border: 0,
      background: tone === "danger" ? "color-mix(in srgb, var(--dsw-alias-state-danger, #dc2626) 10%, transparent)" : "color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 12%, transparent)",
      color: tone === "danger" ? "var(--dsw-alias-state-danger, #dc2626)" : "var(--dsw-alias-state-business-primary, #3b82f6)",
      cursor: disabled ? "default" : "pointer",
      fontSize: 12,
      fontWeight: 510
    }
  }, label);
  return (0, import_react8.createElement)(
    "div",
    {
      "data-magic-ceo-intervene": member.callId,
      style: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }
    },
    (0, import_react8.createElement)("div", { style: { fontSize: 12, fontWeight: 510, color: MUTED2 } }, t("intervene.title")),
    (0, import_react8.createElement)(
      "div",
      { style: { display: "flex", gap: 6 } },
      running ? button(t("intervene.halt"), haltMessageFor(runId), "danger", false) : null,
      !running && member.report?.status === "unknown_after_restart" ? button(t("intervene.resume"), resumeMessageFor(runId), "accent", false) : null
    ),
    running ? (0, import_react8.createElement)("textarea", {
      value: note,
      rows: 2,
      placeholder: t("intervene.placeholder"),
      onChange: (event) => {
        setNote(event.target.value);
      },
      style: {
        width: "100%",
        resize: "vertical",
        boxSizing: "border-box",
        padding: "6px 10px",
        borderRadius: 8,
        border: `0.5px solid ${line.subtle}`,
        background: surface.layer3,
        color: PRIMARY2,
        fontSize: 12,
        lineHeight: "18px"
      }
    }) : null,
    running && draft !== "" ? (0, import_react8.createElement)("button", {
      type: "button",
      onClick: () => {
        send(`Call ceo_replan with redirect run_id ${runId} and note: ${draft}`);
        setNote("");
      },
      style: {
        alignSelf: "flex-start",
        padding: "5px 10px",
        borderRadius: 8,
        border: 0,
        background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 14%, transparent)",
        color: "var(--dsw-alias-state-business-primary, #3b82f6)",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 510
      }
    }, t("intervene.redirect")) : null
  );
}
function haltMessageFor(runId) {
  return `Call ceo_replan with halt run_id ${runId}. The member was stopped by the user; do not rewrite its work as success.`;
}
function resumeMessageFor(runId) {
  return `Call ceo_replan with resume run_id ${runId}. Redispatch this unknown_after_restart node from scratch.`;
}
function CeoMemberInspector({ member, roster: roster2 = [], onIntervene, t }) {
  const process2 = member.process ?? [];
  const report = presentCeoMemberReport(member);
  const presentation = presentCeoMember({ ...member, report });
  const live = member.status === "running" && presentation.viewStatus === "running";
  const reportSource = member.lastMessage ?? reportTextFromProcess(process2);
  const filled = REPORT_FIELDS.filter((field) => {
    const value = report?.[field.key];
    if (typeof value !== "string" || value.trim() === "") return false;
    if (field.key === "userDecisions") return hasUserDecision(value);
    return true;
  });
  const summary = debriefSummaryOf(report, reportSource);
  const debriefDetails = filled.filter((field) => field.key !== "userDecisions" || !presentation.needsDecision).filter((field) => field.key !== "risksOrBlockers" || !presentation.hasBlocker).map((field) => ({
    label: t(field.label),
    body: report?.[field.key] ?? "",
    tone: field.key === "risksOrBlockers" ? "danger" : field.key === "userDecisions" ? "warn" : void 0
  }));
  const showDebrief = summary !== "" || debriefDetails.length > 0;
  const showEmpty = filled.length === 0 && !member.lastMessage && process2.length === 0 && !live;
  return (0, import_react8.createElement)(
    "aside",
    {
      "data-magic-ceo-inspector": member.callId,
      "data-status": presentation.viewStatus,
      style: {
        boxSizing: "border-box",
        width: "100%",
        minWidth: 0,
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column"
      }
    },
    (0, import_react8.createElement)(
      "header",
      {
        style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0, marginBottom: 16 }
      },
      (0, import_react8.createElement)("span", {
        style: {
          ...wrap,
          flex: 1,
          overflow: "hidden",
          fontSize: 14,
          fontWeight: 500,
          lineHeight: "20px",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: PRIMARY2
        }
      }, displayCeoSeat(member, roster2)),
      (0, import_react8.createElement)("span", {
        style: badgeStyle(presentation.viewStatus)
      }, t(`status.${presentation.viewStatus}`))
    ),
    live ? (0, import_react8.createElement)("div", {
      style: {
        marginBottom: 16,
        padding: "10px 12px",
        borderRadius: 12,
        border: "0.5px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 20%, transparent)",
        background: "color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 5%, transparent)",
        fontSize: 13,
        lineHeight: "20px",
        color: PRIMARY2
      }
    }, t("inspector.live")) : null,
    (0, import_react8.createElement)(CollapsibleTask, { text: member.task, t }),
    member.dependsOn.length > 0 ? section(t("depends.on"), member.dependsOn.join(", ")) : null,
    member.usage !== void 0 ? (0, import_react8.createElement)(
      "div",
      {
        "data-magic-ceo-usage": true,
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 16,
          fontVariantNumeric: "tabular-nums",
          fontSize: 12,
          color: MUTED2
        }
      },
      (0, import_react8.createElement)("span", {
        style: {
          padding: "2px 8px",
          borderRadius: 99,
          background: surface.layer2
        }
      }, t("tokens.badge", {
        tokens: formatTokenCount(
          member.usage.totalTokens ?? member.usage.inputTokens + member.usage.outputTokens
        )
      })),
      (0, import_react8.createElement)("span", null, t("tokens.input", { tokens: formatTokenCount(member.usage.inputTokens) })),
      (0, import_react8.createElement)("span", null, t("tokens.output", { tokens: formatTokenCount(member.usage.outputTokens) })),
      member.usage.cacheReadTokens !== void 0 ? (0, import_react8.createElement)("span", null, t("tokens.cache", { tokens: formatTokenCount(member.usage.cacheReadTokens) })) : null
    ) : null,
    member.contextChannels !== void 0 && member.contextChannels.length > 0 ? section(
      t("context.title"),
      member.contextChannels.map(
        (channel) => `${channel.channel}: ${String(channel.chars)}${channel.truncated ? "\uFF08\u5DF2\u622A\u65AD\uFF09" : ""}`
      ).join("\n")
    ) : null,
    member.redirectedNote !== void 0 ? section(t("intervene.redirected"), member.redirectedNote, "warn") : null,
    onIntervene !== void 0 && (member.status === "running" || presentation.viewStatus === "unknown_after_restart") ? (0, import_react8.createElement)(InterveneControls, {
      member,
      send: (message) => {
        onIntervene("halt", message);
      },
      t
    }) : null,
    process2.length > 0 || live ? (0, import_react8.createElement)(
      "div",
      { style: { marginBottom: 16 } },
      (0, import_react8.createElement)(CeoProcessTimeline, {
        steps: process2,
        live,
        hideReportContent: true,
        t
      })
    ) : null,
    presentation.viewStatus === "unknown_after_restart" ? (0, import_react8.createElement)("div", {
      style: { marginBottom: 16, fontSize: 12, color: MUTED2 }
    }, t("inspector.unknown")) : showEmpty ? (0, import_react8.createElement)("div", {
      style: { marginBottom: 16, fontSize: 12, color: MUTED2 }
    }, t(
      member.status === "queued" ? "inspector.queued" : "inspector.noReport"
    )) : null,
    presentation.needsDecision ? (0, import_react8.createElement)("div", {
      style: {
        marginBottom: 16,
        padding: "10px 12px",
        borderRadius: 12,
        border: `0.5px solid ${WARN}`,
        background: "color-mix(in srgb, var(--dsw-alias-state-warning, #d97706) 8%, transparent)",
        fontSize: 13,
        lineHeight: "20px",
        color: WARN
      }
    }, t("inspector.decisionInChat")) : null,
    presentation.hasBlocker && report?.risksOrBlockers ? section(t("badge.blocker"), report.risksOrBlockers, "danger") : null,
    showDebrief ? (0, import_react8.createElement)(DebriefCard, {
      summary: summary || t("field.conclusion"),
      details: debriefDetails,
      t
    }) : null,
    member.answeredDecision ? section(t("decision.sent"), member.answeredDecision) : null
  );
}

// src/client/CeoWorkspace.ts
var STICK_DETACH_PX = 80;
var STICK_ATTACH_PX = 24;
function distanceFromBottom(el) {
  return el.scrollHeight - el.scrollTop - el.clientHeight;
}
function nextStickState(stuck, gap) {
  if (stuck) return gap < STICK_DETACH_PX;
  return gap < STICK_ATTACH_PX;
}
function useStickToBottom(resetKey, followOnReset) {
  const scrollRef = (0, import_react9.useRef)(null);
  const contentRef = (0, import_react9.useRef)(null);
  const stickRef = (0, import_react9.useRef)(true);
  const followRef = (0, import_react9.useRef)(followOnReset);
  followRef.current = followOnReset;
  const [atBottom, setAtBottom] = (0, import_react9.useState)(true);
  const applyStick = (stuck) => {
    stickRef.current = stuck;
    setAtBottom(stuck);
  };
  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el === null) return;
    el.scrollTop = el.scrollHeight;
  };
  const jumpToBottom = () => {
    applyStick(true);
    scrollToBottom();
  };
  (0, import_react9.useEffect)(() => {
    const el = scrollRef.current;
    if (el === null) return;
    const onScroll = () => {
      applyStick(nextStickState(stickRef.current, distanceFromBottom(el)));
    };
    const onWheel = (event) => {
      if (event.deltaY < 0 && stickRef.current) applyStick(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
    };
  }, [resetKey]);
  (0, import_react9.useEffect)(() => {
    const content = contentRef.current;
    const viewport = scrollRef.current;
    if (content === null || typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const follow = () => {
      raf = 0;
      if (stickRef.current) scrollToBottom();
      else setAtBottom(false);
    };
    const observer = new ResizeObserver(() => {
      if (raf !== 0) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(follow);
    });
    observer.observe(content);
    if (viewport !== null) observer.observe(viewport);
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [resetKey]);
  (0, import_react9.useLayoutEffect)(() => {
    if (followRef.current) {
      applyStick(true);
      scrollToBottom();
      return;
    }
    applyStick(false);
    const el = scrollRef.current;
    if (el !== null) el.scrollTop = 0;
  }, [resetKey]);
  return { scrollRef, contentRef, atBottom, jumpToBottom };
}
function ToBottomButton({
  onClick,
  label
}) {
  return (0, import_react9.createElement)(
    "button",
    {
      type: "button",
      "aria-label": label,
      onClick,
      style: {
        position: "absolute",
        left: "50%",
        bottom: 12,
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        padding: 0,
        border: "0.5px solid var(--dsw-alias-border-l3, #3a3a3a)",
        borderRadius: 99,
        transform: "translateX(-50%)",
        background: "var(--dsw-alias-button-floating-fill, #1f1f1f)",
        color: "var(--dsw-alias-label-primary, #f5f5f5)",
        boxShadow: "var(--dsw-elevation-panel, 0 8px 24px rgba(0,0,0,.28))",
        cursor: "pointer"
      }
    },
    (0, import_react9.createElement)("svg", {
      "aria-hidden": true,
      width: 16,
      height: 16,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, (0, import_react9.createElement)("path", { d: "m6 9 6 6 6-6" }))
  );
}
function attentionTone(kind) {
  if (kind === "decision" || kind === "unverified" || kind === "unknown_after_restart") {
    return "var(--dsw-alias-state-warning, #d97706)";
  }
  return "var(--dsw-alias-state-danger, #dc2626)";
}
function attentionPreview(member, kind) {
  if (kind === "decision") return member.report?.userDecisions ?? member.task;
  if (kind === "blocker") return member.report?.risksOrBlockers ?? member.task;
  if (kind === "unverified" || kind === "unknown_after_restart") {
    return member.lastMessage ?? member.report?.done ?? member.task;
  }
  return member.report?.notDone ?? member.lastMessage ?? member.task;
}
function rowButton(key, title, preview, meta, tone, onSelect) {
  return (0, import_react9.createElement)(
    "button",
    {
      key,
      type: "button",
      onClick: onSelect,
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 4,
        width: "100%",
        padding: "10px 10px",
        border: tone === void 0 ? `0.5px solid ${line.subtle}` : `0.5px solid ${tone}`,
        borderRadius: 10,
        background: surface.layer2,
        color: ink.primary,
        textAlign: "left",
        cursor: "pointer"
      }
    },
    (0, import_react9.createElement)(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 8 } },
      (0, import_react9.createElement)("strong", { style: { fontSize: 13, fontWeight: 510 } }, title),
      (0, import_react9.createElement)("span", {
        style: {
          marginLeft: "auto",
          fontSize: 11,
          color: tone ?? ink.tertiary
        }
      }, meta)
    ),
    (0, import_react9.createElement)("div", {
      style: {
        fontSize: 12,
        lineHeight: "18px",
        color: ink.secondary,
        overflow: "hidden",
        textOverflow: "ellipsis",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical"
      }
    }, preview)
  );
}
function overview(roster2, t) {
  const attention = ceoAttentionItems(roster2);
  if (roster2.length === 0) {
    return (0, import_react9.createElement)("div", {
      style: { fontSize: 13, lineHeight: "20px", color: ink.tertiary }
    }, t("workspace.empty"));
  }
  return (0, import_react9.createElement)(
    "div",
    { style: { display: "flex", flexDirection: "column", gap: 16 } },
    attention.length > 0 ? (0, import_react9.createElement)(
      "section",
      { style: { display: "flex", flexDirection: "column", gap: 8 } },
      (0, import_react9.createElement)("div", {
        style: { fontSize: 12, fontWeight: 510, color: ink.tertiary }
      }, t("attention.title")),
      ...attention.map((item) => rowButton(
        `${item.kind}-${item.member.callId}`,
        displayCeoSeat(item.member, roster2),
        attentionPreview(item.member, item.kind),
        t(`attention.${item.kind}`),
        attentionTone(item.kind),
        () => {
          selectCeoMember(item.member);
        }
      ))
    ) : null,
    (0, import_react9.createElement)(
      "section",
      { style: { display: "flex", flexDirection: "column", gap: 8 } },
      (0, import_react9.createElement)("div", {
        style: { fontSize: 12, fontWeight: 510, color: ink.tertiary }
      }, t("roster.title")),
      ...roster2.map((member) => {
        const presentation = presentCeoMember(member);
        return rowButton(
          member.callId,
          displayCeoSeat(member, roster2),
          member.task,
          t(`status.${presentation.viewStatus}`),
          presentation.needsDecision ? attentionTone("decision") : presentation.hasBlocker || presentation.viewStatus === "failed" || presentation.viewStatus === "error" ? attentionTone("failed") : presentation.viewStatus === "unverified" ? attentionTone("unverified") : presentation.viewStatus === "unknown_after_restart" ? attentionTone("unknown_after_restart") : void 0,
          () => {
            selectCeoMember(member);
          }
        );
      })
    )
  );
}
function CeoWorkspace({ sessionId, closeDetails, sendIntervention, t }) {
  const selected3 = (0, import_react9.useSyncExternalStore)(subscribeCeoSelection, getSelectedCeoMember, getSelectedCeoMember);
  const roster2 = (0, import_react9.useSyncExternalStore)(subscribeCeoSelection, getCeoRoster, getCeoRoster);
  const close = () => {
    if (selected3 !== null) {
      selectCeoMember(null);
      return;
    }
    closeDetails();
  };
  const inspector = selected3 === null ? null : (0, import_react9.createElement)(CeoMemberInspector, {
    key: selected3.callId,
    member: selected3,
    roster: roster2,
    onIntervene: sendIntervention === void 0 ? void 0 : (action, note) => {
      const runId = selected3.runId ?? selected3.rawId ?? selected3.callId;
      const message = action === "halt" ? `Call ceo_replan with halt run_id ${runId}. The member was stopped by the user; do not rewrite its work as success.` : action === "resume" ? `Call ceo_replan with resume run_id ${runId}. Redispatch this unknown_after_restart node from scratch.` : note;
      sendIntervention(message);
    },
    t
  });
  const { scrollRef, contentRef, atBottom, jumpToBottom } = useStickToBottom(
    selected3?.callId ?? sessionId ?? "",
    selected3?.status === "running"
  );
  return (0, import_react9.createElement)(
    "div",
    {
      "data-magic-ceo-workspace": true,
      "data-member": selected3?.callId,
      style: {
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minWidth: 0,
        overflow: "hidden",
        borderLeft: `0.5px solid ${line.subtle}`,
        background: surface.base,
        color: ink.primary
      }
    },
    selected3 === null ? (0, import_react9.createElement)(
      "header",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "14px 16px 12px",
          borderBottom: `0.5px solid ${line.subtle}`
        }
      },
      (0, import_react9.createElement)("div", {
        style: {
          overflow: "hidden",
          fontSize: 14,
          lineHeight: "20px",
          fontWeight: 500,
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, t("workspace.title")),
      (0, import_react9.createElement)("button", {
        type: "button",
        "aria-label": t("workspace.close"),
        onClick: close,
        style: {
          marginLeft: "auto",
          width: 28,
          height: 28,
          border: 0,
          borderRadius: 99,
          background: "transparent",
          color: ink.secondary,
          cursor: "pointer",
          fontSize: 11
        }
      }, t("workspace.close"))
    ) : (0, import_react9.createElement)(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          padding: "8px 12px 0"
        }
      },
      (0, import_react9.createElement)("button", {
        type: "button",
        "aria-label": t("workspace.close"),
        onClick: close,
        style: {
          width: 28,
          height: 28,
          border: 0,
          borderRadius: 99,
          background: "transparent",
          color: ink.tertiary,
          cursor: "pointer",
          fontSize: 16,
          lineHeight: "28px"
        }
      }, "\xD7")
    ),
    (0, import_react9.createElement)(
      "div",
      {
        style: {
          position: "relative",
          flex: 1,
          minWidth: 0,
          minHeight: 0
        }
      },
      (0, import_react9.createElement)(
        "div",
        {
          ref: scrollRef,
          style: {
            height: "100%",
            minWidth: 0,
            padding: selected3 === null ? 16 : "8px 16px 16px",
            overflowX: "hidden",
            overflowY: "auto"
          }
        },
        (0, import_react9.createElement)("div", { ref: contentRef }, selected3 === null ? overview(roster2, t) : inspector)
      ),
      selected3 !== null && atBottom === false ? (0, import_react9.createElement)(ToBottomButton, { onClick: jumpToBottom, label: t("workspace.toBottom") }) : null
    )
  );
}

// src/client/definition.ts
function resultText2(content) {
  return textFromContent(content);
}
var ceoTeamDefinition = {
  kind: "ceo-team",
  target: "chat",
  match: (event) => {
    const turn = event.data?.turn;
    if (typeof turn !== "number") return null;
    if (event.type === "turn/start") return { id: String(turn), role: "start" };
    if (event.type === CEO_PLAN || event.type === CEO_PLAN_REVISED) return { id: String(turn), role: "update" };
    if (event.type === "tool/call" && (event.data?.name === "ceo_delegate" || event.data?.name === "ceo_replan")) {
      return { id: String(turn), role: "update" };
    }
    if (event.type === CEO_RUN_JOURNAL) return { id: String(turn), role: "update" };
    if (event.type === CEO_RUN_PROCESS) return { id: String(turn), role: "update" };
    if (event.type === CEO_MEMBER_RESULT) return { id: String(turn), role: "update" };
    if (event.type === CEO_MEMBER_USAGE || event.type === CEO_MEMBER_CONTEXT || event.type === CEO_MEMBER_HALTED || event.type === CEO_MEMBER_REDIRECTED) {
      return { id: String(turn), role: "update" };
    }
    if (event.type === CEO_RUN_PHASE || event.type === CEO_RUN_PROGRESS) return { id: String(turn), role: "update" };
    if (event.type === "tool/result") return { id: String(turn), role: "update" };
    return null;
  },
  start: (_context, match) => {
    return startCeoTeam(match.event.data.turn);
  },
  update: (context, match) => {
    const event = match.event;
    if (event.type === CEO_PLAN || event.type === CEO_PLAN_REVISED) {
      return applyCeoPlan(context.state, {
        planId: String(event.data.planId ?? ""),
        version: typeof event.data.version === "number" ? event.data.version : void 0,
        summary: String(event.data.summary ?? ""),
        analysis: String(event.data.analysis ?? ""),
        ...typeof event.data.teamBrief === "string" ? { teamBrief: event.data.teamBrief } : {},
        tasks: event.data.tasks
      });
    }
    if (event.type === CEO_RUN_PROGRESS) {
      return applyCeoRunProgress(context.state, { callId: String(event.data.callId ?? ""), completed: Number(event.data.completed ?? 0), total: Number(event.data.total ?? 0), seq: event.seq });
    }
    if (event.type === CEO_RUN_PHASE) {
      const phase = event.data.phase;
      if (phase !== "thinking" && phase !== "tool" && phase !== "waiting" && phase !== "winding_down") return context.state;
      return applyCeoRunPhase(context.state, { callId: String(event.data.callId ?? ""), runId: String(event.data.runId ?? ""), memberId: String(event.data.memberId ?? ""), phase, ...typeof event.data.toolName === "string" ? { toolName: event.data.toolName } : {}, seq: event.seq });
    }
    if (event.type === "tool/call") {
      if (event.data.name === "ceo_replan") return context.state;
      if (event.data.name !== "ceo_delegate") return context.state;
      return applyCeoDelegateCall(context.state, {
        callId: String(event.data.callId),
        seq: event.seq,
        argsRaw: event.data.arguments
      });
    }
    if (event.type === CEO_RUN_JOURNAL) {
      return applyCeoRunJournal(context.state, {
        callId: String(event.data.callId ?? ""),
        seq: event.seq,
        runs: parseCeoRunJournalRuns(event.data.runs)
      });
    }
    if (event.type === CEO_RUN_PROCESS) {
      const op = parseCeoProcessOp(event.data.op);
      if (op === void 0) return context.state;
      return applyCeoRunProcess(context.state, {
        callId: String(event.data.callId ?? ""),
        seq: event.seq,
        runId: typeof event.data.runId === "string" ? event.data.runId : void 0,
        memberId: typeof event.data.memberId === "string" ? event.data.memberId : void 0,
        op
      });
    }
    if (event.type === CEO_MEMBER_USAGE) {
      return applyCeoMemberUsage(context.state, {
        callId: String(event.data.callId ?? ""),
        runId: String(event.data.runId ?? ""),
        memberId: String(event.data.memberId ?? ""),
        usage: event.data.usage,
        seq: event.seq
      });
    }
    if (event.type === CEO_MEMBER_CONTEXT) {
      return applyCeoMemberContext(context.state, {
        callId: String(event.data.callId ?? ""),
        runId: String(event.data.runId ?? ""),
        memberId: String(event.data.memberId ?? ""),
        channels: event.data.channels,
        seq: event.seq
      });
    }
    if (event.type === CEO_MEMBER_HALTED) {
      return applyCeoMemberHalted(context.state, {
        callId: String(event.data.callId ?? ""),
        runId: String(event.data.runId ?? ""),
        memberId: typeof event.data.memberId === "string" ? event.data.memberId : void 0,
        seq: event.seq
      });
    }
    if (event.type === CEO_MEMBER_REDIRECTED) {
      return applyCeoMemberRedirected(context.state, {
        callId: String(event.data.callId ?? ""),
        runId: String(event.data.runId ?? ""),
        note: typeof event.data.note === "string" ? event.data.note : "",
        seq: event.seq
      });
    }
    if (event.type === CEO_MEMBER_RESULT) {
      return applyCeoMemberResult(context.state, {
        callId: String(event.data.callId ?? ""),
        runId: String(event.data.runId ?? ""),
        memberId: String(event.data.memberId ?? ""),
        seq: event.seq,
        output: String(event.data.output ?? ""),
        stopReason: typeof event.data.stopReason === "string" ? event.data.stopReason : void 0,
        status: event.data.status === "blocked" || event.data.status === "failed" || event.data.status === "partial" || event.data.status === "completed" || event.data.status === "unverified" || event.data.status === "unknown_after_restart" ? event.data.status : void 0
      });
    }
    if (event.type !== "tool/result") return context.state;
    const callId = String(event.data.message?.source?.callId);
    const result = event.data.message?.content?.[0];
    const text = resultText2(result?.content);
    const known = context.state.members.some((member) => member.batchCallId === callId || member.callId === callId);
    if (known) {
      return applyCeoDelegateResult(context.state, {
        callId,
        seq: event.seq,
        text,
        isError: result?.isError === true
      });
    }
    if (context.state.members.length === 0) return context.state;
    const runs = parseCeoDelegateRuns(text);
    if (runs.length === 0) return context.state;
    const graphCallId = context.state.members[0]?.batchCallId;
    if (graphCallId === void 0 || graphCallId === "") return context.state;
    return applyCeoDelegateResult(context.state, {
      callId: graphCallId,
      seq: event.seq,
      text,
      isError: result?.isError === true
    });
  },
  buildViewNode: (context) => {
    if (context.start === void 0) return null;
    const data = projectCeoTeam(context.state);
    if (data === null) return null;
    return {
      key: context.key,
      kind: "ceo-team",
      id: context.id,
      target: "chat",
      anchorSeq: context.start.event.seq,
      location: context.start.location,
      visibility: "visible",
      data
    };
  }
};
var ceoMemberReportDefinition = {
  kind: "ceo-member-report",
  match: (event) => {
    if (event.type !== "user/message") return null;
    if (senderSessionIdOf(event.data?.source) === void 0) return null;
    return { id: String(event.seq), role: "start" };
  },
  start: (_context, match) => {
    const memberId = senderSessionIdOf(match.event.data.source);
    const source = match.event.data.source;
    const sourceKind = typeof source === "object" && source !== null && "kind" in source ? source.kind : void 0;
    if (memberId !== void 0 && (sourceKind === "agent-message" || sourceKind === "subagent-settled")) {
      applyCeoRosterMessage({
        memberId,
        seq: match.event.seq,
        text: textFromContent(match.event.data.content),
        sourceKind
      });
    }
    return { memberId };
  },
  update: (context) => context.state
};

// src/client/register.ts
var inject = ["uiConversation", "slots", "sessions", "locale", "layout"];
var zh = {
  "graph.title": "CEO \u7F16\u6392\u56FE",
  "graph.empty": "\u8FD8\u6CA1\u6709\u6210\u5458",
  "graph.goal": "\u4F60\u7684\u4EFB\u52A1",
  "graph.goalHint": "\u5BF9\u8BDD\u53D1\u8D77",
  "graph.ceo": "CEO \u6C47\u603B",
  "graph.ceoPending": "\u5F85\u6C47\u603B",
  "graph.ceoRunning": "\u6B63\u5728\u751F\u6210\u6C47\u603B\u2026",
  "graph.ceoDone": "\u5DF2\u6C47\u603B",
  "graph.members": "{count} \u4E2A\u6210\u5458",
  "graph.openCanvas": "\u5728\u753B\u5E03\u6253\u5F00",
  "graph.fold": "\u6536\u8D77",
  "graph.expand": "\u5C55\u5F00",
  "graph.elapsed": "\u7528\u65F6 {duration}",
  "plan.title": "CEO \u5206\u6790\u4E0E\u6D3E\u53D1\u8BA1\u5212",
  "plan.ready": "\u8BA1\u5212\u5DF2\u8BB0\u5F55\uFF0CCEO \u6B63\u5728\u51C6\u5907\u542F\u52A8\u6210\u5458\u3002",
  "graph.zoomIn": "\u653E\u5927",
  "graph.zoomOut": "\u7F29\u5C0F",
  "graph.fit": "\u9002\u5E94\u753B\u5E03",
  "status.queued": "\u6392\u961F\u4E2D",
  "status.running": "\u6267\u884C\u4E2D",
  "status.ok": "\u5DF2\u59D4\u6D3E",
  "status.delegated": "\u5DF2\u59D4\u6D3E",
  "status.completed": "\u5DF2\u5B8C\u6210",
  "status.blocked": "\u963B\u585E",
  "status.failed": "\u5931\u8D25",
  "status.partial": "\u90E8\u5206\u5B8C\u6210",
  "status.unverified": "\u56DE\u4F20\u5F85\u6838\u5B9E",
  "status.unknown_after_restart": "\u91CD\u542F\u540E\u72B6\u6001\u672A\u77E5",
  "status.error": "\u5931\u8D25",
  "depends.on": "\u4F9D\u8D56",
  "tool.title": "\u59D4\u6D3E\u56FE",
  "workspace.title": "\u6210\u5458\u5DE5\u4F5C\u533A",
  "workspace.close": "\u5173\u95ED",
  "workspace.empty": "\u70B9\u9009\u7F16\u6392\u56FE\u4E2D\u7684\u6210\u5458\uFF0C\u5728\u53F3\u4FA7\u770B\u4ED6\u6B63\u5728\u60F3\u3001\u6B63\u5728\u641C",
  "attention.title": "\u9700\u8981\u4F60\u5904\u7406",
  "attention.decision": "\u5F85\u4F60\u62CD\u677F",
  "attention.blocker": "\u963B\u585E",
  "attention.failed": "\u5931\u8D25",
  "attention.unverified": "\u56DE\u4F20\u5F85\u6838\u5B9E",
  "attention.unknown_after_restart": "\u91CD\u542F\u540E\u72B6\u6001\u672A\u77E5",
  "roster.title": "\u6210\u5458",
  "field.lastMessage": "\u6210\u5458\u56DE\u4F20",
  "inspector.hint": "\u70B9\u9009\u8282\u70B9\u67E5\u770B\u4EFB\u52A1\u3001\u6C47\u62A5\u3001\u963B\u585E\u548C\u5F85\u62CD\u677F",
  "inspector.close": "\u5173\u95ED",
  "inspector.live": "\u6B63\u5728\u5B9E\u65F6\u8F93\u51FA\u2014\u2014\u4E0B\u65B9\u5185\u5BB9\u4F1A\u8FB9\u5199\u8FB9\u66F4\u65B0\u3002",
  "inspector.running": "\u6210\u5458\u5DF2\u5F00\u59CB\u6267\u884C\uFF0C\u8FC7\u7A0B\u8FD8\u6CA1\u6709\u6295\u5C04\u8FC7\u6765\u3002",
  "inspector.queued": "\u8FD8\u5728\u7B49\u4F9D\u8D56\u5B8C\u6210\uFF0C\u8C03\u5EA6\u5668\u8FD8\u6CA1\u6709\u542F\u52A8\u8FD9\u4E2A\u8282\u70B9",
  "inspector.noReport": "\u8FD8\u6CA1\u6709\u7ED3\u6784\u5316\u6C47\u62A5\u3002",
  "inspector.unknown": "\u8FDB\u7A0B\u91CD\u542F\u540E\uFF0C\u8FD9\u4E2A\u6210\u5458\u5F53\u65F6\u662F\u5426\u4ECD\u5728\u8FD0\u884C\u5DF2\u7ECF\u65E0\u6CD5\u786E\u8BA4\u3002",
  "debrief.title": "\u4EA4\u63A5\u7B80\u62A5",
  "debrief.expand": "\u5C55\u5F00\u7B80\u62A5",
  "debrief.collapse": "\u6536\u8D77\u7B80\u62A5",
  "debrief.openPage": "\u6253\u5F00\u539F\u9875",
  "field.conclusion": "\u7ED3\u8BBA",
  "process.thinking": "\u601D\u8003\u4E2D\u2026",
  "process.thought.show": "\u601D\u8003",
  "process.thought.hide": "\u6536\u8D77\u601D\u8003",
  "workspace.toBottom": "\u56DE\u5230\u5E95\u90E8",
  "process.fetch.http": "HTTP",
  "process.fetch.open": "\u6253\u5F00\u539F\u9875",
  "process.fetch.empty": "\uFF08\u65E0\u6B63\u6587\uFF09",
  "process.fetch.collection": "Read page \xB7 {count} sources",
  "markdown.copy": "\u590D\u5236",
  "markdown.copied": "\u5DF2\u590D\u5236",
  "markdown.footnotes": "\u811A\u6CE8",
  "process.tool.running": "\u6267\u884C\u4E2D",
  "process.tool.ok": "\u5B8C\u6210",
  "process.tool.error": "\u5931\u8D25",
  "process.search.results": "{count} results",
  "process.search.none": "No results",
  "process.search.query": "\u641C\u7D22\uFF1A",
  "process.search.noKey": "\u641C\u7D22\u672A\u914D\u7F6E API \u5BC6\u94A5",
  "process.search.searching": "Searching",
  "task.expand": "\u5C55\u5F00\u5168\u6587",
  "task.collapse": "\u6536\u8D77",
  "field.task": "\u4EFB\u52A1",
  "field.done": "\u5DF2\u5B8C\u6210",
  "field.notDone": "\u672A\u5B8C\u6210",
  "field.artifacts": "\u4EA7\u7269",
  "field.evidence": "\u9A8C\u8BC1\u4F9D\u636E",
  "field.risks": "\u98CE\u9669 / \u963B\u585E",
  "field.next": "\u4E0B\u4E00\u6B65",
  "field.decisions": "\u5F85\u7528\u6237\u51B3\u7B56",
  "badge.decision": "\u5F85\u4F60\u62CD\u677F",
  "badge.blocker": "\u963B\u585E",
  "inspector.decisionInChat": "\u8FD9\u4E2A\u95EE\u9898\u5728\u8F93\u5165\u6846\u4E0A\u65B9\u56DE\u7B54\uFF0C\u4E0D\u7528\u5728\u8FD9\u91CC\u627E",
  "drawer.caption": "\u5F85\u4F60\u62CD\u677F",
  "drawer.context": "{seat} \u9700\u8981\u4F60\u9009\u4E0B\u4E00\u6B65",
  "drawer.fallbackQuestion": "{seat} \u9700\u8981\u4F60\u62CD\u677F\u624D\u80FD\u7EE7\u7EED",
  "drawer.placeholder": "\u7528\u4E00\u53E5\u8BDD\u5199\u4E0B\u4F60\u7684\u9009\u62E9",
  "drawer.prev": "\u4E0A\u4E00\u9879",
  "drawer.next": "\u4E0B\u4E00\u9879",
  "drawer.fold": "\u6536\u8D77",
  "drawer.expand": "\u5C55\u5F00",
  "decision.label": "\u4F60\u7684\u51B3\u5B9A",
  "decision.placeholder": "\u5199\u7ED9\u8FD9\u4E2A\u6210\u5458\u7684\u62CD\u677F\u3002CEO \u4F1A\u7528 ceo_replan continue \u7EED\u8DD1\u540C\u4E00\u5F20\u56FE\uFF0C\u4E0D\u4F1A\u79C1\u4E0B\u8F6C\u53D1\u7ED9\u6210\u5458\u3002",
  "decision.send": "\u53D1\u7ED9 CEO",
  "decision.sending": "\u53D1\u9001\u4E2D",
  "decision.sent": "\u5DF2\u62CD\u677F",
  "decision.error": "\u62CD\u677F\u6CA1\u6709\u53D1\u51FA",
  "tokens.badge": "{tokens} tokens",
  "tokens.tooltip": "\u8F93\u5165 {input} \xB7 \u8F93\u51FA {output}",
  "tokens.input": "\u8F93\u5165 {tokens}",
  "tokens.output": "\u8F93\u51FA {tokens}",
  "tokens.cache": "\u7F13\u5B58 {tokens}",
  "context.title": "\u6536\u5230\u7684\u4E0A\u4E0B\u6587\uFF08\u901A\u9053\uFF1A\u5B57\u7B26\u6570\uFF09",
  "halted.badge": "\u5DF2\u505C\u6B62",
  "halted.hint": "\u8FD9\u4E2A\u6210\u5458\u88AB\u4F60\u505C\u6B62\u4E86\u3002\u7528 replace \u6216 add \u7EE7\u7EED\u8FD9\u9879\u5DE5\u4F5C\u3002",
  "intervene.title": "\u53EA\u5E72\u9884\u8FD9\u4E2A\u4EBA",
  "intervene.halt": "\u505C\u6B62\u6B64\u6210\u5458",
  "intervene.redirect": "\u6309\u65B0\u65B9\u5411\u91CD\u6D3E",
  "intervene.resume": "\u91CD\u65B0\u6D3E\u53D1",
  "intervene.placeholder": "\u5199\u4E0B\u65B0\u65B9\u5411\uFF0C\u4F8B\u5982\uFF1A\u805A\u7126\u4E2D\u56FD\u5E02\u573A\uFF0C\u4E0D\u8981\u6D77\u5916\u6570\u636E",
  "intervene.redirected": "\u5DF2\u91CD\u6D3E\u65B9\u5411"
};
var en = {
  "graph.title": "CEO graph",
  "graph.empty": "No members yet",
  "graph.goal": "Your task",
  "graph.goalHint": "Started this turn",
  "graph.ceo": "CEO",
  "graph.ceoPending": "Waiting to summarize",
  "graph.ceoRunning": "Writing the summary\u2026",
  "graph.ceoDone": "Summarized",
  "graph.members": "{count} members",
  "graph.openCanvas": "Open in canvas",
  "graph.fold": "Collapse",
  "graph.expand": "Expand",
  "graph.elapsed": "took {duration}",
  "plan.title": "CEO analysis and delegation plan",
  "plan.ready": "The plan is recorded. CEO is preparing to start the team.",
  "graph.zoomIn": "Zoom in",
  "graph.zoomOut": "Zoom out",
  "graph.fit": "Fit",
  "status.queued": "queued",
  "status.running": "running",
  "status.ok": "delegated",
  "status.delegated": "delegated",
  "status.completed": "completed",
  "status.blocked": "blocked",
  "status.failed": "failed",
  "status.partial": "partial",
  "status.unverified": "unverified",
  "status.unknown_after_restart": "unknown after restart",
  "status.error": "failed",
  "depends.on": "depends on",
  "tool.title": "Delegate graph",
  "workspace.title": "Member workspace",
  "workspace.close": "Close",
  "workspace.empty": "Select a member on the run graph to watch thinking, tools, and search",
  "attention.title": "Needs your attention",
  "attention.decision": "Needs your decision",
  "attention.blocker": "Blocked",
  "attention.failed": "Failed",
  "attention.unverified": "unverified",
  "attention.unknown_after_restart": "unknown after restart",
  "roster.title": "Members",
  "field.lastMessage": "Member report",
  "inspector.hint": "Select a node to inspect the task, report, blockers, and decisions",
  "inspector.close": "Close",
  "inspector.live": "Live output \u2014 the content below updates as it is written.",
  "inspector.running": "The member has started. Process has not arrived yet.",
  "inspector.queued": "Waiting for upstream nodes. The scheduler has not started this node yet.",
  "inspector.noReport": "No structured report yet.",
  "inspector.unknown": "After restart, whether this member was still running cannot be confirmed.",
  "debrief.title": "Handoff brief",
  "debrief.expand": "Show brief",
  "debrief.collapse": "Hide brief",
  "debrief.openPage": "Open page",
  "field.conclusion": "Conclusion",
  "process.thinking": "Thinking\u2026",
  "process.thought.show": "Thought",
  "process.thought.hide": "Hide Thought",
  "workspace.toBottom": "Back to bottom",
  "process.fetch.http": "HTTP",
  "process.fetch.open": "Open page",
  "process.fetch.empty": "(no content)",
  "process.fetch.collection": "Read page \xB7 {count} sources",
  "markdown.copy": "Copy",
  "markdown.copied": "Copied",
  "markdown.footnotes": "Footnotes",
  "process.tool.running": "running",
  "process.tool.ok": "done",
  "process.tool.error": "failed",
  "process.search.results": "{count} results",
  "process.search.none": "No results",
  "process.search.query": "\u641C\u7D22\uFF1A",
  "process.search.noKey": "Search is missing an API key",
  "process.search.searching": "Searching",
  "task.expand": "Show full text",
  "task.collapse": "Collapse",
  "field.task": "Task",
  "field.done": "Done",
  "field.notDone": "Not done",
  "field.artifacts": "Artifacts",
  "field.evidence": "Evidence",
  "field.risks": "Risks / blockers",
  "field.next": "Next",
  "field.decisions": "User decisions",
  "badge.decision": "Needs your decision",
  "badge.blocker": "Blocked",
  "inspector.decisionInChat": "Answer this in the card above the input, not in this dock",
  "drawer.caption": "Needs your decision",
  "drawer.context": "{seat} is waiting for you to choose the next step",
  "drawer.fallbackQuestion": "{seat} needs a decision before it can continue",
  "drawer.placeholder": "Write your choice in one sentence",
  "drawer.prev": "Previous",
  "drawer.next": "Next",
  "drawer.fold": "Collapse",
  "drawer.expand": "Expand",
  "decision.label": "Your decision",
  "decision.placeholder": "CEO will call ceo_replan continue on this graph. Do not send_message the member.",
  "decision.send": "Send to CEO",
  "decision.sending": "Sending",
  "decision.sent": "Decision sent",
  "decision.error": "The decision was not sent",
  "tokens.badge": "{tokens} tok",
  "tokens.tooltip": "input {input} \xB7 output {output}",
  "tokens.input": "in {tokens}",
  "tokens.output": "out {tokens}",
  "tokens.cache": "cache {tokens}",
  "context.title": "Received context (channel: chars)",
  "halted.badge": "\u5DF2\u505C\u6B62",
  "halted.hint": "This member was stopped by the user. Replace or add a node to continue the work.",
  "intervene.title": "\u53EA\u5E72\u9884\u8FD9\u4E2A\u4EBA",
  "intervene.halt": "\u505C\u6B62\u6B64\u6210\u5458",
  "intervene.redirect": "\u6309\u65B0\u65B9\u5411\u91CD\u6D3E",
  "intervene.resume": "\u91CD\u65B0\u6D3E\u53D1",
  "intervene.placeholder": "\u5199\u4E0B\u65B0\u7684\u65B9\u5411\uFF0C\u4F8B\u5982\uFF1A\u805A\u7126\u4E2D\u56FD\u5E02\u573A\uFF0C\u4E0D\u8981\u6D77\u5916\u6570\u636E",
  "intervene.redirected": "\u5DF2\u91CD\u6D3E\u65B9\u5411"
};
function registerCeoUi(ctx, components) {
  ctx.uiConversation.events.register(ceoTeamDefinition);
  ctx.uiConversation.events.register(ceoMemberReportDefinition);
  ctx.effect(() => ctx.locale.register("magicCeo", { zh, en }), "magic-ceo-ui: dictionaries");
  const promptSession = async (sessionId, text) => {
    const session = ctx.sessions.binding?.(sessionId)?.session;
    if (session?.prompt === void 0) {
      return { ok: false, error: "session unavailable" };
    }
    const result = await session.prompt([{ type: "text", text }], "queue");
    if (!result.ok) return { ok: false, error: result.error?.message };
    return { ok: true };
  };
  ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
    name: "conversation.chat.node",
    key: "ceo-team",
    locale: "magicCeo",
    inject: () => ({
      openDetails: () => {
        ctx.layout.openDetails();
      }
    })
  }, components.graph));
  ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
    name: "conversation.input.dock",
    id: "ceo-decision",
    order: 15,
    locale: "magicCeo",
    inject: (sessionId) => ({
      sendDecision: (text) => promptSession(sessionId, text)
    })
  }, components.drawer));
  ctx.slots.inject("tool.call.toolview", () => ctx.slots.register({
    name: "tool.call.toolview",
    key: "ceo_delegate",
    locale: "magicCeo"
  }, components.row));
  ctx.slots.inject("details", () => ctx.slots.register({
    name: "details",
    priority: -1,
    locale: "magicCeo",
    inject: (sessionId) => ({
      closeDetails: () => {
        ctx.layout.closeDetails();
      },
      sendIntervention: (message) => {
        void promptSession(sessionId, message);
      }
    })
  }, components.workspace));
}

// src/client/index.ts
function apply(ctx) {
  registerCeoUi(ctx, {
    graph: CeoTeamGraph,
    row: CeoDelegateRow,
    workspace: CeoWorkspace,
    drawer: CeoDecisionDock
  });
}
/*! Bundled license information:

use-sync-external-store/cjs/use-sync-external-store-shim.development.js:
  (**
   * @license React
   * use-sync-external-store-shim.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

use-sync-external-store/cjs/use-sync-external-store-shim/with-selector.development.js:
  (**
   * @license React
   * use-sync-external-store-shim/with-selector.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/

		return module.exports;
	}
});
