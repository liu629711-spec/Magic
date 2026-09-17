import { useState } from "react";
import { Icon } from "../sidebar/Icon";
import { ReviewPanel } from "./ReviewPanel";
import { inspectorTabs, type InspectorTabId } from "./mock-data";

/**
 * 右栏面板（Inspector Dock）。
 * 出处：stitch_codex_ui_clone/codex_01_stream_autonomous_flow/code.html L343-344
 * （<!-- RIGHT: Code Diff, Staged Files & Review Dock -->），宽 520px。
 * 2026-09-17 用户裁定：5 个 tab 全画，浏览器/侧边聊天置灰不可点；
 * 底部提交区不显示「由 Codex 生成的提交说明」小字。
 * 终端/文件 tab 仅入场（内容区无设计稿出处，暂为空容器），审查 tab 静态落地。
 */
export function InspectorPanel() {
  const [active, setActive] = useState<InspectorTabId>("review");

  return (
    <div className="w-[520px] bg-surface-container-lowest flex flex-col overflow-hidden border-l border-surface-container-highest shrink-0">
      <InspectorTabBar active={active} onSelect={setActive} />
      {active === "review" ? (
        <ReviewPanel />
      ) : (
        <div className="flex-1 min-h-0" />
      )}
    </div>
  );
}

function InspectorTabBar({
  active,
  onSelect,
}: {
  active: InspectorTabId;
  onSelect: (id: InspectorTabId) => void;
}) {
  return (
    <div className="h-10 bg-surface-container-lowest border-b border-surface-container-highest flex items-center justify-between px-2 select-none shrink-0">
      <div className="flex items-center h-full gap-0.5 overflow-x-auto">
        {inspectorTabs.map((tab) =>
          tab.disabled ? (
            <button
              key={tab.id}
              type="button"
              disabled
              title={`${tab.label}（暂不可用）`}
              className="flex items-center gap-1.5 px-2.5 h-full text-outline/50 font-label-md text-label-md cursor-not-allowed flex-shrink-0"
            >
              <Icon name={tab.icon} className="text-[14px]" />
              <span>{tab.label}</span>
            </button>
          ) : tab.id === active ? (
            <div
              key={tab.id}
              className="flex items-center gap-1.5 px-3 h-full border-b-2 border-primary bg-surface-container text-on-surface font-label-md text-label-md font-medium cursor-pointer flex-shrink-0"
            >
              <Icon name={tab.icon} className="text-[15px] text-primary" />
              <span className="truncate">{tab.label}</span>
              {tab.id === "review" ? (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-body-sm text-[10px] font-semibold">
                  4
                </span>
              ) : null}
              <button
                type="button"
                title="关闭标签"
                className="ml-1 flex items-center text-outline hover:text-on-surface rounded hover:bg-surface-container-high p-0.5 transition-colors cursor-pointer"
              >
                <Icon name="close" className="text-[13px]" />
              </button>
            </div>
          ) : (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelect(tab.id)}
              className="flex items-center gap-1.5 px-2.5 h-full text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors font-label-md text-label-md cursor-pointer flex-shrink-0"
            >
              <Icon name={tab.icon} className="text-[14px]" />
              <span>{tab.label}</span>
            </button>
          ),
        )}
      </div>
      <div className="flex items-center gap-0.5 text-outline flex-shrink-0 ml-auto">
        <DockButton icon="add" title="新建标签页" />
        <DockButton icon="vertical_split" title="向右拆分" />
        <DockButton icon="fullscreen" title="最大化面板" />
        <DockButton icon="chevron_right" title="折叠面板" />
      </div>
    </div>
  );
}

function DockButton({ icon, title }: { icon: string; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="w-7 h-7 rounded hover:bg-surface-container flex items-center justify-center text-outline hover:text-on-surface transition-colors cursor-pointer"
    >
      <Icon name={icon} className="text-[15px]" />
    </button>
  );
}
