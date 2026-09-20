// 计划审批状态（PRD-02 §15.4）：user-questions waterfall 认领的 plan-review
// 请求的本地呈现态。remote-events 桥收到 plan-review 提问 → setPending；
// UI（PlanReviewCard）渲染批准/继续计划 → answer 结算 waterfall 应答。
// 单槽：同一时刻最多一个待审计划（官方 exit_plan_mode 的交互语义即单题）。

export interface PendingPlanReview {
  /** waterfall 事件 id（宿主 cancel 帧按它匹配撤销）。 */
  eventId: string
  questionId: string
  /** 卡片标题（question.header，如 "Plan review"）。 */
  header: string
  question: string
  /** 计划全文（question.detail）。 */
  detail: string
  approveLabel: string
  keepLabel: string
  resolve: (answer: { answers: Array<{ id: string; selected: string[]; custom?: string }> }) => void
  reject: (reason: Error) => void
}

let pending: PendingPlanReview | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function subscribePlanReview(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPendingPlanReview(): PendingPlanReview | null {
  return pending
}

export function setPendingPlanReview(next: PendingPlanReview): void {
  pending = next
  emit()
}

export function clearPendingPlanReview(): void {
  if (pending === null) return
  pending = null
  emit()
}

/** 结算审批：selected = [批准标签] 即批准；继续计划可带自定义反馈。 */
export function answerPendingPlanReview(selected: string[], custom?: string): void {
  const current = pending
  if (current === null) return
  pending = null
  emit()
  current.resolve({
    answers: [{
      id: current.questionId,
      selected,
      ...(custom !== undefined && custom !== "" ? { custom } : {}),
    }],
  })
}
