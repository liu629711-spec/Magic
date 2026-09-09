import type { RunPhase, RunPlan, RunState } from './plan.ts'

export const CEO_RUN_JOURNAL = 'ceo/run-journal'
export const CEO_PLAN = 'ceo/plan'
export const CEO_PLAN_REVISED = 'ceo/plan-revised'
export const CEO_RUN_PHASE = 'ceo/run-phase'
export const CEO_RUN_PROGRESS = 'ceo/run-progress'

export interface CeoPlanTask {
  id?: string
  role: string
  task: string
  dependsOn: string[]
}

export interface CeoPlanData {
  turn: number
  planId: string
  version: number
  summary: string
  analysis: string
  teamBrief?: string
  tasks: CeoPlanTask[]
}

export interface CeoRunPhaseData {
  turn: number
  callId: string
  runId: string
  memberId: string
  phase: 'thinking' | 'tool' | 'waiting' | 'winding_down'
  toolName?: string
}

export interface CeoRunProgressData {
  turn: number
  callId: string
  completed: number
  total: number
}

export interface CeoRunJournalRun {
  runId: string
  rawId: string
  role: string
  task: string
  dependsOn: string[]
  phase: RunPhase
  memberId?: string
}

export interface CeoRunJournalData {
  turn: number
  callId: string
  runs: CeoRunJournalRun[]
}

export interface JournalSession {
  append?: (type: string, data: unknown) => unknown
  snapshotEvents?: () => ReadonlyArray<{ type?: string; data?: { turn?: unknown } }>
}

function isJournalEnvelope(value: object, type: string): boolean {
  const record = value as { type?: unknown; seq?: unknown; time?: unknown; data?: unknown }
  return record.type === type
    && typeof record.seq === 'number'
    && typeof record.time === 'number'
    && record.data !== undefined
}

/**
 * DSH `Session.append` does not put `ignorable` on the envelope
 * (`reference-project/deepseek-harness/packages/core/session/src/index.ts` L668-697).
 * Out-of-repo event types are refused on reload unless the stored record has
 * `ignorable: true` (`session-persistence/src/coordinator.ts` L1248-1251).
 * Stamp the marker before `deepFreeze` seals the object.
 */
function appendIgnorable(session: JournalSession, type: string, data: unknown): void {
  if (typeof session.append !== 'function') return
  const freeze = Object.freeze
  Object.freeze = ((value: object) => {
    if (value !== null && typeof value === 'object' && isJournalEnvelope(value, type)) {
      (value as { ignorable?: true }).ignorable = true
    }
    return freeze(value)
  }) as typeof Object.freeze
  try {
    const event = session.append(type, data)
    if (event !== null && typeof event === 'object' && Object.isExtensible(event)) {
      (event as { ignorable?: true }).ignorable = true
    }
  } finally {
    Object.freeze = freeze
  }
}

export function currentTurn(session: JournalSession): number | undefined {
  const events = session.snapshotEvents?.() ?? []
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index]
    if (event?.type === 'turn/start' && typeof event.data?.turn === 'number') {
      return event.data.turn
    }
  }
  return undefined
}

export function journalRuns(
  plan: RunPlan,
  phases: ReadonlyMap<string, RunState>,
): CeoRunJournalRun[] {
  return plan.nodes.map(node => {
    const state = phases.get(node.runId)
    return {
      runId: node.runId,
      rawId: node.rawId,
      role: node.role,
      task: node.task,
      dependsOn: node.dependsOn,
      phase: state?.phase ?? 'queued',
      ...state?.memberId === undefined ? {} : { memberId: state.memberId },
    }
  })
}

export function appendRunJournal(
  session: JournalSession,
  data: CeoRunJournalData,
): void {
  try {
    appendIgnorable(session, CEO_RUN_JOURNAL, data)
  } catch {
    // Live journal must not fail the delegate.
  }
}

/** Persist the CEO's pre-delegation plan as an ignorable session event. */
export function appendCeoPlan(session: JournalSession, data: CeoPlanData): void {
  try {
    appendIgnorable(session, CEO_PLAN, data)
  } catch {
    // Planning is useful context; it must not make delegation fail.
  }
}

/** Persist a replacement plan separately so replay can retain prior versions. */
export function appendCeoPlanRevision(session: JournalSession, data: CeoPlanData): void {
  try {
    appendIgnorable(session, CEO_PLAN_REVISED, data)
  } catch {
    // A revision is explanatory state and must not interrupt planning.
  }
}

/** Persist the worker's current activity; lifecycle state remains in ceo/run-journal. */
export function appendCeoRunPhase(session: JournalSession, data: CeoRunPhaseData): void {
  try {
    appendIgnorable(session, CEO_RUN_PHASE, data)
  } catch {
    // Activity indicators are observational.
  }
}

/** Persist a deterministic scheduler progress snapshot for live and replay views. */
export function appendCeoRunProgress(session: JournalSession, data: CeoRunProgressData): void {
  try {
    appendIgnorable(session, CEO_RUN_PROGRESS, data)
  } catch {
    // Progress must not affect scheduling.
  }
}

export const CEO_RUN_PROCESS = 'ceo/run-process'
export const CEO_MEMBER_RESULT = 'ceo/member-result'

export interface CeoSearchSource {
  url: string
  title?: string
  snippet?: string
}

export type CeoProcessOp =
  | { kind: 'reasoning'; text: string }
  | { kind: 'content'; text: string }
  | { kind: 'tool-start'; toolCallId: string; name: string; args?: string }
  | { kind: 'tool-end'; toolCallId: string; result?: string; isError?: boolean; sources?: CeoSearchSource[] }

export interface CeoRunProcessData {
  turn: number
  callId: string
  runId: string
  memberId: string
  op: CeoProcessOp
}

export interface CeoMemberResultData {
  turn: number
  callId: string
  runId: string
  memberId: string
  output: string
  stopReason: string
  status?: 'completed' | 'blocked' | 'failed' | 'partial'
}

/** Persist the worker's final output independently of send_message delivery. */
export function appendCeoMemberResult(session: JournalSession, data: CeoMemberResultData): void {
  try {
    appendIgnorable(session, CEO_MEMBER_RESULT, data)
  } catch {
    // Result projection is observational; the scheduler still owns execution truth.
  }
}

export function appendRunProcess(
  session: JournalSession,
  data: CeoRunProcessData,
): void {
  try {
    appendIgnorable(session, CEO_RUN_PROCESS, data)
  } catch {
    // Live process must not fail the delegate.
  }
}
