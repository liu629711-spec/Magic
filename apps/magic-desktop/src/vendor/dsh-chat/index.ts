// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 + @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2
// （桶出口：Magic 自有客户端对话区渲染内核。壳层从这里取类型、渲染组件与折叠入口。
//  另需 `import './tokens.css'`（或把令牌桥并入全局样式）以生效令牌兜底。）

/* ── 令牌桥（副作用导入）── */
import './tokens.css'

/* ── 外部包类型收敛面 ── */
export * from './vendor-types.ts'

/* ── locale：t 座位与字典 ── */
export { NS as CHAT_NS, zh as chatZh, en as chatEn, createTranslate, createChatTranslate, createConversationTranslate } from './locale/chat.ts'
export type { ChatKey, ChatTranslate } from './locale/chat.ts'
export { CONVERSATION_NS, zh as conversationZh, en as conversationEn } from './locale/conversation.ts'
export type { ConversationKey, ConversationTranslate } from './locale/conversation.ts'
export { zh as commonZh, en as commonEn } from './locale/common.ts'
export type { CommonKey } from './locale/common.ts'

/* ── contract：Chat 节点 / 快照 / 插槽 props ── */
export { isSettledTool, isRunningTool } from './contract/chat-nodes.ts'
export type {
  ChatNodeDataMap, ChatConversationViewNode, ChatNode, ChatNodeKind,
  AssistantChatData, FinalAssistantChatData, ToolChatData, ManualCompactionChatData,
  RetryChatData, TurnTokenUsageRoute, TurnTokenUsage, TurnTailChatData,
  TurnProcessChatData, SystemPromptChatData, ReferencedUserMessageNode,
  ReferencedSteeringMessageNode, ContextChatData,
} from './contract/chat-nodes.ts'
export { EMPTY_CHAT_SNAPSHOT } from './contract/snapshot.ts'
export type {
  ChatNodeSource, ChatNodeProcessSource, ChatNodeStore, TurnNavigationItem,
  ChatTurnNavigationIndex, ChatLocationNodeIndex, ChatTurnProcessPresentation,
  LegacyConversationSlice, ChatSnapshot,
} from './contract/snapshot.ts'
export type {
  OpenFileOptions, TurnTailOwnerProps, AssistantActionOwnerProps, ChatFileMentions,
  ChatNodeOwnerProps, TurnProcessOwnerProps, ChatNodeViewProps, ChatNodeRuntimeShare,
  CommandRowOwnerProps, CommandRowProps, ChatScrollPosition, ChatViewInjected,
  ChatViewSlotProps, RenderMessageImages, UseChat, UseChatNode, UseChatNodeProcess,
} from './contract/slots.ts'
export { TURN_PROCESS_INDEPENDENT_KINDS, sameTurnProcessSpec, isSubagentDelegationTool } from './contract/turn-process.ts'
export type { TurnProcessSpec } from './contract/turn-process.ts'
export { deriveTurnMetrics, assistantStepReading } from './contract/turn-metrics.ts'
export type { TurnMetrics, StepReading } from './contract/turn-metrics.ts'
export { hasAssistantReplyContent } from './contract/assistant-content.ts'
export type { ToolCallId, TurnProcessViewEntry, ChatStoreState } from './contract/store.ts'

/* ── 滚动锚定纯函数（抽自 ChatView.tsx）── */
export {
  scrollerOf, readerMovedScroll, anchorElement, turnAtLine, flowTop, pagingAnchor,
  scrollPosition,
} from './scroll-anchor.ts'
export type { PagingAnchor, ChatScrollPositionSnapshot } from './scroll-anchor.ts'

/* ── chat 渲染组件 ── */
export { AssistantMarkdown, localPathMediaUrl } from './chat/AssistantMarkdown.tsx'
export type { AssistantMarkdownProps } from './chat/AssistantMarkdown.tsx'
export { AssistantNodeView } from './chat/AssistantNodeView.tsx'
export type { AssistantNodeViewProps } from './chat/AssistantNodeView.tsx'
export { ReasoningRow } from './chat/ReasoningRow.tsx'
export { MessageIconActions } from './chat/MessageIconActions.tsx'
export type { MessageIconActionsProps } from './chat/MessageIconActions.tsx'
export { TurnProcessNodeView } from './chat/TurnProcessNodeView.tsx'
export { TurnTailNodeView } from './chat/TurnTailNodeView.tsx'
export type { TurnTailNodeViewProps } from './chat/TurnTailNodeView.tsx'
export { CommandNodeView, ManualCompactionNodeView } from './chat/CommandNodeView.tsx'
export type { CommandNodeViewProps } from './chat/CommandNodeView.tsx'
export { GenericCommandCard } from './chat/GenericCommandCard.tsx'
export type { GenericCommandCardProps } from './chat/GenericCommandCard.tsx'
export { CompactionCommandCard } from './chat/CompactionCommandCard.tsx'
export { SystemPromptRow, SystemPromptNodeView } from './chat/SystemPromptRow.tsx'
export type { SystemPromptRowProps } from './chat/SystemPromptRow.tsx'
export { assistantText } from './chat/turn-assistant.ts'
export {
  PendingSteeringBubble, PendingSubmissionBubble, UserMessageNodeView,
  ContextMessageNodeView, CompactionNodeView, RetryNodeView, TurnErrorNodeView,
  TurnMaxTokensNodeView, UnknownNodeView,
} from './chat/MessageItem.tsx'
export { CompactionItem } from './chat/CompactionItem.tsx'
export { ContextInjectionRow } from './chat/ContextInjectionRow.tsx'
export type { ContextInjectionRowProps } from './chat/ContextInjectionRow.tsx'
export { contextBody, OpaqueBody } from './chat/ContextBody.tsx'
export { useSearchableHidden } from './chat/searchable-hidden.ts'
export { useCalendarDay } from './chat/use-calendar-day.ts'
export {
  startOfLocalDay, msUntilNextLocalMidnight, formatRunDuration, formatLatencySeconds,
  formatTokensPerSecond, formatMessageClock,
} from './chat/message-chrome.ts'
export type { ClockTranslate, RunDurationTranslate } from './chat/message-chrome.ts'
export {
  formatTokens, formatExactTokens, formatCacheHitPercent,
} from './chat/token-format.ts'
export { markdownLabels } from './markdown-labels.ts'

/* ── Tool 卡片（来自 ui-tool，注册壳已剥）── */
export { ToolRow } from './tool/components/ToolRow.tsx'
export type { ToolRowProps } from './tool/components/ToolRow.tsx'
export { AskQuestionCard } from './tool/components/AskQuestionCard.tsx'
export { ToolCallTree } from './tool/ToolCallTree.tsx'
export { GenericToolCard } from './tool/toolviews/GenericToolCard.tsx'
export type { GenericToolCardProps } from './tool/toolviews/GenericToolCard.tsx'
export { ReadRow } from './tool/toolviews/read-row.tsx'
export { ReadImageRow } from './tool/toolviews/read-image-row.tsx'
export { readFamilyRow } from './tool/toolviews/read-family-row.tsx'
export type { ReadFamilyRowProps, ReadImageRowProps, ReadFamilyCard } from './tool/toolviews/read-family-row.tsx'
export { WebRow } from './tool/toolviews/web-row.tsx'
export { TodoRow } from './tool/toolviews/todo-row.tsx'
export { SearchRow } from './tool/toolviews/search-row.tsx'
export { BashRow } from './tool/toolviews/bash-row.tsx'
export type { BashRowProps } from './tool/toolviews/bash-row.tsx'
export { FileMutationRow } from './tool/toolviews/file-mutation-row.tsx'
export { AskQuestionRow } from './tool/toolviews/ask-question-row.tsx'
export { planSummary } from './tool/toolviews/plan-summary.ts'
export type { PlanItemLike, PlanSummary } from './tool/toolviews/plan-summary.ts'
export {
  toolRowModel, classifyTool, resultText, formatToolBody,
} from './tool/models/tool-call-model.ts'
export type { ToolRowModel, ToolRowState, ToolRowVariant } from './tool/models/tool-call-model.ts'
export { parsedToolCall, singleResultText, validEscalationFields } from './tool/models/raw-tool-call.ts'
export { readCardModel, readCallLine, CHAT_READ_MAX_LINES } from './tool/models/read-card-model.ts'
export type { ReadCardModel } from './tool/models/read-card-model.ts'
export { diffCardModel, CHAT_DIFF_MAX_LINES } from './tool/models/diff-card-model.ts'
export type { DiffCardModel } from './tool/models/diff-card-model.ts'
export { searchCardModel, CHAT_SEARCH_MAX_LINES } from './tool/models/search-card-model.ts'
export type { SearchCardModel } from './tool/models/search-card-model.ts'
export {
  terminalCardModel, localizeTerminalCardModel, terminalBlockLabels, terminalFailed,
  isSettledPersistentShellCall, isSpilledShellCall,
} from './tool/models/terminal-card-model.ts'
export type { TerminalCardModel } from './tool/models/terminal-card-model.ts'
export { webCardModel } from './tool/models/web-card-model.ts'
export type { WebCardModelProps } from './tool/models/web-card-model.ts'
export { imageCardModel } from './tool/models/image-card-model.ts'
export type { ImageCardModel } from './tool/models/image-card-model.ts'
export { hasSpillNotice } from './tool/models/spill-notice.ts'
export {
  diffBlockLabels, readBlockLabels, searchBlockLabels, webBlockLabels, markdownLabels as toolMarkdownLabels,
} from './tool/models/primitive-labels.ts'

/* ── conversation-nodes 折叠层 ── */
export { chatNode, contextLocation, CHAT_SYNTHETIC_SEQ_OFFSETS, coordinate } from './conversation-nodes/common.ts'
export {
  contextForm, contextProvenance, sessionRecallLabels, skillInvocationName,
  toAssistantBlocks, toAssistantBlock, emptyAssistantBlock, displayFailure, isTokenDelta,
} from './conversation-nodes/event-projection.ts'
export type { DisplayFailure } from './conversation-nodes/event-projection.ts'
export { PartialAccumulator, isVisibleAssistantChunk } from './conversation-nodes/partial.ts'
export { assistantDefinition } from './conversation-nodes/assistant.ts'
export { messageDefinition } from './conversation-nodes/message.ts'
export { toolDefinition } from './conversation-nodes/tool.ts'
export {
  commandDefinition, compactSource, compactSummary, updateCompactionState,
} from './conversation-nodes/command.ts'
export { compactionDefinition } from './conversation-nodes/compaction.ts'
export { retryDefinition } from './conversation-nodes/retry.ts'
export type { RetryState } from './conversation-nodes/retry.ts'
export { turnErrorDefinition } from './conversation-nodes/turn-error.ts'
export { turnMaxTokensDefinition } from './conversation-nodes/turn-max-tokens.ts'
export { turnTailDefinition } from './conversation-nodes/turn-tail.ts'
export { turnProcessDefinition } from './conversation-nodes/turn-process.ts'
export { ChatTurnProcessProjector } from './conversation-nodes/turn-process-presentation.ts'
export { nextStepInboxDefinition } from './conversation-nodes/inbox.ts'
export type { InboxState } from './conversation-nodes/inbox.ts'
export { unknownFallbackDefinition } from './conversation-nodes/fallback.ts'
export {
  sameTurnNavigationItem, turnNavigationItem,
} from './conversation-nodes/turn-navigation.ts'
export { inspectSystemPrompt, inspectRequestPrompt } from './conversation-nodes/prompt-inspection.ts'
export type { SystemPromptState, SystemPromptInspector } from './conversation-nodes/prompt-inspection.ts'
export { deriveTurnTokenUsage } from './conversation-nodes/token-usage.ts'
export { chatConversationDefinitions, chatFallbackDefinition, foldChatSnapshot } from './conversation-nodes/fold.ts'
export { ConversationNodeAssembler, ConversationLocationIndex } from './conversation-nodes/engine.ts'
export type { ConversationEventDefinitions } from './conversation-nodes/engine.ts'
export { ChatSnapshotBuilder, orderedVisibleChatNodes, SkillNameProjector } from './conversation-nodes/chat-snapshot-builder.ts'
