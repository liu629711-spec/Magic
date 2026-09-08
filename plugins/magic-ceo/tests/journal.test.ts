import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildRunPlan, parseDelegateTasks } from '../src/builder.ts'
import {
  CEO_RUN_JOURNAL,
  CEO_RUN_PROCESS,
  appendRunJournal,
  appendRunProcess,
  currentTurn,
  journalRuns,
} from '../src/journal.ts'

test('stamps ignorable before freeze so a custom journal type can reload', () => {
  const events: Array<{ type: string; seq: number; time: number; data: unknown; ignorable?: true }> = []
  const session = {
    append: (type: string, data: unknown) => {
      const event = { type, seq: events.length, time: 1, data }
      Object.freeze(event)
      events.push(event)
      return event
    },
  }
  appendRunJournal(session, {
    turn: 4,
    callId: 'call-1',
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey',
      dependsOn: [],
      phase: 'running',
    }],
  })
  assert.equal(events[0]?.type, CEO_RUN_JOURNAL)
  assert.equal(events[0]?.ignorable, true)
  assert.equal(Object.isFrozen(events[0]), true)
  assert.equal(Object.isExtensible(events[0]!), false)
})

test('reads the open turn and paints missing nodes as queued', () => {
  const plan = buildRunPlan(parseDelegateTasks({
    tasks: [
      { id: 'survey', role: 'researcher', task: 'Survey' },
      { id: 'build', role: 'implementer', task: 'Build', depends_on: ['survey'] },
    ],
  }), 'del_1')
  const session = {
    snapshotEvents: () => [
      { type: 'turn/start', data: { turn: 2 } },
      { type: 'turn/start', data: { turn: 4 } },
    ],
  }
  assert.equal(currentTurn(session), 4)
  const runs = journalRuns(plan, new Map([
    [plan.nodes[0]!.runId, { phase: 'running' as const }],
  ]))
  assert.equal(runs[0]?.phase, 'running')
  assert.equal(runs[1]?.phase, 'queued')
})

test('stamps ignorable on a run-process event', () => {
  const events: Array<{ type: string; seq: number; time: number; data: unknown; ignorable?: true }> = []
  const session = {
    append: (type: string, data: unknown) => {
      const event = { type, seq: events.length, time: 1, data }
      Object.freeze(event)
      events.push(event)
      return event
    },
  }
  appendRunProcess(session, {
    turn: 4,
    callId: 'call-1',
    runId: 'del_1_survey',
    memberId: 'member-1',
    op: { kind: 'reasoning', text: 'search first' },
  })
  assert.equal(events[0]?.type, CEO_RUN_PROCESS)
  assert.equal(events[0]?.ignorable, true)
})
