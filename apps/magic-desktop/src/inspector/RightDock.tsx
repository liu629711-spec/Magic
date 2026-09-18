/**
 * 右坞容器（2026-09-18 dockkit 化改造）：宽 520 / 全屏 / 收起 return null 的
 * aside 壳保留；内部换成 ui-sidebar-right dockkit 右栏（DockShell →
 * DockkitSidebarRight，官方 apply 序列 + registerNativeSurface 注入），达到
 * 3099 同款「竖向面板 + 顶部 tab 行」形态。
 *
 * props 语义映射：
 * - sessionId/cwd/bridge：DockShell（sessions.list shim / fork / openSession）
 * - onDraftText：官方 conversation.input 桥（树 @ 引用、划选「添加到对话」的写通道）
 * - collapsed：右坞整体消失（顶栏 ◨ 是唯一恢复入口）；dockkit 内部收起按钮
 *   （PanelChrome ◨）经 onCollapse 转发到这里（App 级收起）
 * - fullscreen/onToggleFullscreen：App dockChrome 的窗口级全屏；dockkit 内部
 *   ⛶（PanelChrome）经 onFullscreenChange 折进 dockkitFullscreen——两者任一
 *   生效即 aside 全宽
 * - dockTabRequest：官方 openTab（files→editor files 窗口，changes→git，
 *   jobs→subagent 任务页，terminal/browser/sidechat 同名）
 * - fileRequest：官方 service.openFile（native openResource，editor tab）
 * - teamOpenToken/sendIntervention：官方无「团队」tab，暂不消费（遗留项）
 */
import { useState } from "react";
import { DockShell } from "./DockShell";
import type { DockSessionBridge } from "./DockPanels";

export function RightDock({
  sessionId,
  cwd,
  onDraftText,
  getBinding,
  collapsed,
  onToggleCollapsed,
  fullscreen,
  dockTabRequest,
  fileRequest,
  bridge,
  width = 520,
}: {
  sessionId: string;
  cwd: string | undefined;
  /** 官方 conversation.input 桥：注入文本到对话输入框草稿（追加语义）。 */
  onDraftText?: (text: string) => void;
  /** 官方 ISessions.binding 等价（Side Chat fork 子会话转录/发送/运行态）。 */
  getBinding?: Parameters<typeof DockShell>[0]['getBinding'];
  /** 旧通道：图卡「团队」tab；官方 Sidebar 无对应 tab，暂不消费。 */
  teamOpenToken?: number;
  /** 旧通道：成员干预（团队 tab 语义），同上暂不消费。 */
  sendIntervention?: (message: string) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
  dockTabRequest?: { tab: string; seq: number; sessionId: string } | null;
  fileRequest?: { path: string; seq: number; sessionId: string } | null;
  bridge: DockSessionBridge;
  /** 坞宽（App 布局拖拽下发，2026-09-18；缺省 520，全屏时忽略）。 */
  width?: number;
}) {
  // dockkit 内部 ⛶（PanelChrome）与 App dockChrome 任一生效即全宽。
  const [dockkitFullscreen, setDockkitFullscreen] = useState(false);
  // 收起 = 右坞整体消失（本组件在 collapsed 变化时整体 mount/unmount，安全）。
  if (collapsed === true) return null;
  const effectiveFullscreen = fullscreen === true || dockkitFullscreen;
  return (
    <aside
      data-right-dock
      className={
        "vendor-bs min-h-0 bg-surface-container-lowest border-l border-surface-container-highest flex flex-col overflow-hidden shrink-0 " +
        (effectiveFullscreen ? "flex-1 min-w-0" : "")
      }
      style={effectiveFullscreen ? undefined : { width: `min(${width}px, 60vw)` }}
    >
      <DockShell
        sessionId={sessionId}
        cwd={cwd}
        bridge={bridge}
        onDraftText={onDraftText}
        getBinding={getBinding}
        onFullscreenChange={setDockkitFullscreen}
        onCollapse={onToggleCollapsed}
        dockTabRequest={dockTabRequest}
        fileRequest={fileRequest}
      />
    </aside>
  );
}
