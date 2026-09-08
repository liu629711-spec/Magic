import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ceoMemberReportDefinition, ceoTeamDefinition } from '../src/client/definition.ts'
import { CEO_RUN_JOURNAL, CEO_RUN_PROCESS } from '../src/team.ts'
import {
  getCeoRoster,
  publishCeoTeam,
  resetCeoRoster,
} from '../src/client/selection.ts'

test('folds a turn of ceo_delegate events into one visible team node', () => {
  const startMatch = {
    event: { type: 'turn/start', seq: 1, data: { turn: 4 } },
    role: 'start',
    location: { kind: 'turn' },
  }
  assert.deepEqual(ceoTeamDefinition.match(startMatch.event), { id: '4', role: 'start' })

  let state = ceoTeamDefinition.start(undefined, startMatch)
  assert.equal(ceoTeamDefinition.buildViewNode({
    key: 'ceo-team:4',
    id: '4',
    state,
    start: startMatch,
  }), null)

  state = ceoTeamDefinition.update({ state }, {
    event: {
      type: 'tool/call',
      seq: 8,
      data: {
        turn: 4,
        callId: 'call-1',
        name: 'ceo_delegate',
        arguments: JSON.stringify({
          tasks: [{
            id: 'survey',
            role: 'researcher',
            task: 'Survey options',
          }],
        }),
      },
    },
  })
  assert.equal(state.members[0]?.status, 'queued')
  assert.deepEqual(ceoTeamDefinition.match({
    type: CEO_RUN_JOURNAL,
    data: { turn: 4, callId: 'call-1', runs: [] },
  }), { id: '4', role: 'update' })
  state = ceoTeamDefinition.update({ state }, {
    event: {
      type: CEO_RUN_JOURNAL,
      seq: 8,
      data: {
        turn: 4,
        callId: 'call-1',
        runs: [{
          runId: 'del_1_survey',
          rawId: 'survey',
          role: 'researcher',
          task: 'Survey options',
          dependsOn: [],
          phase: 'running',
        }],
      },
    },
  })
  assert.equal(state.members[0]?.status, 'running')
  assert.equal(state.members[0]?.runId, 'del_1_survey')
  assert.deepEqual(ceoTeamDefinition.match({
    type: CEO_RUN_PROCESS,
    data: { turn: 4, callId: 'call-1', runId: 'del_1_survey', op: { kind: 'reasoning', text: 'look' } },
  }), { id: '4', role: 'update' })
  state = ceoTeamDefinition.update({ state }, {
    event: {
      type: CEO_RUN_PROCESS,
      seq: 8,
      data: {
        turn: 4,
        callId: 'call-1',
        runId: 'del_1_survey',
        memberId: 'member-1',
        op: { kind: 'reasoning', text: 'look at the market' },
      },
    },
  })
  assert.equal(state.members[0]?.process?.[0]?.kind, 'reasoning')
  state = ceoTeamDefinition.update({ state }, {
    event: {
      type: 'tool/result',
      seq: 9,
      data: {
        turn: 4,
        message: {
          source: { callId: 'call-1' },
          content: [{
            isError: false,
            content: [{ type: 'text', text: 'delegated researcher (del_1_survey) as member member-1 completed' }],
          }],
        },
      },
    },
  })

  const node = ceoTeamDefinition.buildViewNode({
    key: 'ceo-team:4',
    id: '4',
    state,
    start: startMatch,
  })
  assert.equal(node?.kind, 'ceo-team')
  assert.equal(node?.data.members[0]?.memberId, 'member-1')
  assert.equal(node?.data.members[0]?.task, 'Survey options')
  assert.equal(node?.data.members[0]?.status, 'ok')
})

test('ignores unrelated tools and keeps a failed member visible', () => {
  const startMatch = {
    event: { type: 'turn/start', seq: 1, data: { turn: 1 } },
    role: 'start',
    location: { kind: 'turn' },
  }
  let state = ceoTeamDefinition.start(undefined, startMatch)
  state = ceoTeamDefinition.update({ state }, {
    event: {
      type: 'tool/call',
      seq: 2,
      data: { callId: 'other', name: 'bash', arguments: '{"command":"ls"}' },
    },
  })
  state = ceoTeamDefinition.update({ state }, {
    event: {
      type: 'tool/call',
      seq: 3,
      data: {
        callId: 'call-1',
        name: 'ceo_delegate',
        arguments: { tasks: [{ role: 'reviewer', task: 'Review' }] },
      },
    },
  })
  state = ceoTeamDefinition.update({ state }, {
    event: {
      type: 'tool/result',
      seq: 4,
      data: {
        turn: 1,
        message: {
          source: { callId: 'call-1' },
          content: [{
            isError: true,
            content: [{ type: 'text', text: 'ceo_delegate requires CEO work mode. Use /mode ceo first.' }],
          }],
        },
      },
    },
  })
  const node = ceoTeamDefinition.buildViewNode({
    key: 'ceo-team:1',
    id: '1',
    state,
    start: startMatch,
  })
  assert.equal(node?.data.members.length, 1)
  assert.equal(node?.data.members[0]?.status, 'error')
})

test('folds a member send_message into the session roster', () => {
  resetCeoRoster()
  publishCeoTeam([{
    callId: 'call-1:n0',
    batchCallId: 'call-1',
    seq: 1,
    role: 'researcher',
    task: 'Survey options',
    dependsOn: [],
    memberId: 'member-1',
    status: 'running',
  }])
  const match = ceoMemberReportDefinition.match({
    type: 'user/message',
    seq: 20,
    data: {
      source: { kind: 'agent-message', senderSessionId: 'member-1' },
      content: [{
        type: 'text',
        text: 'Agent member-1 sent a message:\nstatus: blocked\nuser_decisions: which option?\nrisks_or_blockers: missing budget',
      }],
    },
  })
  assert.deepEqual(match, { id: '20', role: 'start' })
  ceoMemberReportDefinition.start(undefined, {
    event: {
      seq: 20,
      data: {
        source: { kind: 'agent-message', senderSessionId: 'member-1' },
        content: [{
          type: 'text',
          text: 'Agent member-1 sent a message:\nstatus: blocked\nuser_decisions: which option?\nrisks_or_blockers: missing budget',
        }],
      },
    },
  })
  assert.equal(getCeoRoster()[0]?.report?.status, 'blocked')
  assert.equal(getCeoRoster()[0]?.report?.userDecisions, 'which option?')
  resetCeoRoster()
})
