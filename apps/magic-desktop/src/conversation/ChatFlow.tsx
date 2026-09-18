// Magic 自有客户端对话区壳（M1 静态）。
// 替代 DSH ui-chat 的 ChatView.tsx + ChatNodeSeat.tsx + renderSlot 注册表：
// 消息流容器 + kind→组件分发 + Turn-process 折叠逻辑（照 ChatNodeSeat.tsx:38-148
// 的逻辑移植；per-key 可观察份额改为整窗快照直读）。渲染组件全部来自 vendor/dsh-chat。
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  ChatTurnProcessProjector,
  AssistantNodeView,
  CommandNodeView,
  CompactionNodeView,
  ContextMessageNodeView,
  ManualCompactionNodeView,
  RetryNodeView,
  SystemPromptNodeView,
  ToolCallTree,
  TurnErrorNodeView,
  TurnMaxTokensNodeView,
  TurnTailNodeView,
  TURN_PROCESS_INDEPENDENT_KINDS,
  UnknownNodeView,
  UserMessageNodeView,
  createChatTranslate,
  createConversationTranslate,
  chatZh,
  commonZh,
  conversationZh,
  isSettledTool,
  useSearchableHidden,
} from '../vendor/dsh-chat/index.ts'
import type {
  ChatNode,
  ChatSnapshot,
  ChatTranslate,
  ChatTurnProcessPresentation,
  ConversationTranslate,
  TurnProcessOwnerProps,
  TurnTailChatData,
  UseChat,
  ChatNodeOwnerProps,
} from '../vendor/dsh-chat/index.ts'
import { makeRenderToolview } from './tool-views.tsx'
// 换肤点（2026-09-17 会话区对齐 Magic 组合 web 端）：折叠头换 magic-ceo-ui 已验收的
// TurnProcessSummary（codex 式「已处理 2m27s · 已探索 2 项」）。回退时还原
// MagicTurnProcessHeader（对齐画廊 ToolChips 的计数头）或 vendored TurnProcessNodeView。
import { MagicTurnProcessSummary, type MagicTurnProcessSummaryProps } from './MagicTurnProcessSummary.tsx'
// CEO 委派图卡（2026-09-18）：对话流里渲染 CEO 把任务派给成员的画布（节点/连线/状态徽标）。
import { CeoTeamGraph } from '../vendor/ceo/client/CeoTeamGraph.ts'
import type { CeoTeamGraphTaskBoard } from '../vendor/ceo/client/CeoTeamGraph.ts'
import { CeoDecisionDock } from '../vendor/ceo/client/CeoDecisionDrawer.ts'
import { ceoT } from '../vendor/ceo/client/dict.ts'
import {
  getTaskBoardSnapshot,
  reloadTaskBoard,
  subscribeTaskBoard,
  type TaskBoardViewApi,
} from '../vendor/ceo/client/task-board-store.ts'
import { leadSessionIdOf, viewAgentTeam } from '../adapters/dsh-web/agent-teams.ts'
import PromptBar, { type PromptBarChips, type PromptBarMention } from '../vendor/stitch-chat/PromptBar.tsx'
import { ComposerStats, TurnTailPills } from './TurnPills.tsx'
import { SessionHeader, type SessionHeaderData } from './SessionHeader.tsx'
import { TrajectoryView } from './TrajectoryView.tsx'
import { SelectionAnnotation, AnnotationChips, composeWithAnnotations } from './SelectionAnnotation.tsx'
import { InkTowerLoader } from './InkTowerLoader.tsx'
import { ProducedFiles } from './ProducedFiles.tsx'
import { MagicFeedbackActions } from './MagicFeedbackActions.tsx'
import type { ChatSessionStore } from './chat-store.ts'
import css from './ChatFlow.module.css'

const t: ChatTranslate = createChatTranslate(chatZh, commonZh)
const ct: ConversationTranslate = createConversationTranslate(conversationZh, commonZh)
const renderToolview = makeRenderToolview(ct)

const SESSION_ID = 'magic-local-session'
const CWD = 'd:/Harmess/Magic'

const openFile = (_path: string, _options?: unknown): void => {}
const openSkill = (_name: string): void => {}
const inspectCall = (_callId: string): void => {}
const forkAt = (_seq: number): void => {}
const loadImage = async (): Promise<string> => ''
const renderMessageImages = (): null => null
const fileMentions = (): undefined => undefined

/** owner 货币基座（M1 静态：动作皆占位，SDK 接线后逐个换成真实实现）。 */
const ownerBase = {
  cwd: CWD,
  openSkill,
  openFile,
  inspectCall,
  forkAt,
  loadImage,
  renderMessageImages,
  fileMentions,
} as const

function turnOf(node: ChatNode): number | undefined {
  const location = node.location
  return location.kind === 'turn' || location.kind === 'step' ? location.turn.turn : undefined
}

/** 在消息流容器内按键找 Seat 节点（按属性遍历，免去 CSS.escape 的转义依赖）。 */
function findFlowElement(container: HTMLElement, key: string): HTMLElement | null {
  for (const element of container.querySelectorAll<HTMLElement>('[data-chat-flow-key]')) {
    if (element.dataset.chatFlowKey === key) return element
  }
  return null
}

interface SeatProps {
  node: ChatNode
  presentation: ChatTurnProcessPresentation | undefined
  open: boolean
  setOpenTurn: (turn: number, open: boolean) => void
  useChat: UseChat
  turnTail: TurnTailChatData | undefined
  producedByTurn: ReadonlyMap<number, readonly string[]>
  fileMentions: ChatNodeOwnerProps['fileMentions']
  /** CEO 图卡接线（2026-09-18）：整窗透传给 renderNode。 */
  ceo: Pick<RenderContext, 'sessionId' | 'taskBoard' | 'openWorkspace'>
}

/** 一个 Chat 节点的座位：Turn-process 折叠推导 + 分发（照 ChatNodeSeat 逻辑移植）。 */
function Seat({ node, presentation, open, setOpenTurn, useChat, turnTail, producedByTurn, fileMentions, ceo }: SeatProps) {
  const spec = presentation?.spec
  const processOpen = spec !== undefined && open
  const setOpenThis = useCallback((next: boolean) => {
    if (spec !== undefined && spec.answerStep !== null) setOpenTurn(spec.turn, next)
  }, [spec, setOpenTurn])
  const processWindowReady = presentation !== undefined && spec !== undefined
    && spec.answerAnchorSeq !== null
    && presentation.turn === spec.turn
    && presentation.turnClosed
  const processMember = spec !== undefined && processWindowReady
    && !TURN_PROCESS_INDEPENDENT_KINDS.has(node.kind)
    && node.anchorSeq >= spec.processStartSeq
    && spec.answerAnchorSeq !== null
    && node.anchorSeq < spec.answerAnchorSeq
  const processAnswer = spec !== undefined && processWindowReady
    && node.kind === 'assistant-step'
    && node.data.step === spec.answerStep
  const ownsDisclosure = node.kind === 'turn-process' || processAnswer
  const foldable = processWindowReady && spec !== undefined
    && (processMember
      || (ownsDisclosure
        && (presentation.hasExternalProcess || spec.inlineReasoning)))
  const turnProcess: TurnProcessOwnerProps | undefined = spec === undefined
    ? undefined
    : { spec, foldable, open: processOpen, setOpen: setOpenThis }
  const controllerInactive = node.kind === 'turn-process' && !foldable
  const compactAnswer = presentation !== undefined && processAnswer && foldable
    && presentation.compactAnswer && !processOpen
  const processHidden = controllerInactive || (foldable && processMember && !processOpen)
  const revealProcess = useCallback(() => {
    if (processMember) setOpenThis(true)
  }, [processMember, setOpenThis])
  const wrapperRef = useSearchableHidden(processHidden, revealProcess)

  const body = renderNode(node, { turnProcess, turnTail, useChat, producedByTurn, fileMentions, ...ceo })
  return (
    <div
      ref={wrapperRef}
      className={css.flowItem}
      data-chat-anchor-key={node.key}
      data-chat-flow-key={node.key}
      data-chat-turn={turnOf(node)}
      data-turn-process-member={processMember || undefined}
      data-turn-process-hidden={processHidden || undefined}
      data-turn-process-answer={compactAnswer || undefined}
    >
      {body}
    </div>
  )
}

interface RenderContext {
  turnProcess: TurnProcessOwnerProps | undefined
  turnTail: TurnTailChatData | undefined
  useChat: UseChat
  producedByTurn: ReadonlyMap<number, readonly string[]>
  fileMentions: ChatNodeOwnerProps['fileMentions']
  /** CEO 图卡接线（2026-09-18）：当前会话 id、任务板句柄、打开右坞团队 tab 回调。 */
  sessionId?: string
  taskBoard: CeoTeamGraphTaskBoard
  openWorkspace: () => void
}

/** kind→组件分发（替代 renderSlot 键控注册表；base 货币 + node + t）。 */
function renderNode(node: ChatNode, ctx: RenderContext) {
  const base = { ...ownerBase, sessionId: SESSION_ID, t, fileMentions: ctx.fileMentions }
  switch (node.kind) {
    case 'user':
    case 'steering':
      return <UserMessageNodeView {...base} node={node} />
    case 'context':
      return <ContextMessageNodeView {...base} node={node} />
    case 'system-prompt':
      return <SystemPromptNodeView node={node} t={t} />
    case 'assistant-step':
      return (
        <AssistantNodeView
          {...base}
          node={node}
          turnTail={ctx.turnTail}
          turnProcess={ctx.turnProcess}
        />
      )
    case 'tool-call':
      return (
        <ToolCallTree
          node={node}
          cwd={CWD}
          openFile={openFile}
          inspectCall={inspectCall}
          loadImage={loadImage}
          renderToolview={renderToolview}
          t={ct}
        />
      )
    case 'command':
      return <CommandNodeView {...base} node={node} />
    case 'manual-compaction':
      return <ManualCompactionNodeView {...base} node={node} />
    case 'compaction':
      return <CompactionNodeView {...base} node={node} />
    case 'model-retry':
      return <RetryNodeView {...base} node={node} />
    case 'turn-error':
      return <TurnErrorNodeView {...base} node={node} />
    case 'turn-max-tokens':
      return <TurnMaxTokensNodeView {...base} node={node} />
    case 'turn-process':
      // 换肤点（2026-09-17 会话区对齐 Magic 组合 web 端）：折叠头换 magic-ceo-ui
      // 已验收的 TurnProcessSummary（codex 式摘要行）；展开后的工具卡保持 DSH
      // ToolCallTree。回退时还原本目录 MagicTurnProcessHeader 或 vendored TurnProcessNodeView。
      if (ctx.turnProcess === undefined) return null
      return (
        <MagicTurnProcessSummary
          node={node as ChatNode<'turn-process'>}
          turnProcess={ctx.turnProcess}
          useChat={ctx.useChat as MagicTurnProcessSummaryProps['useChat']}
        />
      )
    case 'turn-tail': {
      // 轮尾扩展（2026-09-17 会话区对齐 web 端）：「本次产出」行挂 renderTurnTailSlot 缝，
      // 反馈按钮对挂 renderAssistantActions 缝，用量/用时 pill 挂 usageAction 缝。
      const tailLocation = node.location
      const tailTurn = tailLocation.kind === 'turn' ? tailLocation.turn : undefined
      const tailData = (node as ChatNode<'turn-tail'>).data
      const tailTurnNumber = tailTurn?.turn
      const produced = tailTurnNumber === undefined ? [] : ctx.producedByTurn.get(tailTurnNumber) ?? []
      return (
        <TurnTailNodeView
          {...base}
          node={node}
          forkAt={forkAt}
          useChat={ctx.useChat}
          renderTurnTailSlot={produced.length === 0 ? undefined : () => (
            <ProducedFiles matched={produced} onOpenFile={openFile} />
          )}
          renderAssistantActions={tailData.closing?.finalNode.messageId === undefined
            ? undefined
            : () => <MagicFeedbackActions />}
          usageAction={(
            <TurnTailPills
              turnTail={tailData}
              startTime={tailTurn?.start?.time}
              endTime={tailTurn?.end?.time}
            />
          )}
        />
      )
    }
    case 'unknown':
      return <UnknownNodeView {...base} node={node} />
    case 'ceo-team':
      // CEO 委派图卡：vendor/ceo/client/CeoTeamGraph。props.node.data 即 projectCeoTeam
      // 产出的 CeoTeamView；接线（2026-09-18）：当前会话 id、任务板句柄（画布任务泳道
      // 真实数据源）、打开右坞团队 tab 回调（点成员/CEO 节点）。
      return (
        <CeoTeamGraph
          node={node as ChatNode<'ceo-team'>}
          sessionId={ctx.sessionId}
          openWorkspace={ctx.openWorkspace}
          taskBoard={ctx.taskBoard}
        />
      )
    default: {
      const unreachable: never = node
      return unreachable
    }
  }
}

/** 对话区顶部 tab（M5，2026-09-18）：对话=现有消息流；轨迹=事件时间线表格。 */
type ConversationTab = 'chat' | 'trajectory'

/** tab 条：文字 tab + 底边高亮（跟随 stitch，样式思路同 InspectorPanel/RightDock 的 tab）。 */
function ConversationTabs({ active, onSelect }: {
  active: ConversationTab
  onSelect: (tab: ConversationTab) => void
}) {
  const tabs: { id: ConversationTab; label: string }[] = [
    { id: 'chat', label: '对话' },
    { id: 'trajectory', label: '轨迹' },
  ]
  return (
    <div
      data-conversation-tabs
      className="h-10 shrink-0 select-none border-b border-surface-container-highest bg-surface px-4"
    >
      <div className="mx-auto flex h-full w-full max-w-[var(--dsh-chat-content-width)] items-center gap-1">
        {tabs.map(item => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              type="button"
              data-conversation-tab={item.id}
              data-active={isActive || undefined}
              onClick={() => onSelect(item.id)}
              className={`flex h-full items-center border-b-2 px-3 text-[12.5px] transition-colors cursor-pointer ${
                isActive
                  ? 'border-primary font-medium text-on-surface'
                  : 'border-transparent text-outline hover:text-on-surface'
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ChatFlow({ store, onSend, modelPicker, composerChips, mentionOptions, commandOptions, draftInjection, sessionHeader, onOpenSession, sessionId, onOpenCeoWorkspace, promptToSession }: {
  store: ChatSessionStore
  onSend?: (text: string) => void
  /** 会话头数据（M4，2026-09-18）：App 从真实会话列表算出；mock/无数据时不传 → 不渲染头。 */
  sessionHeader?: SessionHeaderData
  /** 会话头层级/子代理导航：切换会话（App 的 openSession）。 */
  onOpenSession?: (id: string) => void
  /** CEO 图卡接线（2026-09-18）：当前会话 id（agentTeams 路由 + 快照/名册会话守卫）。 */
  sessionId?: string
  /** 打开右坞「团队」tab（图卡点成员/CEO 节点）。 */
  onOpenCeoWorkspace?: () => void
  /** 向当前会话发一条消息（决策抽屉/成员干预）。失败时抛错，由调用方转成错误文案。 */
  promptToSession?: (text: string) => Promise<void>
  /** 模型选择器（真实 runtime：session/modelCatalog + selectModel；缺省=画廊 mock） */
  modelPicker?: {
    options: { key: string; name: string; tag?: string }[]
    currentKey?: string
    onChange: (key: string) => void
  }
  /** 输入条三件套（2026-09-18）：访问模式 / 工作模式 / 上下文用量 */
  composerChips?: PromptBarChips
  /** 输入条 @ 候选与 / 命令（2026-09-18：真实技能/命令数据） */
  mentionOptions?: PromptBarMention[]
  commandOptions?: { key: string; name: string; desc: string }[]
  /** 右坞 @引用草稿注入（2026-09-18）：App 持注入 token，透传给 PromptBar 消费。 */
  draftInjection?: { seq: number; text: string } | null
}) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const { snapshot } = state

  // CEO 图卡接线（2026-09-18）：任务板读接口 → lead 会话（成员子会话映射到父会话），
  // 形状对齐官方 remote.agentTeams.view（agent-teams.ts 的 viewAgentTeam 走 dshRpc）。
  const leadParentId = sessionHeader?.parent?.id
  const taskBoardApi = useMemo<TaskBoardViewApi>(() => ({
    view: async (sid: string) => {
      try {
        const value = await viewAgentTeam(leadSessionIdOf(sid, leadParentId))
        return { ok: true as const, value: { tasks: value.tasks } }
      } catch (cause) {
        return { ok: false as const, error: { message: cause instanceof Error ? cause.message : String(cause) } }
      }
    },
  }), [leadParentId])
  // 句柄引用必须稳定：CeoTeamGraph 用 [props.taskBoard] 作为 reload 依赖，
  // 每次渲染新建对象会触发 reload 循环。
  const taskBoard = useMemo<CeoTeamGraphTaskBoard>(() => ({
    subscribe: subscribeTaskBoard,
    getSnapshot: getTaskBoardSnapshot,
    reload: () => {
      if (sessionId !== undefined && sessionId.length > 0) void reloadTaskBoard(taskBoardApi, sessionId)
    },
    // 只读（PRD-04 §12）：任务生命周期由智能体驱动，画布不提供建任务入口。
    create: async () => { throw new Error('任务板只读：任务生命周期由智能体驱动') },
  }), [sessionId, taskBoardApi])
  // 图卡点成员/CEO 节点 → 打开右坞团队 tab（App 提供）。
  const openCeoWorkspace = useCallback(() => { onOpenCeoWorkspace?.() }, [onOpenCeoWorkspace])
  const ceo = useMemo(
    () => ({ sessionId, taskBoard, openWorkspace: openCeoWorkspace }),
    [sessionId, taskBoard, openCeoWorkspace],
  )
  // 决策抽屉发送：prompt 当前会话；成功/失败都回成 { ok } 信封（对齐原 register.ts 语义）。
  const sendDecision = useMemo(() => {
    if (promptToSession === undefined) return undefined
    return async (text: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        await promptToSession(text)
        return { ok: true }
      } catch (cause) {
        return { ok: false, error: cause instanceof Error ? cause.message : String(cause) }
      }
    }
  }, [promptToSession])

  // Turn-process 呈现投影（幂等；每次快照变更重算全部已加载轮）。
  const projectorRef = useRef<ChatTurnProcessProjector | null>(null)
  if (projectorRef.current === null) projectorRef.current = new ChatTurnProcessProjector()
  const projector = useMemo(() => {
    projectorRef.current?.replace(snapshot.order, snapshot.locations, snapshot.nodes)
    return projectorRef.current
  }, [snapshot])

  // 轮尾数据（assistant-step 的 mentions 闭合链需要）。
  const turnTails = useMemo(() => {
    const map = new Map<number, TurnTailChatData>()
    for (const node of snapshot.nodes.values()) {
      if (node.kind === 'turn-tail') {
        const data = (node as ChatNode<'turn-tail'>).data
        map.set(data.turn, data)
      }
    }
    return map
  }, [snapshot])

  // 「本次产出」按轮推导（edit/write 类工具目标路径；SDK 接线后换 deliverables 投影）。
  const producedByTurn = useMemo(() => {
    const map = new Map<number, string[]>()
    for (const node of snapshot.nodes.values()) {
      if (node.kind !== 'tool-call') continue
      const chatNode = node as ChatNode
      const turn = turnOf(chatNode)
      if (turn === undefined) continue
      const block = (chatNode as ChatNode<'tool-call'>).data.root
      // root 是完整生命周期：落定态名字在 call 里，运行态在顶层（isSettledTool 守卫）。
      const name = isSettledTool(block) ? block.call?.name ?? '' : block.name
      const argsRaw = isSettledTool(block) ? block.call?.argsRaw ?? '' : block.argsRaw
      if (!/(edit|write|patch|apply|str-replace)/.test(name.toLowerCase())) continue
      let path: unknown = null
      try {
        const args: unknown = JSON.parse(argsRaw)
        if (args !== null && typeof args === 'object') {
          const record = args as Record<string, unknown>
          path = record.file_path ?? record.path ?? record.file
        }
      } catch {
        path = null
      }
      if (typeof path !== 'string' || path.length === 0) continue
      const entry = map.get(turn)
      if (entry === undefined) map.set(turn, [path])
      else if (!entry.includes(path)) entry.push(path)
    }
    return map
  }, [snapshot])

  // 正文文件引用 chip（2026-09-17 收尾）：把本轮产出路径解析进 MarkdownText 的
  // inline-code 提及缝——正文里提到 `App.tsx` 等即变为可点文件 chip。
  const fileMentions = useMemo<ChatNodeOwnerProps['fileMentions']>(() => {
    return (owner) => {
      const paths = producedByTurn.get(owner.turn) ?? []
      if (paths.length === 0) return undefined
      return {
        resolve: (value: string) => {
          const hit = paths.find(p => p === value
            || p.endsWith(`/${value}`)
            || p.slice(Math.max(0, p.lastIndexOf('/') + 1)) === value)
          if (hit === undefined) return undefined
          const name = hit.slice(Math.max(0, hit.lastIndexOf('/') + 1))
          return { open: () => { openFile(hit) }, label: name, title: hit }
        },
      }
    }
  }, [producedByTurn])

  // Turn-process 展开状态（DSH 存 chat store；本地为组件状态，按轮）。
  const [openTurns, setOpenTurnsState] = useState<ReadonlySet<number>>(() => new Set())
  const setOpenTurn = useCallback((turn: number, open: boolean) => {
    setOpenTurnsState(prev => {
      const next = new Set(prev)
      if (open) next.add(turn)
      else next.delete(turn)
      return next
    })
  }, [])

  const useChat = useCallback(((selector: (snapshot: ChatSnapshot) => unknown) =>
    selector(snapshot)) as UseChat, [snapshot])

  // 贴底滚动：用户不在底部附近时让位，新事件到来且原本贴底则跟随。
  const flowRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  useEffect(() => {
    const el = flowRef.current
    if (el !== null && stickRef.current) el.scrollTop = el.scrollHeight
  }, [snapshot])

  const awaitingReply = state.awaitingReply

  // 对话 / 轨迹 tab（M5）：本地状态；轨迹视图读整窗持久事件（随快照变更重算）。
  const [tab, setTab] = useState<ConversationTab>('chat')
  const eventEntries = useMemo(() => store.eventEntries(), [store, snapshot])
  // 轨迹行点击跳转（M5）：待处理的目标事件 seq；切回对话 tab 后由下方 effect 完成定位。
  const [jumpSeq, setJumpSeq] = useState<number | null>(null)
  const jumpToEvent = useCallback((seq: number) => {
    setJumpSeq(seq)
    setTab('chat')
  }, [])
  useEffect(() => {
    if (jumpSeq === null || tab !== 'chat') return
    setJumpSeq(null)
    const flowEl = flowRef.current
    if (flowEl === null) return
    stickRef.current = false // 跳转期间停用贴底跟随，避免新事件把视口拉回底部
    // 「事件 seq ≤ 目标 seq 的最近可见节点」= 渲染顺序中 anchorSeq 不超过目标的最大者。
    // 目标早于全部节点（如 permission/preset 之类无对应消息的种子事件）时落到首个节点，
    // 这样轨迹首行也能滚到消息流最前并高亮，而不是莫名滚到底。
    let targetKey: string | null = null
    let targetTurn: number | null = null
    let bestSeq = Number.NEGATIVE_INFINITY
    let firstKey: string | null = null
    let firstTurn: number | null = null
    for (const key of snapshot.order) {
      const node = snapshot.nodes.get(key)
      if (node === undefined || node.visibility === 'hidden') continue
      const chatNode = node as ChatNode
      if (firstKey === null) {
        firstKey = key
        firstTurn = turnOf(chatNode) ?? null
      }
      if (node.anchorSeq <= jumpSeq && node.anchorSeq >= bestSeq) {
        bestSeq = node.anchorSeq
        targetKey = key
        targetTurn = turnOf(chatNode) ?? null
      }
    }
    if (targetKey === null) {
      targetKey = firstKey
      targetTurn = firstTurn
    }
    if (targetKey === null) {
      // 没有任何可见节点：静默滚到消息流底部。
      flowEl.scrollTop = flowEl.scrollHeight
      return
    }
    const key = targetKey
    const revealAndScroll = () => {
      const element = findFlowElement(flowEl, key)
      if (element === null) {
        flowEl.scrollTop = flowEl.scrollHeight
        return
      }
      element.scrollIntoView({ block: 'start', behavior: 'smooth' })
      element.classList.add(css.jumpHighlight)
      window.setTimeout(() => element.classList.remove(css.jumpHighlight), 1200)
    }
    const element = findFlowElement(flowEl, key)
    // 命中节点若被折叠的轮过程隐藏（hidden="until-found"）先展开所属轮，再等一帧滚动。
    if (element !== null && element.hasAttribute('hidden') && targetTurn !== null) {
      setOpenTurn(targetTurn, true)
      window.requestAnimationFrame(() => window.requestAnimationFrame(revealAndScroll))
      return
    }
    revealAndScroll()
  }, [jumpSeq, tab, snapshot, setOpenTurn])
  // 划选注释（M8）：待发送的注释文本（发送后拼成引用块并清空）。
  const [annotations, setAnnotations] = useState<string[]>([])

  return (
    <div className="vendor-dsh-chat flex h-full flex-col bg-surface text-on-surface">
      {sessionHeader !== undefined && (
        <SessionHeader data={sessionHeader} onOpenSession={onOpenSession} />
      )}
      <ConversationTabs active={tab} onSelect={setTab} />
      {tab === 'trajectory' ? (
        <TrajectoryView entries={eventEntries} onJump={jumpToEvent} />
      ) : (
        <>
          <div
            ref={flowRef}
            data-conversation-scroll
            className={css.flow}
            onScroll={event => {
              const el = event.currentTarget
              stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
            }}
          >
            <div className={css.flowInner} data-chat-flow>
              {snapshot.order.map(key => {
                const node = snapshot.nodes.get(key)
                if (node === undefined || node.visibility === 'hidden') return null
                const chatNode = node as ChatNode
                const turn = turnOf(chatNode)
                return (
                  <Seat
                    key={key}
                    node={chatNode}
                    presentation={projector?.get(chatNode)}
                    open={turn !== undefined && openTurns.has(turn)}
                    setOpenTurn={setOpenTurn}
                    useChat={useChat}
                    turnTail={turn === undefined ? undefined : turnTails.get(turn)}
                    producedByTurn={producedByTurn}
                    fileMentions={fileMentions}
                    ceo={ceo}
                  />
                )
              })}
              {/* 运行中状态行（2026-09-17 用户裁定）：毛笔画鼓楼动画 +「绘画中」，
                  位置同 DSH TurnStatus（流末尾左对齐）；提交后等待回包期间常驻。 */}
              {awaitingReply && <InkTowerLoader />}
            </div>
          </div>
          {/* 划选注释（M8）：监听消息流内划选，浮出「添加注释」按钮。 */}
          <SelectionAnnotation
            containerRef={flowRef}
            onAdd={text => setAnnotations(prev => [...prev, text])}
          />
          <div className="shrink-0" data-composer-seat>
            <div className="mx-auto w-full max-w-[var(--dsh-chat-content-width)] px-4 pb-4 pt-3">
              {/* 注释胶囊行（M8）：输入条上方、PromptBar 之前（无注释不渲染）。 */}
              <AnnotationChips
                annotations={annotations}
                onRemove={index => setAnnotations(prev => prev.filter((_, i) => i !== index))}
              />
              {/* 决策抽屉（2026-09-18 CEO 图卡接入）：有「待你拍板」成员时，在输入条上方
                  浮出抽屉（数据来自 selection store 的 attention 项）；发送 → prompt 当前会话。 */}
              <CeoDecisionDock sessionId={sessionId} sendDecision={sendDecision} t={ceoT} />
              {/* 换肤点（2026-09-17 对话区 v2）：输入条换画廊 PromptBar（demo=false 嵌入；
                  听写占位=裁定 4、扫光保留=裁定 2）。回退时还原本目录 Composer.tsx。 */}
              <PromptBar
                demo={false}
                onSend={text => {
                  // 划选注释（M8）：注释以引用块拼在用户文本前，发送后清空。
                  const payload = composeWithAnnotations(text, annotations)
                  setAnnotations([])
                  if (onSend !== undefined) onSend(payload);
                  else store.submit(payload);
                }}
                modelOptions={modelPicker?.options}
                modelKey={modelPicker?.currentKey}
                onModelChange={modelPicker?.onChange}
                composerChips={composerChips}
                mentionOptions={mentionOptions}
                commandOptions={commandOptions}
                draftInjection={draftInjection}
              />
              {/* 会话统计条（2026-09-17 对齐 web 端 StatsPills）：无统计数据的会话不渲染。 */}
              <ComposerStats snapshot={snapshot} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
