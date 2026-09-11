import {
  applyCeoDelegateCall,
  applyCeoDelegateResult,
  applyCeoMemberResult,
  applyCeoPlan,
  applyCeoRunPhase,
  applyCeoRunProgress,
  applyCeoRunJournal,
  applyCeoRunProcess,
  applyCeoMemberUsage,
  applyCeoMemberContext,
  applyCeoMemberHalted,
  applyCeoMemberRedirected,
  parseCeoProcessOp,
  parseCeoDelegateRuns,
  parseCeoRunJournalRuns,
  projectCeoTeam,
  senderSessionIdOf,
  startCeoTeam,
  textFromContent,
  CEO_RUN_JOURNAL,
  CEO_PLAN,
  CEO_MEMBER_RESULT,
  CEO_RUN_PROCESS,
  CEO_PLAN_REVISED,
  CEO_RUN_PHASE,
  CEO_RUN_PROGRESS,
  CEO_MEMBER_USAGE,
  CEO_MEMBER_CONTEXT,
  CEO_MEMBER_HALTED,
  CEO_MEMBER_REDIRECTED,
  type CeoTeamState,
} from '../team.ts'
import { applyCeoRosterMessage } from './selection.ts'

function resultText(content: unknown): string {
  return textFromContent(content)
}

export const ceoTeamDefinition = {
  kind: 'ceo-team',
  target: 'chat',
  match: (event: {
    type?: string
    data?: {
      turn?: unknown
      name?: unknown
      callId?: unknown
      arguments?: unknown
      planId?: unknown
      summary?: unknown
      analysis?: unknown
      teamBrief?: unknown
      tasks?: unknown
      message?: unknown
    }
  }) => {
    const turn = event.data?.turn
    if (typeof turn !== 'number') return null
    if (event.type === 'turn/start') return { id: String(turn), role: 'start' as const }
    if (event.type === CEO_PLAN || event.type === CEO_PLAN_REVISED) return { id: String(turn), role: 'update' as const }
    if (event.type === 'tool/call' && (event.data?.name === 'ceo_delegate' || event.data?.name === 'ceo_replan')) {
      return { id: String(turn), role: 'update' as const }
    }
    if (event.type === CEO_RUN_JOURNAL) return { id: String(turn), role: 'update' as const }
    if (event.type === CEO_RUN_PROCESS) return { id: String(turn), role: 'update' as const }
    if (event.type === CEO_MEMBER_RESULT) return { id: String(turn), role: 'update' as const }
    if (event.type === CEO_MEMBER_USAGE || event.type === CEO_MEMBER_CONTEXT
      || event.type === CEO_MEMBER_HALTED || event.type === CEO_MEMBER_REDIRECTED) {
      return { id: String(turn), role: 'update' as const }
    }
    if (event.type === CEO_RUN_PHASE || event.type === CEO_RUN_PROGRESS) return { id: String(turn), role: 'update' as const }
    if (event.type === 'tool/result') return { id: String(turn), role: 'update' as const }
    return null
  },
  start: (_context: unknown, match: { event: { data: { turn: number } } }) => {
    return startCeoTeam(match.event.data.turn)
  },
  update: (context: { state: CeoTeamState }, match: {
    event: {
      type: string
      seq: number
      data: {
        callId?: unknown
        name?: unknown
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
    }
  }) => {
    const event = match.event
    if (event.type === CEO_PLAN || event.type === CEO_PLAN_REVISED) {
      return applyCeoPlan(context.state, {
        planId: String(event.data.planId ?? ''),
        version: typeof event.data.version === 'number' ? event.data.version : undefined,
        summary: String(event.data.summary ?? ''),
        analysis: String(event.data.analysis ?? ''),
        ...typeof event.data.teamBrief === 'string' ? { teamBrief: event.data.teamBrief } : {},
        tasks: event.data.tasks,
      })
    }
    if (event.type === CEO_RUN_PROGRESS) {
      return applyCeoRunProgress(context.state, { callId: String(event.data.callId ?? ''), completed: Number(event.data.completed ?? 0), total: Number(event.data.total ?? 0), seq: event.seq })
    }
    if (event.type === CEO_RUN_PHASE) {
      const phase = event.data.phase
      if (phase !== 'thinking' && phase !== 'tool' && phase !== 'waiting' && phase !== 'winding_down') return context.state
      return applyCeoRunPhase(context.state, { callId: String(event.data.callId ?? ''), runId: String(event.data.runId ?? ''), memberId: String(event.data.memberId ?? ''), phase, ...typeof event.data.toolName === 'string' ? { toolName: event.data.toolName } : {}, seq: event.seq })
    }
    if (event.type === 'tool/call') {
      if (event.data.name === 'ceo_replan') return context.state
      if (event.data.name !== 'ceo_delegate') return context.state
      return applyCeoDelegateCall(context.state, {
        callId: String(event.data.callId),
        seq: event.seq,
        argsRaw: event.data.arguments,
      })
    }
    if (event.type === CEO_RUN_JOURNAL) {
      return applyCeoRunJournal(context.state, {
        callId: String(event.data.callId ?? ''),
        seq: event.seq,
        runs: parseCeoRunJournalRuns(event.data.runs),
      })
    }
    if (event.type === CEO_RUN_PROCESS) {
      const op = parseCeoProcessOp(event.data.op)
      if (op === undefined) return context.state
      return applyCeoRunProcess(context.state, {
        callId: String(event.data.callId ?? ''),
        seq: event.seq,
        runId: typeof event.data.runId === 'string' ? event.data.runId : undefined,
        memberId: typeof event.data.memberId === 'string' ? event.data.memberId : undefined,
        op,
      })
    }
    if (event.type === CEO_MEMBER_USAGE) {
      return applyCeoMemberUsage(context.state, {
        callId: String(event.data.callId ?? ''),
        runId: String(event.data.runId ?? ''),
        memberId: String(event.data.memberId ?? ''),
        usage: event.data.usage,
        seq: event.seq,
      })
    }
    if (event.type === CEO_MEMBER_CONTEXT) {
      return applyCeoMemberContext(context.state, {
        callId: String(event.data.callId ?? ''),
        runId: String(event.data.runId ?? ''),
        memberId: String(event.data.memberId ?? ''),
        channels: event.data.channels,
        seq: event.seq,
      })
    }
    if (event.type === CEO_MEMBER_HALTED) {
      return applyCeoMemberHalted(context.state, {
        callId: String(event.data.callId ?? ''),
        runId: String(event.data.runId ?? ''),
        memberId: typeof event.data.memberId === 'string' ? event.data.memberId : undefined,
        seq: event.seq,
      })
    }
    if (event.type === CEO_MEMBER_REDIRECTED) {
      return applyCeoMemberRedirected(context.state, {
        callId: String(event.data.callId ?? ''),
        runId: String(event.data.runId ?? ''),
        note: typeof event.data.note === 'string' ? event.data.note : '',
        seq: event.seq,
      })
    }
    if (event.type === CEO_MEMBER_RESULT) {
      return applyCeoMemberResult(context.state, {
        callId: String(event.data.callId ?? ''),
        runId: String(event.data.runId ?? ''),
        memberId: String(event.data.memberId ?? ''),
        seq: event.seq,
        output: String(event.data.output ?? ''),
        stopReason: typeof event.data.stopReason === 'string' ? event.data.stopReason : undefined,
        status: event.data.status === 'blocked'
          || event.data.status === 'failed'
          || event.data.status === 'partial'
          || event.data.status === 'completed'
          || event.data.status === 'unverified'
          || event.data.status === 'unknown_after_restart'
          ? event.data.status
          : undefined,
      })
    }
    if (event.type !== 'tool/result') return context.state
    const callId = String(event.data.message?.source?.callId)
    const result = event.data.message?.content?.[0] as { isError?: boolean; content?: unknown } | undefined
    const text = resultText(result?.content)
    const known = context.state.members.some(member => member.batchCallId === callId || member.callId === callId)
    if (known) {
      return applyCeoDelegateResult(context.state, {
        callId,
        seq: event.seq,
        text,
        isError: result?.isError === true,
      })
    }
    if (context.state.members.length === 0) return context.state
    const runs = parseCeoDelegateRuns(text)
    if (runs.length === 0) return context.state
    const graphCallId = context.state.members[0]?.batchCallId
    if (graphCallId === undefined || graphCallId === '') return context.state
    return applyCeoDelegateResult(context.state, {
      callId: graphCallId,
      seq: event.seq,
      text,
      isError: result?.isError === true,
    })
  },
  buildViewNode: (context: {
    key: string
    id: string
    state: CeoTeamState
    start?: { event: { seq: number }; location: unknown }
  }) => {
    if (context.start === undefined) return null
    const data = projectCeoTeam(context.state)
    if (data === null) return null
    return {
      key: context.key,
      kind: 'ceo-team',
      id: context.id,
      target: 'chat',
      anchorSeq: context.start.event.seq,
      location: context.start.location,
      visibility: 'visible',
      data,
    }
  },
}

export const ceoMemberReportDefinition = {
  kind: 'ceo-member-report',
  match: (event: {
    type?: string
    seq?: number
    data?: {
      source?: unknown
      content?: unknown
    }
  }) => {
    if (event.type !== 'user/message') return null
    if (senderSessionIdOf(event.data?.source) === undefined) return null
    return { id: String(event.seq), role: 'start' as const }
  },
  start: (_context: unknown, match: {
    event: {
      seq: number
      data: {
        source?: unknown
        content?: unknown
      }
    }
  }) => {
    const memberId = senderSessionIdOf(match.event.data.source)
    const source = match.event.data.source
    const sourceKind = typeof source === 'object' && source !== null && 'kind' in source
      ? (source as { kind?: unknown }).kind
      : undefined
    if (memberId !== undefined && (sourceKind === 'agent-message' || sourceKind === 'subagent-settled')) {
      applyCeoRosterMessage({
        memberId,
        seq: match.event.seq,
        text: textFromContent(match.event.data.content),
        sourceKind,
      })
    }
    return { memberId }
  },
  update: (context: { state: { memberId?: string } }) => context.state,
}
