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
  TurnProcessNodeView,
  TurnTailNodeView,
  TURN_PROCESS_INDEPENDENT_KINDS,
  UnknownNodeView,
  UserMessageNodeView,
  createChatTranslate,
  createConversationTranslate,
  chatZh,
  commonZh,
  conversationZh,
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
} from '../vendor/dsh-chat/index.ts'
import { makeRenderToolview } from './tool-views.tsx'
import { Composer } from './Composer.tsx'
import type { ChatSessionStore } from './chat-store.ts'
import css from './ChatFlow.module.css'

const t: ChatTranslate = createChatTranslate(chatZh, commonZh)
const ct: ConversationTranslate = createConversationTranslate(conversationZh, commonZh)
const renderToolview = makeRenderToolview(ct)

const SESSION_ID = 'magic-local-session'
const CWD = 'd:/Harmess/Magic'

const openFile = (): void => {}
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
}

/** 一个 Chat 节点的座位：Turn-process 折叠推导 + 分发（照 ChatNodeSeat 逻辑移植）。 */
function Seat({ node, presentation, open, setOpenTurn, useChat, turnTail }: SeatProps) {
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

  const body = renderNode(node, { turnProcess, turnTail, useChat })
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
}

/** kind→组件分发（替代 renderSlot 键控注册表；base 货币 + node + t）。 */
function renderNode(node: ChatNode, ctx: RenderContext) {
  const base = { ...ownerBase, sessionId: SESSION_ID, t }
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
      if (ctx.turnProcess === undefined) return null
      return <TurnProcessNodeView {...base} node={node} turnProcess={ctx.turnProcess} />
    case 'turn-tail':
      return <TurnTailNodeView {...base} node={node} forkAt={forkAt} useChat={ctx.useChat} />
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
              />
            )
          })}
        </div>
      </div>
      <Composer onSubmit={text => store.submit(text)} />
    </div>
  )
}
