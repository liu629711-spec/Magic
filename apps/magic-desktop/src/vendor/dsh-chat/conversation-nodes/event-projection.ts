// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/conversation-nodes/event-projection.ts

import type { ContentBlock, StreamChunk } from '../vendor-types.ts'
import type {
  AssistantBlock, ContextProvenanceView, KnownContextForm,
} from '../vendor-types.ts'

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function collect(source: Record<string, unknown>, member: string, field: string): string[] {
  const list = source[member]
  if (!Array.isArray(list)) return []
  const seen: string[] = []
  for (const entry of list) {
    const record = asRecord(entry)
    const value = record === null ? null : readString(record, field)
    if (value !== null && !seen.includes(value)) seen.push(value)
  }
  return seen
}

function joined(names: string[]): string | null {
  return names.length > 0 ? names.join(', ') : null
}

/** Chat 结构化呈现的形态；未知的可合并值保持不透明。 */
const KNOWN_FORMS: readonly KnownContextForm[] = [
  'instructions', 'catalog', 'snapshot', 'notice', 'relay', 'recall',
]

/** 从持久消息源读取目标支持的呈现形态。 */
export function contextForm(source: unknown): KnownContextForm | null {
  const record = asRecord(source)
  const form = record === null ? null : readString(record, 'form')
  return form !== null && (KNOWN_FORMS as readonly string[]).includes(form)
    ? form as KnownContextForm
    : null
}

/** 把持久消息源投影到 Chat 行的角色与生产者标签。 */
export function contextProvenance(source: unknown): ContextProvenanceView {
  const record = asRecord(source)
  const kind = record === null ? null : readString(record, 'kind')
  if (record === null || kind === null) return { role: 'inject', label: null }
  switch (kind) {
    case 'session-reference':
      return { role: 'recall', label: joined(collect(record, 'references', 'label')) ?? kind }
    case 'agent-instructions':
      return { role: 'inject', label: joined(collect(record, 'changes', 'path')) ?? kind }
    case 'plugin':
      return { role: 'inject', label: readString(record, 'plugin') ?? kind }
    case 'skill-invocation':
      return { role: 'inject', label: readString(record, 'name') ?? kind }
    default:
      return { role: 'inject', label: kind }
  }
}

/** 读取持久跨会话召回源引用的不同标签。 */
export function sessionRecallLabels(source: unknown): string[] {
  const record = asRecord(source)
  if (record === null || readString(record, 'kind') !== 'session-reference') return []
  return collect(record, 'references', 'label')
}

/** 读取一个持久 skill-invocation 注入加载的技能名。 */
export function skillInvocationName(source: unknown): string | null {
  const record = asRecord(source)
  if (record === null || readString(record, 'kind') !== 'skill-invocation') return null
  return readString(record, 'name')
}

/** 为 Chat 渲染分类落定的 Assistant 内容。 */
export function toAssistantBlocks(content: readonly ContentBlock[]): AssistantBlock[] {
  return content.map(toAssistantBlock)
}

/** 为 Chat 渲染分类一个落定的 Assistant 块。 */
export function toAssistantBlock(block: ContentBlock): AssistantBlock {
  switch (block.type) {
    case 'text': return { kind: 'text', text: block.text }
    case 'reasoning': return { kind: 'reasoning', text: block.text }
    case 'image': return { kind: 'image', attachment: block.attachment }
    case 'tool-call': return { kind: 'tool-call', callId: String(block.id), name: block.name, argsRaw: block.arguments }
    default: return { kind: 'other', block }
  }
}

/** 为一种流式 Assistant 块 kind 创建初始 Chat 块。 */
export function emptyAssistantBlock(blockType: string): AssistantBlock {
  switch (blockType) {
    case 'text': return { kind: 'text', text: '' }
    case 'reasoning': return { kind: 'reasoning', text: '' }
    case 'tool-call': return { kind: 'tool-call', callId: '', name: '', argsRaw: '' }
    default: return { kind: 'other', block: null }
  }
}

/** Chat 投影保留的展示安全失败字段。 */
export interface DisplayFailure {
  readonly code?: string
  readonly message: string
}

/** 把持久失败转换为对 locale 无关、对 Chat 安全的字段。 */
export function displayFailure(failure: unknown): DisplayFailure {
  if (failure === null || typeof failure !== 'object') return { message: String(failure) }
  const record = failure as { code?: unknown; message?: unknown }
  const code = typeof record.code === 'string' ? record.code : undefined
  // Provider AUTH messages may echo a masked or partially preserved credential.
  // Keep the raw diagnostic in the Session log, but never retain it in UI state.
  if (code === 'AUTH') return { code, message: '' }
  return {
    ...(code === undefined ? {} : { code }),
    message: typeof record.message === 'string' ? record.message : JSON.stringify(failure),
  }
}

/** 测试流块是否携带对 Chat 计时可见的模型输出。 */
export function isTokenDelta(chunk: StreamChunk): boolean {
  switch (chunk.type) {
    case 'text-delta':
    case 'reasoning-delta':
      return chunk.text !== ''
    case 'tool-call-delta':
      return chunk.argumentsDelta !== '' || chunk.name !== undefined
    default:
      return false
  }
}
