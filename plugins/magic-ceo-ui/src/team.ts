export const CEO_RUN_JOURNAL = 'ceo/run-journal'
export const CEO_RUN_PROCESS = 'ceo/run-process'
export const CEO_PLAN = 'ceo/plan'
export const CEO_MEMBER_RESULT = 'ceo/member-result'
export const CEO_PLAN_REVISED = 'ceo/plan-revised'
export const CEO_RUN_PHASE = 'ceo/run-phase'
export const CEO_RUN_PROGRESS = 'ceo/run-progress'

export type CeoMemberStatus = 'queued' | 'running' | 'ok' | 'error'
export type CeoReportStatus = 'completed' | 'blocked' | 'failed' | 'partial'
export type CeoRunPhase = 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled'
export type CeoActivityPhase = 'thinking' | 'tool' | 'waiting' | 'winding_down'
export type CeoMemberViewStatus =
  | 'queued'
  | 'running'
  | 'delegated'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'partial'
  | 'error'

export interface CeoMemberReport {
  status?: CeoReportStatus
  done?: string
  notDone?: string
  artifacts?: string
  evidence?: string
  risksOrBlockers?: string
  next?: string
  userDecisions?: string
}

export interface CeoSearchSource {
  url: string
  title?: string
  snippet?: string
}

export type CeoProcessStep =
  | { kind: 'reasoning'; text: string }
  | { kind: 'content'; text: string }
  | {
    kind: 'tool'
    toolCallId: string
    name: string
    args?: string
    result?: string
    sources?: CeoSearchSource[]
    status: 'running' | 'ok' | 'error'
  }

export type CeoProcessOp =
  | { kind: 'reasoning'; text: string }
  | { kind: 'content'; text: string }
  | { kind: 'tool-start'; toolCallId: string; name: string; args?: string }
  | { kind: 'tool-end'; toolCallId: string; result?: string; isError?: boolean; sources?: CeoSearchSource[] }

export interface CeoTeamMember {
  callId: string
  batchCallId: string
  seq: number
  role: string
  task: string
  dependsOn: string[]
  rawId?: string
  runId?: string
  memberId?: string
  status: CeoMemberStatus
  report?: CeoMemberReport
  lastMessage?: string
  answeredDecision?: string
  process?: CeoProcessStep[]
  activity?: { phase: CeoActivityPhase; toolName?: string }
}

export type CeoAttentionKind = 'decision' | 'blocker' | 'failed'

export interface CeoAttentionItem {
  kind: CeoAttentionKind
  member: CeoTeamMember
}

export interface CeoMemberPresentation {
  viewStatus: CeoMemberViewStatus
  needsDecision: boolean
  hasBlocker: boolean
}

export interface CeoTeamState {
  turn: number
  members: CeoTeamMember[]
  plan?: CeoPlanView
  progress: { completed: number; total: number }
  planHistory: CeoPlanView[]
}

export interface CeoTeamView {
  turn: number
  members: CeoTeamMember[]
  plan?: CeoPlanView
  progress: { completed: number; total: number }
  planHistory: CeoPlanView[]
}

export interface CeoPlanView {
  planId: string
  version: number
  summary: string
  analysis: string
  teamBrief?: string
  tasks: Array<{ id?: string; role: string; task: string; dependsOn: string[] }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseSearchSources(value: unknown): CeoSearchSource[] {
  if (!Array.isArray(value)) return []
  const sources: CeoSearchSource[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.url !== 'string' || item.url.trim() === '') continue
    sources.push({
      url: item.url,
      ...typeof item.title === 'string' && item.title.trim() !== '' ? { title: item.title } : {},
      ...typeof item.snippet === 'string' && item.snippet.trim() !== '' ? { snippet: item.snippet } : {},
    })
  }
  return sources
}

function requiredString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : fallback
}

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    .map(item => item.trim())
}

export interface CeoDelegateTask {
  role: string
  task: string
  rawId?: string
  dependsOn: string[]
}

function parseObject(argsRaw: unknown): unknown {
  if (typeof argsRaw !== 'string') return argsRaw
  try {
    return JSON.parse(argsRaw)
  } catch {
    return argsRaw
  }
}

export function parseCeoDelegateTasks(argsRaw: unknown): CeoDelegateTask[] {
  const parsed = parseObject(argsRaw)
  if (isRecord(parsed) && Array.isArray(parsed.tasks)) {
    return parsed.tasks.flatMap((item, index) => {
      if (!isRecord(item)) return []
      const role = requiredString(item.role, 'member')
      const task = requiredString(item.task, requiredString(item.work_package, 'task'))
      const rawId = typeof item.id === 'string' && item.id.trim() !== ''
        ? item.id.trim()
        : `n${String(index)}`
      return [{ role, task, rawId, dependsOn: idList(item.depends_on) }]
    })
  }
  if (typeof parsed === 'string') {
    const task = parsed.trim() || 'task'
    return [{ role: 'member', task, dependsOn: [] }]
  }
  if (!isRecord(parsed)) {
    return [{ role: 'member', task: 'task', dependsOn: [] }]
  }
  const task = requiredString(parsed.task, requiredString(parsed.work_package, requiredString(parsed.prompt, 'task')))
  const rawId = typeof parsed.id === 'string' && parsed.id.trim() !== '' ? parsed.id.trim() : undefined
  return [{
    role: requiredString(parsed.role, 'member'),
    task,
    rawId,
    dependsOn: idList(parsed.depends_on),
  }]
}

export function parseCeoDelegateArgs(argsRaw: unknown): CeoDelegateTask {
  return parseCeoDelegateTasks(argsRaw)[0] ?? { role: 'member', task: 'task', dependsOn: [] }
}

const REPORT_STATUS = new Set<CeoReportStatus>(['completed', 'blocked', 'failed', 'partial'])

function reportStatusOf(value: unknown): CeoReportStatus | undefined {
  return typeof value === 'string' && REPORT_STATUS.has(value.trim() as CeoReportStatus)
    ? value.trim() as CeoReportStatus
    : undefined
}

function fieldText(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (Array.isArray(value)) {
    const parts = value
      .map(item => typeof item === 'string' ? item.trim() : '')
      .filter(item => item !== '')
    return parts.length > 0 ? parts.join('\n') : undefined
  }
  return undefined
}

function reportFromRecord(parsed: Record<string, unknown>): CeoMemberReport | undefined {
  const report: CeoMemberReport = {
    status: reportStatusOf(parsed.status),
    done: fieldText(parsed.done),
    notDone: fieldText(parsed.not_done ?? parsed.notDone),
    artifacts: fieldText(parsed.artifacts),
    evidence: fieldText(parsed.evidence),
    risksOrBlockers: fieldText(parsed.risks_or_blockers ?? parsed.risksOrBlockers),
    next: fieldText(parsed.next),
    userDecisions: fieldText(parsed.user_decisions ?? parsed.userDecisions),
  }
  return Object.values(report).some(value => value !== undefined) ? report : undefined
}

const REPORT_LABELS: Record<string, keyof CeoMemberReport> = {
  status: 'status',
  done: 'done',
  not_done: 'notDone',
  notdone: 'notDone',
  artifacts: 'artifacts',
  evidence: 'evidence',
  risks_or_blockers: 'risksOrBlockers',
  risksorblockers: 'risksOrBlockers',
  next: 'next',
  user_decisions: 'userDecisions',
  userdecisions: 'userDecisions',
}

const FIELD_LINE = /^[-*]?\s*(?:\*\*|__|`)?([A-Za-z][A-Za-z0-9_]*)(?:\*\*|__|`)?\s*[:：]\s*(.*)$/
const LEAD_IN_NOISE = /[，,;；:：]?\s*(?:以下为结构化结果|结构化结果如下|structured result follows)\s*[:：]?\s*$/i

function fieldLineOf(line: string): { key: keyof CeoMemberReport; value: string } | undefined {
  const labeled = FIELD_LINE.exec(line.trim())
  if (labeled === null) return undefined
  const key = REPORT_LABELS[labeled[1].toLowerCase()]
  if (key === undefined) return undefined
  return { key, value: labeled[2].trim() }
}

export function looksLikeMemberReport(text: string): boolean {
  const report = parseCeoMemberReport(text)
  if (report === undefined) return false
  const filled = Object.values(report).filter(value => value !== undefined).length
  return report.status !== undefined || filled >= 2
}

export function reportLeadIn(text: string): string | undefined {
  const lines: string[] = []
  for (const raw of text.split(/\r?\n/)) {
    if (fieldLineOf(raw) !== undefined) break
    lines.push(raw)
  }
  const lead = lines.join('\n').trim().replace(LEAD_IN_NOISE, '').trim()
  return lead === '' ? undefined : lead
}

export function clipDebriefSummary(text: string, limit = 160): string {
  const paragraph = text.split(/\n\n/)[0]?.trim() ?? text.trim()
  const sentences = paragraph.split(/(?<=[。.!？?])\s*/).filter(item => item.trim() !== '')
  let sentence = sentences[0]?.trim() || paragraph
  if (sentence.length < 12 && sentences[1] !== undefined) {
    sentence = `${sentence}${sentences[1].trim()}`
  }
  if (sentence.length <= limit) return sentence
  return `${sentence.slice(0, limit).trimEnd()}…`
}

export function debriefSummaryOf(
  report: CeoMemberReport | undefined,
  lastMessage?: string,
): string {
  const lead = lastMessage === undefined ? undefined : reportLeadIn(lastMessage)
  if (lead !== undefined) return clipDebriefSummary(lead)
  if ((report?.done ?? '').trim() !== '') return clipDebriefSummary(report!.done!)
  if ((lastMessage ?? '').trim() !== '' && looksLikeMemberReport(lastMessage!) === false) {
    return clipDebriefSummary(lastMessage!)
  }
  return ''
}

export function reportTextFromProcess(process: readonly CeoProcessStep[] | undefined): string | undefined {
  if (process === undefined) return undefined
  for (let index = process.length - 1; index >= 0; index -= 1) {
    const step = process[index]
    if (step?.kind !== 'content') continue
    if (looksLikeMemberReport(step.text)) return step.text
  }
  return undefined
}

export function presentCeoMemberReport(
  member: Pick<CeoTeamMember, 'report' | 'lastMessage' | 'process'>,
): CeoMemberReport | undefined {
  const fromMessage = member.lastMessage === undefined
    ? undefined
    : parseCeoMemberReport(member.lastMessage)
  const fromProcess = reportTextFromProcess(member.process)
  return mergeReports(
    mergeReports(member.report, fromMessage),
    fromProcess === undefined ? undefined : parseCeoMemberReport(fromProcess),
  )
}

export function parseCeoMemberReport(text: string): CeoMemberReport | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return undefined
  const jsonStart = trimmed.indexOf('{')
  if (jsonStart >= 0 && jsonStart < 80) {
    try {
      const parsed = JSON.parse(trimmed.slice(jsonStart)) as unknown
      if (isRecord(parsed)) {
        const fromJson = reportFromRecord(parsed)
        if (fromJson !== undefined) return fromJson
      }
    } catch {
      // fall through to labeled text
    }
  }
  const report: CeoMemberReport = {}
  let current: keyof CeoMemberReport | undefined
  for (const rawLine of trimmed.split(/\r?\n/)) {
    const labeled = fieldLineOf(rawLine)
    if (labeled !== undefined) {
      current = labeled.key
      if (labeled.key === 'status') report.status = reportStatusOf(labeled.value)
      else if (labeled.value !== '') report[labeled.key] = labeled.value
      continue
    }
    const line = rawLine.trim()
    if (current !== undefined && current !== 'status' && line !== '') {
      const previous = report[current]
      report[current] = previous ? `${previous}\n${line}` : line
    }
  }
  return Object.values(report).some(value => value !== undefined) ? report : undefined
}

export function presentCeoMember(member: CeoTeamMember): CeoMemberPresentation {
  const needsDecision = (member.report?.userDecisions ?? '').trim() !== ''
    && (member.answeredDecision ?? '').trim() === ''
  const hasBlocker = member.report?.status === 'blocked'
  if (member.report?.status !== undefined) {
    return { viewStatus: member.report.status, needsDecision, hasBlocker }
  }
  if (member.status === 'error') {
    return { viewStatus: 'error', needsDecision, hasBlocker }
  }
  if (member.status === 'running') {
    return { viewStatus: 'running', needsDecision, hasBlocker }
  }
  if (member.status === 'queued') {
    return { viewStatus: 'queued', needsDecision, hasBlocker }
  }
  return { viewStatus: 'delegated', needsDecision, hasBlocker }
}

export function ceoAttentionItems(members: readonly CeoTeamMember[]): CeoAttentionItem[] {
  const items: CeoAttentionItem[] = []
  for (const member of members) {
    const presentation = presentCeoMember(member)
    if (presentation.needsDecision) {
      items.push({ kind: 'decision', member })
      continue
    }
    if (presentation.hasBlocker || presentation.viewStatus === 'blocked') {
      items.push({ kind: 'blocker', member })
      continue
    }
    if (presentation.viewStatus === 'failed' || presentation.viewStatus === 'error') {
      items.push({ kind: 'failed', member })
    }
  }
  return items
}

export function textFromContent(content: unknown): string {
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content) {
    if (isRecord(block) && block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
    }
  }
  return parts.join('\n')
}

export function senderSessionIdOf(source: unknown): string | undefined {
  if (!isRecord(source)) return undefined
  if (source.kind !== 'agent-message' && source.kind !== 'subagent-settled') return undefined
  return typeof source.senderSessionId === 'string' && source.senderSessionId.trim() !== ''
    ? source.senderSessionId.trim()
    : undefined
}

export function unwrapMemberMessage(memberId: string, text: string): string {
  const agentPrefix = `Agent ${memberId} sent a message:`
  if (text.startsWith(agentPrefix)) {
    return text.slice(agentPrefix.length).replace(/^\r?\n/, '')
  }
  const closing = text.split(/\r?\nIts closing message:\r?\n/)
  if (closing.length >= 2) return closing.slice(1).join('\nIts closing message:\n')
  return ''
}

export function settlementStatusOf(text: string): CeoReportStatus | undefined {
  if (text.includes('finished and will do no further work')) return 'completed'
  if (text.includes('was stopped before it finished')) return 'failed'
  if (text.includes('ran out of room before it finished')) return 'partial'
  if (text.includes('declined the task')) return 'failed'
  if (text.includes('failed before it finished')) return 'failed'
  if (text.includes('ended abnormally')) return 'failed'
  return undefined
}

function mergeReports(
  existing: CeoMemberReport | undefined,
  incoming: CeoMemberReport | undefined,
): CeoMemberReport | undefined {
  if (incoming === undefined) return existing
  if (existing === undefined) return incoming
  return {
    status: incoming.status ?? existing.status,
    done: incoming.done ?? existing.done,
    notDone: incoming.notDone ?? existing.notDone,
    artifacts: incoming.artifacts ?? existing.artifacts,
    evidence: incoming.evidence ?? existing.evidence,
    risksOrBlockers: incoming.risksOrBlockers ?? existing.risksOrBlockers,
    next: incoming.next ?? existing.next,
    userDecisions: incoming.userDecisions ?? existing.userDecisions,
  }
}

export function mergeCeoMember(existing: CeoTeamMember, incoming: CeoTeamMember): CeoTeamMember {
  const report = incoming.report ?? existing.report
  const lastMessage = incoming.lastMessage ?? existing.lastMessage
  const memberId = incoming.memberId ?? existing.memberId
  const seq = incoming.seq > existing.seq ? incoming.seq : existing.seq
  const answeredDecision = incoming.answeredDecision ?? existing.answeredDecision
  const process = incoming.process ?? existing.process
  const status = incoming.status === 'error' || existing.status === 'error'
    ? 'error' as const
    : incoming.status === 'running' && report !== undefined
      ? existing.status
      : incoming.status
  if (
    existing.role === incoming.role
    && existing.task === incoming.task
    && existing.batchCallId === incoming.batchCallId
    && existing.runId === incoming.runId
    && existing.rawId === incoming.rawId
    && existing.seq === seq
    && existing.memberId === memberId
    && existing.status === status
    && existing.report === report
    && existing.lastMessage === lastMessage
    && existing.answeredDecision === answeredDecision
    && existing.process === process
  ) {
    return existing
  }
  return {
    ...incoming,
    seq,
    memberId,
    status,
    report,
    lastMessage,
    answeredDecision,
    process,
  }
}

export function applyCeoMemberMessage(
  members: readonly CeoTeamMember[],
  event: {
    memberId: string
    seq: number
    text: string
    sourceKind: 'agent-message' | 'subagent-settled'
  },
): CeoTeamMember[] {
  const body = unwrapMemberMessage(event.memberId, event.text)
  const parsed = parseCeoMemberReport(body)
  const settlement = event.sourceKind === 'subagent-settled'
    ? settlementStatusOf(event.text)
    : undefined
  const incoming = parsed ?? (settlement !== undefined ? { status: settlement } : undefined)
  let found = false
  const next = members.map((member) => {
    if (member.memberId !== event.memberId) return member
    found = true
    const report = mergeReports(member.report, incoming)
    const questionChanged = incoming?.userDecisions !== undefined
      && incoming.userDecisions !== member.report?.userDecisions
    return {
      ...member,
      seq: event.seq,
      lastMessage: body !== '' ? body : member.lastMessage,
      report,
      answeredDecision: questionChanged ? undefined : member.answeredDecision,
      status: member.status === 'error' || event.sourceKind === 'subagent-settled'
        ? (member.status === 'error' ? 'error' as const : 'ok' as const)
        : member.status,
    }
  })
  return found ? next : members
}

export function formatCeoDecisionMessage(member: CeoTeamMember, answer: string): string {
  const who = member.memberId ?? member.role
  const question = (member.report?.userDecisions ?? '').trim()
  const lines = [
    `User decision for member ${who} (${member.role} · ${member.task}):`,
  ]
  if (question !== '') lines.push(`Question: ${question}`)
  lines.push(`Decision: ${answer.trim()}`)
  lines.push('Forward this to the member with send_message. Do not rewrite their work as success.')
  return lines.join('\n')
}

export function applyCeoUserDecision(member: CeoTeamMember, answer: string): CeoTeamMember {
  const trimmed = answer.trim()
  if (trimmed === '' || member.answeredDecision === trimmed) return member
  return { ...member, answeredDecision: trimmed }
}

export function parseCeoDelegateMemberId(text: string): string | undefined {
  const match = text.match(/as member (\S+)/)
  return match?.[1]
}

export function parseCeoDelegateRuns(text: string): Array<{
  role: string
  runId: string
  memberId?: string
  phase: string
}> {
  const runs: Array<{ role: string; runId: string; memberId?: string; phase: string }> = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^delegated (.+) \(([^)]+)\)(?: as member (\S+))? (\S+)$/)
    if (match === null) continue
    runs.push({
      role: match[1],
      runId: match[2],
      memberId: match[3],
      phase: match[4],
    })
  }
  return runs
}

export function startCeoTeam(turn: number): CeoTeamState {
  return { turn, members: [], progress: { completed: 0, total: 0 }, planHistory: [] }
}

export function applyCeoDelegateCall(
  state: CeoTeamState,
  event: { callId: string; seq: number; argsRaw: unknown },
): CeoTeamState {
  const tasks = parseCeoDelegateTasks(event.argsRaw)
  const batch = tasks.map((task, index) => {
    const rawId = task.rawId ?? `n${String(index)}`
    return {
      callId: `${event.callId}:${rawId}`,
      batchCallId: event.callId,
      seq: event.seq,
      role: task.role,
      task: task.task,
      dependsOn: task.dependsOn,
      rawId,
      status: 'queued' as const,
    }
  })
  const others = state.members.filter(member => member.batchCallId !== event.callId)
  return { ...state, members: [...others, ...batch] }
}

const RUN_PHASES = new Set<CeoRunPhase>(['queued', 'running', 'completed', 'failed', 'skipped', 'cancelled'])

export interface CeoRunJournalRun {
  runId: string
  rawId: string
  role: string
  task: string
  dependsOn: string[]
  phase: CeoRunPhase
  memberId?: string
}

export function parseCeoRunJournalRuns(value: unknown): CeoRunJournalRun[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!isRecord(item)) return []
    const phase = typeof item.phase === 'string' && RUN_PHASES.has(item.phase as CeoRunPhase)
      ? item.phase as CeoRunPhase
      : 'queued'
    const rawId = requiredString(item.rawId, requiredString(item.runId, 'n0'))
    return [{
      runId: requiredString(item.runId, rawId),
      rawId,
      role: requiredString(item.role, 'member'),
      task: requiredString(item.task, 'task'),
      dependsOn: idList(item.dependsOn),
      phase,
      ...typeof item.memberId === 'string' && item.memberId.trim() !== ''
        ? { memberId: item.memberId.trim() }
        : {},
    }]
  })
}

function journalStatus(phase: string): CeoMemberStatus {
  if (phase === 'queued') return 'queued'
  if (phase === 'running') return 'running'
  if (phase === 'failed' || phase === 'cancelled' || phase === 'error' || phase === 'skipped') return 'error'
  return 'ok'
}

function phaseStatus(phase: string): CeoMemberStatus {
  if (phase === 'queued') return 'queued'
  if (phase === 'running') return 'running'
  if (phase === 'failed' || phase === 'cancelled' || phase === 'error' || phase === 'skipped') return 'error'
  return 'ok'
}

function phaseReport(phase: string): CeoMemberReport | undefined {
  if (phase === 'completed') return { status: 'completed' }
  if (phase === 'failed' || phase === 'cancelled' || phase === 'skipped') return { status: 'failed' }
  return undefined
}

export function applyCeoRunJournal(
  state: CeoTeamState,
  event: { callId: string; seq: number; runs: readonly CeoRunJournalRun[] },
): CeoTeamState {
  if (event.runs.length === 0 || event.callId === '') return state
  const batch = state.members.filter(member => member.batchCallId === event.callId)
  if (batch.length === 0) {
    const members = event.runs.map((run) => ({
      callId: `${event.callId}:${run.rawId}`,
      batchCallId: event.callId,
      seq: event.seq,
      role: run.role,
      task: run.task,
      dependsOn: run.dependsOn,
      rawId: run.rawId,
      runId: run.runId,
      memberId: run.memberId,
      status: journalStatus(run.phase),
      report: phaseReport(run.phase),
    }))
    return { ...state, members: [...state.members, ...members] }
  }
  return {
    ...state,
    members: state.members.map((member) => {
      if (member.batchCallId !== event.callId) return member
      const index = batch.findIndex(item => item.callId === member.callId)
      const run = event.runs.find(item =>
        item.rawId === member.rawId || item.runId === member.runId,
      ) ?? event.runs[index]
      if (run === undefined) return member
      return {
        ...member,
        seq: event.seq,
        runId: run.runId,
        rawId: run.rawId,
        memberId: run.memberId ?? member.memberId,
        status: member.status === 'error' ? 'error' as const : journalStatus(run.phase),
        report: member.report ?? phaseReport(run.phase),
        process: member.process,
      }
    }),
  }
}

function replaceTrailing(
  process: readonly CeoProcessStep[],
  kind: 'reasoning' | 'content',
  text: string,
): CeoProcessStep[] {
  const last = process.at(-1)
  if (last?.kind === kind) return [...process.slice(0, -1), { kind, text }]
  return [...process, { kind, text }]
}

export function applyCeoProcessOp(
  process: readonly CeoProcessStep[] | undefined,
  op: CeoProcessOp,
): CeoProcessStep[] {
  const current = process ?? []
  if (op.kind === 'reasoning' || op.kind === 'content') {
    return replaceTrailing(current, op.kind, op.text)
  }
  if (op.kind === 'tool-start') {
    return [
      ...current,
      {
        kind: 'tool',
        toolCallId: op.toolCallId,
        name: op.name,
        ...op.args === undefined ? {} : { args: op.args },
        status: 'running' as const,
      },
    ]
  }
  const index = current.findLastIndex(step =>
    step.kind === 'tool' && step.toolCallId === op.toolCallId,
  )
  if (index < 0) {
    return [
      ...current,
      {
        kind: 'tool',
        toolCallId: op.toolCallId,
        name: 'tool',
        ...op.result === undefined ? {} : { result: op.result },
        ...op.sources === undefined ? {} : { sources: op.sources },
        status: op.isError === true ? 'error' as const : 'ok' as const,
      },
    ]
  }
  const existing = current[index]
  if (existing === undefined || existing.kind !== 'tool') return [...current]
  const next = current.slice()
  next[index] = {
    ...existing,
    ...op.result === undefined ? {} : { result: op.result },
    ...op.sources === undefined ? {} : { sources: op.sources },
    status: op.isError === true ? 'error' as const : 'ok' as const,
  }
  return next
}

export function parseCeoProcessOp(value: unknown): CeoProcessOp | undefined {
  if (!isRecord(value) || typeof value.kind !== 'string') return undefined
  if ((value.kind === 'reasoning' || value.kind === 'content') && typeof value.text === 'string') {
    return { kind: value.kind, text: value.text }
  }
  if (value.kind === 'tool-start' && typeof value.toolCallId === 'string' && typeof value.name === 'string') {
    return {
      kind: 'tool-start',
      toolCallId: value.toolCallId,
      name: value.name,
      ...typeof value.args === 'string' ? { args: value.args } : {},
    }
  }
  if (value.kind === 'tool-end' && typeof value.toolCallId === 'string') {
    return {
      kind: 'tool-end',
      toolCallId: value.toolCallId,
      ...typeof value.result === 'string' ? { result: value.result } : {},
      ...Array.isArray(value.sources) ? { sources: parseSearchSources(value.sources) } : {},
      ...value.isError === true ? { isError: true } : {},
    }
  }
  return undefined
}

export function applyCeoRunProcess(
  state: CeoTeamState,
  event: {
    callId: string
    seq: number
    runId?: string
    memberId?: string
    op: CeoProcessOp
  },
): CeoTeamState {
  if (event.callId === '') return state
  return {
    ...state,
    members: state.members.map((member) => {
      if (member.batchCallId !== event.callId) return member
      const sameRun = event.runId !== undefined && event.runId !== '' && member.runId === event.runId
      const sameMember = event.memberId !== undefined && event.memberId !== '' && member.memberId === event.memberId
      if (!sameRun && !sameMember) return member
      return {
        ...member,
        seq: event.seq,
        ...event.memberId === undefined ? {} : { memberId: event.memberId },
        process: applyCeoProcessOp(member.process, event.op),
      }
    }),
  }
}

export function applyCeoDelegateResult(
  state: CeoTeamState,
  event: { callId: string; seq: number; text: string; isError: boolean },
): CeoTeamState {
  const runs = parseCeoDelegateRuns(event.text)
  const batch = state.members.filter(member => member.batchCallId === event.callId)
  const members = state.members.map(member => {
    if (member.batchCallId !== event.callId) return member
    const index = batch.findIndex(item => item.callId === member.callId)
    const run = runs[index]
    return {
      ...member,
      seq: event.seq,
      runId: run?.runId ?? member.runId,
      memberId: run?.memberId ?? member.memberId,
      status: event.isError ? 'error' as const : (run === undefined ? member.status : phaseStatus(run.phase)),
      report: member.report ?? (run === undefined ? undefined : phaseReport(run.phase)),
    }
  })
  return { ...state, members }
}

export function projectCeoTeam(state: CeoTeamState): CeoTeamView | null {
  if (state.members.length === 0 && state.plan === undefined) return null
  return {
    turn: state.turn,
    members: state.members,
    progress: state.progress,
    planHistory: state.planHistory,
    ...state.plan === undefined ? {} : { plan: state.plan },
  }
}

/** Fold the authoritative final worker output; this does not depend on send_message. */
export function applyCeoMemberResult(
  state: CeoTeamState,
  event: { callId: string; runId: string; memberId: string; seq: number; output: string; stopReason?: string; status?: CeoReportStatus },
): CeoTeamState {
  const parsed = parseCeoMemberReport(event.output)
  return {
    ...state,
    members: state.members.map(member => {
      if (member.batchCallId !== event.callId || (member.memberId !== event.memberId && member.runId !== event.runId)) return member
      const status = parsed?.status
      return {
        ...member,
        seq: event.seq,
        memberId: event.memberId,
        lastMessage: event.output.trim() || member.lastMessage,
        report: mergeReports(member.report, event.status === 'blocked' || event.status === 'failed'
          ? { ...parsed, status: event.status }
          : parsed),
        status: status === 'blocked' || status === 'failed' ? 'ok' as const : member.status,
      }
    }),
  }
}

export function applyCeoPlan(
  state: CeoTeamState,
  event: { planId: string; version?: number; summary: string; analysis: string; teamBrief?: string; tasks: unknown },
): CeoTeamState {
  if (!event.planId || !event.summary || !event.analysis || !Array.isArray(event.tasks)) return state
  const tasks = event.tasks.flatMap((item) => {
    if (!isRecord(item) || typeof item.role !== 'string' || typeof item.task !== 'string') return []
    return [{
      ...typeof item.id === 'string' && item.id.trim() !== '' ? { id: item.id.trim() } : {},
      role: item.role.trim(),
      task: item.task.trim(),
      dependsOn: idList(item.dependsOn),
    }]
  })
  const plan = {
    planId: event.planId,
    version: typeof event.version === 'number' ? event.version : (state.plan?.version ?? 0) + 1,
    summary: event.summary,
    analysis: event.analysis,
    ...event.teamBrief === undefined ? {} : { teamBrief: event.teamBrief },
    tasks,
  }
  return {
    ...state,
    plan,
    planHistory: [...state.planHistory, plan].slice(-8),
  }
}

export function applyCeoRunProgress(state: CeoTeamState, event: { callId: string; completed: number; total: number; seq: number }): CeoTeamState {
  if (!event.callId || event.total < 0 || event.completed < 0) return state
  return { ...state, progress: { completed: Math.min(event.completed, event.total), total: event.total } }
}

export function applyCeoRunPhase(state: CeoTeamState, event: { callId: string; runId: string; memberId: string; phase: CeoActivityPhase; toolName?: string; seq: number }): CeoTeamState {
  if (!event.callId || !event.runId || !event.memberId) return state
  return { ...state, members: state.members.map(member => member.batchCallId === event.callId && (member.runId === event.runId || member.memberId === event.memberId) ? { ...member, seq: event.seq, activity: { phase: event.phase, ...event.toolName ? { toolName: event.toolName } : {} } } : member) }
}

export function memberDepth(member: CeoTeamMember, members: readonly CeoTeamMember[]): number {
  if (member.dependsOn.length === 0) return 0
  const depths = member.dependsOn.map((id) => {
    const dependency = members.find(item =>
      item.runId === id || item.rawId === id || item.memberId === id || item.role === id
    )
    return dependency === undefined ? 0 : memberDepth(dependency, members) + 1
  })
  return Math.max(0, ...depths)
}
