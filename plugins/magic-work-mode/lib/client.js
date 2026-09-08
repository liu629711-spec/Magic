window.__ModuleLoader__.load({
	id: "@magic/dsh-work-mode",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/WorkModeControl.ts
var import_react = require("react");

// src/mode.ts
function defaultWorkModeState() {
  return { sessionMode: "agent", inputMode: null };
}
function parseWorkMode(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "agent" || normalized === "ceo") return normalized;
  return null;
}
function parseModeCommand(rawInput) {
  const value = rawInput.trim().toLowerCase();
  if (value === "") return { kind: "show" };
  if (value === "once" || value === "once off" || value === "once clear") {
    return { kind: "once-clear" };
  }
  if (value.startsWith("once ")) {
    const mode2 = parseWorkMode(value.slice(5));
    if (mode2 === null) return { kind: "invalid" };
    return { kind: "once", mode: mode2 };
  }
  const mode = parseWorkMode(value);
  if (mode === null) return { kind: "invalid" };
  return { kind: "session", mode };
}
function applyModeCommand(state, command) {
  if (command.kind === "session") return { sessionMode: command.mode, inputMode: null };
  if (command.kind === "once") return { sessionMode: state.sessionMode, inputMode: command.mode };
  if (command.kind === "once-clear") return { sessionMode: state.sessionMode, inputMode: null };
  return state;
}
function parseDescribedMode(text) {
  const once = /Current work mode: (CEO|agent) for this input only\.\nSession default remains (CEO|agent)\./i.exec(text);
  if (once?.[1] !== void 0 && once[2] !== void 0) {
    return {
      sessionMode: once[2].toLowerCase(),
      inputMode: once[1].toLowerCase()
    };
  }
  const session = /Current work mode: (CEO|agent)\.\nThis is the session default\./i.exec(text);
  if (session?.[1] !== void 0) {
    return { sessionMode: session[1].toLowerCase(), inputMode: null };
  }
  return null;
}

// src/client/state.ts
var EMPTY = defaultWorkModeState();
var states = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
function notify() {
  for (const listener of listeners) listener();
}
function getClientWorkMode(sessionId) {
  return states.get(sessionId) ?? EMPTY;
}
function applyClientWorkModeLine(sessionId, line) {
  const command = parseModeCommand(line.replace(/^\s*\/mode\b/i, ""));
  const current = getClientWorkMode(sessionId);
  if (command.kind === "show" || command.kind === "invalid") return current;
  const next = applyModeCommand(current, command);
  states.set(sessionId, next);
  notify();
  return next;
}
function applyClientWorkModeDescription(sessionId, text) {
  const parsed = parseDescribedMode(text);
  if (parsed === null) return getClientWorkMode(sessionId);
  states.set(sessionId, parsed);
  notify();
  return parsed;
}
function subscribeClientWorkMode(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// src/client/WorkModeControl.ts
var OPTIONS = [
  { id: "agent", line: "/mode agent", label: "menu.agent", hint: "menu.agentHint" },
  { id: "once-ceo", line: "/mode once ceo", label: "menu.onceCeo", hint: "menu.onceCeoHint" },
  { id: "session-ceo", line: "/mode ceo", label: "menu.sessionCeo", hint: "menu.sessionCeoHint" }
];
function activeOption(state) {
  if (state.inputMode === "ceo") return "once-ceo";
  if (state.sessionMode === "ceo") return "session-ceo";
  return "agent";
}
function WorkModeControl({ sessionId, executeMode, t, useInput }) {
  const state = (0, import_react.useSyncExternalStore)(
    subscribeClientWorkMode,
    () => sessionId === void 0 ? getClientWorkMode("") : getClientWorkMode(sessionId),
    () => sessionId === void 0 ? getClientWorkMode("") : getClientWorkMode(sessionId)
  );
  const phase = useInput?.((input) => input.phase);
  const [open, setOpen] = (0, import_react.useState)(false);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    if (sessionId === void 0 || phase !== "submitting") return;
    if (getClientWorkMode(sessionId).inputMode === null) return;
    applyClientWorkModeLine(sessionId, "/mode once");
  }, [phase, sessionId]);
  if (sessionId === void 0) return null;
  const effective = state.inputMode ?? state.sessionMode;
  const modeLabel = t(effective === "ceo" ? "chip.ceo" : "chip.agent");
  const scopeLabel = t(state.inputMode !== null ? "scope.input" : "scope.session");
  const selected = activeOption(state);
  const pick = (line) => {
    setBusy(true);
    setError(null);
    void executeMode(line).then((failure) => {
      setBusy(false);
      if (failure !== null) {
        setError(failure);
        return;
      }
      setOpen(false);
    }, (reason) => {
      setBusy(false);
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  };
  return (0, import_react.createElement)(
    "div",
    {
      "data-magic-work-mode": effective,
      "data-magic-work-mode-scope": state.inputMode !== null ? "input" : "session",
      style: { position: "relative", display: "flex", alignItems: "center" }
    },
    (0, import_react.createElement)("button", {
      type: "button",
      "aria-label": t("chip.aria", { mode: modeLabel, scope: scopeLabel }),
      "aria-haspopup": "menu",
      "aria-expanded": open,
      disabled: busy,
      onClick: () => setOpen((value) => !value),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
        padding: "0 8px",
        border: "0.5px solid var(--dsw-alias-border-l2, #2a2a2a)",
        borderRadius: 8,
        background: "var(--dsw-alias-bg-module-platform, #161616)",
        color: "var(--dsw-alias-label-primary, #f5f5f5)",
        fontSize: 12,
        cursor: busy ? "default" : "pointer"
      }
    }, `${modeLabel} \xB7 ${scopeLabel}`),
    error === null ? null : (0, import_react.createElement)("span", {
      role: "status",
      title: error,
      style: { marginLeft: 6, fontSize: 11, color: "var(--dsw-alias-state-danger, #dc2626)" }
    }, t("error")),
    !open ? null : (0, import_react.createElement)(
      "div",
      {
        role: "menu",
        style: {
          position: "absolute",
          left: 0,
          bottom: "calc(100% + 6px)",
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          width: 260,
          padding: 6,
          border: "0.5px solid var(--dsw-alias-border-l2, #2a2a2a)",
          borderRadius: 10,
          background: "var(--dsw-alias-bg-module-platform, #161616)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)"
        }
      },
      OPTIONS.map((option) => (0, import_react.createElement)(
        "button",
        {
          key: option.id,
          type: "button",
          role: "menuitem",
          disabled: busy,
          onClick: () => pick(option.line),
          style: {
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: "100%",
            padding: "8px 8px",
            border: option.id === selected ? "0.5px solid var(--dsw-alias-label-primary, #f5f5f5)" : "0.5px solid transparent",
            borderRadius: 8,
            background: option.id === selected ? "var(--dsw-alias-bg-module, #1f1f1f)" : "transparent",
            color: "var(--dsw-alias-label-primary, #f5f5f5)",
            textAlign: "left",
            cursor: busy ? "default" : "pointer"
          }
        },
        (0, import_react.createElement)("span", { style: { fontSize: 12, fontWeight: 510 } }, t(option.label)),
        (0, import_react.createElement)("span", {
          style: { fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary, #9a9a9a)" }
        }, t(option.hint))
      ))
    )
  );
}

// src/client/register.ts
var inject = ["slots", "remote", "remote.commands", "locale"];
var zh = {
  "chip.agent": "\u4EE3\u7406",
  "chip.ceo": "CEO",
  "scope.session": "\u5F53\u524D\u4F1A\u8BDD",
  "scope.input": "\u672C\u6B21\u8F93\u5165",
  "chip.aria": "{mode} \xB7 {scope}",
  "menu.agent": "\u4EE3\u7406 \xB7 \u5F53\u524D\u4F1A\u8BDD",
  "menu.agentHint": "\u540E\u7EED\u8F93\u5165\u90FD\u7528\u4EE3\u7406\uFF0C\u4E0D\u7EC4\u7EC7\u6210\u5458",
  "menu.onceCeo": "CEO \xB7 \u672C\u6B21\u8F93\u5165",
  "menu.onceCeoHint": "\u53EA\u5BF9\u8FD9\u4E00\u6B21\u53D1\u9001\u751F\u6548\uFF0C\u53D1\u5B8C\u56DE\u5230\u4F1A\u8BDD\u9ED8\u8BA4",
  "menu.sessionCeo": "CEO \xB7 \u5F53\u524D\u4F1A\u8BDD",
  "menu.sessionCeoHint": "\u540E\u7EED\u8F93\u5165\u90FD\u7528 CEO\uFF0C\u4E0D\u56E0\u6B64\u5EFA\u7ACB\u5DE5\u7A0B",
  "error": "\u5DE5\u4F5C\u65B9\u5F0F\u6CA1\u6709\u6539\u6210"
};
var en = {
  "chip.agent": "Agent",
  "chip.ceo": "CEO",
  "scope.session": "this session",
  "scope.input": "this input",
  "chip.aria": "{mode} \xB7 {scope}",
  "menu.agent": "Agent \xB7 this session",
  "menu.agentHint": "Later inputs use agent. No long-lived members.",
  "menu.onceCeo": "CEO \xB7 this input",
  "menu.onceCeoHint": "Only this send. Then the session default returns.",
  "menu.sessionCeo": "CEO \xB7 this session",
  "menu.sessionCeoHint": "Later inputs use CEO. This does not create engineering.",
  "error": "Work mode did not change"
};
function registerWorkModeUi(ctx, component) {
  ctx.effect(() => ctx.locale.register("magicWorkMode", { zh, en }), "magic-work-mode: dictionaries");
  ctx.on?.("command/executed", (sessionId, name, result) => {
    if (name !== "mode") return;
    const payload = result;
    if (payload.kind !== "success" || typeof payload.text !== "string") return;
    applyClientWorkModeDescription(String(sessionId), payload.text);
  });
  ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
    name: "conversation.input.left",
    id: "magic-work-mode",
    order: 0,
    locale: "magicWorkMode",
    inject: (sessionId) => ({
      sessionId,
      executeMode: async (line) => {
        const result = await ctx.remote.commands.execute(sessionId, line, []);
        if (!result.ok) {
          return `${result.error?.message ?? "command failed"} (${result.error?.code ?? "error"})`;
        }
        if (result.value === void 0) return `unknown command: ${line}`;
        if (result.value.result?.kind === "error") {
          return result.value.result.text ?? "command failed";
        }
        const text = result.value.result?.text;
        if (typeof text === "string") applyClientWorkModeDescription(sessionId, text);
        else applyClientWorkModeLine(sessionId, line);
        return null;
      }
    })
  }, component));
}

// src/client/index.ts
function apply(ctx) {
  registerWorkModeUi(ctx, WorkModeControl);
}

		return module.exports;
	}
});
