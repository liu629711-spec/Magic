// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/toolviews/plan-summary.ts

/** 行看到的列表项：未经校验的模型 JSON。 */
export interface PlanItemLike {
  content?: unknown
  status?: unknown
}

/** 计数加摘要两半，刻意不预拼接。 */
export interface PlanSummary {
  done: number
  total: number
  activeContent: string | null
  activeExtra: number
}

/** 从整列表快照推导计数与活跃摘要。 */
export function planSummary(todos: readonly PlanItemLike[]): PlanSummary {
  const active = todos.filter(t => t.status === 'in_progress')
  const first = active[0]?.content
  const named = typeof first === 'string' && first.trim() !== ''
  return {
    done: todos.filter(t => t.status === 'completed').length,
    total: todos.length,
    activeContent: named ? first : null,
    activeExtra: named ? active.length - 1 : 0,
  }
}
