// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2（类型收敛面）
//
// 外部包类型收敛：搬入的折叠层 / 渲染组件原本从下列包 import 类型。这里把
// 用到的类型定义按原样抄收（逐段标注来源包与路径），运行时导入一律替换为
// 本文件内的等价实现或省略。品牌类型（Branded*）按源码语义以本地 brand 符号
// 收敛——编译期名义化，运行时与原始 string/number 等价。
//
// 类型来源：
// - @deepseek-ai/dsh-brand（brand 原语）
// - @deepseek-ai/dsh-llm/brand、/types、/message、/call-config、/assistant-stream
// - @deepseek-ai/dsh-attachment/types
// - @deepseek-ai/dsh-llm-retry/types
// - @deepseek-ai/dsh-commands/types、/brand（CommandId）
// - @deepseek-ai/dsh-compaction/types、/checkpoint
// - @deepseek-ai/dsh-tools/types（PTC dispatch 事件）
// - @deepseek-ai/dsh-agent/types（agent/inbox/spliced）
// - @deepseek-ai/dsh-tool-todo/types（TodoItem）
// - @deepseek-ai/dsh-session/types（SessionEventMap + SessionSeq 等）
// - @deepseek-ai/dsh-session/surface（surface 判定，值实现）
// - @deepseek-ai/dsh-api-session-controller/client（SessionEventLike 系列）
// - @deepseek-ai/dsh-client-ui-conversation/client（会话记录/位置/引擎契约）
// - @deepseek-ai/dsh-client-ui-slots（Translate / 插槽 props 面）
// - @deepseek-ai/dsh-client-store（ObservableSnapshot / SnapshotStore / notifySubscribers）
// - @deepseek-ai/dsh-util-workspace-path（工作区路径显示工具，值实现）

/* ── brand 原语（@deepseek-ai/dsh-brand）────────────────────────────── */

declare const brand: unique symbol

/** 编译期名义化品牌；运行时即原始 T。 */
export type Branded<B extends string> = string & { readonly [brand]: B }
export type BrandedNumber<B extends string> = number & { readonly [brand]: B }

/* ── 身份品牌（@deepseek-ai/dsh-llm/brand 等）────────────────────────── */

export type MessageId = Branded<'MessageId'>
export type ToolCallId = Branded<'ToolCallId'>
export type ProviderRequestId = Branded<'ProviderRequestId'>
export type LlmAttemptId = Branded<'LlmAttemptId'>
export type ReasoningEffortId = Branded<'ReasoningEffortId'>
export type RetryId = Branded<'RetryId'>
export type CommandId = Branded<'CommandId'>
export type CompactionId = Branded<'CompactionId'>
export type AttachmentId = Branded<'AttachmentId'>
export type SessionId = Branded<'SessionId'>
/** 替代 @deepseek-ai/dsh-session/types 的 SessionSeq（turn-rail-items.ts:10 收敛）。 */
export type SessionSeq = BrandedNumber<'SessionSeq'>

/* ── @deepseek-ai/dsh-attachment/types ──────────────────────────────── */

export type ImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'

export interface ImageAttachmentRef {
  attachmentId: AttachmentId
  mediaType: ImageMediaType
  bytes: number
  width: number
  height: number
  name?: string
  originalDimensions?: { width: number; height: number }
}

export interface FileAttachmentRef {
  attachmentId: AttachmentId
  name: string
  bytes: number
}

/* ── @deepseek-ai/dsh-llm/types ─────────────────────────────────────── */

export interface LlmFailure {
  readonly message: string
  readonly code: string
  readonly status?: number
  readonly providerRetryAfterMs?: number
  readonly requestId?: ProviderRequestId
}

export interface TextBlock { type: 'text'; text: string }
export interface ReasoningBlock { type: 'reasoning'; text: string }
export interface ImageBlock { type: 'image'; attachment: ImageAttachmentRef }
export interface FileBlock { type: 'file'; attachment: FileAttachmentRef }
export interface ToolCallBlockCore {
  type: 'tool-call'
  id: ToolCallId
  name: string
  arguments: string
}
export interface ToolResultBlockCore {
  type: 'tool-result'
  toolCallId: ToolCallId
  content: ContentBlock[]
  isError?: boolean
}

export interface ContentBlockMap {
  'text': TextBlock
  'reasoning': ReasoningBlock
  'image': ImageBlock
  'file': FileBlock
  'tool-call': ToolCallBlockCore
  'tool-result': ToolResultBlockCore
}
export type ContentBlockType = keyof ContentBlockMap
export type ContentBlock = ContentBlockMap[ContentBlockType]

export interface FinishReasonMap {
  'stop': { kind: 'stop' }
  'tool-calls': { kind: 'tool-calls' }
  'max-tokens': { kind: 'max-tokens' }
  'aborted': { kind: 'aborted'; failure: LlmFailure }
  'error': { kind: 'error'; failure: LlmFailure }
}
export type FinishReason = FinishReasonMap[keyof FinishReasonMap]

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens?: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
}

export interface ToolSchema {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type SystemPromptUpdate = 'in-history'

export interface ReplayEnvelope {
  response: unknown
  blocks?: readonly unknown[]
}

export type StreamChunk =
  | { type: 'block-start'; index: number; blockType: ContentBlockType }
  | { type: 'text-delta'; index: number; text: string }
  | { type: 'reasoning-delta'; index: number; text: string }
  | { type: 'tool-call-delta'; index: number; id: ToolCallId; name?: string; argumentsDelta: string }
  | { type: 'block-end'; index: number; block: ContentBlock }
  | { type: 'usage'; usage: TokenUsage }
  | { type: 'finish'; reason: FinishReason; replayState?: ReplayEnvelope }

/* ── @deepseek-ai/dsh-llm/message ───────────────────────────────────── */

export interface AssistantProvenance {
  provider: string
  model: string
  replayState?: unknown
}

export interface ModelMessageSource extends AssistantProvenance { kind: 'model' }
export interface ToolMessageSource { kind: 'tool'; callId: ToolCallId }

export type ContextForm =
  | 'instructions'
  | 'catalog'
  | 'snapshot'
  | 'notice'
  | 'relay'
  | 'recall'

export interface ContextSnapshotSection {
  readonly name: string
  readonly text: string
}

export type ContextFormed =
  | { readonly form?: never }
  | { readonly form: 'instructions' }
  | { readonly form: 'catalog' }
  | { readonly form: 'snapshot'; readonly sections: readonly ContextSnapshotSection[] }
  | { readonly form: 'notice'; readonly summary: string }
  | { readonly form: 'relay' }
  | { readonly form: 'recall' }

export interface MessageSourceMap {
  user: { kind: 'user' }
  plugin: { kind: 'plugin'; plugin: string } & ContextFormed
  model: ModelMessageSource
  tool: ToolMessageSource
}
export type MessageSource = MessageSourceMap[keyof MessageSourceMap]

export interface Message {
  readonly id: MessageId
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: ContentBlock[]
  readonly source: MessageSource
}

export interface UserMessage extends Message { readonly role: 'user' }
export interface AssistantMessage extends Message {
  readonly role: 'assistant'
  readonly source: ModelMessageSource
}
export interface SystemMessage extends Message {
  readonly role: 'system'
  readonly source: MessageSourceMap['plugin']
}
export interface ToolResultMessage extends Message {
  readonly role: 'user'
  readonly content: [ToolResultBlockCore]
  readonly source: ToolMessageSource
}

/* ── @deepseek-ai/dsh-llm/call-config ───────────────────────────────── */

export interface LlmCallConfig {
  provider: string
  model: string
  reasoningEffort?: ReasoningEffortId
  temperature?: number
  maxTokens?: number
  stop?: string[]
}

export interface LlmCallConfigAdapterDefaults {
  reasoningEffort?: true
  maxTokens?: true
}

/* ── @deepseek-ai/dsh-llm/assistant-stream（压缩流记录）──────────────── */

export type AssistantStreamRecord =
  | {
    readonly type: 'text-chunks'
    readonly time0: number
    readonly index: number
    readonly dt: readonly number[]
    readonly texts: readonly string[]
  }
  | {
    readonly type: 'reasoning-chunks'
    readonly time0: number
    readonly index: number
    readonly dt: readonly number[]
    readonly texts: readonly string[]
  }
  | {
    readonly type: 'tool-call-chunks'
    readonly time0: number
    readonly index: number
    readonly dt: readonly number[]
    readonly id: ToolCallId
    readonly name?: string
    readonly args: readonly string[]
  }
  | { readonly type: 'chunk'; readonly time: number; readonly chunk: StreamChunk }

export type RawStreamChunkType = Exclude<StreamChunk['type'], 'text-delta' | 'reasoning-delta' | 'tool-call-delta'>

/** 替代 @deepseek-ai/dsh-llm/assistant-stream 的 lastAssistantStreamChunk，行为等价。 */
export function lastAssistantStreamChunk<T extends RawStreamChunkType>(
  stream: readonly AssistantStreamRecord[],
  type: T,
): Extract<StreamChunk, { type: T }> | undefined {
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index] as AssistantStreamRecord
    if (record.type === 'chunk' && record.chunk.type === type) {
      return record.chunk as Extract<StreamChunk, { type: T }>
    }
  }
  return undefined
}

/* ── @deepseek-ai/dsh-llm-retry/types ───────────────────────────────── */

export type LlmRetryEventData =
  | {
    retryId: RetryId
    turn: number
    step: number
    provider: string
    mode: 'normal'
    policyKey: string
    retry: number
    maxRetries: number
    delayMs: number
    failure: LlmFailure
  }
  | {
    retryId: RetryId
    turn: number
    step: number
    provider: string
    mode: 'always'
    policyKey: string
    retry: number
    delayMs: number
    failure: LlmFailure
  }

export interface LlmRetryStartedEventData {
  retryId: RetryId
  turn: number
  step: number
  retry: number
}

/* ── @deepseek-ai/dsh-commands/types ────────────────────────────────── */

export interface CommandSourceMap { user: { kind: 'user' } }
export type CommandSource = CommandSourceMap[keyof CommandSourceMap]

/* ── @deepseek-ai/dsh-tools/types（PTC dispatch）────────────────────── */

export interface PtcDispatchStartEventData {
  rootCallId: ToolCallId
  parentCallId: ToolCallId
  subCallId: ToolCallId
  name: string
  arguments: unknown
}

export interface PtcDispatchEventData extends PtcDispatchStartEventData {
  isError: boolean
  content: ContentBlock[]
}

/* ── @deepseek-ai/dsh-agent/types（inbox）───────────────────────────── */

export type InboxTarget = 'next-turn' | 'next-step'

/* ── @deepseek-ai/dsh-tool-todo/types ───────────────────────────────── */

export interface TodoItem {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

/* ── @deepseek-ai/dsh-compaction ────────────────────────────────────── */

export interface CompactionStartEventData {
  compactionId: CompactionId
  sourceCommandId?: CommandId
  turn: number | null
}

export interface CompactionSummaryEventData {
  compactionId: CompactionId
  sourceCommandId?: CommandId
  summary: ContentBlock[]
  shadowedRange: { start: SessionSeq; end: SessionSeq }
  shadowedSeqs: SessionSeq[]
  shadowedTokenCount: number
  provider: string
  model: string
  maxTokens?: number
  usage?: TokenUsage
  rawOutput?: ContentBlock[]
  llmStreamCall?: true
}

export interface CompactionEndEventData {
  compactionId: CompactionId
  sourceCommandId?: CommandId
  turn: number | null
  error?: string
}

export interface CompactionCheckpointSource {
  readonly kind: 'plugin'
  readonly plugin: 'compact'
  readonly compactionId: CompactionId
  readonly sourceCommandId?: CommandId
}

/* ── @deepseek-ai/dsh-session/types ─────────────────────────────────── */

export type TurnEndCancelCause =
  | { readonly kind: 'user' }
  | { readonly kind: 'parent' }
  | { readonly kind: 'hook'; readonly reason: string }
  | { readonly kind: 'disposed' }

export type TurnEndReasonMap = {
  completed: { kind: 'completed' }
  aborted: { kind: 'aborted'; reason: TurnEndCancelCause }
  blocked: { kind: 'blocked' }
  error: { kind: 'error'; error: LlmFailure }
  'max-tokens': { kind: 'max-tokens' }
  interrupted: { kind: 'interrupted' }
}
export type TurnEndReason = TurnEndReasonMap[keyof TurnEndReasonMap]

export interface EpochHeader {
  config: LlmCallConfig
  adapterDefaults?: LlmCallConfigAdapterDefaults
  tools?: ToolSchema[]
}

export interface RequestContext {
  provider: string
  model: string
  contextWindow?: number
  systemPromptUpdate?: SystemPromptUpdate
}

export type RequestHeaderReason = 'initial' | 'resume' | 'change' | 'series'

/** 核心 SessionEventMap（@deepseek-ai/dsh-session/types）。 */
export interface CoreSessionEventMap {
  'turn/start': { turn: number }
  'turn/end': { turn: number; reason: TurnEndReason }
  'step/start': { turn: number; step: number }
  'step/end': { turn: number; step: number }
  'user/message': UserMessage
  'system/message': { turn: number; step: number; message: SystemMessage }
  'assistant/message': {
    turn: number
    step: number
    message: AssistantMessage
    stream: AssistantStreamRecord[]
    usage?: TokenUsage
    interrupted?: true
  }
  'assistant/attempt': { turn: number; step: number; stream: AssistantStreamRecord[] }
  'tool/call': { turn: number; step: number; callId: ToolCallId; name: string; arguments: string }
  'tool/result': {
    turn: number
    step: number
    message: ToolResultMessage
    error?: { name: string; code: string }
    meta?: unknown
  }
  'request/header': {
    header: EpochHeader
    reason: RequestHeaderReason
    startsSeries?: true
  }
  'request/context': RequestContext
  'session/end-seed': { inherited?: true }
}

/** 插件合并进 SessionEventMap 的事件面（llm-retry / commands / compaction / tools / agent / todo）。 */
export interface PluginSessionEventMap {
  'llm/retry': LlmRetryEventData
  'llm/retry-started': LlmRetryStartedEventData
  'command/run': { commandId: CommandId; name: string; args?: string; source: CommandSource }
  'command/done': {
    commandId: CommandId
    kind: 'success' | 'error'
    text?: string
    sourceEventSeq?: SessionSeq
  }
  'compaction/start': CompactionStartEventData
  'compaction/summary': CompactionSummaryEventData
  'compaction/end': CompactionEndEventData
  'tool/ptc-dispatch-start': PtcDispatchStartEventData
  'tool/ptc-dispatch': PtcDispatchEventData
  'agent/inbox/spliced': {
    target: InboxTarget
    start: number
    removedCount?: number
    inserted: UserMessage[]
    outcome?: 'canceled'
  }
  'todo/write': { todos: TodoItem[] }
}

export type SessionEventMap = CoreSessionEventMap & PluginSessionEventMap
export type SessionEventType = keyof SessionEventMap

export type SurfaceEventType =
  | 'system/message'
  | 'user/message'
  | 'assistant/message'
  | 'tool/result'

export type SurfaceEvent = SessionEvent<SurfaceEventType>

export type SurfaceOp =
  | 'append'
  | { op: 'replace'; startSeq: SessionSeq; endSeq: SessionSeq }

export type SurfaceIntent<T extends SurfaceEventType = SurfaceEventType> = {
  surfaceOp: SurfaceOp
} & (T extends 'assistant/message' ? {
  sourceEventSeqs?: never
} : {
  sourceEventSeqs?: SessionSeq[]
})

export type SessionEvent<T extends SessionEventType = SessionEventType> = {
  [K in SessionEventType]: {
    type: K
    seq: SessionSeq
    time: number
    data: SessionEventMap[K]
    ignorable?: true
  } & (K extends SurfaceEventType ? SurfaceIntent<K> : {
    surfaceOp?: never
    sourceEventSeqs?: never
  })
}[T]

/* ── @deepseek-ai/dsh-session/surface（值实现）───────────────────────── */

const SURFACE_EVENT_TYPES = new Set<string>([
  'system/message',
  'user/message',
  'assistant/message',
  'tool/result',
])

/** 替代 @deepseek-ai/dsh-session/surface 的 isSurfaceEvent，行为等价。 */
export function isSurfaceEvent(event: SessionEvent): event is SurfaceEvent {
  if (!SURFACE_EVENT_TYPES.has(event.type)) return false
  const candidate: { surfaceOp?: unknown } = event
  return candidate.surfaceOp !== undefined
}

/** 替代 @deepseek-ai/dsh-session/surface 的 isAppendSurfaceEvent，行为等价。 */
export function isAppendSurfaceEvent(
  event: SessionEvent,
): event is SurfaceEvent & { surfaceOp: 'append' } {
  return isSurfaceEvent(event) && event.surfaceOp === 'append'
}

/** 替代 @deepseek-ai/dsh-session/surface 的 isReplacementSurfaceEvent，行为等价。 */
export function isReplacementSurfaceEvent(
  event: SessionEvent,
): event is SurfaceEvent & { surfaceOp: Extract<SurfaceOp, { op: 'replace' }> } {
  return isSurfaceEvent(event) && event.surfaceOp !== 'append'
}

/* ── @deepseek-ai/dsh-api-session-controller/client ─────────────────── */

export interface AssistantLiveChunkEvent {
  readonly type: 'assistant/live-chunk'
  readonly seq: number
  readonly time: number
  readonly data: {
    readonly attemptId: LlmAttemptId
    readonly turn: number
    readonly step: number
    readonly chunk: StreamChunk
  }
}

export type SessionEventLike = SessionEvent | AssistantLiveChunkEvent

export type SessionEventLikeEntry =
  | { readonly type: 'event'; readonly event: SessionEvent }
  | { readonly type: 'transient'; readonly event: AssistantLiveChunkEvent }

export type SessionTransientEventEntry = Extract<SessionEventLikeEntry, { readonly type: 'transient' }>

export interface SessionAssistantSettlementEntry {
  readonly type: 'event'
  readonly event: SessionEvent<'assistant/message'> | SessionEvent<'assistant/attempt'>
}

/* ── @deepseek-ai/dsh-client-ui-conversation/client（图片面）────────── */

/** 持久引用或提交回声预览。 */
export type MessageImageSource =
  | { readonly attachment: ImageAttachmentRef }
  | {
    readonly preview: {
      readonly url: string
      readonly name?: string
      readonly width?: number
      readonly height?: number
    }
  }

/** 带可选同步缓存读取的持久图片加载器。 */
export type MessageImageLoader = ((attachment: ImageAttachmentRef) => Promise<string>) & {
  peek?: (attachment: ImageAttachmentRef) => string | undefined
}

/* ── @deepseek-ai/dsh-api-session-controller/client（提交回声）──────── */

/** 本地提交回声在持久准入前显示的一张图片。 */
export interface PendingSubmissionImage {
  readonly previewUrl: string
  readonly name?: string
  readonly width?: number
  readonly height?: number
}

export interface PendingSubmissionImageAttachment {
  readonly type: 'image'
  readonly value: PendingSubmissionImage
}

export interface PendingSubmissionFileAttachment {
  readonly type: 'file'
  readonly value: FileAttachmentRef
}

export type PendingSubmissionAttachment =
  | PendingSubmissionImageAttachment
  | PendingSubmissionFileAttachment

export type PendingSubmissionPlacement = 'transcript' | 'queued' | 'steering'

/** 本地 prompt 提交回声（仅客户端内存，刷新后重建）。 */
export interface PendingSubmission {
  readonly requestId: string
  readonly placement: PendingSubmissionPlacement
  readonly time: number
  readonly text: string
  readonly attachments: readonly PendingSubmissionAttachment[]
}

/* ── @deepseek-ai/dsh-client-ui-slots（t 座位 / 渲染插槽面）──────────── */

/** 替代 @deepseek-ai/dsh-client-ui-slots 的 Translate，行为等价签名。 */
export type Translate<K extends string = string> =
  (key: K, params?: Record<string, unknown>) => string

/** 键控渲染器收到的运行时份额（node 载荷 + 共享动作），收敛自 PropsRuntime。 */
export interface KeyedRuntimeProps<Owner extends object = object> {
  /** 渲染该节点所在视图的会话 id。 */
  sessionId: string
  /** Owner 供应的共享货币。 */
  owner: Owner
}

/** 渲染插槽分发座位（收敛自 PropsRenderSlots 的 renderSlot 成员）。 */
export type RenderSlot<K extends string, Owner extends object> =
  (slot: K, owner: Owner, options?: { entryKey?: string; fallback?: ReactNodeLike }) => ReactNodeLike

/** PropsRenderSlots 收敛面（ToolRow 等组件引用）。 */
export type PropsRenderSlots<K extends string, Owner extends object> = {
  renderSlot: RenderSlot<K, Owner>
}

export type ReactNodeLike = import('react').ReactNode

/* ── @deepseek-ai/dsh-client-store ──────────────────────────────────── */

/** 替代 @deepseek-ai/dsh-client-store 的 ObservableSnapshot。 */
export interface ObservableSnapshot<T> {
  getSnapshot(): T
  subscribe(fn: () => void): () => void
}

/** 替代 @deepseek-ai/dsh-client-store 的 SnapshotStore（可写面）。 */
export interface SnapshotStore<T> extends ObservableSnapshot<T> {
  update(mutator: (draft: T) => void): void
  set(next: T): void
}

/** 替代 @deepseek-ai/dsh-client-store 的 notifySubscribers，行为等价。 */
export function notifySubscribers<Args extends readonly unknown[]>(
  listeners: Iterable<(...args: Args) => void>,
  label: string,
  ...args: Args
): void {
  for (const listener of [...listeners]) {
    try {
      listener(...args)
    } catch (error) {
      console.error(`${label} subscriber failed:`, error)
    }
  }
}

/* ── @deepseek-ai/dsh-util-workspace-path（值实现）──────────────────── */

function isWindowsStylePath(value: string): boolean {
  return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith('\\\\')
}

/** 替代 @deepseek-ai/dsh-util-workspace-path 的 resolveWorkspacePath，行为等价。 */
export function resolveWorkspacePath(cwd: string | undefined, path: string): string {
  if (path.startsWith('/') || isWindowsStylePath(path)) return path
  if (cwd === undefined || cwd === '') return path
  const separator = isWindowsStylePath(cwd) && cwd.includes('\\') ? '\\' : '/'
  const base = cwd.replace(/[/\\]+$/, '')
  const relative = path.replace(/^[/\\]+/, '')
  return `${base}${separator}${relative}`
}

/** 替代 @deepseek-ai/dsh-util-workspace-path 的 abbreviateHomePath，行为等价。 */
export function abbreviateHomePath(path: string, home?: string): string {
  if (home === undefined || home === '') return path
  if (isWindowsStylePath(path) || isWindowsStylePath(home)) return path
  const root = home.replace(/\/+$/, '')
  if (root === '' || root === '/') return path
  if (path.replace(/\/+$/, '') === root) return '~'
  if (path.startsWith(`${root}/`)) return `~${path.slice(root.length)}`
  return path
}

/** 替代 @deepseek-ai/dsh-util-workspace-path 的 relativizeToCwd，行为等价。 */
export function relativizeToCwd(text: string, cwd: string | undefined): string {
  if (cwd === undefined || cwd === '') return text
  const root = cwd.replace(/[/\\]+$/, '')
  if (text.startsWith(`${root}/`) || text.startsWith(`${root}\\`)) return text.slice(root.length + 1)
  return text
}

/* ── @deepseek-ai/dsh-client-ui-conversation/client（会话记录）───────── */

export interface AssistantRequestConfig {
  provider: string
  model: string
  purpose?: string
  thinking?: string
  reasoningEffort?: string
  temperature?: number
  maxTokens?: number
  stop?: readonly string[]
}

export interface AssistantProvenanceView {
  provider: string
  model: string
}

export type AssistantBlock =
  | { kind: 'text'; text: string }
  | { kind: 'reasoning'; text: string }
  | { kind: 'image'; attachment: ImageAttachmentRef }
  | { kind: 'tool-call'; callId: string; name: string; argsRaw: string }
  | { kind: 'other'; block: unknown }

export interface UserMessageNode {
  kind: 'user'
  seq: number
  time: number
  content: readonly ContentBlock[]
  source: unknown
}

export interface AssistantTiming {
  stepStartTime: number | null
  firstTokenTime: number | null
  completedTime: number
}

export interface AssistantMessageNode {
  kind: 'assistant'
  seq: number
  messageId?: MessageId
  time: number
  turn: number
  step: number
  blocks: readonly AssistantBlock[]
  usage?: unknown
  provenance?: AssistantProvenanceView
  requestConfig?: AssistantRequestConfig
  timing?: AssistantTiming
  interrupted?: true
}

export interface SteeringMessageNode {
  kind: 'steering'
  messageId: MessageId
  seq: number
  time: number
  content: readonly ContentBlock[]
  source: unknown
}

export type ContextRole = 'inject' | 'recall'

export interface ContextProvenanceView {
  role: ContextRole
  label: string | null
}

export type KnownContextForm = 'instructions' | 'catalog' | 'snapshot' | 'notice' | 'relay' | 'recall'

export interface ContextMessageNode {
  kind: 'context'
  seq: number
  time: number
  content: readonly ContentBlock[]
  source: unknown
  provenance: ContextProvenanceView
  form: KnownContextForm | null
}

export type ModelRetryNode = LlmRetryEventData & {
  kind: 'model-retry'
  seq: number
  time: number
  retryState: 'scheduled' | 'started' | 'cancelled'
}

export interface TurnErrorNode {
  kind: 'turn-error'
  seq: number
  time: number
  turn: number
  step: number
  message: string
  code?: string
}

export interface TurnMaxTokensNode {
  kind: 'turn-max-tokens'
  seq: number
  time: number
  turn: number
  step: number
}

export interface ToolResultNode {
  kind: 'tool-result'
  seq: number
  time: number
  callId: string
  parentCallId?: string
  call: { name: string; argsRaw: string } | null
  callTime: number | null
  content: readonly ContentBlock[]
  isError: boolean
  error?: { name: string; code: string }
  meta?: unknown
  subCalls: readonly ToolCallBlock[]
}

export interface CompactionSummaryNode {
  kind: 'compaction'
  seq: number
  time: number
  summary: string | null
  summaryEventSeq: number | null
  shadowedItemCount: number | null
  shadowedTokenCount: number | null
}

export interface UnknownSurfaceNode {
  kind: 'unknown'
  seq: number
  time: number
  type: string
  data: unknown
}

export interface CommandNode {
  kind: 'command'
  seq: number
  time: number
  commandId: CommandId
  name: string | null
  args: string | null
  outcome: {
    kind: 'success' | 'error'
    text?: string
    sourceEventSeq?: number
  } | null
}

export type ConversationNode =
  | UserMessageNode
  | AssistantMessageNode
  | SteeringMessageNode
  | ContextMessageNode
  | ModelRetryNode
  | TurnErrorNode
  | TurnMaxTokensNode
  | ToolResultNode
  | CommandNode
  | CompactionSummaryNode
  | UnknownSurfaceNode

export interface RunningToolCall {
  callId: string
  parentCallId?: string
  name: string
  argsRaw: string
  turn: number
  step: number
  time: number
  subCalls: readonly ToolCallBlock[]
}

export type ToolCallBlock = RunningToolCall | ToolResultNode

export interface PartialAssistant {
  turn: number
  step: number
  blocks: readonly AssistantBlock[]
}

/* ── ui-conversation：位置 / 引擎契约 ───────────────────────────────── */

export interface ConversationMatchResult {
  readonly id: string
  readonly role: 'start' | 'update'
}

/**
 * 轮/步级业务值注册表。原实现经 declare module 由各 definition 合并；
 * 本地按源合并结果预先收敛（turn-tail / turn-process / assistant-step）。
 */
export interface ConversationTurnDataMap {
  /** conversation-nodes/turn-tail.ts：完成轮的页脚事实。 */
  'turn-tail': import('./contract/chat-nodes.ts').TurnTailChatData
  /** conversation-nodes/turn-process.ts：过程区间与定稿回答边界。 */
  'turn-process': import('./contract/turn-process.ts').TurnProcessSpec
}

export interface ConversationStepDataMap {
  /** conversation-nodes/assistant.ts：本步 Assistant 材料。 */
  'assistant-step': import('./contract/chat-nodes.ts').AssistantChatData
}

export interface ConversationLocationDataSource<Value> {
  readonly getSnapshot: () => Value
  readonly subscribe: (listener: () => void) => () => void
}

export interface ConversationLocationDataStore<DataMap extends object> {
  get<Key extends keyof DataMap & string>(key: Key): Readonly<DataMap[Key]> | undefined
  source<Key extends keyof DataMap & string>(
    key: Key,
  ): ConversationLocationDataSource<Readonly<DataMap[Key]> | undefined>
}

interface ConversationLocationDataValue {
  readonly kind: 'turn' | 'step'
  readonly turn: number
  readonly step?: number
  readonly key: string
  readonly value: unknown
}

type RegisteredTurnData<DataMap extends object> = {
  [Key in Extract<keyof DataMap, string>]: {
    readonly kind: 'turn'
    readonly turn: number
    readonly key: Key
    readonly value: DataMap[Key]
  }
}[Extract<keyof DataMap, string>]

type RegisteredStepData<DataMap extends object> = {
  [Key in Extract<keyof DataMap, string>]: {
    readonly kind: 'step'
    readonly turn: number
    readonly step: number
    readonly key: Key
    readonly value: DataMap[Key]
  }
}[Extract<keyof DataMap, string>]

type ConversationLocationDataOf<TurnData extends object, StepData extends object> =
  [keyof TurnData | keyof StepData] extends [never]
    ? ConversationLocationDataValue
    : RegisteredTurnData<TurnData> | RegisteredStepData<StepData>

export type ConversationLocationData = ConversationLocationDataOf<
  ConversationTurnDataMap,
  ConversationStepDataMap
>

export interface StepLocation {
  readonly turn: number
  readonly step: number
  readonly start: SessionEvent<'step/start'> | undefined
  readonly end: SessionEvent<'step/end'> | undefined
  readonly status: 'open' | 'closed' | 'unknown'
  readonly data: ConversationLocationDataStore<ConversationStepDataMap>
}

export interface TurnLocation {
  readonly turn: number
  readonly start: SessionEvent<'turn/start'> | undefined
  readonly end: SessionEvent<'turn/end'> | undefined
  readonly status: 'open' | 'closed' | 'unknown'
  readonly steps: readonly StepLocation[]
  readonly data: ConversationLocationDataStore<ConversationTurnDataMap>
}

export type ConversationLocation =
  | { readonly kind: 'session' }
  | { readonly kind: 'turn'; readonly turn: TurnLocation }
  | { readonly kind: 'step'; readonly turn: TurnLocation; readonly step: StepLocation }
  | { readonly kind: 'unresolved' }

interface ConversationMatchOf<
  Event extends SessionEventLike,
  Role extends ConversationMatchResult['role'],
> {
  readonly event: Event
  readonly role: Role
  readonly location: ConversationLocation
}

export type ConversationStartMatch = ConversationMatchOf<SessionEvent, 'start'>
export type ConversationMatch =
  | ConversationStartMatch
  | ConversationMatchOf<SessionEventLike, 'update'>

export interface ConversationViewNode {
  readonly key: string
  readonly kind: string
  readonly id: string
  readonly target: string
  readonly data: unknown
}

export interface ConversationNodeContext<State = unknown> {
  readonly key: string
  readonly kind: string
  readonly id: string
  readonly matches: readonly ConversationMatch[]
  readonly start: ConversationStartMatch | undefined
  readonly state: State | undefined
  readonly current: ReadonlyMap<string, ConversationViewNode | null>
}

export interface ConversationPreviousContext<State = unknown> {
  readonly key: string
  readonly kind: string
  readonly id: string
  readonly startSeq: number
  readonly state: Readonly<State>
  readonly matches: readonly ConversationMatch[]
}

export interface ConversationContextReader {
  previous<State>(kind: string): ConversationPreviousContext<State> | undefined
}

export type ConversationPublication = 'none' | 'animation-frame' | 'immediate'
export type ConversationLocationDataScope = 'step' | 'turn'

export interface ConversationNodeDefinition<State = unknown> {
  readonly kind: string
  readonly target?: string
  match(event: SessionEventLike): ConversationMatchResult | null
  start(
    context: ConversationNodeContext<State>,
    match: ConversationStartMatch,
    reader: ConversationContextReader,
  ): State
  update(
    context: ConversationNodeContext<State> & { readonly state: State },
    match: ConversationMatch,
  ): State
  publication?(match: ConversationMatch): ConversationPublication
  buildLocationData?(
    context: ConversationNodeContext<State>,
    scope: ConversationLocationDataScope,
    previous: ConversationLocationData | null,
  ): ConversationLocationData | null
  buildViewNode?(context: ConversationNodeContext<State>): ConversationViewNode | null
}

export interface ConversationTimelineSnapshot {
  readonly turnOrder: readonly number[]
  readonly turns: ReadonlyMap<number, TurnLocation>
}

export interface ConversationViewBuilder<Node extends ConversationViewNode = ConversationViewNode, Snapshot = unknown> {
  readonly empty: Snapshot
  replace(input: {
    readonly nodes: readonly Node[]
    readonly timeline: ConversationTimelineSnapshot
  }): Snapshot
  apply(input: {
    readonly upserts: readonly Node[]
    readonly timeline: ConversationTimelineSnapshot
  }): Snapshot
}

export interface ConversationViewDefinition<Node extends ConversationViewNode = ConversationViewNode, Snapshot = unknown> {
  readonly target: string
  create(): ConversationViewBuilder<Node, Snapshot>
  isActive?(snapshot: Snapshot): boolean
}

/** 替代 ui-conversation contract/conversation.ts 的 conversationContextKey，行为等价。 */
export function conversationContextKey(kind: string, id: string): string {
  return `${kind.length}:${kind}${id}`
}

/* ── ui-conversation：system-prompt / request-inspection 契约 ───────── */

export interface SystemPromptNode {
  seq: number
  time: number
  turn: number
  step: number
  text: string
  update: boolean
}

export interface ConversationPromptSnapshot {
  config: AssistantRequestConfig
  system: string
  tools: readonly ToolSchema[]
}

export interface RequestPromptChange {
  seq: number
  time: number
  kind: 'initial' | 'system' | 'tools' | 'system-and-tools'
  previous?: ConversationPromptSnapshot
}

export interface RequestPromptInspection {
  prompt: ConversationPromptSnapshot
  change?: RequestPromptChange
}

export type RequestPromptInspector = (
  previous: ConversationPromptSnapshot | undefined,
  event: SessionEvent<'request/header'>,
  system: SystemPromptNode | undefined,
) => RequestPromptInspection
