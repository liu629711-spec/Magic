// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/models/read-card-model.ts

import type { ReadBlockLine, ReadBlockProps } from '@deepseek-ai/dsh-client-ui-primitives'
import { abbreviateHomePath, relativizeToCwd } from '../../vendor-types.ts'
import type { ToolCallBlock } from './tool-call-model.ts'
import { parsedToolCall, singleResultText } from './raw-tool-call.ts'

/** 聊天行的 read 主体折叠中段前保留的内容行数。 */
export const CHAT_READ_MAX_LINES = 8

/** 该推导拥有的 ReadBlock props。 */
export type ReadCardModel = Pick<ReadBlockProps, 'label' | 'lines' | 'totalLines' | 'lang'>

interface ReadMeta {
  path: string
  offset: number
  lines: ReadBlockLine[]
  totalLines: number
  lang?: string
}

/** 模型参数是 1-based 行位置或计数：至少为 1 的整数。 */
function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1
}

function validReadCall(block: ToolCallBlock): boolean {
  const call = parsedToolCall(block)
  if (call?.name !== 'read') return false
  const { file_path: path, offset, limit } = call.args
  if (typeof path !== 'string' || path.trim() === '') return false
  if (offset !== undefined && !positiveInteger(offset)) return false
  if (limit !== undefined && !positiveInteger(limit)) return false
  return true
}

function readMeta(meta: unknown): ReadMeta | null {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return null
  const { path, offset, lines, totalLines, lang } = meta as Record<string, unknown>
  if (typeof path !== 'string' || typeof offset !== 'number' || !Number.isInteger(offset) || offset < 1) return null
  if (typeof totalLines !== 'number' || !Number.isInteger(totalLines) || totalLines < 0 || !Array.isArray(lines)) return null
  if (lang !== undefined && typeof lang !== 'string') return null
  const narrowed: ReadBlockLine[] = []
  let previous = offset - 1
  for (const line of lines) {
    if (typeof line !== 'object' || line === null || Array.isArray(line)) return null
    const { number, text } = line as Record<string, unknown>
    if (typeof number !== 'number' || !Number.isInteger(number) || number < 1 || number <= previous) return null
    if (number > totalLines || typeof text !== 'string') return null
    previous = number
    narrowed.push({ number, text })
  }
  return {
    path,
    offset,
    lines: narrowed,
    totalLines,
    ...lang === undefined ? {} : { lang },
  }
}

/** 一个 read 调用针对的行，取自其参数。 */
export function readCallLine(block: ToolCallBlock): number | undefined {
  if (!validReadCall(block)) return undefined
  const { offset } = parsedToolCall(block)?.args ?? {}
  return positiveInteger(offset) ? offset : undefined
}

/** 校验持久元数据与模型侧 read 信封后推导落定的根 read 卡片。 */
export function readCardModel(
  block: ToolCallBlock,
  sessionCwd?: string,
  home?: string,
): ReadCardModel | null {
  if (block.parentCallId !== undefined || !('kind' in block) || block.isError) return null
  if (!validReadCall(block)) return null
  const meta = readMeta(block.meta)
  if (meta === null) return null
  const text = singleResultText(block)
  if (text === undefined) return null
  const body = /^<path>[^\n]*<\/path>\n<type>file<\/type>\n<content>\n([\s\S]*)\n<\/content>$/u.exec(text)?.[1]
  if (body === undefined) return null
  return {
    label: abbreviateHomePath(relativizeToCwd(meta.path, sessionCwd), home),
    lines: meta.lines,
    totalLines: meta.totalLines,
    lang: meta.lang,
  }
}
