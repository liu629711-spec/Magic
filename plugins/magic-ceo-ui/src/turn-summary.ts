/**
 * Turn 折叠摘要数据层（P0-1 阶段二，无 React）。
 *
 * DSH ui-chat 把一轮的全部工具调用归组为一个 `turn-process` 节点并自带折叠状态
 * （contract/slots.ts：keyed 槽位复用 key 即替换渲染器；TurnProcessOwnerProps 提供
 * foldable/open/setOpen）。本模块为替换渲染器供给 codex 式摘要数据：
 * 从快照的 legacy 切片按 seq 区间收集该轮的 tool-result 工具名（分类计数用），
 * 并取出轮次起止时间（「已处理 Ns」用）。
 *
 * 关键不变量：selectTurnTools 的返回引用必须稳定——useChat 用 Object.is 比较选择器
 * 结果，每次返回新对象会让组件无限重渲染（React #185 同类）。因此按
 * (nodes 数组身份, timings 对象身份, turn/seq 区间) 做多级缓存。
 */

import { classifyToolName, type ProcessCategory } from './process-summary.ts'

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
 * 返回引用稳定性由 (nodes 身份, timings 身份, turn+seq 区间) 缓存保证。
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
