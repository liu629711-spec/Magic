// Magic CEO 委派画布 Definition（移植自 plugins/magic-ceo-ui/src/client/definition.ts 的
// ceoTeamDefinition，2026-09-18 自有客户端接入）。
//
// 折叠层只保留「产节点」所需的最小路径：
//   事件匹配（match）→ 状态机（vendor/ceo/team.ts 的 applyCeo*/projectCeoTeam）→
//   buildViewNode（产出 kind='ceo-team' 的 Chat 节点）。
// 原插件的 ceoMemberReportDefinition（成员 send_message 回灌 selection 名册）与
// 右坞工作区注册本轮未搬（遗留，见交付报告）。
//
// 类型说明：ceo/* 事件由 magic-ceo 插件经 session.append 写入，未登记在 DSH 的
// SessionEventMap 里，所以事件载荷按结构性类型（CeoEventData）读取，并把
// event.type 收窄为 string 后再与 ceo/* 常量比较。

import type { ConversationNodeDefinition } from '../vendor/dsh-chat/vendor-types.ts'
import { chatNode } from '../vendor/dsh-chat/conversation-nodes/common.ts'
import {
  applyCeoDelegateCall,
  applyCeoDelegateResult,
  applyCeoMemberResult,
  applyCeoMemberContext,
  applyCeoMemberHalted,
  applyCeoMemberRedirected,
  applyCeoMemberUsage,
  applyCeoPlan,
  applyCeoRunJournal,
  applyCeoRunPhase,
  applyCeoRunProcess,
  applyCeoRunProgress,
  parseCeoDelegateRuns,
  parseCeoProcessOp,
  parseCeoRunJournalRuns,
  projectCeoTeam,
  startCeoTeam,
  textFromContent,
  CEO_MEMBER_CONTEXT,
  CEO_MEMBER_HALTED,
  CEO_MEMBER_REDIRECTED,
  CEO_MEMBER_RESULT,
  CEO_MEMBER_USAGE,
  CEO_PLAN,
  CEO_PLAN_REVISED,
  CEO_RUN_JOURNAL,
  CEO_RUN_PHASE,
  CEO_RUN_PROCESS,
  CEO_RUN_PROGRESS,
  type CeoActivityPhase,
  type CeoReportStatus,
  type CeoTeamState,
} from '../vendor/ceo/team.ts'

/** ceo/* 事件载荷的结构性读取面（这些 type 未登记在 SessionEventMap）。 */
interface CeoEventData {
  turn?: unknown
  name?: unknown
  callId?: unknown
  arguments?: unknown
  runs?: unknown
  runId?: unknown
  memberId?: unknown
  op?: unknown
  planId?: unknown
  summary?: unknown
  analysis?: unknown
  teamBrief?: unknown
  tasks?: unknown
  usage?: unknown
  channels?: unknown
  note?: unknown
  output?: unknown
  stopReason?: unknown
  status?: unknown
  version?: unknown
  phase?: unknown
  toolName?: unknown
  completed?: unknown
  total?: unknown
  message?: {
    content?: unknown[]
    source?: { callId?: unknown }
  }
}

function eventData(event: { data: unknown }): CeoEventData {
  return event.data as CeoEventData
}

function isActivityPhase(value: unknown): value is CeoActivityPhase {
  return value === 'thinking' || value === 'tool' || value === 'waiting' || value === 'winding_down'
}

function isReportStatus(value: unknown): value is CeoReportStatus {
  return value === 'blocked'
    || value === 'failed'
    || value === 'partial'
    || value === 'completed'
    || value === 'unverified'
    || value === 'unknown_after_restart'
}

/** Magic CEO 委派画布：一轮 CEO 输出折叠为一个画布节点。 */
export const ceoTeamDefinition: ConversationNodeDefinition<CeoTeamState> = {
  kind: 'ceo-team',
  target: 'chat',
  match: (event) => {
    const type = event.type as string
    const data = eventData(event)
    const turn = data.turn
    if (typeof turn !== 'number') return null
    if (type === 'turn/start') return { id: String(turn), role: 'start' }
    if (type === CEO_PLAN || type === CEO_PLAN_REVISED) return { id: String(turn), role: 'update' }
    if (type === 'tool/call' && (data.name === 'ceo_delegate' || data.name === 'ceo_replan')) {
      return { id: String(turn), role: 'update' }
    }
    if (type === CEO_RUN_JOURNAL) return { id: String(turn), role: 'update' }
    if (type === CEO_RUN_PROCESS) return { id: String(turn), role: 'update' }
    if (type === CEO_MEMBER_RESULT) return { id: String(turn), role: 'update' }
    if (type === CEO_MEMBER_USAGE || type === CEO_MEMBER_CONTEXT
      || type === CEO_MEMBER_HALTED || type === CEO_MEMBER_REDIRECTED) {
      return { id: String(turn), role: 'update' }
    }
    if (type === CEO_RUN_PHASE || type === CEO_RUN_PROGRESS) return { id: String(turn), role: 'update' }
    if (type === 'tool/result') return { id: String(turn), role: 'update' }
    return null
  },
  start: (_context, match) => startCeoTeam(Number(eventData(match.event).turn)),
  update: (context, match) => {
    const state = context.state
    const event = match.event
    const type = event.type as string
    const data = eventData(event)
    const seq = event.seq
    if (type === CEO_PLAN || type === CEO_PLAN_REVISED) {
      return applyCeoPlan(state, {
        planId: String(data.planId ?? ''),
        version: typeof data.version === 'number' ? data.version : undefined,
        summary: String(data.summary ?? ''),
        analysis: String(data.analysis ?? ''),
        ...typeof data.teamBrief === 'string' ? { teamBrief: data.teamBrief } : {},
        tasks: data.tasks,
      })
    }
    if (type === CEO_RUN_PROGRESS) {
      return applyCeoRunProgress(state, {
        callId: String(data.callId ?? ''),
        completed: Number(data.completed ?? 0),
        total: Number(data.total ?? 0),
        seq,
      })
    }
    if (type === CEO_RUN_PHASE) {
      if (!isActivityPhase(data.phase)) return state
      return applyCeoRunPhase(state, {
        callId: String(data.callId ?? ''),
        runId: String(data.runId ?? ''),
        memberId: String(data.memberId ?? ''),
        phase: data.phase,
        ...typeof data.toolName === 'string' ? { toolName: data.toolName } : {},
        seq,
      })
    }
    if (type === 'tool/call') {
      if (data.name === 'ceo_replan') return state
      if (data.name !== 'ceo_delegate') return state
      return applyCeoDelegateCall(state, {
        callId: String(data.callId),
        seq,
        argsRaw: data.arguments,
      })
    }
    if (type === CEO_RUN_JOURNAL) {
      return applyCeoRunJournal(state, {
        callId: String(data.callId ?? ''),
        seq,
        runs: parseCeoRunJournalRuns(data.runs),
      })
    }
    if (type === CEO_RUN_PROCESS) {
      const op = parseCeoProcessOp(data.op)
      if (op === undefined) return state
      return applyCeoRunProcess(state, {
        callId: String(data.callId ?? ''),
        seq,
        runId: typeof data.runId === 'string' ? data.runId : undefined,
        memberId: typeof data.memberId === 'string' ? data.memberId : undefined,
        op,
      })
    }
    if (type === CEO_MEMBER_USAGE) {
      return applyCeoMemberUsage(state, {
        callId: String(data.callId ?? ''),
        runId: String(data.runId ?? ''),
        memberId: String(data.memberId ?? ''),
        usage: data.usage,
        seq,
      })
    }
    if (type === CEO_MEMBER_CONTEXT) {
      return applyCeoMemberContext(state, {
        callId: String(data.callId ?? ''),
        runId: String(data.runId ?? ''),
        memberId: String(data.memberId ?? ''),
        channels: data.channels,
        seq,
      })
    }
    if (type === CEO_MEMBER_HALTED) {
      return applyCeoMemberHalted(state, {
        callId: String(data.callId ?? ''),
        runId: String(data.runId ?? ''),
        memberId: typeof data.memberId === 'string' ? data.memberId : undefined,
        seq,
      })
    }
    if (type === CEO_MEMBER_REDIRECTED) {
      return applyCeoMemberRedirected(state, {
        callId: String(data.callId ?? ''),
        runId: String(data.runId ?? ''),
        note: typeof data.note === 'string' ? data.note : '',
        seq,
      })
    }
    if (type === CEO_MEMBER_RESULT) {
      return applyCeoMemberResult(state, {
        callId: String(data.callId ?? ''),
        runId: String(data.runId ?? ''),
        memberId: String(data.memberId ?? ''),
        seq,
        output: String(data.output ?? ''),
        stopReason: typeof data.stopReason === 'string' ? data.stopReason : undefined,
        status: isReportStatus(data.status) ? data.status : undefined,
      })
    }
    if (type !== 'tool/result') return state
    const callId = String(data.message?.source?.callId)
    const result = data.message?.content?.[0] as { isError?: boolean; content?: unknown } | undefined
    const text = textFromContent(result?.content)
    const known = state.members.some(member => member.batchCallId === callId || member.callId === callId)
    if (known) {
      return applyCeoDelegateResult(state, {
        callId,
        seq,
        text,
        isError: result?.isError === true,
      })
    }
    if (state.members.length === 0) return state
    const runs = parseCeoDelegateRuns(text)
    if (runs.length === 0) return state
    const graphCallId = state.members[0]?.batchCallId
    if (graphCallId === undefined || graphCallId === '') return state
    return applyCeoDelegateResult(state, {
      callId: graphCallId,
      seq,
      text,
      isError: result?.isError === true,
    })
  },
  buildViewNode: (context) => {
    if (context.start === undefined || context.state === undefined) return null
    const data = projectCeoTeam(context.state)
    if (data === null) return null
    return chatNode(context, 'ceo-team', context.start.event.seq, data)
  },
}