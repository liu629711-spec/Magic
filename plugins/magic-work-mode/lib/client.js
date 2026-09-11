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

// src/client/WorkModeChangedCard.ts
var import_react = require("react");
function modeLabel(mode, t) {
  return t(mode === "ceo" ? "chip.ceo" : "chip.agent");
}
function WorkModeChangedCard({ node, t }) {
  const data = node.data;
  return (0, import_react.createElement)(
    "section",
    {
      "data-magic-work-mode-changed": true,
      style: {
        padding: "10px 12px",
        borderRadius: 10,
        border: "0.5px solid var(--dsw-alias-border-l2, #2a2a2a)",
        background: "var(--dsw-alias-bg-module-platform, #161616)",
        color: "var(--dsw-alias-label-primary, #f5f5f5)"
      }
    },
    (0, import_react.createElement)("strong", { style: { display: "block", fontSize: 13, marginBottom: 4 } }, t("changed.title")),
    (0, import_react.createElement)("div", {
      style: { fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary, #c8c8c8)" }
    }, t("changed.fromTo", { from: modeLabel(data.from, t), to: modeLabel(data.to, t) })),
    data.summary === void 0 ? null : (0, import_react.createElement)("div", {
      style: { marginTop: 6, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-secondary, #c8c8c8)" }
    }, data.summary),
    data.members.length === 0 ? null : (0, import_react.createElement)("ul", {
      style: { margin: "6px 0 0", paddingLeft: 16, fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary, #9a9a9a)" }
    }, ...data.members.map((member) => (0, import_react.createElement)("li", {
      key: `${member.role}-${member.phase}`
    }, `${member.role} [${member.phase}]`)))
  );
}

// src/client/WorkModeControl.ts
var import_react2 = require("react");

// src/handoff.ts
var WORK_MODE_CONFIRM_PREFIX = "Work mode change needs confirmation.";
function isWorkModeConfirmText(text) {
  return text.startsWith(WORK_MODE_CONFIRM_PREFIX);
}

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
  const confirmed = value.endsWith(" confirm");
  const rest = confirmed ? value.slice(0, -8).trim() : value;
  if (rest === "once" || rest === "once off" || rest === "once clear") {
    return confirmed ? { kind: "invalid" } : { kind: "once-clear" };
  }
  if (rest.startsWith("once ")) {
    if (confirmed) return { kind: "invalid" };
    const mode2 = parseWorkMode(rest.slice(5));
    if (mode2 === null) return { kind: "invalid" };
    return { kind: "once", mode: mode2 };
  }
  const mode = parseWorkMode(rest);
  if (mode === null) return { kind: "invalid" };
  return { kind: "session", mode, confirmed };
}
function applyModeCommand(state, command) {
  if (command.kind === "session") {
    return { sessionMode: command.mode, inputMode: null };
  }
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
  return applyClientWorkModeState(sessionId, parsed);
}
function applyClientWorkModeState(sessionId, state) {
  const current = states.get(sessionId);
  if (current !== void 0 && current.sessionMode === state.sessionMode && current.inputMode === state.inputMode) {
    return current;
  }
  states.set(sessionId, state);
  notify();
  return state;
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
  const state = (0, import_react2.useSyncExternalStore)(
    subscribeClientWorkMode,
    () => sessionId === void 0 ? getClientWorkMode("") : getClientWorkMode(sessionId),
    () => sessionId === void 0 ? getClientWorkMode("") : getClientWorkMode(sessionId)
  );
  const phase = useInput?.((input) => input.phase);
  const [open, setOpen] = (0, import_react2.useState)(false);
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [error, setError] = (0, import_react2.useState)(null);
  const [pending, setPending] = (0, import_react2.useState)(null);
  (0, import_react2.useEffect)(() => {
    if (sessionId === void 0 || phase !== "submitting") return;
    if (getClientWorkMode(sessionId).inputMode === null) return;
    applyClientWorkModeLine(sessionId, "/mode once");
  }, [phase, sessionId]);
  if (sessionId === void 0) return null;
  const effective = state.inputMode ?? state.sessionMode;
  const modeLabel2 = t(effective === "ceo" ? "chip.ceo" : "chip.agent");
  const scopeLabel = t(state.inputMode !== null ? "scope.input" : "scope.session");
  const selected = activeOption(state);
  const run = (line) => {
    setBusy(true);
    setError(null);
    void executeMode(line).then((failure) => {
      setBusy(false);
      if (failure !== null) {
        if (isWorkModeConfirmText(failure)) {
          setPending({ line, text: failure });
          return;
        }
        setError(failure);
        return;
      }
      setPending(null);
      setOpen(false);
    }, (reason) => {
      setBusy(false);
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  };
  return (0, import_react2.createElement)(
    "div",
    {
      "data-magic-work-mode": effective,
      "data-magic-work-mode-scope": state.inputMode !== null ? "input" : "session",
      style: { position: "relative", display: "flex", alignItems: "center" }
    },
    (0, import_react2.createElement)("button", {
      type: "button",
      "aria-label": t("chip.aria", { mode: modeLabel2, scope: scopeLabel }),
      "aria-haspopup": "menu",
      "aria-expanded": open,
      disabled: busy,
      onClick: () => {
        setPending(null);
        setOpen((value) => !value);
      },
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
    }, `${modeLabel2} \xB7 ${scopeLabel}`),
    error === null ? null : (0, import_react2.createElement)("span", {
      role: "status",
      title: error,
      style: { marginLeft: 6, fontSize: 11, color: "var(--dsw-alias-state-danger, #dc2626)" }
    }, t("error")),
    !open ? null : (0, import_react2.createElement)(
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
          width: pending === null ? 260 : 320,
          padding: 6,
          border: "0.5px solid var(--dsw-alias-border-l2, #2a2a2a)",
          borderRadius: 10,
          background: "var(--dsw-alias-bg-module-platform, #161616)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)"
        }
      },
      pending === null ? OPTIONS.map((option) => (0, import_react2.createElement)(
        "button",
        {
          key: option.id,
          type: "button",
          role: "menuitem",
          disabled: busy,
          onClick: () => run(option.line),
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
        (0, import_react2.createElement)("span", { style: { fontSize: 12, fontWeight: 510 } }, t(option.label)),
        (0, import_react2.createElement)("span", {
          style: { fontSize: 11, lineHeight: "16px", color: "var(--dsw-alias-label-tertiary, #9a9a9a)" }
        }, t(option.hint))
      )) : [
        (0, import_react2.createElement)("div", {
          key: "confirm-title",
          style: { padding: "6px 8px 2px", fontSize: 12, fontWeight: 510, color: "var(--dsw-alias-label-primary, #f5f5f5)" }
        }, t("confirm.title")),
        (0, import_react2.createElement)("div", {
          key: "confirm-body",
          "data-magic-work-mode-confirm": true,
          style: {
            padding: "4px 8px 8px",
            fontSize: 11,
            lineHeight: "16px",
            color: "var(--dsw-alias-label-secondary, #c8c8c8)",
            whiteSpace: "pre-wrap"
          }
        }, pending.text),
        (0, import_react2.createElement)(
          "div",
          {
            key: "confirm-actions",
            style: { display: "flex", gap: 6, padding: "0 4px 4px" }
          },
          (0, import_react2.createElement)("button", {
            type: "button",
            disabled: busy,
            onClick: () => run(`${pending.line} confirm`),
            style: {
              flex: 1,
              height: 28,
              border: 0,
              borderRadius: 8,
              background: "var(--dsw-alias-label-primary, #f5f5f5)",
              color: "var(--dsw-alias-bg-base, #111)",
              fontSize: 12,
              cursor: busy ? "default" : "pointer"
            }
          }, t("confirm.continue")),
          (0, import_react2.createElement)("button", {
            type: "button",
            disabled: busy,
            onClick: () => setPending(null),
            style: {
              flex: 1,
              height: 28,
              border: "0.5px solid var(--dsw-alias-border-l2, #2a2a2a)",
              borderRadius: 8,
              background: "transparent",
              color: "var(--dsw-alias-label-primary, #f5f5f5)",
              fontSize: 12,
              cursor: busy ? "default" : "pointer"
            }
          }, t("confirm.cancel"))
        )
      ]
    )
  );
}

// src/persist.ts
var WORK_MODE_EVENT = "magic/work-mode";
var WORK_MODE_CHANGED_EVENT = "magic/work-mode-changed";
function asWorkMode(value) {
  return value === "agent" || value === "ceo" ? value : void 0;
}
function parseWorkModeEvent(data) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return void 0;
  const record = data;
  const sessionMode = asWorkMode(record.sessionMode);
  if (sessionMode === void 0) return void 0;
  if (record.inputMode === null) return { sessionMode, inputMode: null };
  const inputMode = asWorkMode(record.inputMode);
  if (inputMode === void 0) return void 0;
  return { sessionMode, inputMode };
}
function parseWorkModeClientEvent(data) {
  const state = parseWorkModeEvent(data);
  if (state === void 0 || typeof data !== "object" || data === null) return void 0;
  const sessionId = data.sessionId;
  if (typeof sessionId !== "string" || sessionId === "") return void 0;
  return { sessionId, state };
}
function parseWorkModeChangedEvent(data) {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return void 0;
  const record = data;
  const from = asWorkMode(record.from);
  const to = asWorkMode(record.to);
  if (from === void 0 || to === void 0) return void 0;
  if (typeof record.sessionId !== "string" || record.sessionId === "") return void 0;
  const members = Array.isArray(record.members) ? record.members.flatMap((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const member = item;
    if (typeof member.role !== "string" || member.role.trim() === "") return [];
    if (typeof member.phase !== "string" || member.phase.trim() === "") return [];
    return [{
      role: member.role.trim(),
      phase: member.phase.trim(),
      ...typeof member.task === "string" && member.task.trim() !== "" ? { task: member.task.trim() } : {}
    }];
  }) : [];
  return {
    sessionId: record.sessionId,
    from,
    to,
    ...typeof record.summary === "string" && record.summary.trim() !== "" ? { summary: record.summary.trim() } : {},
    members
  };
}

// src/client/definition.ts
var workModeEventDefinition = {
  kind: "magic-work-mode",
  match: (event) => {
    if (event.type !== WORK_MODE_EVENT) return null;
    if (parseWorkModeClientEvent(event.data) === void 0) return null;
    return { id: String(event.seq), role: "start" };
  },
  start: (_context, match) => {
    const parsed = parseWorkModeClientEvent(match.event.data);
    if (parsed !== void 0) applyClientWorkModeState(parsed.sessionId, parsed.state);
    return parsed;
  },
  update: (context) => context.state
};
var workModeChangedDefinition = {
  kind: "magic-work-mode-changed",
  target: "chat",
  match: (event) => {
    if (event.type !== WORK_MODE_CHANGED_EVENT) return null;
    if (parseWorkModeChangedEvent(event.data) === void 0) return null;
    return { id: String(event.seq), role: "start" };
  },
  start: (_context, match) => {
    return parseWorkModeChangedEvent(match.event.data);
  },
  update: (context) => context.state,
  buildViewNode: (context) => {
    if (context.start === void 0 || context.state === void 0) return null;
    return {
      key: context.key,
      kind: "magic-work-mode-changed",
      id: context.id,
      target: "chat",
      anchorSeq: context.start.event.seq,
      location: context.start.location,
      visibility: "visible",
      data: context.state
    };
  }
};

// src/client/register.ts
var inject = ["slots", "remote", "remote.commands", "locale", "uiConversation"];
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
  "error": "\u5DE5\u4F5C\u65B9\u5F0F\u6CA1\u6709\u6539\u6210",
  "confirm.title": "\u5DE5\u4F5C\u65B9\u5F0F\u8FD8\u6CA1\u6539",
  "confirm.continue": "\u7EE7\u7EED\u6539",
  "confirm.cancel": "\u5148\u4E0D\u6539",
  "changed.title": "\u5DE5\u4F5C\u65B9\u5F0F\u5DF2\u6539\u53D8",
  "changed.fromTo": "{from} \u2192 {to}"
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
  "error": "Work mode did not change",
  "confirm.title": "Work mode has not changed yet",
  "confirm.continue": "Continue",
  "confirm.cancel": "Not now",
  "changed.title": "Work mode changed",
  "changed.fromTo": "{from} \u2192 {to}"
};
function registerWorkModeUi(ctx, components) {
  ctx.uiConversation.events.register(workModeEventDefinition);
  ctx.uiConversation.events.register(workModeChangedDefinition);
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
        const commandText = result.value?.result?.text;
        if (result.value?.result?.kind === "error") {
          return typeof commandText === "string" ? commandText : "command failed";
        }
        if (!result.ok) {
          return typeof commandText === "string" ? commandText : `${result.error?.message ?? "command failed"} (${result.error?.code ?? "error"})`;
        }
        if (result.value === void 0) return `unknown command: ${line}`;
        const text = result.value.result?.text;
        if (typeof text === "string") applyClientWorkModeDescription(sessionId, text);
        else applyClientWorkModeLine(sessionId, line);
        return null;
      }
    })
  }, components.chip));
  ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
    name: "conversation.chat.node",
    key: "magic-work-mode-changed",
    locale: "magicWorkMode"
  }, components.changed));
}

// src/client/index.ts
function apply(ctx) {
  registerWorkModeUi(ctx, { chip: WorkModeControl, changed: WorkModeChangedCard });
}

		return module.exports;
	}
});
