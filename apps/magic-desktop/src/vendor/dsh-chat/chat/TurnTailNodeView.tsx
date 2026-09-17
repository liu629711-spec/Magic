// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/TurnTailNodeView.tsx
// （剥离点：① ui-slots 的 renderSlotChain('conversation.chat.turnTail') /
// renderSlot('conversation.chat.assistant-actions') 键控分发收敛为可选纯 prop
// renderTurnTailSlot / renderAssistantActions，缺省不渲染（与源无插槽注册时
// 返回 null 一致）；② TurnUsagePanel / TurnTimePanel 统计弹窗未搬（牵
// stat-dialog 门户机制），其 IconActions 触发器收敛为可选纯 prop usageAction，
// 缺省不渲染，runMs 推导随弹窗一并剥离；③ PropsRuntime 注入的 useChat 选择器
// 改为必传纯 prop；④ TurnTailOwnerProps.turn 按目标契约收敛为轮号 number
// （源为 TurnLocation 对象）。其余渲染逻辑零改动。）

import { memo, type ReactNode } from 'react'
import type {
  AssistantActionOwnerProps, ChatNodeViewProps, TurnTailOwnerProps, UseChat,
} from '../contract/slots.ts'
import { MessageIconActions } from './MessageIconActions.tsx'
import { assistantText } from './turn-assistant.ts'
import css from './TurnTailNodeView.module.css'

/** 轮尾渲染器 props：ChatNodeViewProps 外加强化的纯 props 面。 */
export interface TurnTailNodeViewProps extends ChatNodeViewProps<'turn-tail'> {
  /** Chat 目标快照选择器（原 PropsRuntime 注入的 useChat，壳按需下传）。 */
  useChat: UseChat
  /** 轮尾扩展链分发（原 renderSlotChain('conversation.chat.turnTail')）。 */
  renderTurnTailSlot?: ((owner: TurnTailOwnerProps) => ReactNode | null | undefined) | undefined
  /** Assistant 动作分发（原 renderSlot('conversation.chat.assistant-actions')）。 */
  renderAssistantActions?: ((owner: AssistantActionOwnerProps) => ReactNode | null | undefined) | undefined
  /** 轮统计 IconActions 触发器（原内置 TurnUsagePanel / TurnTimePanel，未搬）。 */
  usageAction?: ReactNode
}

/** Turn-local actions and feature tail over the Location index, independent of Assistant placement. */
export const TurnTailNodeView = memo(function TurnTailNodeView({
  node, openFile, forkAt, useChat, renderTurnTailSlot, renderAssistantActions, usageAction, t,
}: TurnTailNodeViewProps) {
  const data = node.data
  const hasLaterChatNode = useChat(snapshot =>
    snapshot.locations.getTurn(data.turn).at(-1) !== node.key)
  const isLatestTurn = useChat(snapshot => snapshot.timeline.turnOrder.at(-1) === data.turn)
  const turn = node.location.kind === 'turn' || node.location.kind === 'step'
    ? node.location.turn
    : undefined
  if (turn === undefined) return null
  const closing = data.closing
  // 目标契约收敛：TurnTailOwnerProps.turn 为轮号。
  const owner: TurnTailOwnerProps = { turn: turn.turn, seq: closing?.finalNode.seq ?? data.seq, openFile }
  const tail = renderTurnTailSlot?.(owner) ?? null
  if (closing === null) return tail === null ? null : <div className={css.root}>{tail}</div>
  // （runMs 推导随 TurnUsagePanel / TurnTimePanel 统计弹窗剥离；轮统计触发器
  // 改由壳经可选 prop usageAction 提供。）
  // Interruption-frozen partials carry no messageId, so they address no
  // durable message and contribute no per-message actions.
  const messageId = closing.finalNode.messageId
  const assistantActions = messageId === undefined || renderAssistantActions === undefined
    ? null
    : renderAssistantActions({ messageId })
  return (
    <div
      className={css.root}
      data-turn-tail={data.turn}
      data-actions-reveal={isLatestTurn ? 'always' : 'hover'}
    >
      {tail}
      <MessageIconActions
        text={assistantText(closing.blocks)}
        time={closing.time}
        clock="end"
        onBranch={() => { forkAt(closing.finalNode.seq) }}
        branchUnavailable={data.branchUnavailable || hasLaterChatNode}
        className={css.actions}
        extraActions={assistantActions}
        usageAction={usageAction}
        t={t}
      />
    </div>
  )
})
