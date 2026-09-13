window.__ModuleLoader__.load({
	id: "@magic/dsh-browser",
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

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var inject = ["betterSidebar"];
async function postInput(body) {
  await fetch("/magic-browser/api/input", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).catch(() => void 0);
}
function WatchTab(_props) {
  const [frame, setFrame] = (0, import_react.useState)(void 0);
  const [connected, setConnected] = (0, import_react.useState)(false);
  const [pageId, setPageId] = (0, import_react.useState)(void 0);
  const [text, setText] = (0, import_react.useState)("");
  const imageRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    const source = new EventSource("/magic-browser/api/stream");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "frame" && parsed.data !== void 0) {
          setFrame(parsed.data);
          setPageId(parsed.pageId);
        }
      } catch {
      }
    };
    return () => source.close();
  }, []);
  const sendClick = (event) => {
    const image = imageRef.current;
    if (image === null) return;
    const rect = image.getBoundingClientRect();
    void postInput({
      kind: "mouse",
      action: "click",
      button: event.button === 2 ? "right" : "left",
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    });
  };
  const sendWheel = (event) => {
    const image = imageRef.current;
    if (image === null) return;
    const rect = image.getBoundingClientRect();
    void postInput({
      kind: "wheel",
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height
    });
  };
  const sendText = () => {
    if (text === "") return;
    void postInput({ kind: "key", text });
    setText("");
  };
  const sendSpecial = (key) => void postInput({ kind: "key", key });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", height: "100%", gap: 6, padding: 8, boxSizing: "border-box" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: 12, opacity: 0.65 }, children: [
      connected ? "\u76F4\u64AD\u4E2D" : "\u672A\u8FDE\u63A5\uFF08Agent \u8C03\u7528\u6D4F\u89C8\u5668\u5DE5\u5177\u540E\u81EA\u52A8\u5F00\u59CB\uFF09",
      pageId !== void 0 ? ` \xB7 \u9875\u9762 ${pageId}` : "",
      " \xB7 \u70B9\u51FB\u753B\u9762 = \u63A5\u7BA1\u9F20\u6807"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#111", borderRadius: 6 }, children: frame !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "img",
      {
        ref: imageRef,
        src: `data:image/jpeg;base64,${frame}`,
        alt: "Agent \u6D4F\u89C8\u5668\u76F4\u64AD",
        onClick: sendClick,
        onWheel: sendWheel,
        style: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "crosshair", userSelect: "none" }
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { color: "#777", fontSize: 13 }, children: "\u8FD8\u6CA1\u6709\u753B\u9762\u2014\u2014\u8BA9 Agent \u8C03\u7528 browser_* \u5DE5\u5177\u5373\u53EF\u5F00\u59CB" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: 6 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          value: text,
          placeholder: "\u8F93\u5165\u6587\u5B57\u540E\u56DE\u8F66 = \u5728\u9875\u9762\u91CC\u8F93\u5165\uFF08\u5148\u70B9\u4E00\u4E0B\u8F93\u5165\u6846\u4F4D\u7F6E\uFF09",
          onChange: (event) => setText(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter") sendText();
          },
          style: { flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "#eee", fontSize: 13 }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => sendSpecial("Enter"), style: { padding: "6px 10px", borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "#eee", fontSize: 12 }, children: "Enter" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => sendSpecial("Escape"), style: { padding: "6px 10px", borderRadius: 6, border: "1px solid #333", background: "#1a1a1a", color: "#eee", fontSize: 12 }, children: "Esc" })
    ] })
  ] });
}
function apply(ctx) {
  const debug = globalThis.__mgbClient = {
    applied: true,
    registered: false,
    error: null,
    servicePresent: false
  };
  const sidebar = ctx.betterSidebar ?? ctx.get("betterSidebar")?.betterSidebar;
  debug.servicePresent = sidebar !== void 0;
  globalThis.__mgbSidebar = sidebar;
  if (sidebar === void 0) {
    debug.error = "betterSidebar service missing on injected client context";
    return;
  }
  sidebar.registerTab({
    id: "magic-browser:watch",
    title: "Agent \u6D4F\u89C8\u5668",
    description: "Agent \u6B63\u5728\u64CD\u4F5C\u7684\u771F\u5B9E\u6D4F\u89C8\u5668\u76F4\u64AD\uFF0C\u53EF\u968F\u65F6\u63A5\u7BA1",
    single: true,
    order: 20,
    component: (props) => WatchTab(props)
  });
  debug.registered = true;
}

		return module.exports;
	}
});
