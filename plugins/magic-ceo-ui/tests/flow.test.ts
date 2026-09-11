import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CEO_FLOW,
  ceoFlowEdgePath,
  ceoFlowMemberId,
  ceoTeamSinkStatus,
  layoutCeoTeamFlow,
} from '../src/flow.ts'
import type { CeoTeamMember } from '../src/team.ts'

function member(overrides: Partial<CeoTeamMember>): CeoTeamMember {
  return {
    callId: 'call-1:n0',
    batchCallId: 'call-1',
    seq: 1,
    role: 'researcher',
    task: 'Survey',
    dependsOn: [],
    status: 'running',
    ...overrides,
  }
}

test('independent members fan out from the goal and report to CEO', () => {
  const layout = layoutCeoTeamFlow([
    member({ callId: 'call-1:survey', rawId: 'survey', memberId: 'member-1', task: 'List dirs' }),
    member({
      callId: 'call-1:risks',
      rawId: 'risks',
      seq: 2,
      memberId: 'member-2',
      role: 'reviewer',
      task: 'Risks',
    }),
  ])

  assert.equal(layout.nodes.map(node => node.id).join(','), 'goal,member:call-1:survey,member:call-1:risks,ceo')
  const left = layout.nodes.filter(node => node.kind === 'member')
  assert.equal(left[0]?.x, left[1]?.x)
  assert.equal(left[0]?.x, CEO_FLOW.padX + CEO_FLOW.goal.width + CEO_FLOW.columnGap)
  assert.ok((left[1]?.y ?? 0) > (left[0]?.y ?? 0))
  assert.deepEqual(
    layout.edges.map(edge => `${edge.kind}:${edge.from}->${edge.to}`),
    [
      'goal:goal->member:call-1:survey',
      'goal:goal->member:call-1:risks',
      'report:member:call-1:survey->ceo',
      'report:member:call-1:risks->ceo',
    ],
  )
  assert.equal(layout.nodes.find(node => node.id === 'ceo')?.x, left[0]!.x + CEO_FLOW.member.width + CEO_FLOW.columnGap)
})

test('a dependency chain occupies successive columns', () => {
  const layout = layoutCeoTeamFlow([
    member({ callId: 'call-1:survey', rawId: 'survey', memberId: 'member-1' }),
    member({
      callId: 'call-1:build',
      rawId: 'build',
      seq: 2,
      memberId: 'member-2',
      role: 'implementer',
      task: 'Build',
      dependsOn: ['survey'],
    }),
  ])

  const first = layout.nodes.find(node => node.id === 'member:call-1:survey')
  const second = layout.nodes.find(node => node.id === 'member:call-1:build')
  assert.ok(first)
  assert.ok(second)
  assert.ok(second.x > first.x)
  assert.equal(layout.nodes.find(node => node.id === 'goal')?.enterIndex, 0)
  assert.equal(first.enterIndex, 1)
  assert.equal(second.enterIndex, 2)
  assert.equal(layout.nodes.find(node => node.id === 'ceo')?.enterIndex, 3)
  assert.deepEqual(
    layout.edges.map(edge => `${edge.kind}:${edge.from}->${edge.to}`),
    [
      'goal:goal->member:call-1:survey',
      'depends:member:call-1:survey->member:call-1:build',
      'report:member:call-1:build->ceo',
    ],
  )
})

test('a skipped synthesizer still occupies its own column', () => {
  const layout = layoutCeoTeamFlow([
    member({ callId: 'call-1:domestic', rawId: 'research-domestic', memberId: 'm1', role: 'research' }),
    member({
      callId: 'call-1:overseas',
      rawId: 'research-overseas',
      seq: 2,
      memberId: 'm2',
      role: 'research',
      task: 'Overseas',
    }),
    member({
      callId: 'call-1:synthesize',
      rawId: 'synthesize',
      seq: 3,
      role: 'synthesis',
      task: 'Compare',
      dependsOn: ['research-domestic', 'research-overseas'],
      status: 'error',
      report: { status: 'failed' },
    }),
  ])

  const researchers = layout.nodes.filter(node => node.member?.role === 'research')
  const synthesis = layout.nodes.find(node => node.id === 'member:call-1:synthesize')
  assert.equal(researchers.length, 2)
  assert.ok(synthesis)
  assert.equal(researchers[0]?.x, researchers[1]?.x)
  assert.ok((synthesis.x ?? 0) > (researchers[0]?.x ?? 0))
  assert.ok((layout.nodes.find(node => node.id === 'ceo')?.x ?? 0) > synthesis.x)
  assert.equal(synthesis.enterIndex, 2)
  assert.deepEqual(
    layout.edges.map(edge => `${edge.kind}:${edge.from}->${edge.to}`),
    [
      'goal:goal->member:call-1:domestic',
      'goal:goal->member:call-1:overseas',
      'depends:member:call-1:domestic->member:call-1:synthesize',
      'depends:member:call-1:overseas->member:call-1:synthesize',
      'report:member:call-1:synthesize->ceo',
    ],
  )
})

test('unresolved dependencies still start from the goal', () => {
  const layout = layoutCeoTeamFlow([
    member({ callId: 'call-1:n0', dependsOn: ['missing'] }),
  ])
  assert.deepEqual(
    layout.edges.map(edge => `${edge.from}->${edge.to}`),
    ['goal->member:call-1:n0', 'member:call-1:n0->ceo'],
  )
})

test('sink status follows the members that still need attention', () => {
  assert.equal(ceoTeamSinkStatus([member({ status: 'queued' })]), 'queued')
  assert.equal(ceoTeamSinkStatus([
    member({ status: 'running' }),
    member({ callId: 'call-1:n1', status: 'queued' }),
  ]), 'running')
  assert.equal(ceoTeamSinkStatus([member({ status: 'running' })]), 'running')
  assert.equal(ceoTeamSinkStatus([
    member({
      status: 'ok',
      report: { status: 'blocked', userDecisions: 'which option?' },
    }),
  ]), 'blocked')
  assert.equal(ceoTeamSinkStatus([
    member({ status: 'ok', report: { status: 'completed' } }),
    member({ callId: 'call-1:n1', status: 'ok', report: { status: 'completed' } }),
  ]), 'completed')
  assert.equal(ceoTeamSinkStatus([
    member({ status: 'ok', report: { status: 'unverified' } }),
  ]), 'unverified')
  assert.equal(ceoTeamSinkStatus([
    member({ status: 'ok', report: { status: 'unknown_after_restart' } }),
  ]), 'unknown_after_restart')
})

test('wave lanes sit behind member columns with finite bounds', () => {
  const layout = layoutCeoTeamFlow([
    member({ callId: 'call-1:survey', rawId: 'survey', memberId: 'member-1' }),
    member({
      callId: 'call-1:build',
      rawId: 'build',
      seq: 2,
      memberId: 'member-2',
      role: 'implementer',
      task: 'Build',
      dependsOn: ['survey'],
    }),
  ])
  assert.equal(layout.lanes.length, 2)
  assert.equal(layout.lanes[0]?.label, '第 1 波')
  assert.equal(layout.lanes[1]?.label, '第 2 波')
  for (const lane of layout.lanes) {
    assert.equal(Number.isFinite(lane.x), true)
    assert.equal(Number.isFinite(lane.y), true)
    assert.equal(Number.isFinite(lane.w), true)
    assert.equal(Number.isFinite(lane.h), true)
    assert.ok(lane.h >= CEO_FLOW.member.height)
  }
})

test('edge path leaves the source on the right and enters the target on the left', () => {
  const path = ceoFlowEdgePath(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 50, y: 20, width: 10, height: 10 },
  )
  assert.match(path, /^M 10 5 C /)
  assert.equal(ceoFlowMemberId('call-1'), 'member:call-1')
  assert.deepEqual(layoutCeoTeamFlow([]), { width: 0, height: 0, nodes: [], edges: [], lanes: [] })
})
