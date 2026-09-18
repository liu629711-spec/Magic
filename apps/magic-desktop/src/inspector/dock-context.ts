/**
 * Magic 右坞的官方 client Context shim：把 magic-desktop 的 App 桥
 * （bridge / onDraftText / collapsed 等）适配成 dsh-better-sidebar client
 * 消费的 Context（vendor context-types.ts 的 `Context = Cordis Context &
 * SidebarContextShape`，纯类型面）。
 *
 * 只实现 client 运行时真正消费的成员（vendor client 全量 grep 证据）：
 * - ctx.get('betterSidebar')：Sidebar.tsx:151/332/336/543/557/621/640/642/662、
 *   TabContent.tsx:38/68、EditorHost.tsx:88/163/340/349/404/529、
 *   tree-mutations.ts:31/41、ChangesTab.tsx:119、SideChatView.tsx:422/446/582/591、
 *   intercept.tsx:24/51、conversation-draft.ts:176/229、index.tsx:348
 * - ctx.sessions.list：Sidebar.tsx:196-199、use-host-feeds.ts:70/252
 * - ctx.sessions.scope + ctx.get('conversation')：conversation-draft.ts:171-191/227-249
 * - ctx.locale：Sidebar.tsx:104-107、index.tsx attachLocale
 * - ctx.get('sidebarRight')：use-host-feeds.ts:66（窄屏停靠面，NativeColumnFace）
 * - ctx.modules：index.tsx:218 → chunk-loader（chunk 404 由调用方 catch 容错）
 * - ctx.connection：SideChatView.tsx:404-405/747 全部 `?.` 消费 → undefined 即隐藏断线横幅
 * - ctx.on（session feed / assistant-stream）：client 运行时零调用点 → noop
 * host-half 服务面（webServer/settings/tools/jobs/agents/invariants/slots/webRuntime/
 * subagents/agentPresets/sessionTitle/sessionPersistence）运行时无人读：置 undefined。
 */
import type {
  Context,
  SidebarConversation,
  SidebarSessionInput,
  SidebarSessionList,
  SidebarSessionsService,
} from '../vendor/dsh-better-sidebar/src/context-types.ts'
import type { BetterSidebarService } from '../vendor/dsh-better-sidebar/src/client/service.ts'
import type { DockSessionBridge } from './DockPanels'

export interface DockContextOptions {
  service: BetterSidebarService
  /** 会话跳转 / Side Chat fork 的 App 侧语义（官方 ISessions.open / ISessions.fork 镜像）。 */
  bridge: Pick<DockSessionBridge, 'openSession' | 'fork'>
  /** 每次读取取最新值（DockShell 以 latest-ref 模式供数）。 */
  getSession(): { sessionId: string | undefined; cwd: string | undefined; title: string | undefined }
  getRows(): DockSessionBridge['sessions']
  /** conversation.input 的唯一写通道：转发 App 草稿桥（追加语义）。 */
  onDraftText?: (text: string) => void
  /** ctx.get('sidebarRight').isExpanded 的取值（右坞可见性）。 */
  isExpanded(): boolean
  toggleExpanded(): void
}

export interface DockContextBundle {
  ctx: Context
  /** props 驱动的 sessions 快照变化后调用（DockShell 的 effect 负责）。 */
  refreshSessions(): void
}

/**
 * 会话级伪 Context：conversation-draft.ts:171/227 的 scope 只在
 * insertFileReference 的 emit('slash/input-insert-reference') 分支触达它；
 * 我们 input.state 恒 draftRev: undefined（见 inputFor），该分支直接 false
 * 回落 appendToDraft，emit 永不执行。
 */
function createSessionScopeContext(): Context {
  return { emit: () => {} } as unknown as Context
}

export function createDockContext(options: DockContextOptions): DockContextBundle {
  const provided = new Map<string, unknown>()

  // ── ctx.sessions.list：useSyncExternalStore 兼容 mini store ──────────────
  // uSES 要求 getSnapshot 引用稳定：props（sessionId/cwd/rows）由 key 标记，
  // key 不变则返回同一缓存对象；DockShell 在 props 变化的 effect 里调
  // refreshSessions() 通知订阅者。
  const sessionListeners = new Set<() => void>()
  let cachedSnapshot: SidebarSessionList | undefined
  let cachedKey = ''
  const sessionsKey = (): string => {
    const { sessionId, cwd } = options.getSession()
    const rows = options.getRows()
    const row = sessionId === undefined ? undefined : rows.find(item => item.sessionId === sessionId)
    return `${sessionId ?? ''}|${cwd ?? ''}|${row?.title ?? ''}|${row?.updatedAt ?? 0}|${rows.length}`
  }
  const buildSnapshot = (): SidebarSessionList => {
    const { sessionId, cwd, title } = options.getSession()
    const byId: SidebarSessionList['byId'] = {}
    for (const row of options.getRows()) {
      byId[row.sessionId] = {
        id: row.sessionId,
        cwd: row.cwd,
        displayTitle: row.title,
        ...(row.running ? { running: true } : {}),
        ...(row.parentSessionId === undefined ? {} : { parentId: row.parentSessionId }),
      }
    }
    // 当前会话兜底行（cwd 以 DockShell 解析值优先——App 的 dockCwd 可能晚于列表到达）。
    if (sessionId !== undefined && byId[sessionId] === undefined) {
      byId[sessionId] = { id: sessionId, cwd, displayTitle: title ?? sessionId }
    }
    // jobsBySession：后台任务推送（session/jobs WS）本环境无源，恒空集——
    // 官方类型允许缺省，任务页仅少一个后台任务区。
    return { current: sessionId, byId, jobsBySession: {} }
  }
  const getSessionsSnapshot = (): SidebarSessionList => {
    const key = sessionsKey()
    if (cachedSnapshot === undefined || key !== cachedKey) {
      cachedKey = key
      cachedSnapshot = buildSnapshot()
    }
    return cachedSnapshot
  }

  // ── conversation.input：draft 恒空 + setDraft 转发 onDraftText ───────────
  // 对齐 conversation-draft.ts:171-191（appendToDraft）与 227-249（insertFileReference）
  // 的消费面：官方读 input.state.getSnapshot().draft 后 spliceInsert 再 setDraft(整段)；
  // 我们的 draft 恒空 → next=text 本身 → onDraftText(text) 即"追加文本"语义，
  // 与 App 的 draftInjection（按 seq 追加）一一对应。draftRev 恒 undefined →
  // insertFileReference 直接 false → 官方代码自动回落纯文本 `@path`（与自写壳一致）。
  const inputFor = (_actx: unknown): SidebarSessionInput => ({
    state: { getSnapshot: () => ({ draft: '', draftRev: undefined }) },
    setDraft: (text: string) => { options.onDraftText?.(text) },
  })
  const conversation: SidebarConversation = { input: { for: inputFor } }

  // ── sessions face（SidebarSessionsService：必填只有 list 与 scope）──────
  const sessions: SidebarSessionsService = {
    list: {
      getSnapshot: getSessionsSnapshot,
      subscribe(fn: () => void): () => void {
        sessionListeners.add(fn)
        return () => { sessionListeners.delete(fn) }
      },
    },
    open(id: string): void { options.bridge.openSession(id) },
    fork(opts: { sessionId: string }): Promise<string> { return options.bridge.fork(opts.sessionId) },
    scope(): Context { return createSessionScopeContext() },
    // binding / openSubagent / subagentAddress / setSubagentCatalogOpen /
    // refreshSubagents：官方可选成员。saved-session 重命名与 subagent 目录
    // 在本环境无实现（undefined = 面板内对应动作降级），不在此桩。
  }

  // ── locale：固定 zh 的 mini store ────────────────────────────────────────
  // t() 直读 zh 源字典（locales.ts:999 zh 是 source of truth），register 面
  // 留空（无外部 lookup 消费者）；subscribe 恒不触发（locale 固定）。
  const localeListeners = new Set<() => void>()
  const locale = {
    getSnapshot: () => ({ active: 'zh' }),
    subscribe(fn: () => void): () => void {
      localeListeners.add(fn)
      return () => { localeListeners.delete(fn) }
    },
    register(): () => void { return () => {} },
  }

  // ── sidebarRight：官方 use-host-feeds.ts:36-77 的 NativeColumnFace ──────
  const sidebarRightFace = {
    isExpanded: () => options.isExpanded(),
    toggleExpanded: () => { options.toggleExpanded() },
  }

  const ctx = {
    get: (name: string): unknown => {
      if (name === 'betterSidebar') return options.service
      if (name === 'conversation') return conversation
      if (name === 'sidebarRight') return sidebarRightFace
      if (provided.has(name)) return provided.get(name)
      // betterLocale / remote：官方按 undefined 降级（Sidebar.tsx:125-129、index.tsx:348）。
      return undefined
    },
    provide: (name: string, factory: () => unknown): void => { provided.set(name, factory()) },
    effect: (fn: () => (() => void) | void): (() => void) => {
      const disposer = fn()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    inject: () => () => {},
    sessions,
    locale,
    modules: {
      // chunk-loader externals 面（chunk-loader.ts:72-80 的 CHUNK_EXTERNALS）：
      // 每页一次 await import(spec) 建 require 表（buildExternalsRequire），
      // 必须真正 settle。用静态可分析的动态 import 映射表（Vite 会重写并预打包）；
      // 本机未装的包（dsh-client-ui-slots）不进表 → import 抛错 → 官方
      // per-spec catch（chunk-loader.ts:182-188）置 undefined，仅当 chunk
      // 真的 require 它时才报错。
      import: (specifier: string): Promise<unknown> => {
        const loaders: Record<string, () => Promise<unknown>> = {
          'react': () => import('react'),
          'react/jsx-runtime': () => import('react/jsx-runtime'),
          'react-dom': () => import('react-dom'),
          'react-dom/client': () => import('react-dom/client'),
          'cordis': () => import('@deepseek-ai/cordis'),
          '@deepseek-ai/dsh-client-ui-primitives': () => import('@deepseek-ai/dsh-client-ui-primitives'),
        }
        const load = loaders[specifier]
        if (load === undefined) {
          return Promise.reject(new Error(`[magic-desktop] chunk external "${specifier}" is not resolvable`))
        }
        return load()
      },
    },
    connection: undefined,
    on: () => () => {},
    // host-half 服务面：client 运行时零消费（见文件头），显式 undefined。
    webServer: undefined,
    webRuntime: undefined,
    slots: undefined,
    settings: undefined,
    invariants: undefined,
    tools: undefined,
    jobs: undefined,
    agents: undefined,
    subagents: undefined,
    agentPresets: undefined,
    sessionTitle: undefined,
    sessionPersistence: undefined,
    betterSidebar: options.service,
    conversation,
  } as unknown as Context

  return {
    ctx,
    refreshSessions: () => {
      for (const fn of [...sessionListeners]) fn()
    },
  }
}
