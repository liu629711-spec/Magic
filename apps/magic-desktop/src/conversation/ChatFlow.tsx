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
import PromptBar from '../vendor/stitch-chat/PromptBar.tsx'
import { ComposerStats, TurnTailPills } from './TurnPills.tsx'
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

interface SeatProps {
  node: ChatNode
  presentation: ChatTurnProcessPresentation | undefined
  open: boolean
  setOpenTurn: (turn: number, open: boolean) => void
  useChat: UseChat
  turnTail: TurnTailChatData | undefined
  producedByTurn: ReadonlyMap<number, readonly string[]>
  fileMentions: ChatNodeOwnerProps['fileMentions']
}

/** 一个 Chat 节点的座位：Turn-process 折叠推导 + 分发（照 ChatNodeSeat 逻辑移植）。 */
function Seat({ node, presentation, open, setOpenTurn, useChat, turnTail, producedByTurn, fileMentions }: SeatProps) {
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

  const body = renderNode(node, { turnProcess, turnTail, useChat, producedByTurn, fileMentions })
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
    default: {
      const unreachable: never = node
      return unreachable
    }
  }
}

export function ChatFlow({ store }: { store: ChatSessionStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const { snapshot } = state

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

  return (
    <div className="vendor-dsh-chat flex h-full flex-col bg-surface text-on-surface">
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
              />
            )
          })}
          {/* 运行中状态行（2026-09-17 用户裁定）：毛笔画鼓楼动画 +「绘画中」，
              位置同 DSH TurnStatus（流末尾左对齐）；提交后等待回包期间常驻。 */}
          {awaitingReply && <InkTowerLoader />}
        </div>
      </div>
      <div className="shrink-0" data-composer-seat>
        <div className="mx-auto w-full max-w-[var(--dsh-chat-content-width)] px-4 pb-4 pt-3">
          {/* 换肤点（2026-09-17 对话区 v2）：输入条换画廊 PromptBar（demo=false 嵌入；
              听写占位=裁定 4、扫光保留=裁定 2）。回退时还原本目录 Composer.tsx。 */}
          <PromptBar demo={false} onSend={text => store.submit(text)} />
          {/* 会话统计条（2026-09-17 对齐 web 端 StatsPills）：无统计数据的会话不渲染。 */}
          <ComposerStats snapshot={snapshot} />
        </div>
      </div>
    </div>
  )
}
