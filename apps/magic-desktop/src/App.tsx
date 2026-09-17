import { SessionSidebar } from "./sidebar/SessionSidebar";
import { InspectorPanel } from "./inspector/InspectorPanel";

/**
 * M1 区块顺序（2026-09-16 用户裁定）：左栏会话区 → 右栏（审查/终端/文件）→ 对话区（中栏）最后。
 * 中栏暂为占位，避免自造界面。外壳固定一屏，页面不滚动。
 */
export function App() {
  return (
    <div className="h-screen overflow-hidden bg-surface text-on-surface font-headline-md text-headline-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      <SessionSidebar />
      <div className="pl-[260px] h-full flex">
        <main className="flex-1 min-w-0 bg-surface" />
        <InspectorPanel />
      </div>
    </div>
  );
}
