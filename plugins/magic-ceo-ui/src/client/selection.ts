import {
  applyCeoMemberMessage,
  applyCeoUserDecision,
  mergeCeoMember,
  type CeoTeamMember,
} from '../team.ts'

type Listener = () => void

interface PendingMemberMessage {
  memberId: string
  seq: number
  text: string
  sourceKind: 'agent-message' | 'subagent-settled'
}

let selected: CeoTeamMember | null = null
let roster: CeoTeamMember[] = []
let rosterSessionId: string | undefined
let pendingMessages: PendingMemberMessage[] = []
const listeners = new Set<Listener>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function getSelectedCeoMember(): CeoTeamMember | null {
  return selected
}

export function getCeoRoster(): readonly CeoTeamMember[] {
  return roster
}

export function getCeoRosterSessionId(): string | undefined {
  return rosterSessionId
}

export function subscribeCeoSelection(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function selectCeoMember(member: CeoTeamMember | null): void {
  if (selected === member) return
  selected = member
  notify()
}

function refreshSelected(): void {
  if (selected === null) return
  selected = roster.find(member => member.callId === selected?.callId) ?? null
}

function drainPending(members: readonly CeoTeamMember[]): CeoTeamMember[] {
  if (pendingMessages.length === 0) return members.slice()
  const still: PendingMemberMessage[] = []
  let next = members
  for (const event of pendingMessages) {
    const applied = applyCeoMemberMessage(next, event)
    if (applied === next) still.push(event)
    else next = applied
  }
  pendingMessages = still
  return next === members ? members.slice() : [...next]
}

export function publishCeoTeam(members: readonly CeoTeamMember[], sessionId?: string): void {
  if (sessionId !== undefined && sessionId !== rosterSessionId) {
    selected = null
    roster = []
    pendingMessages = []
    rosterSessionId = sessionId
  } else if (sessionId !== undefined) {
    rosterSessionId = sessionId
  }
  if (members.length === 0) return
  const next = roster.slice()
  let changed = false
  for (const incoming of members) {
    const index = next.findIndex(member => member.callId === incoming.callId)
    if (index === -1) {
      next.push(incoming)
      changed = true
      continue
    }
    const merged = mergeCeoMember(next[index]!, incoming)
    if (merged !== next[index]) {
      next[index] = merged
      changed = true
    }
  }
  const drained = drainPending(next)
  if (!changed && drained.length === next.length && drained.every((member, index) => member === next[index])) {
    return
  }
  roster = drained
  refreshSelected()
  notify()
}

export function recordCeoUserDecision(callId: string, answer: string): void {
  const index = roster.findIndex(member => member.callId === callId)
  if (index === -1) return
  const next = applyCeoUserDecision(roster[index]!, answer)
  if (next === roster[index]) return
  roster = roster.slice()
  roster[index] = next
  refreshSelected()
  notify()
}

export function applyCeoRosterMessage(event: PendingMemberMessage): void {
  const next = applyCeoMemberMessage(roster, event)
  if (next === roster) {
    pendingMessages = [...pendingMessages, event]
    return
  }
  roster = next
  refreshSelected()
  notify()
}

export function resetCeoRoster(): void {
  if (selected === null && roster.length === 0 && pendingMessages.length === 0 && rosterSessionId === undefined) return
  selected = null
  roster = []
  rosterSessionId = undefined
  pendingMessages = []
  notify()
}
