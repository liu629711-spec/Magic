import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRosterMerger, layoutCeoTeamFlow, type CeoFlowTask } from '../src/flow.ts'
import type { CeoTeamMember } from '../src/team.ts'

function member(callId: string, dependsOn: string[] = []): CeoTeamMember {
  return {
    callId,
    batchCallId: 'c1',
    seq: 1,
    role: 'researcher',
    task: 'do it',
    dependsOn,
    status: 'completed',
  } as unknown as CeoTeamMember
}

const tasks: CeoFlowTask[] = [
  { id: 'task-1', subject: '验收任务板：界面创建', status: 'pending' },
  { id: 'task-2', subject: '第二条', status: 'completed' },
]

test('有成员 + 有任务：任务泳道出现在画布底部', () => {
  const layout = layoutCeoTeamFlow([member('a')], tasks)
  const taskNodes = layout.nodes.filter((node) => node.kind === 'task')
  assert.equal(taskNodes.length, 2)
  assert.notEqual(layout.taskLane, undefined)
  assert.equal(layout.taskLane?.label, '任务板 · 2 个任务')
  // 任务节点 id 唯一
  const ids = taskNodes.map((node) => node.id)
  assert.equal(new Set(ids).size, 2)
})

test('只有任务没有成员：仅任务泳道', () => {
  const layout = layoutCeoTeamFlow([], tasks)
  assert.equal(layout.nodes.filter((node) => node.kind === 'task').length, 2)
  assert.equal(layout.nodes.filter((node) => node.kind === 'member').length, 0)
})

test('无任务：不产生任务泳道（向后兼容）', () => {
  const layout = layoutCeoTeamFlow([], [])
  assert.equal(layout.nodes.filter((node) => node.kind === 'task').length, 0)
  assert.equal(layout.taskLane, undefined)
})

// ── createRosterMerger：CeoTeamGraph 每秒 tick 的重排根因（引用收敛）────────

test('mergeRosterMembers：roster 实时状态并回，缺席成员保留 turn 原项', () => {
  const merge = createRosterMerger()
  const a = member('a')
  const b = member('b')
  const runningA = { ...a, status: 'running' } as unknown as CeoTeamMember
  const merged = merge([a, b], [runningA])
  assert.equal(merged[0], runningA, 'roster 有该 callId → 用 roster 项')
  assert.equal(merged[1], b, 'roster 缺席 → 保留 turn 项')
})

test('mergeRosterMembers：输入引用不变时幂等返回同一数组', () => {
  const merge = createRosterMerger()
  const turn = [member('a')]
  const roster = [member('a')]
  const first = merge(turn, roster)
  assert.equal(merge(turn, roster), first)
})

test('mergeRosterMembers：输入换新数组但逐位成员等价 → 收敛回旧引用', () => {
  const merge = createRosterMerger()
  const a = member('a')
  const first = merge([a], [a])
  // selection store 事件会重建数组，但未变化的成员保留旧对象引用
  const again = merge([a], [a])
  assert.equal(again, first, '内容等价时不得产出新引用（否则 Canvas memo 每秒失效）')
})

test('mergeRosterMembers：成员对象真变化 → 产出新引用', () => {
  const merge = createRosterMerger()
  const turn = [member('a')]
  const first = merge(turn, [member('a')])
  const running = { ...member('a'), status: 'running' } as unknown as CeoTeamMember
  const second = merge(turn, [running])
  assert.notEqual(second, first)
  assert.equal(second[0], running)
})
