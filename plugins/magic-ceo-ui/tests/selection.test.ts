import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyCeoRosterMessage,
  getCeoRoster,
  getCeoRosterSessionId,
  getSelectedCeoMember,
  publishCeoTeam,
  recordCeoUserDecision,
  resetCeoRoster,
  selectCeoMember,
  subscribeCeoSelection,
} from '../src/client/selection.ts'
import type { CeoTeamMember } from '../src/team.ts'

function member(overrides: Partial<CeoTeamMember> = {}): CeoTeamMember {
  return {
    callId: 'call-1:n0',
    batchCallId: 'call-1',
    seq: 1,
    role: 'researcher',
    task: 'Survey options',
    dependsOn: [],
    status: 'running',
    ...overrides,
  }
}

test('selects a member and refreshes it from a later team snapshot', () => {
  resetCeoRoster()
  let ticks = 0
  const stop = subscribeCeoSelection(() => { ticks += 1 })

  const first = member()
  selectCeoMember(first)
  assert.equal(getSelectedCeoMember()?.callId, 'call-1:n0')
  assert.equal(ticks, 1)

  publishCeoTeam([member({ status: 'ok', memberId: 'member-1', seq: 2 })])
  assert.equal(getSelectedCeoMember()?.status, 'ok')
  assert.equal(getSelectedCeoMember()?.memberId, 'member-1')
  assert.equal(ticks, 2)

  publishCeoTeam([member({ callId: 'call-2:n0', batchCallId: 'call-2' })])
  assert.equal(getSelectedCeoMember()?.callId, 'call-1:n0')
  assert.equal(getCeoRoster().length, 2)
  assert.equal(ticks, 3)

  stop()
  resetCeoRoster()
})

test('a later session snapshot replaces the previous roster', () => {
  resetCeoRoster()
  publishCeoTeam([member()], 'session-a')
  selectCeoMember(getCeoRoster()[0] ?? null)
  assert.equal(getCeoRosterSessionId(), 'session-a')
  publishCeoTeam([member({ callId: 'call-9:n0', batchCallId: 'call-9' })], 'session-b')
  assert.equal(getCeoRosterSessionId(), 'session-b')
  assert.equal(getCeoRoster().length, 1)
  assert.equal(getCeoRoster()[0]?.callId, 'call-9:n0')
  assert.equal(getSelectedCeoMember(), null)
  resetCeoRoster()
  assert.equal(getCeoRosterSessionId(), undefined)
})

test('applies a later member report and keeps unmatched messages until the member appears', () => {
  resetCeoRoster()
  applyCeoRosterMessage({
    memberId: 'member-1',
    seq: 9,
    text: 'Agent member-1 sent a message:\nstatus: blocked\nuser_decisions: which option?',
    sourceKind: 'agent-message',
  })
  assert.equal(getCeoRoster().length, 0)

  publishCeoTeam([member({ memberId: 'member-1' })])
  assert.equal(getCeoRoster()[0]?.report?.status, 'blocked')
  assert.equal(getCeoRoster()[0]?.report?.userDecisions, 'which option?')

  selectCeoMember(getCeoRoster()[0] ?? null)
  applyCeoRosterMessage({
    memberId: 'member-1',
    seq: 10,
    text: 'Background subagent member-1 finished and will do no further work unless you send it more.\nIts closing message:\nstatus: blocked',
    sourceKind: 'subagent-settled',
  })
  assert.equal(getSelectedCeoMember()?.report?.status, 'blocked')

  applyCeoRosterMessage({
    memberId: 'member-1',
    seq: 11,
    text: 'Background subagent member-1 was stopped before it finished.\nIts closing message:\nstatus: completed\ndone: surveyed',
    sourceKind: 'subagent-settled',
  })
  assert.equal(getSelectedCeoMember()?.report?.status, 'blocked')

  recordCeoUserDecision('call-1:n0', 'take option A')
  assert.equal(getSelectedCeoMember()?.answeredDecision, 'take option A')
  resetCeoRoster()
})
