import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
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

// TaskBoard.ts 依赖 react（由 DSH 运行时提供，测试环境解析不到），组件代码不被
// 本套件加载 —— 与 contract-smoke 存在的理由相同，只能用静态契约钉住。
test('任务板 UI 必须只读（PRD-04 §12，2026-09-13 裁定）', async () => {
  const card = await readFile(new URL('../src/client/TaskBoard.ts', import.meta.url), 'utf8')
  // 写操作退出 UI：不得出现新建/完成的任何调用或载荷构造。
  assert.doesNotMatch(card, /api\.createTask|api\.updateTask|completePayload|onMutated/)
  // 视图刷新（读）保留。
  assert.match(card, /api\.view\(sessionId\)/)
  const workspace = await readFile(new URL('../src/client/CeoWorkspace.ts', import.meta.url), 'utf8')
  // 右坞两条写路径（卡片 onMutated / 详情 onComplete）都不得回来。
  assert.doesNotMatch(workspace, /onMutated|taskBoard\.complete/)
})
