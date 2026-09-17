// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/contract/turn-metrics.ts
// （延迟/吞吐折叠，轮尾与统计共用。）

import type { AssistantMessageNode, ConversationNode } from '../vendor-types.ts'

/** 一轮页脚的延迟与解码吞吐读数。 */
export interface TurnMetrics {
  ttftMs?: number
  tokensPerSecond?: number
}

/** 一个 assistant step 可推导的延迟事实；null 为未记录。 */
export interface StepReading {
  ttftMs: number | null
  decodeMs: number | null
  outputTokens: number | null
}

interface UsageLike {
  outputTokens?: number
}

type AssistantNode = AssistantMessageNode

function usageOutputTokens(usage: unknown): number | null {
  if (typeof usage !== 'object' || usage === null) return null
  const value = (usage as UsageLike).outputTokens
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null
}

/** 读取一个 assistant 节点的 TTFT、解码耗时与输出 token。 */
export function assistantStepReading(node: AssistantNode): StepReading {
  const timing = node.timing
  const ttftMs = timing !== undefined && timing.stepStartTime !== null && timing.firstTokenTime !== null
    ? Math.max(0, timing.firstTokenTime - timing.stepStartTime)
    : null
  const decodeMs = timing !== undefined && timing.firstTokenTime !== null
    ? Math.max(0, timing.completedTime - timing.firstTokenTime)
    : null
  return { ttftMs, decodeMs, outputTokens: usageOutputTokens(node.usage) }
}

interface TurnFold {
  firstStep: number
  firstStepTtftMs: number | null
  decodeMs: number
  outputTokens: number
  sampled: boolean
}

/** 把 assistant 节点折叠为每轮页脚指标。 */
export function deriveTurnMetrics(nodes: readonly ConversationNode[]): Map<number, TurnMetrics> {
  const folds = new Map<number, TurnFold>()
  for (const node of nodes) {
    if (node.kind !== 'assistant') continue
    const reading = assistantStepReading(node)
    let fold = folds.get(node.turn)
    if (fold === undefined) {
      fold = { firstStep: node.step, firstStepTtftMs: reading.ttftMs, decodeMs: 0, outputTokens: 0, sampled: false }
      folds.set(node.turn, fold)
    } else if (node.step < fold.firstStep) {
      fold.firstStep = node.step
      fold.firstStepTtftMs = reading.ttftMs
    }
    if (reading.decodeMs !== null && reading.outputTokens !== null) {
      fold.decodeMs += reading.decodeMs
      fold.outputTokens += reading.outputTokens
      fold.sampled = true
    }
  }
  const metrics = new Map<number, TurnMetrics>()
  for (const [turn, fold] of folds) {
    const entry: TurnMetrics = {}
    if (fold.firstStepTtftMs !== null) entry.ttftMs = fold.firstStepTtftMs
    if (fold.sampled && fold.decodeMs > 0) entry.tokensPerSecond = fold.outputTokens / (fold.decodeMs / 1000)
    if (entry.ttftMs !== undefined || entry.tokensPerSecond !== undefined) metrics.set(turn, entry)
  }
  return metrics
}
