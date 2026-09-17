import { useMemo, useRef, useState } from "react";
import { SessionSidebar } from "./sidebar/SessionSidebar";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { ChatFlow } from "./conversation/ChatFlow.tsx";
import { ChatSessionStore } from "./conversation/chat-store.ts";
import { mockEvents } from "./conversation/mock-events.ts";

/**
 * M1 区块顺序（2026-09-16 用户裁定）：左栏会话区 → 右栏（审查/终端/文件）→ 对话区（中栏）最后。
 * 中栏为自写对话区壳（2026-09-17 裁定 16：搬 DSH ui-chat 渲染内核 + 本地折叠，
 * v2 皮肤换装：PromptBar/ThinkingState/操作行/ToolChips 头——stitch-chat vendor）。
 * M1 静态：事件窗口为 mock 数据，SDK 接线后由真实 session.event 流驱动。
 * 会话区联动（2026-09-17 v2）：点击会话行切换对话区窗口，新建任务开空白对话；
 * 运行中动效接发送状态待 SDK 接线（M1 无真实回包，不造假）。
 * 左栏会话管理（2026-09-17 裁定 18，对齐 web 端 ui-workspace 包）：「分叉会话」
 * 由 App 复制 mock 种子到新会话并切换；重命名/归档为侧栏本地行为（见 SessionSidebar）。
 * 外壳固定一屏，页面不滚动。
 */

/** 会话窗口仓库：M1 用 mock 事件映射；无 mock 的会话为空白对话。 */
const SESSION_MOCKS: Record<string, typeof mockEvents> = {
  "了解当前项目进度": mockEvents,
};

export function App() {
  // 会话种子表（分叉/重开共享；forkSession 会写入新键）
  const seedsRef = useRef<Record<string, typeof mockEvents>>({ ...SESSION_MOCKS });
  const [stores, setStores] = useState<Record<string, ChatSessionStore>>(() => {
    const initial: Record<string, ChatSessionStore> = {};
    for (const id of Object.keys(SESSION_MOCKS)) {
      const store = new ChatSessionStore();
      store.seedWindow(SESSION_MOCKS[id]);
      initial[id] = store;
    }
    return initial;
  });
  const [activeId, setActiveId] = useState<string>(() =>
    Object.keys(SESSION_MOCKS)[0] ?? "",
  );

  const store = useMemo(
    () => stores[activeId] ?? new ChatSessionStore(),
    [stores, activeId],
  );

  const openSession = (id: string) => {
    setStores((prev) => {
      if (prev[id] !== undefined) return prev;
      const next = { ...prev };
      const fresh = new ChatSessionStore();
      const mock = seedsRef.current[id];
      if (mock !== undefined) fresh.seedWindow(mock);
      next[id] = fresh;
      return next;
    });
    setActiveId(id);
  };

  // 左栏会话管理（裁定 18）：分叉会话 = 复制源会话 mock 种子到 forkId 并切换过去。
  // SDK 接线后换成真实 session.fork 命令（sourceEventSeqs 到源末尾）。
  const forkSession = (sourceId: string, forkId: string) => {
    const source = seedsRef.current[sourceId];
    if (source !== undefined && seedsRef.current[forkId] === undefined) {
      seedsRef.current[forkId] = source;
    }
    setStores((prev) => {
      if (prev[forkId] !== undefined) return prev;
      const next = { ...prev };
      const fresh = new ChatSessionStore();
      const mock = seedsRef.current[forkId];
      if (mock !== undefined) fresh.seedWindow(mock);
      next[forkId] = fresh;
      return next;
    });
    setActiveId(forkId);
  };

  return (
    <div className="h-screen overflow-hidden bg-surface text-on-surface font-headline-md text-headline-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      <SessionSidebar
        activeSessionId={activeId}
        onOpenSession={openSession}
        onForkSession={forkSession}
      />
      <div className="pl-[260px] h-full flex">
        <main className="flex-1 min-w-0 bg-surface">
          <ChatFlow key={activeId} store={store} />
        </main>
        <InspectorPanel />
      </div>
    </div>
  );
}
