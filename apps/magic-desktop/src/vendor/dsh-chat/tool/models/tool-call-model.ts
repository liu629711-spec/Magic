// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/models/tool-call-model.ts
// （LocaleKeysOf<'conversation'> 收敛为本地 ConversationKey；
// @deepseek-ai/dsh-util-workspace-path 的两个工具由 vendor-types 的等价实现供应。）

import type { ToolResultNode } from '../../vendor-types.ts'
import type { ToolCallBlock } from '../../vendor-types.ts'
import { abbreviateHomePath, relativizeToCwd } from '../../vendor-types.ts'
import type { ConversationKey } from '../../locale/conversation.ts'

// The block union's defining home is runtime (fold-product types); this
// contract only forwards it (type-definition authority stays with the layer
// that produces the values).
export type { ToolCallBlock } from '../../vendor-types.ts'

/** 泛型原子渲染器选择的 Tool 行变体。 */
export type ToolRowVariant = 'search' | 'read' | 'bash' | 'write' | 'edit' | 'code' | 'others'

/** 行状态语义；颜色由 StateDot 自供。 */
export type ToolRowState = 'running' | 'ok' | 'error' | 'stopped'

type ToolTitleKey = Extract<ConversationKey, `tool.title.${string}`>

/** 每个泛型行变体的 locale 键。 */
export const VARIANT_TITLE_KEYS = {
  search: 'tool.title.search', read: 'tool.title.read', bash: 'tool.title.bash',
  write: 'tool.title.write', edit: 'tool.title.edit', code: 'tool.title.code',
  others: 'tool.title.generic',
} as const satisfies Record<ToolRowVariant, ToolTitleKey>

/** 已知工具名 -> 变体。 */
const TOOL_VARIANTS: Record<string, ToolRowVariant> = {
  bash: 'bash',
  pwsh: 'bash',
  read: 'read',
  read_image: 'read',
  web_fetch: 'read',
  web_search: 'search',
  grep: 'search',
  glob: 'search',
  write: 'write',
  edit: 'edit',
  run_code: 'code',
  cordis_package_inspect: 'read',
  cordis_runtime_inspect: 'read',
  cordis_run: 'others',
  cordis_stop: 'others',
  cordis_undefine: 'others',
}

/** 细化泛型行变体而不替换它的工具专属标题。 */
const TOOL_TITLE_KEYS: Record<string, ToolTitleKey> = {
  cordis_package_inspect: 'tool.title.inspect',
  cordis_runtime_inspect: 'tool.title.inspect',
  cordis_run: 'tool.title.runCordis',
  cordis_stop: 'tool.title.stopCordis',
  cordis_undefine: 'tool.title.removeCordis',
  pwsh: 'tool.title.pwsh',
  read_image: 'tool.title.readImage',
}

/** 把工具名分类进其行变体。 */
export function classifyTool(toolName: string): ToolRowVariant {
  return TOOL_VARIANTS[toolName] ?? 'others'
}

/** ToolRow 需要的一切，从冻结切片一次性推导。 */
export interface ToolRowModel {
  variant: ToolRowVariant
  titleKey: ToolTitleKey
  summary: string
  filePath: string | undefined
  bodyRaw: string | null
  output: string | null
  errorSummary: string | null
  state: ToolRowState
}

/** 把落定结果的内容块扁平化为展示文本。 */
export function resultText(node: ToolResultNode): string {
  const parts: string[] = []
  for (const block of node.content) {
    if (block.type === 'text') parts.push(block.text)
    else parts.push(JSON.stringify(block, null, 2))
  }
  if (parts.length === 0 && node.error !== undefined) {
    parts.push(`${node.error.name}: ${node.error.code}`)
  }
  return parts.join('\n')
}

function parseArgs(argsRaw: string): unknown {
  try {
    return JSON.parse(argsRaw)
  } catch {
    return undefined
  }
}

function firstLine(text: string): string {
  const nl = text.indexOf('\n')
  return nl === -1 ? text : text.slice(0, nl)
}

function pickString(args: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const v = args[key]
    if (typeof v === 'string' && v !== '') return v
  }
  return undefined
}

/** 每个变体的摘要键偏好。 */
const SUMMARY_KEYS: Record<ToolRowVariant, readonly string[]> = {
  bash: ['description', 'command'],
  read: ['path', 'file_path', 'url'],
  search: ['query', 'pattern', 'url'],
  write: ['path', 'file_path'],
  edit: ['path', 'file_path'],
  code: ['description'],
  others: [],
}

function deriveSummary(variant: ToolRowVariant, argsRaw: string): string {
  const parsed = parseArgs(argsRaw)
  if (typeof parsed !== 'object' || parsed === null) return firstLine(argsRaw)
  const args = parsed as Record<string, unknown>
  if (variant === 'search' && Array.isArray(args.queries)) {
    const queries = args.queries.filter((query): query is string => typeof query === 'string' && query !== '')
    if (queries.length > 0) return queries.map(firstLine).join(', ')
  }
  const picked = pickString(args, SUMMARY_KEYS[variant])
  if (picked !== undefined) return firstLine(picked)
  for (const v of Object.values(args)) {
    if (typeof v === 'string' && v !== '') return firstLine(v)
  }
  return firstLine(argsRaw)
}

/** 仅路径键——绝不用 `url`（web_fetch 落在 read 变体上）。 */
const FILE_PATH_KEYS = ['path', 'file_path'] as const

/** 摘要可为可打开工作区路径的文件工具变体。 */
const FILE_PATH_VARIANTS: ReadonlySet<ToolRowVariant> = new Set(['read', 'write', 'edit'])

function deriveFilePath(variant: ToolRowVariant, argsRaw: string): string | undefined {
  if (!FILE_PATH_VARIANTS.has(variant)) return undefined
  const parsed = parseArgs(argsRaw)
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const picked = pickString(parsed as Record<string, unknown>, FILE_PATH_KEYS)
  return picked === undefined ? undefined : firstLine(picked)
}

/** 行的泛型输入主体可见时格式化一个参数载荷。 */
export function formatToolBody(variant: ToolRowVariant, argsRaw: string): string | null {
  if (argsRaw === '') return null
  const parsed = parseArgs(argsRaw)
  if (parsed === undefined) return argsRaw
  if (variant === 'code' && typeof parsed === 'object' && parsed !== null) {
    const code = (parsed as Record<string, unknown>).code
    if (typeof code === 'string' && code !== '') return code
  }
  return JSON.stringify(parsed, null, 2)
}

/** 从冻结调用切片推导完整行模型。 */
export function toolRowModel(toolName: string, block: ToolCallBlock, cwd?: string, home?: string): ToolRowModel {
  const variant = classifyTool(toolName)
  const done = 'kind' in block
  const argsRaw = (done ? block.call?.argsRaw : block.argsRaw) ?? ''
  const state: ToolRowState = !done ? 'running'
    : block.error?.code === 'interrupted' ? 'stopped'
      : block.isError ? 'error' : 'ok'
  const base = argsRaw === ''
    ? block.callId
    : abbreviateHomePath(relativizeToCwd(deriveSummary(variant, argsRaw), cwd), home)
  const toolTitleKey = TOOL_TITLE_KEYS[toolName]
  const summary = variant === 'others' && toolName !== '' && toolTitleKey === undefined
    ? `${toolName} · ${base}`
    : base
  const output = done ? (resultText(block) || null) : null
  const errorSummary = state === 'error' && output !== null ? firstLine(output) : null
  const bodyRaw = argsRaw === '' ? null : argsRaw
  return {
    variant,
    titleKey: toolTitleKey ?? VARIANT_TITLE_KEYS[variant],
    summary,
    filePath: deriveFilePath(variant, argsRaw),
    bodyRaw,
    output,
    errorSummary,
    state,
  }
}
