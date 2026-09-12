import assert from 'node:assert/strict'
import { test } from 'node:test'
import { layoutCeoTeamFlow, type CeoFlowTask } from '../src/flow.ts'
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
  const layout = layoutCeoTeamFlow([member('a')], [])
  assert.equal(layout.nodes.filter((node) => node.kind === 'task').length, 0)
  assert.equal(layout.taskLane, undefined)
})
