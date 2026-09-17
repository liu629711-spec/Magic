import { SessionSidebar } from "./sidebar/SessionSidebar";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { ChatFlow } from "./conversation/ChatFlow.tsx";
import { ChatSessionStore } from "./conversation/chat-store.ts";
import { mockEvents } from "./conversation/mock-events.ts";

/**
 * M1 区块顺序（2026-09-16 用户裁定）：左栏会话区 → 右栏（审查/终端/文件）→ 对话区（中栏）最后。
 * 中栏为自写对话区壳（2026-09-17 裁定 16：搬 DSH ui-chat 渲染内核 + 本地折叠，
 * 还原 DSH 网页对话体验；codex-ui 版本保留在 vendor/codex-ui 降级备用）。
 * M1 静态：事件窗口为 mock 数据，SDK 接线后由真实 session.event 流驱动。
 * 外壳固定一屏，页面不滚动。
 */
const chatStore = new ChatSessionStore();
chatStore.seedWindow(mockEvents);

export function App() {
  return (
    <div className="h-screen overflow-hidden bg-surface text-on-surface font-headline-md text-headline-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      <SessionSidebar />
      <div className="pl-[260px] h-full flex">
        <main className="flex-1 min-w-0 bg-surface">
          <ChatFlow store={chatStore} />
        </main>
        <InspectorPanel />
      </div>
    </div>
  );
}
