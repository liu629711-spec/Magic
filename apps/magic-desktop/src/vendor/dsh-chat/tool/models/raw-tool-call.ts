// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/models/raw-tool-call.ts

import type { ToolCallBlock, ToolResultNode } from '../../vendor-types.ts'

/** 带对象参数的已解析、在窗口内的 Tool 调用头。 */
export interface ParsedToolCall {
  name: string
  args: Record<string, unknown>
}

const parsedCalls = new WeakMap<ToolCallBlock, ParsedToolCall | null>()

/** 解析与一个不可变 Tool 块配对的调用头。 */
export function parsedToolCall(block: ToolCallBlock): ParsedToolCall | null {
  const cached = parsedCalls.get(block)
  if (cached !== undefined || parsedCalls.has(block)) return cached ?? null
  const call = 'kind' in block ? block.call : block
  if (call === null) {
    parsedCalls.set(block, null)
    return null
  }
  let value: unknown
  try {
    value = JSON.parse(call.argsRaw)
  } catch {
    parsedCalls.set(block, null)
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    parsedCalls.set(block, null)
    return null
  }
  const parsed = { name: call.name, args: value as Record<string, unknown> }
  parsedCalls.set(block, parsed)
  return parsed
}

/** 读取一方卡片推导消费的精确单个文本块。 */
export function singleResultText(block: ToolResultNode): string | undefined {
  if (block.content.length !== 1) return undefined
  const only = block.content[0]
  return only?.type === 'text' ? only.text : undefined
}

/** 校验一方 shell 与文件变更工具共享的可选提权对。 */
export function validEscalationFields(args: Record<string, unknown>): boolean {
  const permission = args.sandbox_permissions
  const justification = args.justification
  if (permission === undefined && justification === undefined) return true
  if (permission !== 'workspace-write' && permission !== 'danger-full-access') return false
  return typeof justification === 'string' && justification.trim() !== ''
}
