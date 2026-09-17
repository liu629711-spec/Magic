// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/contract/chat-nodes.ts
// （ChatNodeDataMap 原经各 definition 文件的 declare module 合并；本地收敛为
// 显式接口，键与原合并结果一一对应。）

import type {
  AssistantBlock, AssistantMessageNode, CommandNode, CompactionSummaryNode,
  ContentBlock, ConversationLocation, ConversationViewNode, KnownContextForm,
  ContextProvenanceView, MessageId, ModelRetryNode, RunningToolCall, ToolCallBlock,
  TurnErrorNode, TurnMaxTokensNode, UnknownSurfaceNode,
} from '../vendor-types.ts'

/** Chat 业务 Definition 产出的最终渲染单元。 */
export interface ChatConversationViewNode extends ConversationViewNode {
  readonly target: 'chat'
  readonly anchorSeq: number
  readonly location: ConversationLocation
  readonly visibility: 'visible' | 'hidden'
}

/** 流式与落定态共享的最终 Assistant 行载荷。 */
export interface AssistantChatData {
  readonly status: 'running' | 'settled' | 'interrupted'
  readonly turn: number
  readonly step: number
  readonly blocks: readonly AssistantBlock[]
  readonly time: number
  readonly usage?: unknown
  readonly finalNode?: AssistantMessageNode
}

/** 带持久呈现节点的落定 / 中断 Assistant 载荷。 */
export type FinalAssistantChatData = AssistantChatData & {
  readonly finalNode: AssistantMessageNode
}

/** message.ts：直接用户消息（含召回标签与技能名装饰）。 */
export interface ReferencedUserMessageNode {
  kind: 'user'
  seq: number
  time: number
  content: readonly ContentBlock[]
  source: unknown
  /** 紧随其后的 session-reference 上下文引用的标签。 */
  readonly referenceLabels?: readonly string[]
  /** 同 step 的 skill-invocation 注入为该消息加载的技能名。 */
  readonly skillNames?: readonly string[]
}

/** message.ts：运行中插话的用户消息。 */
export interface ReferencedSteeringMessageNode {
  kind: 'steering'
  messageId: MessageId
  seq: number
  time: number
  content: readonly ContentBlock[]
  source: unknown
  readonly referenceLabels?: readonly string[]
  readonly skillNames?: readonly string[]
}

/** 根 Tool 行载荷；根生命周期持有全部递归子调用。 */
export interface ToolChatData {
  readonly root: ToolCallBlock
}

/** 一条手动指令与其关联的压缩事务。 */
export interface ManualCompactionChatData {
  readonly command: CommandNode
  readonly compaction: CompactionSummaryNode | null
}

/** 渲染为单行的持久重试链。 */
export interface RetryChatData {
  readonly attempts: readonly ModelRetryNode[]
  readonly current: ModelRetryNode
}

/** 一次计费请求尝试的 provider/model 归属。 */
export interface TurnTokenUsageRoute {
  readonly provider: string
  readonly model: string
}

/** 一个完成轮内全部尝试的精确 token 记账。 */
export interface TurnTokenUsage {
  readonly uncachedInputTokens: number
  readonly outputTokens: number
  readonly totalTokens: number
  readonly cacheReadTokens?: number
  readonly cacheWriteTokens?: number
  readonly reasoningTokens?: number
  readonly routes?: readonly TurnTokenUsageRoute[]
}

/** 轮尾行：持有动作与可选功能贡献。 */
export interface TurnTailChatData {
  readonly turn: number
  readonly seq: number
  readonly time: number
  /** 本轮最后一条落定且有内容的 Assistant。 */
  readonly closing: FinalAssistantChatData | null
  /** 后续未渲染证据令 closing seq 非尾。 */
  readonly branchUnavailable: boolean
  readonly ttftMs?: number
  readonly tokensPerSecond?: number
  /** 精确的整轮记账；加载证据不完整时缺省。 */
  readonly tokenUsage?: TurnTokenUsage
}

/** 投影到定稿回答之前的轮级过程披露。 */
export interface TurnProcessChatData {
  readonly turn: number
  readonly controlAnchorSeq: number
  readonly processStartSeq: number
  readonly answerAnchorSeq: number | null
  readonly answerStep: number | null
  readonly inlineReasoning: boolean
  readonly messageCount: number
  readonly toolCallCount: number
  readonly subagentCount: number
}

/** 系统提示词行载荷（request-prompt.ts）。 */
export interface SystemPromptChatData {
  readonly text: string
  readonly update?: true
}

/** 按最终渲染器 kind 扩展的载荷注册表（原 declare module 合并结果）。 */
export interface ChatNodeDataMap {
  /** 流式 / 落定 / 中断的 Assistant step（conversation-nodes/assistant.ts）。 */
  'assistant-step': AssistantChatData
  /** 普通开轮用户消息（conversation-nodes/message.ts）。 */
  user: ReferencedUserMessageNode
  /** 运行中插话的用户消息（conversation-nodes/message.ts）。 */
  steering: ReferencedSteeringMessageNode
  /** 非用户上下文注入（conversation-nodes/message.ts）。 */
  context: ContextChatData
  /** 根 Tool 生命周期，递归持有子调用（conversation-nodes/tool.ts）。 */
  'tool-call': ToolChatData
  /** 普通 slash 指令生命周期（conversation-nodes/command.ts）。 */
  command: CommandNode
  /** 手动 compact 指令与其压缩事务（conversation-nodes/command.ts）。 */
  'manual-compaction': ManualCompactionChatData
  /** 自动压缩检查点标记（conversation-nodes/compaction.ts）。 */
  compaction: CompactionSummaryNode
  /** 生产者关联的模型重试链（conversation-nodes/retry.ts）。 */
  'model-retry': RetryChatData
  /** 轮终失败（conversation-nodes/turn-error.ts）。 */
  'turn-error': TurnErrorNode
  /** 输出 token 上限截断通知（conversation-nodes/turn-max-tokens.ts）。 */
  'turn-max-tokens': TurnMaxTokensNode
  /** 完成轮的动作行与扩展尾（conversation-nodes/turn-tail.ts）。 */
  'turn-tail': TurnTailChatData
  /** 轮级过程披露控制节点（conversation-nodes/turn-process.ts）。 */
  'turn-process': TurnProcessChatData
  /** 一个请求渲染的完整系统提示词（conversation-nodes/request-prompt.ts）。 */
  'system-prompt': SystemPromptChatData
  /** 未认领 append-surface 事件的兜底呈现（conversation-nodes/fallback.ts）。 */
  unknown: UnknownSurfaceNode
}

/** message.ts 的上下文行载荷。 */
export interface ContextChatData {
  kind: 'context'
  seq: number
  time: number
  content: readonly ContentBlock[]
  source: unknown
  provenance: ContextProvenanceView
  form: KnownContextForm | null
}

/** 渲染器 kind 集。 */
export type ChatNodeKind = Extract<keyof ChatNodeDataMap, string>

/** 收窄到某个已注册渲染器 kind 与载荷的最终 Chat Node。 */
export type ChatNode<Kind extends ChatNodeKind = ChatNodeKind> = {
  [RegisteredKind in Kind]: ChatConversationViewNode & {
    readonly kind: RegisteredKind
    readonly data: ChatNodeDataMap[RegisteredKind]
  }
}[Kind]

/**
 * 测试 Tool 根是否已落定。
 * @param block - Tool 根生命周期值。
 */
export function isSettledTool(block: ToolCallBlock): block is Extract<ToolCallBlock, { kind: 'tool-result' }> {
  return 'kind' in block
}

/**
 * 测试 Tool 根是否仍在运行。
 * @param block - Tool 根生命周期值。
 */
export function isRunningTool(block: ToolCallBlock): block is RunningToolCall {
  return !isSettledTool(block)
}
