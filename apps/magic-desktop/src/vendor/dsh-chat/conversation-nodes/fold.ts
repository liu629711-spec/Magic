// 折叠入口（收敛为纯函数）：
// 输入事件数组 → 输出 ChatNodes 快照。替代原 react 式 client-store 链路
// （@deepseek-ai/dsh-client-store 引擎不搬），壳以整窗重算方式调用。
//
// 定义注册顺序与源包 conversation-nodes/register.ts 一致（register.ts 的
// cordis 注册壳本身不搬）。

import type {
  ConversationNodeDefinition, SessionEventLikeEntry,
} from '../vendor-types.ts'
import type { ChatSnapshot } from '../contract/snapshot.ts'
import { ConversationNodeAssembler, type ConversationEventDefinitions } from './engine.ts'
import { ChatSnapshotBuilder } from './chat-snapshot-builder.ts'
import { nextStepInboxDefinition } from './inbox.ts'
import { messageDefinition } from './message.ts'
import { systemMessageChatDefinition, requestPromptChatDefinition } from './request-prompt.ts'
import { assistantDefinition } from './assistant.ts'
import { turnProcessDefinition } from './turn-process.ts'
import { toolDefinition } from './tool.ts'
import { commandDefinition } from './command.ts'
import { compactionDefinition } from './compaction.ts'
import { retryDefinition } from './retry.ts'
import { turnErrorDefinition } from './turn-error.ts'
import { turnMaxTokensDefinition } from './turn-max-tokens.ts'
import { turnTailDefinition } from './turn-tail.ts'
import { unknownFallbackDefinition } from './fallback.ts'
// Magic 自研扩展（2026-09-18）：CEO 委派画布 Definition。magic-ceo 插件把 ceo/*
// 事件写进同一事件流，源包无此 definition（会被兜底丢弃），故在本地折叠层登记。
import { ceoTeamDefinition } from '../../../conversation/ceo-team.ts'

/** Chat 业务的全部事件定义（注册顺序与源包一致）。 */
export const chatConversationDefinitions: readonly ConversationNodeDefinition[] = [
  nextStepInboxDefinition,
  messageDefinition,
  systemMessageChatDefinition,
  requestPromptChatDefinition,
  assistantDefinition,
  turnProcessDefinition,
  toolDefinition,
  commandDefinition,
  compactionDefinition,
  retryDefinition,
  turnErrorDefinition,
  turnMaxTokensDefinition,
  turnTailDefinition,
  ceoTeamDefinition,
]

/** 未认领 append-surface 事件的兜底定义。 */
export const chatFallbackDefinition: ConversationNodeDefinition = unknownFallbackDefinition

const CHAT_EVENT_DEFINITIONS: ConversationEventDefinitions = {
  entries: () => chatConversationDefinitions,
  fallbackEntry: () => chatFallbackDefinition,
}

/**
 * 把一个连续事件窗口折叠为 Chat 快照（纯函数）。
 * @param entries - 事件条目（持久事件或 assistant/live-chunk 瞬态）。
 * @returns Chat 快照（order/locations/navigation/timeline/legacy/nodes）。
 */
export function foldChatSnapshot(
  entries: readonly SessionEventLikeEntry[],
): ChatSnapshot {
  const assembler = new ConversationNodeAssembler(CHAT_EVENT_DEFINITIONS)
  assembler.replaceWindow(entries)
  const nodes = assembler.flush('chat')
  const builder = new ChatSnapshotBuilder()
  return builder.replace({
    nodes: nodes as import('../contract/chat-nodes.ts').ChatConversationViewNode[],
    timeline: assembler.getLocationIndex().snapshot(),
  })
}
