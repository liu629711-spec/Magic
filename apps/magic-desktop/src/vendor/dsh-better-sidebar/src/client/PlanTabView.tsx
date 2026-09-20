// Magic 客户端补丁文件（2026-09-20，非上游源码）：右坞「计划」tab 的本体（PRD-02 §15.4）。
// 数据 = 当前任务事件流里最近一次 exit_plan_mode 工具调用（官方 plan-mode 的计划
// 提交口，plan-mode/src/index.ts:273-361）：arguments.plan 为完整 markdown 计划；
// 其后对应 callId 的 tool/result 判定审批状态（已批准 / 继续计划）。
import { useEffect, useState } from 'react'
import type { SessionEvent } from '../../../dsh-chat/index.ts'

/** 计划 tab 的事件面（dock-context 的 binding face，events/subscribe 与轨迹 tab 同源）。 */
export interface PlanTabProps {
  sessionId: string
  eventsOf: () => readonly { type: string; seq: number; time: number; data: unknown }[]
  subscribe: (fn: () => void) => () => void
}

export interface SessionPlanView {
  title: string
  markdown: string
  status: 'pending' | 'approved' | 'rejected'
  callId: string
}

/** 倒查事件流：最近一次 exit_plan_mode 调用 + 其 result 的审批状态。 */
export function latestPlanOf(entries: readonly SessionEvent[]): SessionPlanView | undefined {
  let call: { callId: string; plan: string; title: string; seq: number } | undefined
  for (const entry of entries) {
    if (entry.type !== 'tool/call') continue
    const data = entry.data as { name?: unknown; arguments?: unknown; callId?: unknown }
    if (data?.name !== 'exit_plan_mode') continue
    let plan = ''
    try {
      const args = JSON.parse(String(data.arguments ?? '{}')) as { plan?: unknown }
      if (typeof args.plan === 'string') plan = args.plan
    } catch {
      // arguments 非法 JSON：跳过该次调用（不中断扫描）
    }
    if (plan === '') continue
    const heading = /^#{1,6}\s+(.+?)\s*$/m.exec(plan)?.[1]
    call = { callId: String(data.callId ?? ''), plan, title: (heading ?? '计划').trim(), seq: Number(entry.seq ?? 0) }
  }
  if (call === undefined) return undefined
  let status: SessionPlanView['status'] = 'pending'
  for (const entry of entries) {
    if (entry.type !== 'tool/result' || Number(entry.seq ?? 0) <= call.seq) continue
    const data = entry.data as { callId?: unknown; toolCallId?: unknown; isError?: unknown; content?: unknown }
    const id = String(data?.callId ?? data?.toolCallId ?? '')
    if (id !== call.callId) continue
    // result 事件 content 形状因通道而异（渲染文本 / 结构化 {approved:true}），
    // 两种都认；isError 或 keep-planning 文案 = 继续计划。
    const text = JSON.stringify(data?.content ?? '')
    status = data?.isError === true || text.includes("keep planning")
      ? 'rejected'
      : text.includes("Plan approved") || text.includes('"approved":true') || text.includes('"approved": true')
        ? 'approved'
        : 'rejected'
    break
  }
  return { title: call.title, markdown: call.plan, status, callId: call.callId }
}

const STATUS_LABEL: Record<SessionPlanView['status'], string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '继续计划',
}

const STATUS_CLASS: Record<SessionPlanView['status'], string> = {
  pending: 'bg-primary/10 text-on-surface-variant',
  approved: 'bg-green/10 text-green',
  rejected: 'bg-error/10 text-error',
}

export function PlanTabView({ sessionId, eventsOf, subscribe }: PlanTabProps) {
  // binding.events() 引用直读 + 订阅触发重渲（与 TrajectoryTabView 同款单向数据流）。
  const [, bump] = useState(0)
  useEffect(() => subscribe(() => bump(value => value + 1)), [subscribe])
  const entries = eventsOf() as unknown as readonly SessionEvent[]
  const plan = latestPlanOf(entries)
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface text-on-surface" data-magic-plan-tab={sessionId}>
      {plan === undefined ? (
        <div className="flex flex-1 items-center justify-center px-8 text-center text-[13px] leading-5 text-on-surface-variant">
          还没有计划。开启计划模式后，智能体调研完成会经 exit_plan_mode 提交计划，这里展示最近一次计划全文。
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold" title={plan.title}>{plan.title}</span>
            <span className={`flex-none rounded-full px-2 py-0.5 text-[11px] leading-4 ${STATUS_CLASS[plan.status]}`}>
              {STATUS_LABEL[plan.status]}
            </span>
          </div>
          <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-[21px]">{plan.markdown}</pre>
        </div>
      )}
    </div>
  )
}
