/**
 * 右坞容器（2026-09-18 官方化改造）：宽 520 / 全屏 / 收起 return null 的
 * aside 壳保留；内部自写面板（DockTabBar/DockPanels/FilePreview/EditorPane/
 * FilesTab/ChangesTab/开始页）退役，换成官方 dsh-better-sidebar client 的
 * Sidebar（经 DockShell 的 Context shim 驱动）。DockPanels.tsx 保留不删
 * （后续 SideChat 数据源参考）。
 *
 * props 语义映射：
 * - sessionId/cwd/bridge：DockShell（sessions.list shim / fork / openSession）
 * - onDraftText：官方 conversation.input 桥（树 @ 引用、划选「添加到对话」的写通道）
 * - collapsed：右坞整体消失（顶栏 ◨ 是唯一恢复入口，与自写壳一致）
 * - dockTabRequest：官方 openTab（files→editor files 窗口，changes→git，
 *   jobs→subagent 任务页，terminal/browser/sidechat 同名）
 * - fileRequest：官方 service.openFile（editor tab，按路径去重）
 * - fullscreen/onToggleFullscreen：类型保留（App 继续传 dockChrome）；
 *   官方工作台无全屏按钮，入口暂缺（遗留项）
 * - teamOpenToken/sendIntervention：官方无「团队」tab，暂不消费（遗留项）
 */
import { DockShell } from "./DockShell";
import type { DockSessionBridge } from "./DockPanels";

export function RightDock({
  sessionId,
  cwd,
  onDraftText,
  collapsed,
  onToggleCollapsed,
  fullscreen,
  dockTabRequest,
  fileRequest,
  bridge,
}: {
  sessionId: string;
  cwd: string | undefined;
  /** 官方 conversation.input 桥：注入文本到对话输入框草稿（追加语义）。 */
  onDraftText?: (text: string) => void;
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
}) {
  // 收起 = 右坞整体消失（本组件无 hooks，条件返回安全）。
  if (collapsed === true) return null;
  return (
    <aside
      data-right-dock
      className={
        "vendor-bs min-h-0 bg-surface-container-lowest border-l border-surface-container-highest flex flex-col overflow-hidden shrink-0 " +
        (fullscreen ? "flex-1 min-w-0" : "w-[min(520px,42vw)]")
      }
    >
      <DockShell
        sessionId={sessionId}
        cwd={cwd}
        bridge={bridge}
        onDraftText={onDraftText}
        expanded={true}
        onToggleCollapsed={onToggleCollapsed}
        dockTabRequest={dockTabRequest}
        fileRequest={fileRequest}
      />
    </aside>
  );
}
