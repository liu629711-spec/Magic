import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  EMPTY_TASK_BOARD_SNAPSHOT,
  completeTaskOnBoard,
  createTaskOnBoard,
  getEmptyTaskBoardSnapshot,
  getTaskBoardSnapshot,
  reloadTaskBoard,
  resetTaskBoardForSession,
  selectCeoTask,
  subscribeTaskBoard,
} from '../src/client/task-board-store.ts'
import {
  taskMutationFailure,
  type TaskBoardApi,
  type TaskMutationEnvelope,
  type TeamTaskDuck,
} from '../src/client/task-board-data.ts'

function task(
  id: string,
  subject: string,
  status: TeamTaskDuck['status'] = 'pending',
  revision = 1,
): TeamTaskDuck {
  return { id, revision, subject, status }
}

/**
 * 假 api：view 走**单层**载波信封 `{ok:true,value:{tasks}}`（官方 TeamActionResult<T>），
 * 写操作走**双层**信封（官方 TeamTaskActionResult = RemoteResult<TeamTaskMutationResult>）。
 */
function fakeApi(options: {
  tasks?: readonly TeamTaskDuck[]
  viewFailure?: string
  mutation?: TaskMutationEnvelope
}): { api: TaskBoardApi; calls: { view: number; create: number; update: number } } {
  const calls = { view: 0, create: 0, update: 0 }
  const tasks = options.tasks ?? []
  const mutation: TaskMutationEnvelope = options.mutation ?? { ok: true, value: { ok: true } }
  return {
    calls,
    api: {
      view: async () => {
        calls.view += 1
        if (options.viewFailure !== undefined) return { ok: false, error: { message: options.viewFailure } }
        return { ok: true, value: { tasks } }
      },
      createTask: async () => { calls.create += 1; return mutation },
      updateTask: async () => { calls.update += 1; return mutation },
    },
  }
}

test('getTaskBoardSnapshot：状态未变时必须返回同一引用（useSyncExternalStore 硬要求）', async () => {
  const { api } = fakeApi({ tasks: [task('task-1', '待办')] })
  await reloadTaskBoard(api, 'session-stable')
  // 这两行是 React #185（Maximum update depth exceeded）的根因回归：
  // 旧实现 `return { tasks, loading, error, selectedTaskId }` 每次都是新对象字面量，
  // Object.is 判定 store 一直在变 → 无限重渲染 → 画布卡刚挂载即被卸载。
  assert.equal(getTaskBoardSnapshot(), getTaskBoardSnapshot())
})

test('getEmptyTaskBoardSnapshot：通道缺席时的降级快照必须引用稳定', () => {
  // 历史缺陷：CeoWorkspace 里写成 `() => ({ tasks: [], loading: false })`，
  // 每次返回新对象 → 右坞整块 slot 崩在 React #185
  //（「slot entry crashed in 'sidebar.right.pane.tab'」）。
  assert.equal(getEmptyTaskBoardSnapshot(), getEmptyTaskBoardSnapshot())
  assert.equal(getEmptyTaskBoardSnapshot(), EMPTY_TASK_BOARD_SNAPSHOT)
})

test('reloadTaskBoard：内容等价时保持 tasks 数组引用（下游 memo 才有效）', async () => {
  const { api } = fakeApi({ tasks: [task('task-1', '待办')] })
  await reloadTaskBoard(api, 'session-dedupe')
  const baseline = getTaskBoardSnapshot().tasks
  await reloadTaskBoard(api, 'session-dedupe')
  // 数据源内容等价 → 必须复用旧数组，否则 Canvas 的 memo/useMemo 每帧失效
  assert.equal(getTaskBoardSnapshot().tasks, baseline)
})

test('reloadTaskBoard：内容变化时替换数组引用', async () => {
  await reloadTaskBoard(fakeApi({ tasks: [task('task-1', '第一条')] }).api, 'session-change')
  const baseline = getTaskBoardSnapshot().tasks
  await reloadTaskBoard(fakeApi({ tasks: [task('task-1', '第一条'), task('task-2', '第二条')] }).api, 'session-change')
  assert.notEqual(getTaskBoardSnapshot().tasks, baseline)
  assert.equal(getTaskBoardSnapshot().tasks.length, 2)
})

test('commit：等价快照不通知订阅者，真变化才通知', async () => {
  const { api } = fakeApi({ tasks: [task('task-1', '待办')] })
  await reloadTaskBoard(api, 'session-notify')
  let notifications = 0
  const off = subscribeTaskBoard(() => { notifications += 1 })
  try {
    const baseline = notifications
    selectCeoTask(undefined)                       // 选中态本来就是 undefined → 等价，不通知
    assert.equal(notifications, baseline)
    selectCeoTask('task-1')                        // 真变化 → 通知一次
    assert.equal(notifications, baseline + 1)
    selectCeoTask('task-1')                        // 幂等 → 不通知
    assert.equal(notifications, baseline + 1)
  } finally {
    off()
  }
})

test('reloadTaskBoard：从 result.value.tasks 取任务（单层信封，画布泳道空列表的根因）', async () => {
  const { api } = fakeApi({
    tasks: [task('task-1', '验收任务板：界面创建'), task('task-gone', '已删', 'deleted')],
  })
  await reloadTaskBoard(api, 'session-envelope')
  const snapshot = getTaskBoardSnapshot()
  // 旧实现读 result.tasks（恒 undefined）→ 这里会是 0，画布泳道永远空、右坞却正常
  assert.equal(snapshot.tasks.length, 1)
  assert.equal(snapshot.tasks[0]?.id, 'task-1')
  assert.equal(snapshot.loading, false)
  assert.equal(snapshot.error, undefined)
})

test('reloadTaskBoard：线上真实形状 {ok:true,value:{members,tasks}}', async () => {
  const api: TaskBoardApi = {
    view: async () => ({ ok: true, value: { members: [], tasks: [task('task-1', '待办')] } }),
    createTask: async () => ({ ok: true, value: { ok: true } }),
    updateTask: async () => ({ ok: true, value: { ok: true } }),
  }
  await reloadTaskBoard(api, 'session-wire')
  assert.equal(getTaskBoardSnapshot().tasks.length, 1)
})

test('reloadTaskBoard：view 失败 → 记录错误且不清空已有任务', async () => {
  await reloadTaskBoard(fakeApi({ tasks: [task('task-1', '待办')] }).api, 'session-fail')
  await reloadTaskBoard(fakeApi({ tasks: [], viewFailure: '通道断开' }).api, 'session-fail')
  const snapshot = getTaskBoardSnapshot()
  assert.equal(snapshot.error, '通道断开')
  assert.equal(snapshot.loading, false)
  assert.equal(snapshot.tasks.length, 1)
})

test('resetTaskBoardForSession：会话切换清空并复位选中', async () => {
  await reloadTaskBoard(fakeApi({ tasks: [task('task-1', '待办')] }).api, 'session-a')
  selectCeoTask('task-1')
  resetTaskBoardForSession('session-b')
  const snapshot = getTaskBoardSnapshot()
  assert.equal(snapshot.tasks.length, 0)
  assert.equal(snapshot.selectedTaskId, undefined)
})

test('selectCeoTask：selectedTaskId 是字符串 id，右坞据此匹配出任务详情', async () => {
  const { api } = fakeApi({ tasks: [task('task-1', '验收任务板：界面创建')] })
  await reloadTaskBoard(api, 'session-select')
  selectCeoTask('task-1')
  const snapshot = getTaskBoardSnapshot()
  // 画布点任务节点后走的就是这条：store 存 id，CeoWorkspace 用
  // `tasks.find(t => t.id === selectedTaskId)` 取详情。若调用方误传任务对象，
  // 这里永远匹配不到 → 点节点只会打开普通列表、出不来任务详情。
  assert.equal(snapshot.selectedTaskId, 'task-1')
  assert.equal(typeof snapshot.selectedTaskId, 'string')
  assert.notEqual(snapshot.tasks.find((item) => item.id === snapshot.selectedTaskId), undefined)
})

test('selectCeoTask：选中已不存在的任务会在下次归一时被清掉', async () => {
  const { api } = fakeApi({ tasks: [task('task-1', '待办')] })
  await reloadTaskBoard(api, 'session-dangling')
  selectCeoTask('task-gone')
  assert.equal(getTaskBoardSnapshot().selectedTaskId, 'task-gone')
  await reloadTaskBoard(api, 'session-dangling')
  assert.equal(getTaskBoardSnapshot().selectedTaskId, undefined)
})

test('taskMutationFailure：双层信封四态归一', () => {
  assert.equal(taskMutationFailure(undefined), '任务板不可用')
  assert.equal(taskMutationFailure({ ok: false, error: { message: '通道断开' } }), '通道断开')
  assert.equal(taskMutationFailure({ ok: false }), '任务板不可用')
  assert.equal(taskMutationFailure({ ok: true, value: { ok: true, value: { id: 'task-1' } } }), undefined)
  assert.equal(
    taskMutationFailure({ ok: true, value: { ok: false, error: { code: 'team-rejected', message: '不允许' } } }),
    '不允许',
  )
  assert.match(
    taskMutationFailure({
      ok: true,
      value: { ok: false, error: { code: 'team-task-conflict', message: 'revision 过期' } },
    }) ?? '',
    /刷新后重试/,
  )
})

test('completeTaskOnBoard：载波 ok 但业务拒绝 → 必须抛出且快照留下原因', async () => {
  const conflict: TaskMutationEnvelope = {
    ok: true,
    value: { ok: false, error: { code: 'team-task-conflict', message: 'revision 过期' } },
  }
  const { api, calls } = fakeApi({ tasks: [task('task-1', '待办')], mutation: conflict })
  await reloadTaskBoard(api, 'session-conflict')
  // 旧实现只在 `result.ok !== true` 时看内层，业务拒绝被完全跳过 → 不抛异常、
  // 错误被随后的 reload 覆盖 → CAS 冲突对用户静默。
  await assert.rejects(() => completeTaskOnBoard(api, 'session-conflict', 'task-1', 1), /刷新后重试/)
  assert.equal(calls.update, 1)
  assert.match(getTaskBoardSnapshot().error ?? '', /刷新后重试/)
})

test('createTaskOnBoard：双层信封成功 → 刷新出新任务', async () => {
  const created: TeamTaskDuck[] = []
  const api: TaskBoardApi = {
    view: async () => ({ ok: true, value: { tasks: [...created] } }),
    createTask: async (_sessionId, input) => {
      created.push(task('task-1', input.subject))
      return { ok: true, value: { ok: true, value: { id: 'task-1' } } }
    },
    updateTask: async () => ({ ok: true, value: { ok: true } }),
  }
  await createTaskOnBoard(api, 'session-create', '验收任务板：界面创建')
  const snapshot = getTaskBoardSnapshot()
  assert.equal(snapshot.tasks.length, 1)
  assert.equal(snapshot.tasks[0]?.subject, '验收任务板：界面创建')
  assert.equal(snapshot.loading, false)
  assert.equal(snapshot.error, undefined)
})

test('createTaskOnBoard：业务拒绝 → 抛出且快照留下原因', async () => {
  const { api } = fakeApi({
    tasks: [],
    mutation: { ok: true, value: { ok: false, error: { code: 'team-rejected', message: '超出配额' } } },
  })
  await assert.rejects(() => createTaskOnBoard(api, 'session-reject-create', '新任务'), /超出配额/)
  assert.equal(getTaskBoardSnapshot().error, '超出配额')
})
