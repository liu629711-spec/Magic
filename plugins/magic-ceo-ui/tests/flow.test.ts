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
  assert.deepEqual(
    layout.edges.map(edge => `${edge.kind}:${edge.from}->${edge.to}`),
    [
      'goal:goal->member:call-1:survey',
      'depends:member:call-1:survey->member:call-1:build',
      'report:member:call-1:build->ceo',
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
})

test('edge path leaves the source on the right and enters the target on the left', () => {
  const path = ceoFlowEdgePath(
    { x: 0, y: 0, width: 10, height: 10 },
    { x: 50, y: 20, width: 10, height: 10 },
  )
  assert.match(path, /^M 10 5 C /)
  assert.equal(ceoFlowMemberId('call-1'), 'member:call-1')
  assert.deepEqual(layoutCeoTeamFlow([]), { width: 0, height: 0, nodes: [], edges: [] })
})
