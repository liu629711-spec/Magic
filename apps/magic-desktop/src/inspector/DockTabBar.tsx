/**
 * 右坞 tab 行（stitch 图五形态）：激活 tab = 实心胶囊（icon + label + 徽标 + ×），
 * 非激活 ghost 态；＋ 添加面板菜单；右侧 = 外链 / 全屏 / 更多 按钮组。
 * 视觉基准：stitch_codex_ui_clone/codex_01_stream_autonomous_flow/screen.png 右坞顶行
 * （`☰ 审查 (4) ×`｜`💻 终端`｜`📄 文件`｜`🌐 浏览器`｜`＋`｜右侧 ↗ ⛶ ⌄）。
 *
 * 诚实边界：设计稿的「浏览器」面板无真实数据源，仅在 ＋ 菜单内置灰占位（能力未接入）；
 * 非激活 hover 底用 surface-container-high（项目主题 token 无独立 bg-hover）。
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "../sidebar/Icon";

export type DockTabId = "changes" | "terminal" | "files" | "team";

/** tab 定义（tab 行与 ＋ 菜单共用）。 */
export interface DockTabDef {
  id: DockTabId;
  label: string;
  icon: string;
}

/** 右侧小按钮统一形态：正常（可点）/ 置灰（未接线能力）。 */
const GHOST_BTN =
  "w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer";
const GHOST_BTN_DISABLED =
  "w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-outline opacity-40 cursor-not-allowed";

export function DockTabBar({
  tabs,
  menuTabs,
  active,
  disabled,
  changesCount,
  fullscreen,
  onToggleFullscreen,
  onSelect,
  onCloseTab,
  onReopenTab,
  onResetLayout,
}: {
  /** 当前可见 tabs（顺序即渲染顺序：审查 / 终端 / 文件 / 团队）。 */
  tabs: DockTabDef[];
  /** ＋ 菜单候选（文件 / 审查 / 终端 / 团队，任务指定顺序；浏览器项组件内置）。 */
  menuTabs: DockTabDef[];
  active: DockTabId | null;
  disabled: boolean;
  /** 审查 tab 徽标 = 变更文件数；null = 不显示（拿不到不造假）。 */
  changesCount: number | null;
  fullscreen: boolean;
  onToggleFullscreen?: () => void;
  onSelect: (id: DockTabId) => void;
  /** × 关闭：从可见列表隐藏（hiddenTabs 归 RightDock 持有）。 */
  onCloseTab: (id: DockTabId) => void;
  /** ＋ 菜单点选：恢复显示并激活。 */
  onReopenTab: (id: DockTabId) => void;
  /** ▾ 菜单「重置布局」：恢复全部 tab + 退出全屏 + 展开。 */
  onResetLayout: () => void;
}) {
  const [menu, setMenu] = useState<"add" | "more" | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 菜单打开时：点击 tab 行外 / Escape 关闭（capture，先于内容区处理）。
  useEffect(() => {
    if (menu === null) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (rootRef.current === null || !rootRef.current.contains(event.target as Node)) setMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [menu]);

  const fullscreenWired = onToggleFullscreen !== undefined;
  const fullscreenTitle = !fullscreenWired ? "未接线" : fullscreen ? "退出全屏" : "全屏";
  const visibleIds = new Set(tabs.map(tab => tab.id));

  return (
    <div
      ref={rootRef}
      className="relative h-9 shrink-0 bg-surface-container-lowest border-b border-surface-container-highest flex items-center gap-1 px-2 select-none"
    >
      {/* tabs + ＋（左侧区，可压缩） */}
      <div className="flex items-center gap-0.5 min-w-0 flex-1">
        {tabs.map(tab => {
          const isActive = tab.id === active;
          return (
            <div
              key={tab.id}
              className={`group flex items-center h-7 rounded-md shrink-0 min-w-0 transition-colors ${
                isActive
                  ? "bg-surface-container-high text-on-surface"
                  : "text-outline hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <button
                type="button"
                disabled={disabled}
                title={tab.label}
                onClick={() => {
                  setMenu(null);
                  onSelect(tab.id);
                }}
                className={`flex items-center gap-1.5 h-full min-w-0 pl-2 pr-1 text-[12px] ${
                  disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <Icon name={tab.icon} className="text-[14px] shrink-0" />
                <span className="truncate">{tab.label}</span>
                {tab.id === "changes" && changesCount !== null && (
                  <span className="shrink-0 h-4 px-1 rounded text-[10px] leading-4 bg-inverse-surface text-inverse-on-surface tabular-nums">
                    {changesCount}
                  </span>
                )}
              </button>
              {/* ×：激活 tab 常显，非激活 hover 出现；点击 = 从可见列表隐藏 */}
              <button
                type="button"
                disabled={disabled}
                title={`关闭 ${tab.label}`}
                aria-label={`关闭 ${tab.label}`}
                onClick={() => {
                  setMenu(null);
                  onCloseTab(tab.id);
                }}
                className={`mr-1 w-[18px] h-[18px] shrink-0 rounded flex items-center justify-center hover:bg-surface-container-highest transition-opacity cursor-pointer ${
                  isActive ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70"
                }`}
              >
                <Icon name="close" className="text-[13px]" />
              </button>
            </div>
          );
        })}
        {/* ＋ 添加面板 */}
        <span className="relative shrink-0">
          <button
            type="button"
            title="添加面板"
            aria-label="添加面板"
            onClick={() => setMenu(menu === "add" ? null : "add")}
            className={GHOST_BTN}
          >
            <Icon name="add" className="text-[16px]" />
          </button>
          {menu === "add" && (
            <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-md border border-surface-container-highest bg-surface-container-low p-1 shadow-lg">
              {menuTabs.map(item => {
                const opened = visibleIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={opened}
                    title={opened ? "已打开" : undefined}
                    onClick={() => {
                      onReopenTab(item.id);
                      setMenu(null);
                    }}
                    className={`w-full flex items-center gap-2 h-7 px-2 rounded text-[12px] transition-colors ${
                      opened
                        ? "text-outline opacity-60 cursor-not-allowed"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer"
                    }`}
                  >
                    <Icon name={item.icon} className="text-[14px] shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
              <div className="my-1 border-t border-surface-container-highest" />
              {/* 设计稿的浏览器面板：无真实数据源，置灰占位（不造假） */}
              <button
                type="button"
                disabled
                title="能力未接入"
                className="w-full flex items-center gap-2 h-7 px-2 rounded text-[12px] text-outline opacity-60 cursor-not-allowed"
              >
                <Icon name="language" className="text-[14px] shrink-0" />
                <span className="truncate">浏览器</span>
              </button>
            </div>
          )}
        </span>
      </div>

      {/* 右侧按钮组：外链 / 全屏 / 更多 */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          disabled
          title="桌面壳阶段开放"
          aria-label="在新窗口打开（桌面壳阶段开放）"
          className={GHOST_BTN_DISABLED}
        >
          <Icon name="open_in_new" className="text-[16px]" />
        </button>
        <button
          type="button"
          disabled={!fullscreenWired}
          title={fullscreenTitle}
          aria-label={fullscreenTitle}
          onClick={() => onToggleFullscreen?.()}
          className={fullscreenWired ? GHOST_BTN : GHOST_BTN_DISABLED}
        >
          <Icon name={fullscreen ? "fullscreen_exit" : "fullscreen"} className="text-[16px]" />
        </button>
        <span className="relative">
          <button
            type="button"
            title="更多"
            aria-label="更多"
            onClick={() => setMenu(menu === "more" ? null : "more")}
            className={GHOST_BTN}
          >
            <Icon name="keyboard_arrow_down" className="text-[16px]" />
          </button>
          {menu === "more" && (
            <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-surface-container-highest bg-surface-container-low p-1 shadow-lg">
              {/* 面板说明（只读，不可点） */}
              <p className="px-2 py-1.5 text-[11px] leading-relaxed text-outline">
                右侧停靠面板：审查（git 变更与 diff）/ 终端 / 文件 / 团队，数据来自本机 dsh web 的 /sidebar/* 真实路由。
              </p>
              <div className="my-1 border-t border-surface-container-highest" />
              <button
                type="button"
                onClick={() => {
                  onResetLayout();
                  setMenu(null);
                }}
                className="w-full flex items-center gap-2 h-7 px-2 rounded text-[12px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                <Icon name="restart_alt" className="text-[14px] shrink-0" />
                <span className="truncate">重置布局</span>
              </button>
            </div>
          )}
        </span>
      </div>
    </div>
  );
}
