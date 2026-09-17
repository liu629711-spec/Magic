// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/AssistantNodeView.tsx
// （剥离：PropsRuntime 注入的 useTurnData('turn-tail') hook 收敛为可选纯 prop
// turnTail；缺省视为该轮无 turn-tail 数据，mentions 不渲染——与源 hook 返回
// undefined 时行为一致。TurnTailOwnerProps.turn 按目标契约收敛为轮号 number
// （源为 TurnLocation 对象）。其余渲染逻辑零改动。）

import { memo, useCallback, useMemo } from 'react'
import type { ChatNodeViewProps, TurnTailOwnerProps } from '../contract/slots.ts'
import type { TurnTailChatData } from '../contract/chat-nodes.ts'
import { AssistantMarkdown } from './AssistantMarkdown.tsx'

/** Assistant step 渲染器 props：ChatNodeViewProps 外加可选 turn-tail 数据。 */
export interface AssistantNodeViewProps extends ChatNodeViewProps<'assistant-step'> {
  /** 所属轮的 turn-tail 位置数据（原 useTurnData('turn-tail')，壳按需下传）。 */
  turnTail?: TurnTailChatData | undefined
}

/** Streaming, settled, and interrupted Assistant states share one keyed renderer instance. */
export const AssistantNodeView = memo(function AssistantNodeView({
  node, turnTail, turnProcess, openFile, renderMessageImages, fileMentions, t,
}: AssistantNodeViewProps) {
  const data = node.data
  const turn = node.location.kind === 'turn' || node.location.kind === 'step'
    ? node.location.turn
    : undefined
  const tail = turnTail
  const owner = useMemo<TurnTailOwnerProps | undefined>(() => {
    if (turn?.status !== 'closed' || data.finalNode === undefined) return undefined
    if (tail?.closing?.finalNode.seq !== data.finalNode.seq) return undefined
    // 目标契约收敛：TurnTailOwnerProps.turn 为轮号。
    return { turn: turn.turn, seq: data.finalNode.seq, openFile }
  }, [data.finalNode, openFile, tail, turn])
  const mentions = useMemo(
    () => owner === undefined ? undefined : fileMentions(owner),
    [fileMentions, owner],
  )
  const reasoningHidden = turnProcess !== undefined
    && turnProcess.foldable
    && turnProcess.spec.answerStep === data.step
    && turnProcess.spec.inlineReasoning
    && !turnProcess.open
  const revealProcess = useCallback(() => { turnProcess?.setOpen(true) }, [turnProcess])
  return (
    <AssistantMarkdown
      blocks={data.blocks}
      streaming={data.status === 'running'}
      interrupted={data.status === 'interrupted'}
      renderMessageImages={renderMessageImages}
      reasoningHidden={reasoningHidden}
      revealProcess={revealProcess}
      mentions={mentions}
      t={t}
    />
  )
})
