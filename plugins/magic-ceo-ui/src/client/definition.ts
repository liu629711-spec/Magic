import {
  applyCeoDelegateCall,
  applyCeoDelegateResult,
  applyCeoRunJournal,
  applyCeoRunProcess,
  parseCeoProcessOp,
  parseCeoRunJournalRuns,
  projectCeoTeam,
  senderSessionIdOf,
  startCeoTeam,
  textFromContent,
  CEO_RUN_JOURNAL,
  CEO_RUN_PROCESS,
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
      message?: unknown
    }
  }) => {
    const turn = event.data?.turn
    if (typeof turn !== 'number') return null
    if (event.type === 'turn/start') return { id: String(turn), role: 'start' as const }
    if (event.type === 'tool/call' && event.data?.name === 'ceo_delegate') {
      return { id: String(turn), role: 'update' as const }
    }
    if (event.type === CEO_RUN_JOURNAL) return { id: String(turn), role: 'update' as const }
    if (event.type === CEO_RUN_PROCESS) return { id: String(turn), role: 'update' as const }
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
        message?: {
          content?: unknown[]
          source?: { callId?: unknown }
        }
      }
    }
  }) => {
    const event = match.event
    if (event.type === 'tool/call') {
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
    if (event.type !== 'tool/result') return context.state
    const callId = String(event.data.message?.source?.callId)
    if (!context.state.members.some(member => member.batchCallId === callId || member.callId === callId)) return context.state
    const result = event.data.message?.content?.[0] as { isError?: boolean; content?: unknown } | undefined
    return applyCeoDelegateResult(context.state, {
      callId,
      seq: event.seq,
      text: resultText(result?.content),
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
