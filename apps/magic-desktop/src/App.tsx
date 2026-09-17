import { SessionSidebar } from "./sidebar/SessionSidebar";
import { InspectorPanel } from "./inspector/InspectorPanel";
import { ConversationView, mockMessages } from "./vendor/codex-ui";

/**
 * M1 区块顺序（2026-09-16 用户裁定）：左栏会话区 → 右栏（审查/终端/文件）→ 对话区（中栏）最后。
 * 中栏挂载 vendored codex-ui ConversationView（2026-09-17，非自造界面）；
 * .vendor-cv 为 --cv-* 令牌挂载点作用域（见 src/vendor/codex-ui/conversation/tokens.css）。
 * 外壳固定一屏，页面不滚动。
 */
export function App() {
  return (
    <div className="h-screen overflow-hidden bg-surface text-on-surface font-headline-md text-headline-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      <SessionSidebar />
      <div className="pl-[260px] h-full flex">
        <main className="flex-1 min-w-0 bg-surface">
          <div className="vendor-cv h-full">
            <ConversationView
              mode="live"
              ready
              status="已连接"
              statusKind="ok"
              sessions={[]}
              messages={mockMessages}
              responding
              userProfile={{ name: "Magic 用户", label: "本地会话" }}
              onSendMessage={() => {}}
              hideComposer={false}
            />
          </div>
        </main>
        <InspectorPanel />
      </div>
    </div>
  );
}
