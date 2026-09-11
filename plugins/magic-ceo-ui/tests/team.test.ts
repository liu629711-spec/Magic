import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyCeoDelegateCall,
  applyCeoDelegateResult,
  applyCeoRunJournal,
  applyCeoRunProcess,
  applyCeoMemberMessage,
  applyCeoMemberResult,
  applyCeoUserDecision,
  mergeCeoMember,
  ceoAttentionItems,
  formatCeoDecisionMessage,
  memberDepth,
  parseCeoDelegateArgs,
  parseCeoDelegateMemberId,
  parseCeoDelegateRuns,
  clipDebriefSummary,
  displayCeoRole,
  displayCeoSeat,
  debriefSummaryOf,
  looksLikeMemberReport,
  looksLikeStructuredDump,
  hasUserDecision,
  parseCeoMemberReport,
  presentCeoMember,
  presentCeoMemberReport,
  reportLeadIn,
  reportTextFromProcess,
  projectCeoTeam,
  senderSessionIdOf,
  startCeoTeam,
  unwrapMemberMessage,
  settlementStatusOf,
} from '../src/team.ts'

test('parses a tasks[] graph and a legacy single-task payload', () => {
  assert.deepEqual(
    parseCeoDelegateArgs({
      tasks: [{
        role: 'researcher',
        task: 'Survey options',
        id: 'survey',
        depends_on: ['risks'],
      }],
    }),
    {
      role: 'researcher',
      task: 'Survey options',
      rawId: 'survey',
      dependsOn: ['risks'],
    },
  )
  assert.deepEqual(
    parseCeoDelegateArgs({
      role: 'researcher',
      work_package: 'Survey options',
      prompt: 'List the options.',
      depends_on: ['member-1'],
    }),
    {
      role: 'researcher',
      task: 'Survey options',
      rawId: undefined,
      dependsOn: ['member-1'],
    },
  )
  assert.equal(
    parseCeoDelegateMemberId('delegated researcher (del_1_survey) as member member-1 completed'),
    'member-1',
  )
  assert.deepEqual(
    parseCeoDelegateRuns([
      'delegated researcher (del_1_survey) as member member-1 completed',
      'delegated implementer (del_1_build) skipped',
    ].join('\n')),
    [
      { role: 'researcher', runId: 'del_1_survey', memberId: 'member-1', phase: 'completed' },
      { role: 'implementer', runId: 'del_1_build', memberId: undefined, phase: 'skipped' },
    ],
  )
})

test('folds one tasks[] call into a run graph', () => {
  let state = startCeoTeam(3)
  assert.equal(projectCeoTeam(state), null)

  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 10,
    argsRaw: JSON.stringify({
      tasks: [
        { id: 'survey', role: 'researcher', task: 'Survey options' },
        { id: 'build', role: 'implementer', task: 'Build the chosen option', depends_on: ['survey'] },
      ],
    }),
  })

  let view = projectCeoTeam(state)
  assert.equal(view?.members.length, 2)
  assert.equal(view?.members[0]?.callId, 'call-1:survey')
  assert.equal(view?.members[0]?.batchCallId, 'call-1')
  assert.equal(view?.members[0]?.task, 'Survey options')
  assert.equal(view?.members[0]?.status, 'queued')
  assert.equal(view?.members[1]?.status, 'queued')
  assert.equal(view?.members[1]?.dependsOn[0], 'survey')
  assert.equal(memberDepth(view?.members[1]!, view?.members ?? []), 1)

  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 10,
    runs: [
      {
        runId: 'del_1_survey',
        rawId: 'survey',
        role: 'researcher',
        task: 'Survey options',
        dependsOn: [],
        phase: 'running',
      },
      {
        runId: 'del_1_build',
        rawId: 'build',
        role: 'implementer',
        task: 'Build the chosen option',
        dependsOn: ['del_1_survey'],
        phase: 'queued',
      },
    ],
  })
  view = projectCeoTeam(state)
  assert.equal(view?.members[0]?.status, 'running')
  assert.equal(view?.members[0]?.runId, 'del_1_survey')
  assert.equal(view?.members[1]?.status, 'queued')
  assert.equal(presentCeoMember(view?.members[1]!).viewStatus, 'queued')

  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 10,
    runs: [
      {
        runId: 'del_1_survey',
        rawId: 'survey',
        role: 'researcher',
        task: 'Survey options',
        dependsOn: [],
        phase: 'completed',
        memberId: 'member-1',
      },
      {
        runId: 'del_1_build',
        rawId: 'build',
        role: 'implementer',
        task: 'Build the chosen option',
        dependsOn: ['del_1_survey'],
        phase: 'running',
        memberId: 'member-2',
      },
    ],
  })
  view = projectCeoTeam(state)
  assert.equal(view?.members[0]?.status, 'ok')
  assert.equal(view?.members[0]?.memberId, 'member-1')
  assert.equal(view?.members[1]?.status, 'running')

  state = applyCeoDelegateResult(state, {
    callId: 'call-1',
    seq: 11,
    text: [
      'delegated researcher (del_1_survey) as member member-1 completed',
      'delegated implementer (del_1_build) as member member-2 completed',
    ].join('\n'),
    isError: false,
  })
  view = projectCeoTeam(state)
  assert.equal(view?.members[0]?.memberId, 'member-1')
  assert.equal(view?.members[0]?.runId, 'del_1_survey')
  assert.equal(view?.members[0]?.status, 'ok')
  assert.equal(view?.members[1]?.memberId, 'member-2')
  assert.equal(view?.members[1]?.status, 'ok')
})

test('folds a member process into the selected run without dropping later journal ticks', () => {
  let state = startCeoTeam(4)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 10,
    argsRaw: { tasks: [{ id: 'survey', role: 'researcher', task: 'Survey options' }] },
  })
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 11,
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey options',
      dependsOn: [],
      phase: 'running',
      memberId: 'member-1',
    }],
  })
  state = applyCeoRunProcess(state, {
    callId: 'call-1',
    seq: 12,
    runId: 'del_1_survey',
    memberId: 'member-1',
    op: { kind: 'reasoning', text: 'look' },
  })
  state = applyCeoRunProcess(state, {
    callId: 'call-1',
    seq: 13,
    runId: 'del_1_survey',
    memberId: 'member-1',
    op: { kind: 'reasoning', text: 'look at the market' },
  })
  state = applyCeoRunProcess(state, {
    callId: 'call-1',
    seq: 14,
    runId: 'del_1_survey',
    memberId: 'member-1',
    op: { kind: 'tool-start', toolCallId: 'tool-1', name: 'web_search' },
  })
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 15,
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey options',
      dependsOn: [],
      phase: 'completed',
      memberId: 'member-1',
    }],
  })
  const member = projectCeoTeam(state)?.members[0]
  assert.equal(member?.status, 'ok')
  assert.deepEqual(member?.process, [
    { kind: 'reasoning', text: 'look at the market' },
    { kind: 'tool', toolCallId: 'tool-1', name: 'web_search', status: 'running' },
  ])
})

test('keeps structured search sources on the tool step', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ id: 'survey', role: 'researcher', task: 'Survey options' }] },
  })
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 2,
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey options',
      dependsOn: [],
      phase: 'running',
      memberId: 'member-1',
    }],
  })
  state = applyCeoRunProcess(state, {
    callId: 'call-1',
    seq: 3,
    runId: 'del_1_survey',
    memberId: 'member-1',
    op: {
      kind: 'tool-start',
      toolCallId: 'tool-1',
      name: 'web_search',
      args: '{"queries":["Hearthstone revenue 2025"]}',
    },
  })
  state = applyCeoRunProcess(state, {
    callId: 'call-1',
    seq: 4,
    runId: 'del_1_survey',
    memberId: 'member-1',
    op: {
      kind: 'tool-end',
      toolCallId: 'tool-1',
      result: 'Sources:\n- [Ignored](https://ignored.example)',
      sources: [{
        url: 'https://hearthstone.blizzard.com',
        title: 'Hearthstone',
        snippet: 'fast-paced strategy card game',
      }],
    },
  })
  const tool = projectCeoTeam(state)?.members[0]?.process?.[0]
  assert.equal(tool?.kind, 'tool')
  if (tool?.kind !== 'tool') return
  assert.equal(tool.status, 'ok')
  assert.equal(tool.sources?.[0]?.title, 'Hearthstone')
})

test('marks a failed delegation without dropping the member', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ role: 'reviewer', task: 'Review' }] },
  })
  state = applyCeoDelegateResult(state, {
    callId: 'call-1',
    seq: 2,
    text: 'ceo_delegate requires CEO work mode. Use /mode ceo first.',
    isError: true,
  })
  assert.equal(projectCeoTeam(state)?.members[0]?.status, 'error')
  assert.equal(projectCeoTeam(state)?.members[0]?.memberId, undefined)
})

test('parses a structured member report and surfaces decisions', () => {
  const report = parseCeoMemberReport([
    'status: blocked',
    'done: surveyed two options',
    'not_done: pick one',
    'artifacts: notes.md',
    'evidence: compared docs',
    'risks_or_blockers: missing budget',
    'next: wait for the user',
    'user_decisions: which option should we take?',
  ].join('\n'))
  assert.equal(report?.status, 'blocked')
  assert.equal(report?.userDecisions, 'which option should we take?')

  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ role: 'researcher', task: 'Survey the options.' }] },
  })
  state = applyCeoDelegateResult(state, {
    callId: 'call-1',
    seq: 2,
    text: 'delegated researcher (del_1_n0) as member member-1 completed',
    isError: false,
  })
  const afterReceipt = projectCeoTeam(state)?.members ?? []
  assert.equal(afterReceipt[0]?.status, 'ok')
  const members = applyCeoMemberMessage(afterReceipt, {
    memberId: 'member-1',
    seq: 3,
    text: [
      'Agent member-1 sent a message:',
      JSON.stringify({
        status: 'blocked',
        done: 'surveyed two options',
        user_decisions: 'which option?',
        risks_or_blockers: 'missing budget',
      }),
    ].join('\n'),
    sourceKind: 'agent-message',
  })
  const member = members[0]
  assert.ok(member)
  const presentation = presentCeoMember(member)
  assert.equal(presentation.viewStatus, 'blocked')
  assert.equal(presentation.needsDecision, true)
  assert.equal(presentation.hasBlocker, true)
  assert.deepEqual(ceoAttentionItems(members).map(item => item.kind), ['decision'])

  const answered = applyCeoUserDecision(member, 'take option A')
  assert.equal(presentCeoMember(answered).needsDecision, false)
  assert.deepEqual(ceoAttentionItems([answered]).map(item => item.kind), ['blocker'])
  assert.match(
    formatCeoDecisionMessage(answered, 'take option A'),
    /User decision for member member-1/,
  )
  assert.match(formatCeoDecisionMessage(answered, 'take option A'), /send_message/)
})

test('folds an unverified worker result as 回传待核实, not completed', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ id: 'survey', role: 'researcher', task: 'Survey options' }] },
  })
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 2,
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey options',
      dependsOn: [],
      phase: 'unverified',
      memberId: 'member-1',
    }],
  })
  state = applyCeoMemberResult(state, {
    callId: 'call-1',
    runId: 'del_1_survey',
    memberId: 'member-1',
    seq: 3,
    output: 'I looked at a few sites and wrote some notes.',
    stopReason: 'completed',
    status: 'unverified',
  })
  const member = projectCeoTeam(state)?.members[0]
  assert.ok(member)
  const presentation = presentCeoMember(member)
  assert.equal(presentation.viewStatus, 'unverified')
  assert.deepEqual(ceoAttentionItems([member]).map(item => item.kind), ['unverified'])
})

test('unwraps parent-facing member messages and settlement notices', () => {
  assert.equal(senderSessionIdOf({ kind: 'user' }), undefined)
  assert.equal(senderSessionIdOf({ kind: 'agent-message', senderSessionId: 'member-1' }), 'member-1')
  assert.equal(
    unwrapMemberMessage('member-1', 'Agent member-1 sent a message:\nstatus: completed\ndone: surveyed'),
    'status: completed\ndone: surveyed',
  )
  assert.equal(
    unwrapMemberMessage(
      'member-1',
      'Background subagent member-1 finished and will do no further work unless you send it more.\nIts closing message:\nstatus: completed',
    ),
    'status: completed',
  )
  assert.equal(
    settlementStatusOf('Background subagent member-1 finished and will do no further work unless you send it more.'),
    'unverified',
  )
  assert.equal(
    settlementStatusOf('Background subagent member-1 was stopped before it finished.'),
    'unverified',
  )
  assert.equal(
    settlementStatusOf('Background subagent member-1 ran out of room before it finished.'),
    'unverified',
  )
  assert.equal(
    settlementStatusOf('Background subagent member-1 failed before it finished.'),
    'failed',
  )
})

test('an unstructured DSH settlement is unverified and cannot overwrite an honest report', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ role: 'researcher', task: 'Survey' }] },
  })
  state = applyCeoDelegateResult(state, {
    callId: 'call-1',
    seq: 2,
    text: 'delegated researcher (del_1_n0) as member member-1 running',
    isError: false,
  })
  const finished = 'Background subagent member-1 finished and will do no further work unless you send it more.\nIts closing message:\nI looked around.'
  const unverified = applyCeoMemberMessage(state.members, {
    memberId: 'member-1',
    seq: 3,
    text: finished,
    sourceKind: 'subagent-settled',
  })
  assert.equal(unverified[0]?.report?.status, 'unverified')
  assert.equal(presentCeoMember(unverified[0]!).viewStatus, 'unverified')

  const blocked = applyCeoMemberMessage(state.members, {
    memberId: 'member-1',
    seq: 4,
    text: 'Agent member-1 sent a message:\nstatus: blocked\nuser_decisions: which option?',
    sourceKind: 'agent-message',
  })
  const afterFinish = applyCeoMemberMessage(blocked, {
    memberId: 'member-1',
    seq: 5,
    text: finished,
    sourceKind: 'subagent-settled',
  })
  assert.equal(afterFinish[0]?.report?.status, 'blocked')
  assert.equal(presentCeoMember(afterFinish[0]!).viewStatus, 'blocked')
})

test('a stopped settlement with a declared completed report is unverified, not completed', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ role: 'researcher', task: 'Survey' }] },
  })
  state = applyCeoDelegateResult(state, {
    callId: 'call-1',
    seq: 2,
    text: 'delegated researcher (del_1_n0) as member member-1 running',
    isError: false,
  })
  const stopped = [
    'Background subagent member-1 was stopped before it finished.',
    'Its closing message:',
    'status: completed',
    'done: surveyed two options',
  ].join('\n')
  const members = applyCeoMemberMessage(state.members, {
    memberId: 'member-1',
    seq: 3,
    text: stopped,
    sourceKind: 'subagent-settled',
  })
  assert.equal(members[0]?.report?.status, 'unverified')
  assert.equal(presentCeoMember(members[0]!).viewStatus, 'unverified')
  assert.equal(
    presentCeoMemberReport(members[0]!)?.status,
    'unverified',
  )
})

test('running out of room is unverified, not partial success', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ role: 'researcher', task: 'Survey' }] },
  })
  state = applyCeoDelegateResult(state, {
    callId: 'call-1',
    seq: 2,
    text: 'delegated researcher (del_1_n0) as member member-1 running',
    isError: false,
  })
  const truncated = [
    'Background subagent member-1 ran out of room before it finished.',
    'Its closing message:',
    'status: partial',
    'done: drafted half the survey',
  ].join('\n')
  const members = applyCeoMemberMessage(state.members, {
    memberId: 'member-1',
    seq: 3,
    text: truncated,
    sourceKind: 'subagent-settled',
  })
  assert.equal(members[0]?.report?.status, 'unverified')
  assert.equal(presentCeoMember(members[0]!).viewStatus, 'unverified')
})

test('a finished settlement with a structured completed report stays completed', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ role: 'researcher', task: 'Survey' }] },
  })
  state = applyCeoDelegateResult(state, {
    callId: 'call-1',
    seq: 2,
    text: 'delegated researcher (del_1_n0) as member member-1 running',
    isError: false,
  })
  const finished = [
    'Background subagent member-1 finished and will do no further work unless you send it more.',
    'Its closing message:',
    'status: completed',
    'done: surveyed two options',
  ].join('\n')
  const members = applyCeoMemberMessage(state.members, {
    memberId: 'member-1',
    seq: 3,
    text: finished,
    sourceKind: 'subagent-settled',
  })
  assert.equal(members[0]?.report?.status, 'completed')
  assert.equal(presentCeoMember(members[0]!).viewStatus, 'completed')
})

test('a later stopped settlement rewrites a declared completed report to unverified', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ role: 'researcher', task: 'Survey' }] },
  })
  state = applyCeoDelegateResult(state, {
    callId: 'call-1',
    seq: 2,
    text: 'delegated researcher (del_1_n0) as member member-1 running',
    isError: false,
  })
  const claimed = applyCeoMemberMessage(state.members, {
    memberId: 'member-1',
    seq: 3,
    text: 'Agent member-1 sent a message:\nstatus: completed\ndone: surveyed',
    sourceKind: 'agent-message',
  })
  assert.equal(claimed[0]?.report?.status, 'completed')
  const stopped = applyCeoMemberMessage(claimed, {
    memberId: 'member-1',
    seq: 4,
    text: 'Background subagent member-1 was stopped before it finished.\nIts closing message:\nstatus: completed',
    sourceKind: 'subagent-settled',
  })
  assert.equal(stopped[0]?.report?.status, 'unverified')
  assert.equal(presentCeoMember(stopped[0]!).viewStatus, 'unverified')
})

test('presentCeoMemberReport cannot paint completed over a stored honest status', () => {
  const member = {
    callId: 'call-1:n0',
    batchCallId: 'call-1',
    seq: 3,
    role: 'researcher',
    task: 'Survey',
    dependsOn: [],
    memberId: 'member-1',
    status: 'ok' as const,
    report: { status: 'unverified' as const, done: 'claimed done' },
    lastMessage: 'status: completed\ndone: claimed done',
    process: [{ kind: 'content' as const, text: 'status: completed\ndone: claimed done' }],
  }
  assert.equal(presentCeoMemberReport(member)?.status, 'unverified')
  assert.equal(presentCeoMember({ ...member, report: presentCeoMemberReport(member) }).viewStatus, 'unverified')
})

test('declared completed plus a non-completed stop folds as unverified', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ id: 'survey', role: 'researcher', task: 'Survey options' }] },
  })
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 2,
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey options',
      dependsOn: [],
      phase: 'running',
      memberId: 'member-1',
    }],
  })
  state = applyCeoMemberResult(state, {
    callId: 'call-1',
    runId: 'del_1_survey',
    memberId: 'member-1',
    seq: 3,
    output: 'status: completed\ndone: surveyed two options',
    stopReason: 'aborted',
    status: 'completed',
  })
  const member = projectCeoTeam(state)?.members[0]
  assert.equal(member?.report?.status, 'unverified')
  assert.equal(presentCeoMember(member!).viewStatus, 'unverified')
})

test('a later completed parse cannot overwrite blocked, failed, or unverified', () => {
  const blocked = {
    callId: 'call-1:n0',
    batchCallId: 'call-1',
    seq: 1,
    role: 'researcher',
    task: 'Survey',
    dependsOn: [],
    memberId: 'member-1',
    status: 'ok' as const,
    report: { status: 'blocked' as const, userDecisions: 'which option?' },
  }
  const overwritten = applyCeoMemberMessage([blocked], {
    memberId: 'member-1',
    seq: 4,
    text: 'Agent member-1 sent a message:\nstatus: completed\ndone: done',
    sourceKind: 'agent-message',
  })
  assert.equal(overwritten[0]?.report?.status, 'blocked')
  assert.equal(presentCeoMember(overwritten[0]!).viewStatus, 'blocked')
})

test('a later completed snapshot cannot overwrite an honest roster report', () => {
  const existing = {
    callId: 'call-1:n0',
    batchCallId: 'call-1',
    seq: 2,
    role: 'researcher',
    task: 'Survey',
    dependsOn: [],
    memberId: 'member-1',
    status: 'ok' as const,
    report: { status: 'unverified' as const, done: 'claimed done' },
  }
  const merged = mergeCeoMember(existing, {
    ...existing,
    seq: 3,
    report: { status: 'completed' as const, done: 'claimed done' },
  })
  assert.equal(merged.report?.status, 'unverified')
  assert.equal(presentCeoMember(merged).viewStatus, 'unverified')
})

test('unknown journal stamps a member that only had a draft report', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ id: 'survey', role: 'researcher', task: 'Survey options' }] },
  })
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 2,
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey options',
      dependsOn: [],
      phase: 'running',
      memberId: 'member-1',
    }],
  })
  state = {
    ...state,
    members: state.members.map(member => ({
      ...member,
      report: { done: 'draft notes' },
    })),
  }
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 3,
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey options',
      dependsOn: [],
      phase: 'unknown_after_restart',
      memberId: 'member-1',
    }],
  })
  const member = projectCeoTeam(state)?.members[0]
  assert.equal(member?.report?.status, 'unknown_after_restart')
  assert.equal(member?.report?.done, 'draft notes')
  assert.equal(presentCeoMember(member!).viewStatus, 'unknown_after_restart')
})

test('blocked journal nodes stay queued for dependents and ask for a decision', () => {
  let state = startCeoTeam(1)
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 2,
    runs: [
      {
        runId: 'del_1_survey',
        rawId: 'survey',
        role: 'researcher',
        task: 'Survey options',
        dependsOn: [],
        phase: 'blocked',
        memberId: 'member-1',
      },
      {
        runId: 'del_1_build',
        rawId: 'build',
        role: 'implementer',
        task: 'Build it',
        dependsOn: ['del_1_survey'],
        phase: 'queued',
      },
    ],
  })
  const view = projectCeoTeam(state)
  assert.equal(presentCeoMember(view!.members[0]!).viewStatus, 'blocked')
  assert.equal(presentCeoMember(view!.members[1]!).viewStatus, 'queued')
})

test('a decision message tells the CEO to ceo_replan continue, not send_message', () => {
  const text = formatCeoDecisionMessage({
    callId: 'call-1:survey',
    batchCallId: 'call-1',
    seq: 1,
    role: 'researcher',
    task: 'Survey options',
    dependsOn: [],
    rawId: 'survey',
    runId: 'del_1_survey',
    memberId: 'member-1',
    status: 'ok',
    report: { userDecisions: 'which option?' },
  }, 'take option A')
  assert.match(text, /run_id survey/)
  assert.match(text, /ceo_replan/)
  assert.match(text, /take option A/)
  assert.match(text, /Do not send_message/)
  assert.doesNotMatch(text, /Forward this to the member with send_message/)
})

test('a later journal can append a replan-added node to the roster', () => {
  let state = startCeoTeam(1)
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 2,
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey options',
      dependsOn: [],
      phase: 'completed',
      memberId: 'member-1',
    }],
  })
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 3,
    runs: [
      {
        runId: 'del_1_survey',
        rawId: 'survey',
        role: 'researcher',
        task: 'Survey options',
        dependsOn: [],
        phase: 'completed',
        memberId: 'member-1',
      },
      {
        runId: 'del_1_build',
        rawId: 'build',
        role: 'implementer',
        task: 'Build it',
        dependsOn: ['del_1_survey'],
        phase: 'queued',
      },
    ],
  })
  const view = projectCeoTeam(state)
  assert.equal(view?.members.length, 2)
  assert.equal(view?.members[1]?.role, 'implementer')
  assert.equal(presentCeoMember(view!.members[1]!).viewStatus, 'queued')
})

test('in-flight journal after restart is unknown, not running', () => {
  let state = startCeoTeam(1)
  state = applyCeoRunJournal(state, {
    callId: 'call-1',
    seq: 2,
    runs: [{
      runId: 'del_1_survey',
      rawId: 'survey',
      role: 'researcher',
      task: 'Survey options',
      dependsOn: [],
      phase: 'unknown_after_restart',
      memberId: 'member-1',
    }],
  })
  const member = projectCeoTeam(state)?.members[0]
  assert.ok(member)
  assert.equal(presentCeoMember(member).viewStatus, 'unknown_after_restart')
  assert.deepEqual(ceoAttentionItems([member]).map(item => item.kind), ['unknown_after_restart'])
})

test('a mid-work member message keeps the node visible after the run settles', () => {
  let state = startCeoTeam(1)
  state = applyCeoDelegateCall(state, {
    callId: 'call-1',
    seq: 1,
    argsRaw: { tasks: [{ role: 'researcher', task: 'Survey' }] },
  })
  assert.equal(state.members[0]?.status, 'queued')
  state = applyCeoDelegateResult(state, {
    callId: 'call-1',
    seq: 2,
    text: 'delegated researcher (del_1_n0) as member member-1 completed',
    isError: false,
  })
  const members = applyCeoMemberMessage(state.members, {
    memberId: 'member-1',
    seq: 3,
    text: 'Agent member-1 sent a message:\nstatus: blocked\nuser_decisions: which option?',
    sourceKind: 'agent-message',
  })
  assert.equal(members[0]?.status, 'ok')
  assert.equal(presentCeoMember(members[0]!).viewStatus, 'blocked')
})

test('a later report with a new question reopens the decision', () => {
  const member = {
    callId: 'call-1:n0',
    batchCallId: 'call-1',
    seq: 1,
    role: 'researcher',
    task: 'Survey',
    dependsOn: [],
    memberId: 'member-1',
    status: 'running' as const,
    report: { userDecisions: 'which option?' },
    answeredDecision: 'take option A',
  }
  assert.equal(presentCeoMember(member).needsDecision, false)
  const next = applyCeoMemberMessage([member], {
    memberId: 'member-1',
    seq: 4,
    text: 'Agent member-1 sent a message:\nuser_decisions: pick a deadline',
    sourceKind: 'agent-message',
  })
  assert.equal(next[0]?.answeredDecision, undefined)
  assert.equal(presentCeoMember(next[0]!).needsDecision, true)
})

test('canvas titles map English plan roles to Chinese seats', () => {
  assert.equal(displayCeoRole('research'), '调研')
  assert.equal(displayCeoRole('researcher'), '调研')
  assert.equal(displayCeoRole('synthesis'), '汇总')
  assert.equal(displayCeoRole('synthesizer'), '汇总')
  assert.equal(displayCeoRole('review'), '审阅')
  assert.equal(displayCeoRole('implementation'), '实现')
  assert.equal(displayCeoRole('调研'), '调研')
  assert.equal(displayCeoRole('国内市场'), '国内市场')
  assert.equal(displayCeoRole(''), '成员')
})

test('generic seats take a distinct name from the task', () => {
  const domestic = {
    callId: 'call-1:domestic',
    role: 'research',
    task: '调研国内休闲游戏市场，覆盖超休闲与混合休闲。',
  }
  const overseas = {
    callId: 'call-1:overseas',
    role: 'research',
    task: '完成2024-2025年海外休闲游戏市场调研（全球除中国大陆）。',
  }
  const synthesis = {
    callId: 'call-1:synth',
    role: 'synthesis',
    task: '汇总海内外对比结论。',
  }
  const roster = [domestic, overseas, synthesis]
  assert.equal(displayCeoSeat(domestic, roster), '国内市场')
  assert.equal(displayCeoSeat(overseas, roster), '海外市场')
  assert.equal(displayCeoSeat(synthesis, roster), '结论汇总')
  assert.equal(displayCeoSeat({
    callId: 'call-1:named',
    role: '国内市场',
    task: '调研国内休闲游戏',
  }), '国内市场')
  assert.equal(displayCeoSeat({
    callId: 'call-1:exclude-cn',
    role: 'research',
    task: '完成2024-2025年海外休闲游戏市场调研（全球除中国大陆）。',
  }), '海外市场')
})

test('empty user_decisions do not ask the user to decide', () => {
  assert.equal(hasUserDecision(undefined), false)
  assert.equal(hasUserDecision('无'), false)
  assert.equal(hasUserDecision('无。'), false)
  assert.equal(hasUserDecision('[]'), false)
  assert.equal(hasUserDecision('none'), false)
  assert.equal(hasUserDecision('which option?'), true)

  const chineseNone = parseCeoMemberReport([
    'status: completed',
    'done: surveyed the market',
    '用户决策：无。',
  ].join('\n'))
  assert.equal(chineseNone?.userDecisions, undefined)

  const none = parseCeoMemberReport([
    'status: completed',
    'done: surveyed the market',
    'user_decisions: 无',
  ].join('\n'))
  assert.equal(none?.userDecisions, undefined)
  assert.equal(presentCeoMember({
    callId: 'call-1:survey',
    batchCallId: 'call-1',
    seq: 1,
    role: 'researcher',
    task: 'Survey',
    dependsOn: [],
    status: 'ok',
    report: none,
  }).needsDecision, false)

  const emptyArray = parseCeoMemberReport(JSON.stringify({
    status: 'completed',
    done: 'surveyed the market',
    user_decisions: [],
  }))
  assert.equal(emptyArray?.userDecisions, undefined)
  assert.equal(emptyArray?.done, 'surveyed the market')

  const fenced = parseCeoMemberReport([
    '```json',
    JSON.stringify({
      status: 'completed',
      done: '调研完成，报告已写入工作区',
      user_decisions: [],
    }, null, 2),
    '```',
  ].join('\n'))
  assert.equal(fenced?.status, 'completed')
  assert.equal(fenced?.userDecisions, undefined)
  assert.equal(looksLikeStructuredDump('```json\n{"status":"completed","done":"x"}\n```'), true)
  assert.equal(
    debriefSummaryOf(fenced, '```json\n{"status":"completed","done":"调研完成，报告已写入工作区","user_decisions":[]}\n```'),
    '调研完成，报告已写入工作区',
  )
})

test('delegation receipts do not become fake reports', () => {
  assert.equal(
    parseCeoMemberReport('delegated researcher (del_1_survey) as member member-1 completed'),
    undefined,
  )
})

test('markdown-bold labeled reports parse into a compact debrief', () => {
  const dump = [
    '调研完成。报告已写入工作区文件,以下为结构化结果:',
    '',
    '- **status**: completed',
    '- **done**: 完成中国大陆实体集换式卡牌市场中文调研报告,产出 `中国卡牌市场调研报告.md`(约5000字)',
    '- **not_done**: 云涌科技、名传文化两家公司未能检索到可核实的公开财务/业务数据',
    '- **artifacts**: `中国卡牌市场调研报告.md`',
    '- **evidence**: 通过360资讯搜索检索并直接抓取核实了8篇以上权威报道',
    '- **risks_or_blockers**: web_search工具因缺少API Key不可用;市场规模存在口径冲突',
    '- **next**: 如需深化,建议获取招股书原文核对',
    '- **user_decisions**: 报告偏投资视角还是业务运营视角?',
  ].join('\n')
  const report = parseCeoMemberReport(dump)
  assert.equal(report?.status, 'completed')
  assert.match(report?.done ?? '', /中国卡牌市场调研报告/)
  assert.match(report?.notDone ?? '', /云涌科技/)
  assert.match(report?.artifacts ?? '', /中国卡牌市场调研报告\.md/)
  assert.equal(looksLikeMemberReport(dump), true)
  assert.equal(reportLeadIn(dump), '调研完成。报告已写入工作区文件')
  assert.equal(debriefSummaryOf(report, dump), '调研完成。报告已写入工作区文件')
  assert.equal(clipDebriefSummary('短句'), '短句')
  const presented = presentCeoMemberReport({
    process: [{ kind: 'content', text: dump }],
  })
  assert.equal(presented?.status, 'completed')
  assert.equal(reportTextFromProcess([{ kind: 'content', text: dump }]), dump)
  assert.equal(debriefSummaryOf(presented, dump).includes('**status**'), false)
})
