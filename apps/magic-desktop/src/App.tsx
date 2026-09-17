import { useEffect, useMemo, useRef, useState } from "react";
import { SessionSidebar } from "./sidebar/SessionSidebar";
// 右坞暂时隐藏（2026-09-17 用户裁定）；InspectorPanel/ReviewPanel 代码保留待回归
import { ChatFlow } from "./conversation/ChatFlow.tsx";
import { ChatSessionStore } from "./conversation/chat-store.ts";
import { buildSessionMarkdown } from "./conversation/session-export.ts";
import { mockEvents } from "./conversation/mock-events.ts";
import { useWebBackend, type RemoteSessionRow } from "./adapters/dsh-web/web-backend.ts";
import { SkillsHub } from "./skills/SkillsHub.tsx";
import { SettingsPage } from "./settings/SettingsPage.tsx";
import { readRecentLimit } from "./settings/local-prefs.ts";
import type { Workspace } from "./sidebar/mock-data";

/**
 * M1 区块顺序（2026-09-16 用户裁定）：左栏会话区 → 右栏（审查/终端/文件）→ 对话区（中栏）最后。
 * 中栏为自写对话区壳（2026-09-17 裁定 16：搬 DSH ui-chat 渲染内核 + 本地折叠，
 * v2 皮肤换装：PromptBar/ThinkingState/操作行/ToolChips 头——stitch-chat vendor）。
 * 会话区联动（2026-09-17 v2）：点击会话行切换对话区窗口，新建任务开空白对话；
 * 左栏会话管理（裁定 18/19）见 SessionSidebar。
 * SDK 接线（2026-09-17 裁定 20，浏览器 dev 形态）：URL 带 ?backend=web 时直连本机
 * `dsh web` 实例（Vite 代理 /api /sidebar /dsh-auth-connect 同源化）——真实会话列表
 * （session/list，按 cwd 归组进项目分区）、真实事件流（session/follow → chat-store 折叠层）、
 * 真实发消息（session/prompt）、fork/rename 真实命令；默认不带参数仍为 mock 模式。
 * Electron 壳阶段同一前端换成 SDK 进程内桥（adapter 面不变）。
 * 外壳固定一屏，页面不滚动。
 */

/** 会话窗口仓库：M1 mock 模式用 mock 事件映射；web 模式键为真实 sessionId。 */
const SESSION_MOCKS: Record<string, typeof mockEvents> = {
  "了解当前项目进度": mockEvents,
};

/** SDK 接线开关：?backend=web。 */
const backendMode = new URLSearchParams(window.location.search).get("backend") === "web";

function cwdGroupName(cwd: string | undefined): string {
  if (cwd === undefined || cwd.length === 0) return "默认工作区";
  const normalized = cwd.replace(/\\/g, "/");
  const base = normalized.slice(Math.max(0, normalized.lastIndexOf("/") + 1));
  return base.length > 0 ? base : "默认工作区";
}

export function App() {
  const web = useWebBackend(backendMode);
  // mock 会话种子表（分叉/重开共享；forkSession 会写入新键）
  const seedsRef = useRef<Record<string, typeof mockEvents>>({ ...SESSION_MOCKS });
  const [stores, setStores] = useState<Record<string, ChatSessionStore>>(() => {
    const initial: Record<string, ChatSessionStore> = {};
    if (!backendMode) {
      for (const id of Object.keys(SESSION_MOCKS)) {
        const store = new ChatSessionStore();
        store.seedWindow(SESSION_MOCKS[id]);
        initial[id] = store;
      }
    }
    return initial;
  });
  const storesRef = useRef(stores);
  storesRef.current = stores;
  // 进入应用为空白态（2026-09-17 用户裁定：关闭界面/应用再进来，默认不恢复上次
  // 打开的会话界面与内容）。
  const [activeId, setActiveId] = useState<string>("");
  // 视图路由（裁定 22）：chat=对话；skills=技能扩展（左栏不变）；settings=整页设置
  const [view, setView] = useState<"chat" | "skills" | "settings">("chat");
  // 会话归属（2026-09-17 用户裁定）：新建任务默认进最近任务区；工作区行 + 号建到工作区；
  // 拖拽改变归属。M1 为本地组织状态（runtime workspace attachment 后续接）。
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  // 最近任务展示数量（设置页可调；localStorage + 事件同步）
  const [recentLimit, setRecentLimit] = useState<number>(() => readRecentLimit());
  useEffect(() => {
    const onChanged = () => setRecentLimit(readRecentLimit());
    window.addEventListener("magic:recent-limit", onChanged);
    return () => window.removeEventListener("magic:recent-limit", onChanged);
  }, []);

  /** 打开即建库（web 模式：真实 sessionId；mock 模式：标题键 + mock 种子）。 */
  const ensureStore = (id: string): ChatSessionStore => {
    const existing = storesRef.current[id];
    if (existing !== undefined) return existing;
    const fresh = new ChatSessionStore();
    const mock = seedsRef.current[id];
    if (mock !== undefined) fresh.seedWindow(mock);
    storesRef.current = { ...storesRef.current, [id]: fresh };
    setStores(storesRef.current);
    return fresh;
  };

  const store = useMemo(
    () => stores[activeId] ?? new ChatSessionStore(),
    [stores, activeId],
  );

  const openSession = (id: string) => {
    setView("chat"); // 打开会话即回到对话视图（技能/设置页点击会话行同样生效）
    if (id.length === 0) {
      setActiveId("");
      return;
    }
    ensureStore(id);
    setActiveId(id);
  };

  // 左栏会话管理（裁定 18）：分叉会话。web 模式走 session/fork；mock 模式复制种子。
  const forkSession = (sourceId: string, forkId: string) => {
    if (backendMode) {
      web
        .fork(sourceId)
        .then(childId => {
          if (childId.length > 0) openSession(childId);
        })
        .catch(error => window.alert(`分叉失败：${error instanceof Error ? error.message : String(error)}`));
      return;
    }
    const source = seedsRef.current[sourceId];
    if (source !== undefined && seedsRef.current[forkId] === undefined) {
      seedsRef.current[forkId] = source;
    }
    ensureStore(forkId);
    setActiveId(forkId);
  };

  // 会话导出（裁定 19）：快照序列化为 Markdown 下载。
  const exportSession = (id: string) => {
    const target = storesRef.current[id];
    if (target === undefined) return;
    const markdown = buildSessionMarkdown(id, target.getSnapshot().snapshot);
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${id}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // web 模式：会话列表 → 项目分组（cwd basename）+ 标题投影；自动打开最近会话
  const remoteWorkspaces = useMemo<Workspace[] | undefined>(() => {
    if (!backendMode || web.status !== "ready") return undefined;
    const groups = new Map<string, RemoteSessionRow[]>();
    for (const row of web.sessions) {
      if (row.parentSessionId !== undefined) continue; // 子代理会话暂不进列表（层级导航后续裁定）
      const name = cwdGroupName(row.cwd);
      const bucket = groups.get(name) ?? [];
      bucket.push(row);
      groups.set(name, bucket);
    }
    return [...groups.entries()].map(([name, rows]) => ({
      id: `remote-${name}`,
      name,
      expanded: true,
      sessions: [...rows].sort((a, b) => b.updatedAt - a.updatedAt).map(row => row.sessionId),
    }));
  }, [web.status, web.sessions]);

  const labels = useMemo<Record<string, string>>(
    () => Object.fromEntries(web.sessions.map(row => [row.sessionId, row.title])),
    [web.sessions],
  );

  // 会话工作目录（右键菜单「复制路径」用，2026-09-17 用户裁定）
  const sessionCwds = useMemo<Record<string, string>>(
    () => Object.fromEntries(
      web.sessions
        .filter(row => row.cwd !== undefined && row.cwd.length > 0)
        .map(row => [row.sessionId, row.cwd as string]),
    ),
    [web.sessions],
  );

  // web 模式：任务区 = 全部会话按最近时间倒序（「最近」语义；新建任务即排第一）
  const remoteTaskSessions = useMemo<string[] | undefined>(() => {
    if (!backendMode || web.status !== "ready") return undefined;
    return [...web.sessions]
      .filter(row => row.parentSessionId === undefined)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(row => row.sessionId);
  }, [web.status, web.sessions]);

  // web 模式：activeId 变化 → follow 事件流进对应 store（快照整窗替换 + 增量追加）
  useEffect(() => {
    if (!backendMode || web.status !== "ready" || activeId.length === 0) return;
    const target = ensureStore(activeId);
    const dispose = web.follow(activeId, target);
    return () => {
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, web.status, web.sessions]);

  const handleSend = (text: string) => {
    if (!backendMode) {
      store.submit(text);
      return;
    }
    if (activeId.length > 0) {
      store.markAwaiting();
      web
        .prompt(activeId, text)
        .catch(error => {
          store.settleReply();
          window.alert(`发送失败：${error instanceof Error ? error.message : String(error)}`);
        });
      return;
    }
    // 空白态直接发消息（2026-09-17）：先建会话再发；follow 的 snapshot 会补齐事件
    web
      .createSession()
      .then(id => {
        if (id.length === 0) return;
        openSession(id);
        return web.prompt(id, text);
      })
      .catch(error =>
        window.alert(`发送失败：${error instanceof Error ? error.message : String(error)}`),
      );
  };

  // web 模式连接门（认证/探测/错误态整屏呈现）
  if (backendMode && web.status !== "ready") {
    return (
      <div className="h-screen overflow-hidden bg-surface text-on-surface flex items-center justify-center">
        <div className="w-[520px] rounded-xl bg-surface-container border border-surface-container-highest shadow-[0_16px_40px_-4px_rgba(0,0,0,0.7)] p-space-lg">
          <div className="text-[15px] font-semibold text-on-surface mb-2">连接 DSH Runtime</div>
          {web.status === "probing" ? (
            <div className="text-[13px] text-on-surface-variant">正在探测本机 dsh web 实例…</div>
          ) : null}
          {web.status === "need-auth" ? (
            <ConnectCard
              hint="未认证。粘贴 dsh web 启动时打印的授权 URL（或其中 token）完成本机授权："
              submitLabel="连接"
              onSubmit={input =>
                web.connect(input).catch(error =>
                  window.alert(error instanceof Error ? error.message : String(error)),
                )
              }
            />
          ) : null}
          {web.status === "error" ? (
            <>
              <div className="text-[13px] text-on-surface-variant mb-3">
                连接失败：{web.errorMessage}
              </div>
              <ConnectCard
                hint="可粘贴授权 URL 重试（或重启 dsh web 后刷新本页）："
                submitLabel="重试连接"
                onSubmit={input =>
                  web.connect(input).catch(error =>
                    window.alert(error instanceof Error ? error.message : String(error)),
                  )
                }
              />
            </>
          ) : null}
          <div className="mt-3 text-[12px] text-outline">
            dev 用法：先运行 dsh web（Magic 插件全挂实例），再打开 /?backend=web。
          </div>
        </div>
      </div>
    );
  }

  // 视图路由（2026-09-17 用户裁定）：对话 / 技能扩展（左栏不变，主区替换）/
// 设置（图二式整页，替换整个界面）。设置页从底部用户卡「设置」进入。
  if (view === "settings") {
    return (
      <SettingsPage
        onBack={() => setView("chat")}
        onOpenSkills={() => setView("skills")}
        backendReady={backendMode && web.status === "ready"}
      />
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-surface text-on-surface font-headline-md text-headline-md antialiased selection:bg-primary-container selection:text-on-primary-container">
      <SessionSidebar
        activeSessionId={activeId}
        onOpenSession={openSession}
        onForkSession={forkSession}
        onExportSession={exportSession}
        onOpenSkills={() => setView("skills")}
        onOpenSettings={() => setView("settings")}
        labels={backendMode ? labels : undefined}
        onRenameSession={
          backendMode
            ? (id, title) => {
                web
                  .rename(id, title)
                  .catch(error =>
                    window.alert(`重命名失败：${error instanceof Error ? error.message : String(error)}`),
                  );
              }
            : undefined
        }
        onCreateSession={
          backendMode
            ? (workspaceId?: string) => {
                web
                  .createSession()
                  .then(id => {
                    if (id.length === 0) return;
                    // 工作区行 + 号：创建后归属到该工作区（2026-09-17 用户裁定）
                    if (workspaceId !== undefined) {
                      setAssigned(prev => ({ ...prev, [id]: workspaceId }));
                    }
                    openSession(id);
                  })
                  .catch(error =>
                    window.alert(`新建失败：${error instanceof Error ? error.message : String(error)}`),
                  );
              }
            : undefined
        }
        remoteWorkspaces={remoteWorkspaces}
        remoteTaskSessions={remoteTaskSessions}
        showMockSections={!backendMode}
        assigned={backendMode ? assigned : undefined}
        onAssign={
          backendMode
            ? (sessionId, workspaceId) => {
                setAssigned(prev => {
                  const next = { ...prev };
                  if (workspaceId === null) delete next[sessionId];
                  else next[sessionId] = workspaceId;
                  return next;
                });
              }
            : undefined
        }
        recentLimit={recentLimit}
        sessionCwds={backendMode ? sessionCwds : undefined}
      />
      <div className="pl-[260px] h-full flex">
        <main className="flex-1 min-w-0 bg-surface">
          {view === "skills" ? (
            <SkillsHub
              backendReady={backendMode && web.status === "ready"}
              sessionId={activeId.length > 0 ? activeId : web.sessions[0]?.sessionId ?? ""}
            />
          ) : (
            <ChatFlow key={activeId} store={store} onSend={handleSend} />
          )}
        </main>
        {/* 右坞暂时隐藏（2026-09-17 用户裁定）：<InspectorPanel /> */}
      </div>
    </div>
  );
}

/** 授权输入卡（token URL → /dsh-auth-connect 代理交换 Cookie）。 */
function ConnectCard({ hint, submitLabel, onSubmit }: {
  hint: string;
  submitLabel: string;
  onSubmit: (input: string) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <>
      <div className="text-[12.5px] text-outline mb-2">{hint}</div>
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter" && value.trim().length > 0) onSubmit(value);
          }}
          placeholder="http://127.0.0.1:3099/?token=…"
          className="flex-1 h-9 px-3 rounded-lg border border-surface-container-highest focus:border-primary bg-surface-container-lowest outline-none text-[13px] text-on-surface placeholder:text-outline"
        />
        <button
          type="button"
          disabled={value.trim().length === 0}
          onClick={() => onSubmit(value)}
          className="h-9 px-3 rounded-lg bg-inverse-surface text-inverse-on-surface text-[13px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitLabel}
        </button>
      </div>
    </>
  );
}
