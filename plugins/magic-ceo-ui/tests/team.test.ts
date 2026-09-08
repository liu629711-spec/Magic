import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyCeoDelegateCall,
  applyCeoDelegateResult,
  applyCeoRunJournal,
  applyCeoRunProcess,
  applyCeoMemberMessage,
  applyCeoUserDecision,
  ceoAttentionItems,
  formatCeoDecisionMessage,
  memberDepth,
  parseCeoDelegateArgs,
  parseCeoDelegateMemberId,
  parseCeoDelegateRuns,
  clipDebriefSummary,
  debriefSummaryOf,
  looksLikeMemberReport,
  parseCeoMemberReport,
  presentCeoMember,
  presentCeoMemberReport,
  reportLeadIn,
  reportTextFromProcess,
  projectCeoTeam,
  senderSessionIdOf,
  startCeoTeam,
  unwrapMemberMessage,
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
