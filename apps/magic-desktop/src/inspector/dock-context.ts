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
 * host-half 服务面（webServer/settings/tools/jobs/agents/invariants/webRuntime/
 * subagents/agentPresets/sessionTitle/sessionPersistence）运行时无人读：置 undefined。
 *
 * dockkit 右栏扩展（ui-sidebar-right 平移包 + 插件 native/index.ts 的消费面）：
 * - ctx.slots：官方 SlotCore（vendor/dsh-client-ui-slots 平移）+ mini renderer 的
 *   inject 语义（dockkit-slot-renderer.tsx），声明链 host 侧自建；
 * - ctx.locale 增 bind/register：bind 供 ui-sidebar-right 的 t 席（dockLabels/
 *   guide 标题），register 兼容两种官方形态——better-sidebar (ns, lang, dict)
 *   与 ui-sidebar-right (ns, { zh, en })；
 * - ctx.inject(deps, cb)：插件 native/index.ts:137 等待 'sidebarRightTabs'
 *   服务的挂载序列。本环境服务由 host 在同一 mount 序列同步 provide，缺失
 *   依赖时显式 warn（官方 fiber 等待语义在受控时序下不需要）；
 * - ctx.sidebarRight / ctx.sidebarRightTabs：由 DockkitSidebarRight host 经
 *   provide 注入（controller 与 tab-type registry）。
 */
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import { slotsInject } from './dockkit-slot-renderer'
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
  /**
   * 会话实时对话流读取面（官方 ISessions.binding 的本环境等价）：
   * App 的 ChatSessionStore 注册表按会话 id 取 store（follow 流的落点），
   * Side Chat 面板的转录/发送/运行态从这里读；未打开过的会话返回 undefined
   * （官方对未知会话 binding() throw，调用方需容错——本环境返回 undefined 更温和）。
   */
  getBinding?: (id: string) => {
    /** 转录事件窗口（follow 流已按 seq 归并；Side Chat 轮询读整窗）。
     *  结构性事件面（官方 SessionEvent 镜像）：App 的 SessionEvent 联合
     *  （vendor/dsh-chat）结构兼容，data 用 unknown 承接（dsh-chat 事件 data
     *  是具名接口，无 index signature，不能用 Record<string, unknown> 约束）。 */
    events(): readonly { type: string; seq: number; time: number; data: unknown }[]
    subscribe(fn: () => void): () => void
    /** 发送一条消息（session/prompt 语义；失败 reject）。 */
    prompt(text: string): Promise<void>
    /** 该会话 agent 是否在跑。 */
    running(): boolean
    rename(title: string): Promise<unknown>
  } | undefined
  /** conversation.input 的唯一写通道：转发 App 草稿桥（追加语义）。 */
  onDraftText?: (text: string) => void
  /** ctx.get('sidebarRight').isExpanded 的取值（右坞可见性）。 */
  isExpanded(): boolean
  toggleExpanded(): void
}

export interface DockContextBundle {
  ctx: Context
  /** dockkit 右栏的 slot 注册表（ui-sidebar-right/插件 tab body 都注册进这里）。 */
  slotCore: SlotCore
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
        // origin 取真实值（SessionSummary.origin）：只有 subagent 子会话才是
        // 'subagent'，fork 出的会话带 parentId 但 origin 为空。此前按
        // parentSessionId 一刀切标 subagent，会把 fork 会话混进任务管理/
        // 子代理检测（SubagentView.tsx:78、subagent-detect.ts:34）与侧边线程
        // 枚举（sidechat-core.ts:471）——2026-09-18 修正。
        ...(row.origin === undefined ? {} : { origin: row.origin }),
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
    // Side Chat 的转录/发送/运行态读取面（官方 ISessions.binding 的本环境等价）。
    binding(id: string) {
      if (options.getBinding === undefined) return undefined
      const binding = options.getBinding(id)
      if (binding === undefined) return undefined
      return {
        session: {
          rename(title: string): Promise<unknown> { return binding.rename(title) },
          prompt(content: readonly { type: 'text'; text: string }[], _mode?: string): Promise<unknown> {
            const text = content.map(part => part.text).join('\n')
            return binding.prompt(text)
          },
          subscribe(fn: () => void): () => void { return binding.subscribe(fn) },
          getSnapshot(): unknown { return { running: binding.running() } },
          // Side Chat 转录源（官方 Session.snapshotEvents 语义）：follow 流
          // 的持久事件窗口整窗给出；映射层的 seed-cut/delta 逻辑照常工作。
          snapshotEvents(): readonly { type: string; seq: number; time: number; data: unknown }[] {
            return binding.events()
          },
        },
      }
    },
    scope(): Context { return createSessionScopeContext() },
    // binding 已实现（见上）；openSubagent / subagentAddress / setSubagentCatalogOpen /
    // refreshSubagents：官方可选成员。subagent 目录在本环境无实现
    // （undefined = 面板内对应动作降级），不在此桩。
  }

  // ── locale：固定 zh 的 mini store + dockkit 词典面 ───────────────────────
  // t() 直读 zh 源字典（locales.ts:999 zh 是 source of truth），register 面
  // 兼容两种官方形态；bind(ns) 是 ui-sidebar-right 的 t 席（dockLabels、
  // guide 标题、PanelChrome 文案都从这走，locales.ts 词典在 host 注册）。
  const localeListeners = new Set<() => void>()
  const localeDicts = new Map<string, Record<string, Record<string, string>>>()
  const locale = {
    getSnapshot: () => ({ active: 'zh' }),
    subscribe(fn: () => void): () => void {
      localeListeners.add(fn)
      return () => { localeListeners.delete(fn) }
    },
    register(ns: string, lang: string | Record<string, Record<string, string>>, dict?: Record<string, string>): () => void {
      const before = localeDicts.get(ns)
      // better-sidebar 形态 (ns, lang, dict) 与 ui-sidebar-right 形态 (ns, {zh, en})。
      const next = typeof lang === 'string'
        ? { ...before, [lang]: dict ?? {} }
        : { ...before, ...lang }
      localeDicts.set(ns, next)
      return () => {
        if (before === undefined) localeDicts.delete(ns)
        else localeDicts.set(ns, before)
      }
    },
    bind(ns: string): (key: string, params?: Record<string, unknown>) => string {
      return (key, params) => {
        const table = localeDicts.get(ns)
        let text = table?.zh?.[key] ?? table?.en?.[key] ?? key
        if (params !== undefined) {
          for (const [name, value] of Object.entries(params)) {
            text = text.split(`{${name}}`).join(String(value))
          }
        }
        return text
      }
    },
  }

  // ── sidebarRight：官方 use-host-feeds.ts:36-77 的 NativeColumnFace ──────
  const sidebarRightFace = {
    isExpanded: () => options.isExpanded(),
    toggleExpanded: () => { options.toggleExpanded() },
  }

  // ── dockkit slots：官方 SlotCore + mini inject ──────────────────────────
  // SlotCore 本体零依赖（vendor/dsh-client-ui-slots 全量平移）；register 的
  // 静态类型约束由 host 调用点 cast 承担（SlotMap merge 来自平移包自身的
  // declare module）。'root' 是 SlotCore 构造时内置声明。
  const slotCore = new SlotCore()
  const slots = {
    register: (options: Record<string, unknown>, component: unknown): (() => void) =>
      slotCore.register(options as never, component as never),
    inject: (name: string, factory: () => (() => void) | Iterable<() => void>): (() => void) =>
      slotsInject(slotCore, name, factory),
    subscribe: (name: string, fn: () => void): (() => void) => slotCore.subscribe(name, fn),
    entries: (name: string): readonly unknown[] => slotCore.entries(name),
  }
  // ctx.inject 的可用性判定：dockkit 右栏的服务面（host provide）+ ctx 自身
  // 固有成员（callback 以 ctx 为注入面，ctx.get 可达全部）。
  const injectableNames = new Set(['betterSidebar', 'conversation', 'sidebarRight', 'sidebarRightTabs'])

  const ctx = {
    get: (name: string): unknown => {
      if (name === 'betterSidebar') return options.service
      if (name === 'conversation') return conversation
      // dockkit host provide 的 controller 优先；未挂载时回落 better-sidebar
      // 的窄屏停靠面（use-host-feeds.ts:66 的 NativeColumnFace）。
      if (name === 'sidebarRight') return provided.has(name) ? provided.get(name) : sidebarRightFace
      if (provided.has(name)) return provided.get(name)
      // betterLocale / remote：官方按 undefined 降级（Sidebar.tsx:125-129、index.tsx:348）。
      return undefined
    },
    provide: (name: string, factory: () => unknown): void => { provided.set(name, factory()) },
    effect: (fn: () => (() => void) | void, _label?: string): (() => void) => {
      const disposer = fn()
      return typeof disposer === 'function' ? disposer : () => {}
    },
    inject: (deps: readonly string[], callback: (injected: unknown) => (() => void) | void): { dispose: () => void } => {
      // 官方语义（cordis ctx.inject）：deps 全部可用时执行 callback（注入面
      // 是 ctx 自身，ctx.get 可达服务）；这里 host 时序可控，缺失依赖显式
      // warn 而不是静默等待（服务不会在本 mount 序列之后出现）。
      const missing = deps.filter(name => !provided.has(name) && !injectableNames.has(name))
      if (missing.length !== 0) {
        console.warn(`[magic-desktop] ctx.inject 依赖未就绪: ${missing.join(', ')}`)
        return { dispose: () => {} }
      }
      const disposer = callback(ctx)
      return { dispose: typeof disposer === 'function' ? disposer : () => {} }
    },
    slots,
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
    slotCore,
    refreshSessions: () => {
      for (const fn of [...sessionListeners]) fn()
    },
  }
}
