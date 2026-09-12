/**
 * 失败/阻塞卡片数据层（无 React，PRD-04 §12）：把成员的失败/阻塞状态
 * 归一成卡片数据。状态判定与 presentCeoMember 同源（report.status 优先，
 * 原始 status 兜底），数据取自成员自带的工具步骤、汇报与依赖关系——
 * 不发起新的 RPC。
 */

import { presentCeoMember, type CeoProcessStep, type CeoTeamMember } from './team.ts'

export interface CeoFailureCard {
  kind: 'failed' | 'blocked'
  /** 重试/重规划动作要用的 run id（member.runId，缺省回退 rawId）。 */
  runId?: string
  /** 失败卡：最后一个失败的工具名。 */
  toolName?: string
  /** 失败卡：错误摘要（失败工具步的结果文本，缺省回退 lastMessage 尾部）。 */
  errorText?: string
  /** 失败卡：汇报里的「未完成」。 */
  notDone?: string
  /** 阻塞卡：等待的上游成员（按 roster 把 callId 映射成角色名）。 */
  waitingOn: readonly string[]
  /** 阻塞卡：汇报里的「风险/阻塞」。 */
  blockers?: string
}

/** 错误摘要上限：卡片是摘要不是日志全文，超出截断（完整文本在过程流里）。 */
const ERROR_CLIP = 600

function clipText(text: string | undefined): string {
  const trimmed = text?.trim() ?? ''
  if (trimmed === '') return ''
  if (trimmed.length <= ERROR_CLIP) return trimmed
  return `${trimmed.slice(0, ERROR_CLIP)}…`
}

/** 阻塞成员正在等谁：dependsOn 的 callId 映射成上游角色名，映射不到保留原值。 */
export function waitingOnOf(
  member: CeoTeamMember,
  roster: readonly CeoTeamMember[] = [],
): string[] {
  return member.dependsOn.map(dep =>
    roster.find(item => item.callId === dep)?.role ?? dep,
  )
}

/**
 * 成员的失败/阻塞卡；健康状态返回 undefined。
 * 失败 = viewStatus failed/error；阻塞 = viewStatus blocked（判定同 presentCeoMember）。
 */
export function failureCardOf(
  member: CeoTeamMember,
  roster: readonly CeoTeamMember[] = [],
): CeoFailureCard | undefined {
  const viewStatus = presentCeoMember(member).viewStatus
  const runId = member.runId ?? member.rawId
  if (viewStatus === 'failed' || viewStatus === 'error') {
    const failedStep = [...member.process ?? []]
      .reverse()
      .find((step): step is Extract<CeoProcessStep, { kind: 'tool' }> =>
        step.kind === 'tool' && step.status === 'error')
    const notDone = clipText(member.report?.notDone)
    return {
      kind: 'failed',
      runId,
      toolName: failedStep?.name,
      errorText: clipText(failedStep?.result ?? member.lastMessage),
      notDone: notDone !== '' ? notDone : undefined,
      waitingOn: [],
    }
  }
  if (viewStatus === 'blocked') {
    const blockers = clipText(member.report?.risksOrBlockers)
    return {
      kind: 'blocked',
      runId,
      waitingOn: waitingOnOf(member, roster),
      blockers: blockers !== '' ? blockers : undefined,
    }
  }
  return undefined
}
