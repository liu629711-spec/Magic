// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/conversation-nodes/common.ts
// （剥离 cordis Context 相关注册函数；纯折叠辅助原样搬入。）

import type {
  ConversationLocation, ConversationNodeContext,
} from '../vendor-types.ts'
import type {
  ChatNode, ChatNodeDataMap, ChatNodeKind,
} from '../contract/chat-nodes.ts'

/**
 * 一个持久事件 seq 邻域内的相对位置：中断 Assistant、其后续 Node、
 * 然后是普通 final 的后续。max-tokens 通知位于收尾 Assistant 与轮尾之间，
 * 使轮尾保持为该轮最后一个节点并保持分支动作可用。
 */
export const CHAT_SYNTHETIC_SEQ_OFFSETS = {
  interruptedAssistant: -0.9,
  interruptedFollowup: -0.8,
  processControl: -0.1,
  maxTokensNotice: 0.05,
  finalizedFollowup: 0.1,
} as const

/** 解析一个 Context 当前最佳已加载事件 Location。 */
export function contextLocation(context: ConversationNodeContext): ConversationLocation {
  return context.start?.location ?? context.matches[0]?.location ?? { kind: 'unresolved' }
}

/** 用引擎拥有的稳定 key 构建一个最终 Chat 目标 Node。 */
export function chatNode<Kind extends ChatNodeKind>(
  context: ConversationNodeContext,
  kind: Kind,
  anchorSeq: number,
  data: ChatNodeDataMap[Kind],
  options: {
    readonly location?: ConversationLocation
    readonly visibility?: 'visible' | 'hidden'
  } = {},
): ChatNode<Kind> {
  return {
    key: context.key,
    kind,
    id: context.id,
    target: 'chat',
    anchorSeq,
    location: options.location ?? contextLocation(context),
    visibility: options.visibility ?? 'visible',
    data,
  }
}

/** 从结构性收窄的载荷读取有限非负整数。 */
export function coordinate(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}
