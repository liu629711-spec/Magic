import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { SessionSidebar } from "./sidebar/SessionSidebar";
import { createSidebarStore } from "./vendor/dsh-better-sidebar/src/client/state.ts";
import { Icon } from "./sidebar/Icon";
// 底部终端面板（3099 形态）复用插件的 lazy terminal chunk（xterm 主包不进主 bundle）。
const LazyTerminalView = lazy(
  () => import("./vendor/dsh-better-sidebar/src/client/chunks/terminal.tsx").then(mod => ({ default: mod.TerminalView })),
);
// 右坞（2026-09-18）：三个真实 tab（文件/文件变动/终端）接本机 dsh web 的 /sidebar 通道。
// 原 InspectorPanel/ReviewPanel（静态 mock）保留作历史参考，不再渲染。
import { RightDock } from "./inspector/RightDock";
import { ChatFlow } from "./conversation/ChatFlow.tsx";
import { ChatSessionStore } from "./conversation/chat-store.ts";
// 上下文圆环（2026-09-18 官方化）：formatTokens 官方紧凑格式 + 明细行类型 + 实测三段色
import {
  CONTEXT_METER_TONES,
  formatTokens,
  type ContextMeterBreakdownItem,
} from "./conversation/ContextMeter.tsx";
import type { SessionHeaderData } from "./conversation/SessionHeader.tsx";
import { buildSessionMarkdown } from "./conversation/session-export.ts";
import { mockEvents } from "./conversation/mock-events.ts";
import { useWebBackend, type RemoteSessionRow } from "./adapters/dsh-web/web-backend.ts";
import { dshRpc } from "./adapters/dsh-web/rpc.ts";
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

/** 子代理会话标题清洗（2026-09-18）：runtime 对未命名子会话的 title 投影会回落到
 *  worker 系统提示词前缀（"You are a worker on…"），显示为「子代理 N」更可读。 */
function subagentTitle(row: RemoteSessionRow, index: number): string {
  const title = row.title;
  if (title.startsWith("You are") || title.length > 64) return `子代理 ${index + 1}`;
  return title;
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
  // 当前会话 store（提前定义：三件套/模型等 hook 依赖它）
  const store = useMemo(
    () => stores[activeId] ?? new ChatSessionStore(),
    [stores, activeId],
  );
  // 模型目录（2026-09-17：对话区模型选择器接真实数据，不再用画廊 mock）
  const [modelCatalog, setModelCatalog] = useState<
    { key: string; name: string; tag?: string; provider: string }[]
  >([]);
  useEffect(() => {
    if (!backendMode || web.status !== "ready") return;
    dshRpc<{ groups?: { id: string; name: string; models?: { id: string; name: string }[] }[] }>(
      "session/modelCatalog",
      {},
    )
      .then(value => {
        const options: { key: string; name: string; tag?: string; provider: string }[] = [];
        for (const group of value.groups ?? []) {
          for (const model of group.models ?? []) {
            options.push({ key: `${group.id}:${model.id}`, name: model.name, tag: group.name, provider: group.id });
          }
        }
        setModelCatalog(options);
      })
      .catch(() => setModelCatalog([]));
  }, [web.status]);

  const activeSessionModel = web.sessions.find(row => row.sessionId === activeId)?.model;
  // 右坞作用域：只有真实 web 会话才有对应的宿主会话（mock 会话没有，右坞保持空态）。
  const dockSessionId = backendMode && web.status === "ready" && activeId.length > 0 ? activeId : "";
  const dockCwd = web.sessions.find(row => row.sessionId === activeId)?.cwd;
  const modelPicker =
    backendMode && modelCatalog.length > 0
      ? {
          options: modelCatalog.map(({ key, name, tag }) => ({ key, name, tag })),
          currentKey:
            activeSessionModel !== undefined
              ? `${activeSessionModel.provider}:${activeSessionModel.model}`
              : undefined,
          onChange: (key: string) => {
            const option = modelCatalog.find(m => m.key === key);
            if (option === undefined || activeId.length === 0) return;
            web
              .selectModel(activeId, option.provider, key.slice(option.provider.length + 1))
              .catch(error =>
                window.alert(`切换模型失败：${error instanceof Error ? error.message : String(error)}`),
              );
          },
        }
      : undefined;

  // 输入条三件套（2026-09-18 照 Magic 网页版）：订阅当前会话 store 拿投影与事件
  const chatState = useSyncExternalStore(store.subscribe, store.getSnapshot);
  // 命令执行（/permission、/mode 等）。wire 参数取自生成的 Remote 契约
  // `commands/lib/typert.remote-client.d.ts:11-16`：execute(agentId, line, submittedAttachments, signal?)，
  // 其中 agentId 是 Agent lookup 的 wire 字段（core/agent/src/index.ts:258-264 注册 wire:'agentId'）。
  const runCommand = (line: string) => {
    if (activeId.length === 0) return;
    dshRpc("commands/execute", { agentId: activeId, line, submittedAttachments: [] }).catch(
      (error: unknown) =>
        window.alert(`命令执行失败：${error instanceof Error ? error.message : String(error)}`),
    );
  };
  const composerChips = (() => {
    if (!backendMode || activeId.length === 0) return undefined;
    const values = chatState.projections?.values ?? {};
    // 访问模式（permission-presets 投影 values.permissions = {currentValue, options:[{value,name}]}）
    const permissionRaw = values.permissions as
      | { currentValue?: string; options?: { value?: string; name?: string }[] }
      | undefined;
    const permissionId =
      typeof permissionRaw?.currentValue === "string" ? permissionRaw.currentValue : undefined;
    const permissionLabel =
      permissionId === undefined
        ? undefined
        : permissionRaw?.options?.find(option => option.value === permissionId)?.name ??
          (permissionId === "read-only"
            ? "只读"
            : permissionId === "danger-full-access"
              ? "完全访问"
              : permissionId === "workspace-write"
                ? "工作区内修改"
                : undefined);
    // 上下文用量（token-meter 投影 values.contextPressure = {contextWindow, pressureTokens, projectedTokens}）。
    // 2026-09-18 官方化：detail 换官方「~36.1K / 262K」紧凑格式（used 优先 projectedTokens，
    // 同官方 context-occupancy.ts:18）；明细从 values.contextBreakdown 读（官方
    // ContextBreakdownProjection = {systemTokens, toolsTokens, messageTokens}）。
    const pressureRaw = values.contextPressure as Record<string, unknown> | undefined;
    const contextWindow = Number(pressureRaw?.contextWindow ?? 0);
    const usedTokens = Number(pressureRaw?.projectedTokens ?? pressureRaw?.pressureTokens ?? 0);
    const context =
      contextWindow > 0
        ? {
            percent: Math.min(100, Math.round((usedTokens / contextWindow) * 100)),
            detail: `~${formatTokens(usedTokens)} / ${formatTokens(contextWindow)}`,
          }
        : undefined;
    // 上下文明细三段（系统提示词/工具定义/对话消息）。投影缺失或形状不符 → breakdown
    // undefined，ContextMeter 弹窗只显示头部两段（条与图例不渲染）。
    const breakdownRaw = values.contextBreakdown as
      | { systemTokens?: unknown; toolsTokens?: unknown; messageTokens?: unknown }
      | undefined;
    const breakdown: ContextMeterBreakdownItem[] | undefined =
      breakdownRaw === undefined || context === undefined
        ? undefined
        : [
            {
              label: "系统提示词",
              value: `~${formatTokens(Number(breakdownRaw.systemTokens ?? 0))}`,
              tokens: Number(breakdownRaw.systemTokens ?? 0),
              tone: CONTEXT_METER_TONES.system,
            },
            {
              label: "工具定义",
              value: `~${formatTokens(Number(breakdownRaw.toolsTokens ?? 0))}`,
              tokens: Number(breakdownRaw.toolsTokens ?? 0),
              tone: CONTEXT_METER_TONES.tools,
            },
            {
              label: "对话消息",
              value: `~${formatTokens(Number(breakdownRaw.messageTokens ?? 0))}`,
              tokens: Number(breakdownRaw.messageTokens ?? 0),
              tone: CONTEXT_METER_TONES.messages,
            },
          ];
    // 工作模式（magic-work-mode 事件流）
    const workModeRaw = store.recentEventData("magic/work-mode") as { sessionMode?: string } | undefined;
    const isCeo = workModeRaw?.sessionMode === "ceo";
    return {
      permission:
        permissionLabel !== undefined
          ? {
              label: permissionLabel,
              onClick: () =>
                runCommand(
                  permissionId === "read-only" ? "/permission workspace-write" : "/permission read-only",
                ),
            }
          : undefined,
      workMode: {
        label: isCeo ? "CEO · 当前会话" : "Agent · 当前会话",
        onClick: () => runCommand(isCeo ? "/mode agent" : "/mode ceo"),
      },
      context: context === undefined ? undefined : { ...context, breakdown },
    };
  })();

  // 输入条 @ 候选（真实技能）与 / 命令（commands/list）（2026-09-18）
  const [mentionOptions, setMentionOptions] = useState<
    { key: string; name: string; desc: string; glyph?: string; attach?: boolean }[] | undefined
  >(undefined);
  const [commandOptions, setCommandOptions] = useState<
    { key: string; name: string; desc: string }[] | undefined
  >(undefined);
  // @ 引用桥（2026-09-18）：右坞「@文件」→ 对话输入框草稿 `@<相对路径> `。
  // 受控注入 token：seq 变化 = 一次注入（PromptBar 按 seq 消费）。
  const [draftInjection, setDraftInjection] = useState<{ seq: number; text: string } | null>(null);
  const pushDraft = (text: string) => setDraftInjection({ seq: Date.now(), text: `${text} ` });
  // 只消费一次：子组件（PromptBar）的 effect 先于父组件 effect 执行，故这里在它追加草稿后
  // 立刻清空注入——之后切会话/切视图都不会重复追加。不在对话视图（无输入框）时注入被丢弃。
  useEffect(() => {
    if (draftInjection === null) return;
    setDraftInjection(null);
  }, [draftInjection]);
  useEffect(() => {
    if (!backendMode || web.status !== "ready" || activeId.length === 0) return;
    let cancelled = false;
    dshRpc<{ skills?: { name: string; description?: string }[] }>("skills/list", {
      request: { sessionId: activeId },
    })
      .then(value => {
        if (cancelled) return;
        const skills = (value.skills ?? []).slice(0, 40).map(skill => ({
          key: `skill:${skill.name}`,
          name: skill.name,
          desc: skill.description ?? "技能",
        }));
        setMentionOptions([
          { key: "attach", name: "添加照片和文件", desc: "从电脑上传", glyph: "clip", attach: true },
          ...skills,
        ]);
      })
      .catch(() => undefined);
    // list 的 wire 参数同上：list(agentId)（typert.remote-client.d.ts:12）。
    // 传 agentId 才会按该 Agent 的 scoped 层展开——插件命令 /mode（magic-work-mode）、
    // /permission（permission-presets）注册在 agent 上下文子层，缺 agentId 只回全局核心命令。
    dshRpc<unknown>("commands/list", { agentId: activeId })
      .then(value => {
        if (cancelled) return;
        const list = Array.isArray(value)
          ? value
          : ((value as { items?: unknown[] } | null)?.items ?? []);
        setCommandOptions(
          list
            .map(item => {
              const record = item as { name?: unknown; description?: unknown };
              const name = typeof record.name === "string" ? record.name : "";
              return {
                key: name,
                name: `/${name}`,
                desc: typeof record.description === "string" ? record.description : "",
              };
            })
            .filter(item => item.key.length > 0),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [backendMode, web.status, activeId]);

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

  // 会话预设显示名映射（图二顶栏「标准模式」段；官方 AgentPresetLabel 语义：
  // 投影 agentPreset 存 id，显示名经 agentPresets/list 映射。args 双形状兜底同 SkillsHub）。
  const [presetNames, setPresetNames] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!backendMode || web.status !== "ready") return;
    let cancelled = false;
    void (async () => {
      for (const args of [{}, { _request: {} }] as Record<string, unknown>[]) {
        try {
          const roster = await dshRpc<{ presets?: { id?: string; name?: string }[] }>(
            "agentPresets/list",
            args,
          );
          if (cancelled) return;
          const map: Record<string, string> = {};
          for (const preset of roster.presets ?? []) {
            if (typeof preset.id === "string" && typeof preset.name === "string" && preset.name.length > 0) {
              map[preset.id] = preset.name;
            }
          }
          setPresetNames(map);
          return;
        } catch {
          /* 下一种 args 形状 */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backendMode, web.status]);

  // 会话头数据（M4，2026-09-18）：从真实会话列表算父会话与子代理/子会话；
  // mock 模式（无 web 数据）返回 undefined → 对话区不渲染会话头。
  const sessionHeader = useMemo<SessionHeaderData | undefined>(() => {
    if (!backendMode || web.status !== "ready" || activeId.length === 0) return undefined;
    const current = web.sessions.find(row => row.sessionId === activeId);
    if (current === undefined) return undefined;
    const parentRow =
      current.parentSessionId !== undefined
        ? web.sessions.find(row => row.sessionId === current.parentSessionId)
        : undefined;
    const children = web.sessions.filter(row => row.parentSessionId === activeId);
    return {
      id: current.sessionId,
      title: current.title,
      // 工作目录（图二顶行 workspace chip 展示/复制，2026-09-18）。
      cwd: current.cwd,
      // 会话预设显示名（图二「标准模式」段；官方 AgentPresetLabel 语义）。
      preset:
        current.preset !== undefined
          ? (presetNames[current.preset] ?? current.preset)
          : undefined,
      parent:
        parentRow !== undefined
          ? { id: parentRow.sessionId, title: parentRow.title }
          : undefined,
      children: children.map((row, index) => ({ id: row.sessionId, title: subagentTitle(row, index) })),
    };
  }, [backendMode, web.status, web.sessions, activeId, presetNames]);

  // web 模式：activeId 变化 → follow 事件流进对应 store（快照整窗替换 + 增量追加）。
  // 子代理会话必须用 subagent 地址（durable parent）——否则宿主报 session/agent-busy。
  useEffect(() => {
    if (!backendMode || web.status !== "ready" || activeId.length === 0) return;
    const target = ensureStore(activeId);
    const parentId = web.sessions.find(row => row.sessionId === activeId)?.parentSessionId;
    const dispose = web.follow(activeId, target, parentId);
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

  // CEO 委派图卡接线（2026-09-18）：向当前会话发一条消息（决策抽屉/成员干预都用它）。
  // 与 handleSend 同 RPC（session/prompt），但不改本地 store 等待态——那由 follow 事件流驱动。
  const promptToSession = useCallback(async (text: string): Promise<void> => {
    if (!backendMode || activeId.length === 0) throw new Error("当前会话不可用");
    await web.prompt(activeId, text);
  }, [web.prompt, activeId]);
  const sendIntervention = useCallback((message: string) => {
    void promptToSession(message).catch((error: unknown) =>
      window.alert(`干预发送失败：${error instanceof Error ? error.message : String(error)}`),
    );
  }, [promptToSession]);
  // 打开右坞「团队」tab（图卡点成员/CEO 节点）：token 自增，RightDock 监听后切 tab。
  const [teamOpenToken, setTeamOpenToken] = useState(0);
  const openTeamTab = useCallback(() => { setDockCollapsed(false); setTeamOpenToken(value => value + 1); }, []);
  // 右坞 chrome 状态（2026-09-18 图四顶行接线）：收起态 + 全屏态 + 切 tab 请求。
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [dockFullscreen, setDockFullscreen] = useState(false);
  // 切 tab 请求（{tab, seq}，seq 区分同 tab 的重复点击）：RightDock 监听 seq 变化切 tab。
  const [dockTabRequest, setDockTabRequest] = useState<{ tab: string; seq: number; sessionId: string } | null>(null);
  const [fileRequest, setFileRequest] = useState<{path:string;seq:number;sessionId:string}|null>(null);
  const requestSeq = useRef(0);
  const openFile = useCallback((path:string) => {
    setDockCollapsed(false);
    setFileRequest({path,sessionId:activeId,seq:++requestSeq.current});
  },[activeId]);
  useEffect(()=>{setDockFullscreen(false);setDockCollapsed(false);setDockTabRequest(null);setFileRequest(null)},[activeId]);
  const dockBridge = { sessions:web.sessions, fork:web.fork, follow:web.follow, prompt:web.prompt, selectModel:web.selectModel, openSession };
  // L agent 契约（并行开发）：RightDock 按同名 props 消费——
  // collapsed/onToggleCollapsed/fullscreen/onToggleFullscreen/dockTabRequest。
  // 契约由另一 agent 在 RightDock.tsx 落地；此处先以 any 展开避免契约未合入时 tsc 失败。
  const dockChrome = {
    collapsed: dockCollapsed,
    onToggleCollapsed: () => { setDockFullscreen(false); setDockCollapsed(v => !v); },
    fullscreen: dockFullscreen,
    onToggleFullscreen: () => setDockFullscreen(v => !v),
    dockTabRequest,
  };

  // ── 布局拖拽（2026-09-18 用户裁定，3099 实测几何 + Codex 式阻力收起）──
  // 左栏/右坞缘 8px 骑缝手柄拖动调宽；拖进阻力区位移衰减（明显变重），
  // 拖过阻力上限即收起，收起后保留各自唯一打开入口（左栏 56px 图标条 /
  // 顶栏右坞开关）。对话区宽度手柄在 ChatFlow（内容列 clamp 680-920）。
  const SIDEBAR_RESIST = 220;
  const SIDEBAR_COLLAPSE_BELOW = 180;
  const SIDEBAR_MAX = 480;
  const DOCK_RESIST = 420;
  const DOCK_COLLAPSE_BELOW = 340;
  const DOCK_MAX = 880;
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dockWidth, setDockWidth] = useState(520);
  const sidebarWidthRef = useRef(sidebarWidth);
  sidebarWidthRef.current = sidebarWidth;
  const dockWidthRef = useRef(dockWidth);
  dockWidthRef.current = dockWidth;
  // 阻力映射：正常区线性跟随；阻力区按 0.3 系数衰减（拖感明显变重），越过上限收起。
  const resistWidth = (raw: number, resist: number): number =>
    raw < resist ? resist - (resist - raw) * 0.3 : raw;
  const onSidebarHandleDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = sidebarWidthRef.current;
    let cleanup = (): void => {};
    const onMove = (ev: PointerEvent): void => {
      const raw = startWidth + (ev.clientX - startX);
      if (raw <= SIDEBAR_COLLAPSE_BELOW) {
        setSidebarCollapsed(true);
        cleanup();
        return;
      }
      setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(56, resistWidth(raw, SIDEBAR_RESIST))));
    };
    cleanup = (): void => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", cleanup);
      handle.removeEventListener("pointercancel", cleanup);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", cleanup);
    handle.addEventListener("pointercancel", cleanup);
  }, []);
  const onDockHandleDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = dockWidthRef.current;
    let cleanup = (): void => {};
    const onMove = (ev: PointerEvent): void => {
      const raw = startWidth - (ev.clientX - startX);
      if (raw <= DOCK_COLLAPSE_BELOW) {
        setDockFullscreen(false);
        setDockCollapsed(true);
        cleanup();
        return;
      }
      setDockWidth(Math.min(DOCK_MAX, Math.max(360, resistWidth(raw, DOCK_RESIST))));
    };
    cleanup = (): void => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", cleanup);
      handle.removeEventListener("pointercancel", cleanup);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", cleanup);
    handle.addEventListener("pointercancel", cleanup);
  }, []);

  // ── 底部终端面板（2026-09-18，3099 实测形态）：顶栏终端钮 → 对话区底部弹出
  // 220px 面板（8px 骑缝手柄拖高、右上 × 收起、再点顶栏钮收起）。终端本体复用
  // 插件 TerminalView（xterm + pty，lazy chunk），UI-tab 固定 tabId=term:bottom
  // ——同一会话重开面板 reattach 同一 shell。
  const [bottomTerminalOpen, setBottomTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(220);
  // TerminalView 消费独立 store（prefs 字体 / tabOpen 生命周期判定），与右坞 store 无关。
  const [terminalStore] = useState(createSidebarStore);
  const terminalHeightRef = useRef(terminalHeight);
  terminalHeightRef.current = terminalHeight;
  const toggleBottomTerminal = useCallback(() => setBottomTerminalOpen(value => !value), []);
  const onTerminalResizeDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const startY = event.clientY;
    const startHeight = terminalHeightRef.current;
    let cleanup = (): void => {};
    const onMove = (ev: PointerEvent): void => {
      setTerminalHeight(Math.min(window.innerHeight - 260, Math.max(140, startHeight + (startY - ev.clientY))));
    };
    cleanup = (): void => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", cleanup);
      handle.removeEventListener("pointercancel", cleanup);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", cleanup);
    handle.addEventListener("pointercancel", cleanup);
  }, []);

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
        width={sidebarWidth}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(value => !value)}
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
      <div className="relative h-full flex" style={{ paddingLeft: sidebarCollapsed ? 56 : sidebarWidth }}>
        {/* 左栏拖拽手柄（8px 骑缝，3099 同款几何；拖进阻力区变重、越过上限收起成 56px 图标条） */}
        <div
          data-layout-handle="sidebar"
          className="fixed top-0 h-full w-2 z-[45] -ml-1 cursor-col-resize touch-none select-none hover:bg-primary/20"
          style={{ left: sidebarCollapsed ? 52 : sidebarWidth - 4 }}
          onPointerDown={onSidebarHandleDown}
        />
        <main className={dockFullscreen ? "hidden" : "flex-1 min-w-0 bg-surface"}>
          {view === "skills" ? (
            <SkillsHub
              backendReady={backendMode && web.status === "ready"}
              sessionId={activeId.length > 0 ? activeId : web.sessions[0]?.sessionId ?? ""}
            />
          ) : (
            <ChatFlow
              key={activeId}
              store={store}
              onSend={handleSend}
              onOpenFile={openFile}
              modelPicker={modelPicker}
              composerChips={composerChips}
              mentionOptions={mentionOptions}
              commandOptions={commandOptions}
              draftInjection={draftInjection}
              sessionHeader={sessionHeader}
              onOpenSession={openSession}
              cwd={dockCwd}
              dockCollapsed={dockCollapsed}
              onExpandDock={() => setDockCollapsed(false)}
              onCollapseDock={() => setDockCollapsed(true)}
              onToggleTerminal={toggleBottomTerminal}
              terminalOpen={bottomTerminalOpen}
              onOpenDockTab={tab => {
                setDockCollapsed(false);
                setDockTabRequest({ tab, seq: ++requestSeq.current, sessionId: activeId });
              }}
              headerActions={
                backendMode && activeId.length > 0
                  ? {
                      rename: title => {
                        web
                          .rename(activeId, title)
                          .catch(error =>
                            window.alert(
                              `重命名失败：${error instanceof Error ? error.message : String(error)}`,
                            ),
                          );
                      },
                      exportMarkdown: () => exportSession(activeId),
                      copyId: () => {
                        void navigator.clipboard.writeText(activeId);
                      },
                    }
                  : undefined
              }
              sessionId={backendMode ? activeId : undefined}
              onOpenCeoWorkspace={openTeamTab}
              promptToSession={promptToSession}
            />
          )}
        </main>
        {/* 右坞拖拽手柄（8px 骑缝在坞左缘；阻力 + 越过上限收起，恢复入口=顶栏右坞开关） */}
        {!dockCollapsed && !dockFullscreen && (
          <div
            data-layout-handle="dock"
            className="fixed top-0 h-full w-2 z-[45] -ml-1 cursor-col-resize touch-none select-none hover:bg-primary/20"
            style={{ right: dockWidth - 4 }}
            onPointerDown={onDockHandleDown}
          />
        )}
        {/* 右坞：文件 / 文件变动 / 终端 / 团队（真实 dsh web /sidebar 通道，无 mock）；
            onQuoteFile：文件 @引用注入对话输入框草稿（跨模块桥）；
            teamOpenToken：图卡点成员/CEO 节点时切到「团队」tab；sendIntervention：成员干预写回会话 */}
        <RightDock
          key={dockSessionId}
          width={dockWidth}
          bridge={dockBridge}
          fileRequest={fileRequest}
          sessionId={dockSessionId}
          cwd={dockCwd}
          onDraftText={pushDraft}
          teamOpenToken={teamOpenToken}
          sendIntervention={sendIntervention}
          {...dockChrome}
        />
        {/* 底部终端面板（3099 实测形态）：对话区底部整条弹出，8px 骑缝拖高 + 右上 × 收起；
            left 从侧栏右缘起（3099 同款），盖过对话区与右坞之间，贴视口底。 */}
        {bottomTerminalOpen && backendMode && web.status === "ready" && (
          <div
            data-bottom-terminal
            className="absolute z-40 flex flex-col bg-surface border-t border-surface-container-highest"
            style={{ left: sidebarCollapsed ? 56 : sidebarWidth, right: 0, bottom: 0, height: terminalHeight }}
          >
            <div
              data-bottom-terminal-resize
              className="absolute -top-1 left-0 right-0 h-2 cursor-row-resize touch-none hover:bg-primary/20"
              onPointerDown={onTerminalResizeDown}
            />
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-surface-container-highest pr-1 pl-3">
              <span className="flex items-center gap-1 text-[12px] text-outline">
                <Icon name="terminal" className="text-[14px]" />
                终端
              </span>
              <button
                type="button"
                title="折叠底部面板"
                aria-label="折叠底部面板"
                onClick={() => setBottomTerminalOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded text-outline transition-colors hover:bg-hover hover:text-on-surface cursor-pointer"
              >
                <Icon name="close" className="text-[14px]" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <Suspense fallback={null}>
                <LazyTerminalView
                  scope={{ sessionId: activeId, cwd: dockCwd }}
                  tabId="term:bottom"
                  store={terminalStore}
                />
              </Suspense>
            </div>
          </div>
        )}
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
