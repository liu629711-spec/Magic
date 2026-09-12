import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
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

// TaskBoard.ts 依赖 react（由 DSH 运行时提供，测试环境解析不到），组件代码不被
// 本套件加载 —— 与 contract-smoke 存在的理由相同，只能用静态契约钉住接线。
test('TaskBoardCard.run：写操作必须走双层信封判定 taskMutationFailure', async () => {
  const source = await readFile(new URL('../src/client/TaskBoard.ts', import.meta.url), 'utf8')
  // 判定四态归一已在 task-board-store.test.ts 覆盖；这里钉住 run() 确实交给它：
  // 载波 ok + 内层业务拒绝（如 CAS 冲突）必须把原因透出，不得静默吞掉。
  assert.match(source, /taskMutationFailure\(await operation\(\)\)/)
  // 旧实现把结果断言成单层载波并只判外层 ok —— 回归到该写法必须报红。
  assert.doesNotMatch(source, /as \{ ok\?: boolean/)
  // 卡片写完必须通知宿主重拉共享 store，否则画布泳道不跟随（双通路失步）。
  assert.match(source, /onMutated\?\.\(\)/)
  const workspace = await readFile(new URL('../src/client/CeoWorkspace.ts', import.meta.url), 'utf8')
  assert.match(workspace, /onMutated: \(\) => \{ taskBoard\?\.reload\(\) \}/)
})
