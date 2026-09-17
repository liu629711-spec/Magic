// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/conversation-nodes/retry.ts
// （剥离：cordis Context 注册函数与 declare module 合并。）

import type {
  ConversationLocation, ConversationMatch, ConversationNodeDefinition, ModelRetryNode,
} from '../vendor-types.ts'
import type { RetryChatData } from '../contract/chat-nodes.ts'
import { chatNode } from './common.ts'

/** 共享一个生产者拥有的 RetryId 的累计重试尝试。 */
export interface RetryState {
  readonly turn: number
  readonly step: number
  readonly attempts: readonly ModelRetryNode[]
}

function scheduledNode(match: ConversationMatch): ModelRetryNode | undefined {
  if (match.event.type !== 'llm/retry') return undefined
  return {
    kind: 'model-retry',
    seq: match.event.seq,
    time: match.event.time,
    retryState: 'scheduled',
    ...match.event.data,
  }
}

/** 任一所属边界关闭后，一次已调度的尝试即被取消。 */
function isClosed(location: ConversationLocation): boolean {
  return (location.kind === 'step' && location.step.status === 'closed')
    || ((location.kind === 'step' || location.kind === 'turn') && location.turn.status === 'closed')
}

/** 生产者关联的模型重试链 Definition。 */
export const retryDefinition: ConversationNodeDefinition<RetryState> = {
  kind: 'model-retry',
  target: 'chat',
  match: (event) => {
    if (event.type === 'llm/retry') {
      const retryId: unknown = event.data.retryId
      if (typeof retryId !== 'string' || retryId === '') return null
      return { id: retryId, role: event.data.retry === 1 ? 'start' : 'update' }
    }
    if (event.type === 'llm/retry-started') {
      const retryId: unknown = event.data.retryId
      return typeof retryId === 'string' && retryId !== '' ? { id: retryId, role: 'update' } : null
    }
    return null
  },
  start: (_context, match) => {
    const node = scheduledNode(match)
    if (node === undefined) throw new Error('model-retry start requires a valid llm/retry event')
    return { turn: node.turn, step: node.step, attempts: [node] }
  },
  update: (context, match) => {
    if (match.event.type === 'llm/retry') {
      const node = scheduledNode(match)
      return node === undefined ? context.state : { ...context.state, attempts: [...context.state.attempts, node] }
    }
    if (match.event.type !== 'llm/retry-started') return context.state
    const retry = match.event.data.retry
    return {
      ...context.state,
      attempts: context.state.attempts.map(attempt =>
        attempt.retry === retry ? { ...attempt, retryState: 'started' } : attempt),
    }
  },
  buildViewNode: (context) => {
    if (context.state === undefined || context.state.attempts.length === 0) return null
    const location = context.start?.location ?? context.matches[0]?.location ?? { kind: 'unresolved' as const }
    const stateAttempts = context.state.attempts
    const attempts = stateAttempts.map((attempt, index) =>
      index === stateAttempts.length - 1
        && attempt.retryState === 'scheduled'
        && isClosed(location)
        ? { ...attempt, retryState: 'cancelled' as const }
        : attempt)
    const current = attempts.at(-1)
    if (current === undefined) return null
    const data: RetryChatData = { attempts, current }
    return chatNode(context, 'model-retry', attempts[0]?.seq ?? current.seq, data)
  },
}
