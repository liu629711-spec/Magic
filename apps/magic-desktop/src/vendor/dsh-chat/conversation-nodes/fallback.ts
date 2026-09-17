// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/conversation-nodes/fallback.ts
// （剥离：cordis Context 注册函数；registerFallback 的兜底角色由引擎按
// definitions.fallback 收敛。）

import type {
  ConversationNodeDefinition, UnknownSurfaceNode,
} from '../vendor-types.ts'
import { isAppendSurfaceEvent } from '../vendor-types.ts'
import { chatNode } from './common.ts'

/** 未认领 append-surface 兜底 Definition。 */
export const unknownFallbackDefinition: ConversationNodeDefinition<UnknownSurfaceNode> = {
  kind: 'unknown-surface',
  target: 'chat',
  match: event => event.type !== 'assistant/live-chunk' && isAppendSurfaceEvent(event)
    ? { id: String(event.seq), role: 'start' }
    : null,
  start: (_context, match) => ({
    kind: 'unknown',
    seq: match.event.seq,
    time: match.event.time,
    type: match.event.type,
    data: match.event.data,
  }),
  update: context => context.state,
  buildViewNode: context => context.state === undefined
    ? null
    : chatNode(context, 'unknown', context.state.seq, context.state),
}
