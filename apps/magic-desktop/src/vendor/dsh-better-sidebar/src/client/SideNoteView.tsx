// Magic 客户端补丁文件（2026-09-18，非上游源码）：
// dsh-sidenote 的 fork 式侧边聊天在 magic-desktop 的等价实现。上游 sidenote
// 插件（plugins/dsh-sidenote）依赖宿主的 ctx.sessions.binding（实时对话流），
// 本环境由 dock-context.ts 的 binding face（App 的 ChatSessionStore + web.follow）
// 等价供给。数据语义照 sidenote：fork 子会话（继承主会话历史）→ 独立对话 →
// 「整段回流」把结论写回主会话输入框 → 「保存为正式会话」fork 子会话转正。
// 转录渲染直接走 ChatFlow（主会话同款消息流/思考块/工具卡），轻于 sidenote 的
// 自绘面板而视觉一致。
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { IconNewChatOutline16, IconShareOutline16, StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '../context-types.ts'
import type { SessionScope } from './api.ts'
import type { SidebarTab } from './state.ts'
import { ChatSessionStore } from '../../../../conversation/chat-store.ts'
import { ChatFlow } from '../../../../conversation/ChatFlow.tsx'
import { buildComposerChips } from '../../../../conversation/composer-facts.ts'
import css from './SideNoteView.module.css'

/** fork 子会话 id 寄存在 tab.meta（刷新恢复；sidenote 的 meta.childId 同形）。 */
export function sideNoteChildIdOf(tab: SidebarTab): string | undefined {
  const meta = tab.meta as { childId?: unknown } | undefined
  return typeof meta?.childId === 'string' && meta.childId !== '' ? meta.childId : undefined
}

/**
 * fork 编排的跨挂载登记（key = 源会话 id + native tab id）。
 *
 * native 面下 tab 的 meta 寄存在 native record（内存），body 卸载即被
 * `records.drop` 清掉（tab-adapter.tsx:289）——StrictMode 双挂载必然经历一次
 * 卸载重挂，meta 随之丢失，次生「重挂 → 重新 fork 出孤儿子会话」（实测一次
 * 打开产生 3 个会话）。故在 meta 之外再登记两份模块级状态：in-flight 请求
 * （两次挂载共享同一个 fork，绝不重复发起）与已得结果（重挂后直接复用并补写
 * meta 自愈）。key 带源会话 id：native tab id 形如 `tab3`，跨会话可能重用。
 */
const forkInFlight = new Map<string, Promise<string>>()
const forkedChild = new Map<string, string>()
const sideNoteKey = (sessionId: string, tabId: string): string => `${sessionId}::${tabId}`

/** fork 式侧边聊天面板（sidenote SideChatPanel 的本环境等价）。 */
export function SideNoteView(props: {
  ctx: Context
  scope: SessionScope
  tab: SidebarTab
  visible?: boolean
  /** fork 子会话（dock-context 的 sessions.fork = App 的 web.fork）。 */
  onFork: (sessionId: string) => Promise<string>
  /** 子会话对话流读取面（dock-context 的 sessions.binding.session）。 */
  bindingOf: (id: string) => {
    events(): readonly { type: string; seq: number; time: number; data: unknown }[]
    subscribe(fn: () => void): () => void
    prompt(text: string): Promise<void>
    running(): boolean
  } | undefined
  /** 主会话运行态（父会话三态指示条的数据源）。 */
  parentRunning?: boolean
  /** 分身 composer 数据面（BuiltinTabOptions.sideNote.chat）：模型/命令/@候选，
      与主会话同源、按子会话 id 参数化——缺项诚实降级。 */
  chat?: {
    modelCatalog?: {
      key: string
      name: string
      tag?: string
      provider: string
      /** 该模型支持的思考档位（catalog reasoning.efforts，2026-09-19 思考级别）。 */
      efforts?: { id: string; name: string }[]
      defaultEffort?: string
    }[]
    sessionModelOf?: (sessionId: string) => { provider: string; model: string } | undefined
    selectModel?: (sessionId: string, provider: string, model: string, reasoningEffort?: string) => void
    runCommand?: (sessionId: string, line: string) => void
    mentionOptions?: { key: string; name: string; desc: string; glyph?: string; attach?: boolean }[]
    commandOptions?: { key: string; name: string; desc: string }[]
  }
}) {
  const { ctx, scope, tab, onFork, bindingOf, chat } = props
  const key = sideNoteKey(scope.sessionId, tab.id)
  // 读 childId：meta 优先，其次模块级已得结果（重挂后 meta 已被 records.drop
  // 清空时的自愈来源）。render 期读——随后被写成 state 驱动重渲。
  const [childId, setChildId] = useState<string | undefined>(() => sideNoteChildIdOf(tab) ?? forkedChild.get(key))
  const [forkError, setForkError] = useState<string | null>(null)
  const onForkRef = useRef(onFork)
  onForkRef.current = onFork
  // 已得结果是稳定的模块级事实：setChildId 让它进入本地 state（驱动后续渲染），
  // 若 meta 已丢（records.drop）则这里顺手补写自愈。
  useEffect(() => {
    if (childId === undefined) return
    forkedChild.set(key, childId)
    if (sideNoteChildIdOf(tab) === undefined) {
      ctx.get('betterSidebar')?.updateTab(tab.id, { meta: { childId } })
    }
  }, [childId, key, tab.id, ctx])

  // 首开编排（sidenote forkAndRegister）：
  // 1. childId 已在（meta 或模块级登记）→ 直接渲染，绝不重复 fork。
  // 2. 模块级 in-flight → 复用同一请求（StrictMode 双挂载/重渲共享）。
  // 3. 都无 → 发起 fork，并登记模块级 in-flight（防并发重复）与结果。
  // 用模块级 Map 而非组件 ref：ref 随实例销毁，而重挂的正是新实例——恰恰要在
  // 两实例间共享，就必须放到组件之外。
  useEffect(() => {
    if (childId !== undefined) return
    let cancelled = false
    const inflight = forkInFlight.get(key)
    const pending = inflight ?? onForkRef.current(scope.sessionId)
    if (inflight === undefined) forkInFlight.set(key, pending)
    pending
      .then((forked) => {
        if (cancelled) return
        if (forked === '') throw new Error('宿主未返回侧边会话 id')
        forkedChild.set(key, forked)
        forkInFlight.delete(key)
        setChildId(forked)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        forkInFlight.delete(key)
        setForkError(error instanceof Error ? error.message : String(error))
      })
    return () => { cancelled = true }
  }, [childId, key, scope.sessionId])

  // 子会话对话流（binding face；fork resolve 前为 undefined → forking 相位）。
  const binding = childId === undefined ? undefined : bindingOf(childId)
  const [childStore] = useState(() => new ChatSessionStore())
  // binding.events() 是 App store 的引用直读：把事件窗口灌进本地 fold 引擎，
  // 消息流/工具卡/思考块全部复用主会话渲染链。窗口整窗替换（follow 流语义）。
  // 订阅里整窗重灌 + 幂等采纳（adoptWindow 内部再 publish；每次调用都广播，
  // 由 store 去重不炸），保证 follow 异步到达的窗口能被重渲看到（events() 每次
  // 返回新数组，靠 useSyncExternalStore 无法触发——订阅是唯一重渲入口）。
  const events = binding?.events()
  // 订阅只负责「触发重渲」，不直接写 store：follow 的异步窗口到达时 bump 一次，
  // 重渲后由下面这条渲染期主路径（events → adoptWindow）统一灌入。让数据流单向
  // 可推：任何实例（含 StrictMode/HMR 重挂出的新实例）都能在自己的重渲里自愈，
  // 而不是依赖「订阅回调恰好绑在同一个 childStore 上」。
  const [, bump] = useState(0)
  useEffect(() => {
    if (binding === undefined) return
    return binding.subscribe(() => bump(v => v + 1))
  }, [binding])
  // 来源行（3099 实测「继承自主会话 · 截至第 N 轮 fork，共 M 条」）：只在首次
  // 灌窗时冻结——follow 快照含继承前缀，首灌即 fork 时刻的完整继承态。
  const [provenance, setProvenance] = useState<{ turns: number; count: number } | undefined>(undefined)
  useEffect(() => {
    if (events === undefined) return
    childStore.adoptWindow(events as never[])
    if (provenance === undefined) {
      const snap = childStore.getSnapshot().snapshot
      // binding 先于 follow 快照解析时首灌为空窗——等非空快照再冻结来源行。
      if (snap.order.length === 0) return
      let maxTurn = -1
      for (const key of snap.order) {
        const node = snap.nodes.get(key) as { location?: { kind?: string; turn?: { turn?: number } } } | undefined
        const turn = node?.location?.kind === 'turn' || node?.location?.kind === 'step' ? node.location.turn?.turn : undefined
        if (typeof turn === 'number') maxTurn = Math.max(maxTurn, turn)
      }
      setProvenance({ turns: maxTurn + 1, count: snap.order.length })
    }
  }, [childStore, events, provenance])

  const running = binding?.running() === true
  // 分身 composer 数据（2026-09-19，用户裁定「侧边=会话内的分身」）：与主会话
  // 同一套 PromptBar（模型/上下文圆环/访问模式/工作模式），数据按子会话 id 取。
  // childState 订阅让投影（permissions/contextPressure 等）随 follow 灌窗刷新。
  const childState = useSyncExternalStore(childStore.subscribe, childStore.getSnapshot)
  // 分身思考级别（2026-09-19 自适应）：当前模型条目（efforts 数据源）+ 投影记录的
  // effort（modelSelection wire 视图 {lastUsed, next}），回退模型默认档。
  const childSelection = (() => {
    const raw = childState.projections?.values?.modelSelection as
      | {
          next?: { provider?: string; model?: string; reasoningEffort?: string } | null
          lastUsed?: { provider?: string; model?: string; reasoningEffort?: string } | null
        }
      | undefined
    // wire 视图 next/lastUsed 均 nullable（model-selection-projection.ts:20-21），
    // 新子会话初始为 null——null ?? undefined 不会兜底，必须一并排除。
    const chosen = raw?.next ?? raw?.lastUsed
    return chosen != null ? chosen : undefined
  })()
  const childModelKey =
    childSelection?.provider !== undefined && childSelection?.model !== undefined
      ? `${childSelection.provider}:${childSelection.model}`
      : undefined
  const childModelEntry =
    childModelKey !== undefined ? chat?.modelCatalog?.find(option => option.key === childModelKey) : undefined
  const childEffort =
    childSelection?.reasoningEffort ?? childModelEntry?.defaultEffort ?? childModelEntry?.efforts?.[0]?.id
  const modelPicker = chat?.modelCatalog !== undefined && chat.modelCatalog.length > 0 && childId !== undefined
    ? {
        options: chat.modelCatalog,
        currentKey: (() => {
          const model = chat.sessionModelOf?.(childId)
          return model !== undefined ? `${model.provider}:${model.model}` : undefined
        })(),
        onChange: (key: string) => {
          const option = chat.modelCatalog?.find(m => m.key === key)
          if (option === undefined) return
          // 自适应（同主会话）：换模型时 effort 不兼容则落新模型默认档。
          const carriedEffort =
            childEffort !== undefined && option.efforts?.some(effort => effort.id === childEffort) === true
              ? childEffort
              : option.defaultEffort
          const model = chat.sessionModelOf?.(childId)
          if (model === undefined) return
          chat.selectModel?.(childId, model.provider, key.slice(model.provider.length + 1), carriedEffort)
        },
        efforts: childModelEntry?.efforts,
        currentEffort: childEffort,
        onEffortChange: (effortId: string) => {
          const model = chat.sessionModelOf?.(childId)
          if (model === undefined) return
          chat.selectModel?.(childId, model.provider, model.model, effortId)
        },
      }
    : undefined
  const composerChips = useMemo(
    () =>
      buildComposerChips({
        values: childState.projections?.values ?? {},
        recentEventData: type => childStore.recentEventData(type),
        onCommand: line => chat?.runCommand?.(childId ?? '', line),
        cwd: scope.cwd,
      }),
    [childState, childStore, chat, childId, scope.cwd],
  )

  /** 整段回流（sidenote reflow）：把子会话最终结论注入主会话输入框草稿。 */
  const reflow = useCallback(() => {
    if (childId === undefined) return
    const snapshot = childStore.getSnapshot().snapshot
    let last = ''
    for (const key of snapshot.order) {
      const node = snapshot.nodes.get(key)
      if (node === undefined || node.kind !== 'assistant') continue
      const data = (node as { data?: { text?: unknown } }).data
      if (typeof data?.text === 'string' && data.text.trim() !== '') last = data.text
    }
    const conversation = ctx.get('conversation') as { input?: { for: (c: Context) => { setDraft(text: string): void } | undefined } } | undefined
    const input = conversation?.input?.for(ctx)
    if (input === undefined || last === '') return
    input.setDraft(last)
  }, [childId, childStore, ctx])

  /** 保存为正式会话（sidenote D3a）：fork 子会话转正 → 打开 → 关本 tab。 */
  const promote = useCallback(() => {
    if (childId === undefined) return
    void (async () => {
      try {
        const promoted = await ctx.sessions.fork?.({ sessionId: childId })
        if (promoted !== undefined && promoted !== '') ctx.sessions.open?.(promoted)
        ctx.get('betterSidebar')?.closeTab(tab.id, { sessionId: scope.sessionId })
      } catch (error) {
        console.warn('[magic-desktop] 保存为正式会话失败:', error)
      }
    })()
  }, [childId, ctx, scope.sessionId, tab.id])

  if (forkError !== null) {
    return (
      <div className={css.root}>
        <div className={css.hero}>
          <div className={css.heroTitle}>无法创建侧边聊天</div>
          <div className={css.heroDesc}>{forkError}</div>
          <button type="button" className={css.primary} onClick={() => { forkInFlight.delete(key); forkedChild.delete(key); setForkError(null) }}>
            重试
          </button>
        </div>
      </div>
    )
  }
  if (childId === undefined || binding === undefined) {
    return (
      <div className={css.root}>
        <div className={css.hero}>
          <IconNewChatOutline16 size={22} />
          <div className={`${css.heroTitle} ${css.shimmer}`}>正在准备侧边聊天…</div>
          <div className={css.heroDesc}>从当前任务 fork，独立演进不回流主线</div>
        </div>
      </div>
    )
  }

  return (
    <div className={css.root}>
      {/* 主任务状态条（3099 parentStrip：点回主线） */}
      <button
        type="button"
        className={css.parentStrip}
        title="回到主任务"
        onClick={() => { ctx.sessions.open?.(scope.sessionId) }}
      >
        <StateDot state={props.parentRunning === true ? 'ongoing' : 'done'} />
        <span>{props.parentRunning === true ? '主线：运行中' : '主线：空闲'}</span>
      </button>
      {/* 工具行：分身专属动作（整段回流/保存为正式任务） */}
      <div className={css.toolbar}>
        <button type="button" className={css.toolAction} title="把最终结论写回主任务输入框" onClick={reflow}>
          <IconShareOutline16 size={14} />
          整段回流
        </button>
        <button type="button" className={css.toolAction} title="fork 子任务转正 → 打开 → 关本 tab" onClick={promote}>
          保存为正式任务
        </button>
        {running && (
          <span className={css.running}>
            <StateDot state="ongoing" />
            <span>侧边：运行中</span>
          </span>
        )}
      </div>
      {/* 来源行（继承溯源：截至第 N 轮 fork，共 M 条） */}
      {provenance !== undefined && (
        <div className={css.provenance}>
          继承自主任务 · 截至第 {provenance.turns} 轮 fork，共 {provenance.count} 条
        </div>
      )}
      <div className={css.body}>
        {/* 全会话分身（2026-09-19 用户裁定）：完整 ChatFlow——消息流/思考块/工具卡/
            composer（模型/上下文/访问模式/工作模式/语音/发送）/统计条与主会话一致，
            数据面按子会话 id 参数化（chat face）。 */}
        <ChatFlow
          store={childStore}
          sessionId={childId}
          cwd={scope.cwd}
          modelPicker={modelPicker}
          composerChips={composerChips}
          mentionOptions={chat?.mentionOptions}
          commandOptions={chat?.commandOptions}
          onSend={(text: string) => {
            void binding.prompt(text).catch(() => undefined)
          }}
          onOpenFile={() => undefined}
        />
      </div>
    </div>
  )
}
