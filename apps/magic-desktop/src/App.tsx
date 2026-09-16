import { SessionSidebar } from "./sidebar/SessionSidebar";

/** M1 先只落地左栏；中栏/右栏占位，避免自造界面。外壳固定一屏，页面不滚动。 */
export function App() {
  return (
    <div className="h-screen overflow-hidden bg-surface text-on-surface font-headline-md text-headline-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      <SessionSidebar />
      <div className="pl-[260px] h-full bg-surface" />
    </div>
  );
}
