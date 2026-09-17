// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/conversation-nodes/message.ts
// （剥离：cordis Context 注册函数与 declare module 合并；
// isAppendSurfaceEvent / isReplacementSurfaceEvent 来自 vendor-types 的本地等价实现。）

import type {
  ConversationNodeDefinition,
} from '../vendor-types.ts'
import { isAppendSurfaceEvent, isReplacementSurfaceEvent } from '../vendor-types.ts'
import type { ReferencedUserMessageNode, ReferencedSteeringMessageNode, ContextChatData } from '../contract/chat-nodes.ts'
import type { InboxState } from './inbox.ts'
import { chatNode } from './common.ts'
import { contextForm, contextProvenance } from './event-projection.ts'

type MessageNode = ReferencedUserMessageNode | ReferencedSteeringMessageNode | ContextChatData

function isCompactionCheckpoint(event: Parameters<ConversationNodeDefinition['match']>[0]): boolean {
  if (event.type !== 'user/message' || !isReplacementSurfaceEvent(event)) return false
  const source = event.data.source
  return source.kind === 'plugin' && source.plugin === 'compact'
}

/** 用户、插话与注入上下文消息分类 Definition。 */
export const messageDefinition: ConversationNodeDefinition<MessageNode> = {
  kind: 'input-message',
  target: 'chat',
  match: event => event.type === 'user/message'
    && isAppendSurfaceEvent(event)
    && !isCompactionCheckpoint(event)
    ? { id: String(event.data.id), role: 'start' }
    : null,
  start: (_context, match, reader) => {
    if (match.event.type !== 'user/message') throw new Error('input-message start requires user/message')
    const event = match.event
    if (event.data.source.kind !== 'user') {
      return {
        kind: 'context',
        seq: event.seq,
        time: event.time,
        content: event.data.content,
        source: event.data.source,
        provenance: contextProvenance(event.data.source),
        form: contextForm(event.data.source),
      }
    }
    const claimed = reader.previous<InboxState>('inbox-next-step')
      ?.state.currentClaimed.has(String(event.data.id)) === true
    return claimed
      ? {
        kind: 'steering',
        messageId: event.data.id,
        seq: event.seq,
        time: event.time,
        content: event.data.content,
        source: event.data.source,
      }
      : {
        kind: 'user',
        seq: event.seq,
        time: event.time,
        content: event.data.content,
        source: event.data.source,
      }
  },
  update: context => context.state,
  buildViewNode: (context) => {
    if (context.state === undefined) return null
    return chatNode(context, context.state.kind, context.state.seq, context.state)
  },
}
