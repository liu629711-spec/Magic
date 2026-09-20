// 窗口控制（2026-09-19 用户裁定，ZCode 参考图右上角 — □ ×）：自有客户端自定义
// 标题栏的最小化/最大化/关闭三键，固定在窗口右上角第一行，所有视图可见。
// 桌面（Tauri）运行时经 __TAURI_INTERNALS__.invoke 调 plugin:window|*（label 取
// metadata.currentWindow，与 @tauri-apps/api getCurrentWindow().minimize() 同一命令）；
// web 调试通道（浏览器）没有窗口宿主，按钮为诚实占位（tooltip 说明）。
const WINDOW_ICONS = {
  minimize: "remove",
  toggleMaximize: "crop_square",
  close: "close",
} as const;

type WindowCommand = keyof typeof WINDOW_ICONS;

interface TauriInternals {
  invoke?: (cmd: string, args?: unknown) => Promise<unknown>;
  metadata?: { currentWindow?: { label?: string } };
}

export function WindowControls() {
  // 每次渲染重读（web 壳恒 undefined；开销可忽略，避免生命周期分支）
  const internals = (window as unknown as { __TAURI_INTERNALS__?: TauriInternals })
    .__TAURI_INTERNALS__;
  const tauri =
    internals?.invoke !== undefined
      ? { invoke: internals.invoke, label: internals.metadata?.currentWindow?.label }
      : undefined;

  const act = (cmd: WindowCommand): void => {
    if (tauri === undefined) return;
    tauri
      .invoke(`plugin:window|${cmd}`, { label: tauri.label })
      .catch(() => {});
  };

  return (
    <div
      data-window-controls
      className="fixed top-0 right-0 z-[80] flex h-9 items-stretch bg-surface/95"
    >
      {(
        [
          { cmd: "minimize" as const, title: "最小化" },
          { cmd: "toggleMaximize" as const, title: "最大化 / 还原" },
          { cmd: "close" as const, title: "关闭" },
        ]
      ).map(item => (
        <button
          key={item.cmd}
          type="button"
          data-window-control={item.cmd}
          title={
            tauri === undefined
              ? `${item.title}（桌面客户端窗口控制；web 调试通道为占位）`
              : item.title
          }
          onClick={() => act(item.cmd)}
          className={`flex w-11 cursor-pointer items-center justify-center text-on-surface-variant transition-colors ${
            item.cmd === "close"
              ? "hover:bg-error-container hover:text-on-surface"
              : "hover:bg-surface-container-high hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[16px] leading-none">
            {WINDOW_ICONS[item.cmd]}
          </span>
        </button>
      ))}
    </div>
  );
}
