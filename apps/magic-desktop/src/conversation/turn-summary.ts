// 搬自 Magic plugins/magic-ceo-ui/src/turn-summary.ts + process-summary.ts（classifyToolName 部分）。
// 2026-09-17 用户裁定：会话区折叠头直接复用 Magic 组合网页端已验收的 TurnProcessSummary
// 实现；本数据层为纯函数（无 React / 无 cordis），快照契约 snapshot.legacy.nodes +
// legacy.turnTimings 与 vendor/dsh-chat 的 ChatSnapshot 完全一致，仅抽掉对 team.ts 的依赖。
import type { ChatNode } from '../vendor/dsh-chat/index.ts'

export type ProcessCategory = 'explore' | 'search' | 'edit' | 'run' | 'other'

export interface TurnProcessSpecLike {
  readonly turn: number
  readonly processStartSeq: number
  readonly answerAnchorSeq: number | null
  readonly toolCallCount: number
  readonly messageCount: number
  readonly subagentCount: number
}

export interface TurnNodeLike {
  readonly kind: string
  readonly seq: number
  readonly call?: { readonly name: string } | null
}

export interface TurnSnapshotLike {
  readonly legacy?: {
    readonly nodes?: readonly TurnNodeLike[]
    readonly turnTimings?: ReadonlyMap<number, { readonly startTime: number; readonly endTime?: number }>
  }
}

export interface TurnToolSummary {
  readonly names: readonly string[]
  readonly startTime?: number
  readonly endTime?: number
}

export const EMPTY_TURN_TOOL_SUMMARY: TurnToolSummary = { names: [] }

/** 容忍性分类：顺序敏感（edit 先于 explore，避免 'todo_write' 落进探索）。 */
export function classifyToolName(name: string): ProcessCategory {
  const lower = name.toLowerCase()
  if (/(edit|write|patch|apply)/.test(lower)) return 'edit'
  if (/(grep|search|find)/.test(lower)) return 'search'
  if (/(bash|exec|command|shell|run|test|build|install)/.test(lower)) return 'run'
  if (/(read|view|list|glob|dir|open|fetch|browse|source)/.test(lower)) return 'explore'
  return 'other'
}

/** 该轮 process 区间内的工具名（窗口截断导致 call 缺头时记为 'unknown'）。 */
export function collectTurnToolNames(
  nodes: readonly TurnNodeLike[],
  spec: Pick<TurnProcessSpecLike, 'processStartSeq' | 'answerAnchorSeq'>,
): string[] {
  const names: string[] = []
  for (const node of nodes) {
    if (node.kind !== 'tool-result') continue
    if (node.seq < spec.processStartSeq) continue
    if (spec.answerAnchorSeq !== null && node.seq >= spec.answerAnchorSeq) continue
    names.push(node.call?.name ?? 'unknown')
  }
  return names
}

export function categorizeToolNames(names: readonly string[]): Record<ProcessCategory, number> {
  const counts: Record<ProcessCategory, number> = { explore: 0, search: 0, edit: 0, run: 0, other: 0 }
  for (const name of names) counts[classifyToolName(name)] += 1
  return counts
}

const selectorCache = new WeakMap<object, {
  timings: object
  byTurn: Map<string, TurnToolSummary>
}>()

/**
 * useChat 的选择器：按 turn 收集工具名与起止时间。
 * 返回引用稳定性由 (nodes 身份, timings 身份, turn+seq 区间) 缓存保证
 * （useChat 以 Object.is 比较选择器结果，新对象会引发无限重渲染）。
 */
export function selectTurnTools(snapshot: TurnSnapshotLike, spec: TurnProcessSpecLike): TurnToolSummary {
  const nodes = snapshot?.legacy?.nodes
  const timings = snapshot?.legacy?.turnTimings
  if (nodes === undefined || timings === undefined) return EMPTY_TURN_TOOL_SUMMARY
  let entry = selectorCache.get(nodes)
  if (entry === undefined || entry.timings !== timings) {
    entry = { timings, byTurn: new Map() }
    selectorCache.set(nodes, entry)
  }
  const key = `${String(spec.turn)}:${String(spec.processStartSeq)}:${String(spec.answerAnchorSeq)}`
  const cached = entry.byTurn.get(key)
  if (cached !== undefined) return cached
  const timing = timings.get(spec.turn)
  const summary: TurnToolSummary = {
    names: collectTurnToolNames(nodes, spec),
    startTime: timing?.startTime,
    endTime: timing?.endTime,
  }
  entry.byTurn.set(key, summary)
  return summary
}

/** 便捷重导出：ChatNode 的轮号提取（与 ChatFlow 内 turnOf 同语义）。 */
export function chatNodeTurn(node: ChatNode): number | undefined {
  const location = node.location
  return location.kind === 'turn' || location.kind === 'step' ? location.turn.turn : undefined
}
