import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  completePayload,
  taskRowOf,
  taskRowsFromResult,
  type TeamViewDuck,
} from '../src/client/task-board-data.ts'

test('taskRowsFromResult：ok/失败/空/未定义 四态归一', () => {
  assert.equal(taskRowsFromResult(undefined).kind, 'loading')
  const failed = taskRowsFromResult({ ok: false, error: { message: 'boom' } })
  assert.equal(failed.kind, 'unavailable')
  assert.equal(failed.message, 'boom')
  const empty = taskRowsFromResult({ ok: true, value: { tasks: [] } })
  assert.equal(empty.kind, 'empty')
  const view: TeamViewDuck = {
    tasks: [
      { id: 't1', revision: 3, subject: '写部署文档', status: 'completed' },
      { id: 't2', revision: 1, subject: '联调接口', status: 'pending', blockedBy: ['t1'], ready: false },
    ],
  }
  const ready = taskRowsFromResult({ ok: true, value: view })
  assert.equal(ready.kind, 'ready')
  assert.equal(ready.tasks.length, 2)
})

test('taskRowOf：阻塞文案与可完成判定', () => {
  const blocked = taskRowOf({ id: 't2', revision: 1, subject: '联调', status: 'pending', blockedBy: ['t1'] })
  assert.equal(blocked.blockedByText, '阻塞于：t1')
  assert.equal(blocked.completable, true)
  const done = taskRowOf({ id: 't1', revision: 3, subject: '写文档', status: 'completed' })
  assert.equal(done.completable, false)
})

test('completePayload：CAS 载荷带 expectedRevision', () => {
  const payload = completePayload({ id: 't1', revision: 7, subject: 'x', status: 'in_progress' })
  assert.deepEqual(payload, { taskId: 't1', expectedRevision: 7, action: 'complete' })
})
