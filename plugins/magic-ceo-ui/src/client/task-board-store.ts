/**
 * 任务板客户端状态（第一梯队 #3，Codex 对标）：拉取官方任务板并维护
 * 「当前选中的任务节点」（点画布上的任务节点 → 右坞显示任务详情）。
 *
 * 模式与 selection.ts 一致：模块级单例 + useSyncExternalStore 订阅；
 * 数据源是官方 remote.agentTeams（RPC），本模块不触碰 cordis。
 *
 * ## 关键不变量：快照引用必须稳定
 *
 * `getTaskBoardSnapshot()` 在状态未变时必须返回**同一个对象引用**。
 * useSyncExternalStore 用 `Object.is` 比较快照；若每次调用都返回新对象字面量，
 * React 会判定「外部 store 一直在变」→ 无限重渲染 → React #185
 * 「Maximum update depth exceeded」，表现为画布卡刚挂载即被卸载（肉眼看到的
 * 「时有时无」）。因此状态变更一律走 `commit()`，由它做字段等价判定。
 *
 * ## 信封层级（依据官方源码，见 task-board-data.ts 注释）
 *
 * - `view`：单层信封，任务在 `result.value.tasks`。
 *
 * ## 只读（PRD-04 §12，2026-09-13 裁定）
 *
 * 任务生命周期由智能体驱动（CEO 拆解派发、成员带证据完成），本 store 只拉取
 * 与分发，不含写操作；写信封（createTask/updateTask 双层）的解码语义保留在
 * task-board-data.ts 的 taskMutationFailure 供核对官方线格式。
 */

import {
  type TaskBoardApi,
  type RemoteResult,
  type TeamTaskDuck,
  type TeamViewDuck,
} from './task-board-data.ts'

export interface TaskBoardSnapshot {
  readonly tasks: readonly TeamTaskDuck[]
  readonly loading: boolean
  readonly error?: string
  /** 当前选中的任务 id（画布点选 → 右坞显示详情）。 */
  readonly selectedTaskId?: string
}

type Listener = () => void

/**
 * 空快照常量：所有「通道缺席 / 初始态」降级路径共用**同一个对象**。
 * 严禁在组件里另写 `() => ({ tasks: [], loading: false })` —— 每次返回新对象
 * 会让 useSyncExternalStore 无限重渲染（React #185）。历史上有两处这样的
 * 局部常量（CeoTeamGraph、CeoWorkspace），其中 CeoWorkspace 那处导致了
 * 右坞「slot entry crashed in 'sidebar.right.pane.tab'」。
 */
export const EMPTY_TASK_BOARD_SNAPSHOT: TaskBoardSnapshot = { tasks: [], loading: false }

/** 稳定的空快照读取器（可直接作为 useSyncExternalStore 的 getSnapshot/getServerSnapshot）。 */
export function getEmptyTaskBoardSnapshot(): TaskBoardSnapshot {
  return EMPTY_TASK_BOARD_SNAPSHOT
}

let snapshot: TaskBoardSnapshot = EMPTY_TASK_BOARD_SNAPSHOT
let boundSessionId: string | undefined
const listeners = new Set<Listener>()

function notify(): void {
  for (const listener of listeners) listener()
}

/** 任务列表内容等价判定：同内容不同引用会让下游 memo/useMemo 全部失效。 */
function sameTasks(left: readonly TeamTaskDuck[], right: readonly TeamTaskDuck[]): boolean {
  if (left === right) return true
  if (left.length !== right.length) return false
  return left.every((task, index) => {
    const other = right[index]
    return other !== undefined
      && task.id === other.id
      && task.subject === other.subject
      && task.status === other.status
      && task.revision === other.revision
  })
}

/**
 * 提交下一个快照，做两级收敛（这是 useSyncExternalStore 的硬要求，见文件头）：
 *
 * 1. 内容等价的任务列表收敛回**旧数组引用** —— 下游 `Canvas` 的 memo 与
 *    `useMemo` 依赖数组引用，仅靠「快照对象稳定」不够（`loading` 翻转等
 *    无关字段变化也会造出新快照，若此时带入新数组，整张图仍会重排）。
 * 2. 四个字段全部等价时连快照对象本身都不替换、不通知。
 */
function commit(next: TaskBoardSnapshot): void {
  const previous = snapshot
  const tasks = sameTasks(next.tasks, previous.tasks) ? previous.tasks : next.tasks
  if (
    tasks === previous.tasks
    && next.loading === previous.loading
    && next.error === previous.error
    && next.selectedTaskId === previous.selectedTaskId
  ) {
    return
  }
  snapshot = { tasks, loading: next.loading, error: next.error, selectedTaskId: next.selectedTaskId }
  notify()
}

export function subscribeTaskBoard(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getTaskBoardSnapshot(): TaskBoardSnapshot {
  return snapshot
}

export function getTaskBoardSessionId(): string | undefined {
  return boundSessionId
}

/** 会话切换时清空（与 selection.ts 的 rosterSessionId 守卫同款）。 */
export function resetTaskBoardForSession(sessionId: string | undefined): void {
  if (boundSessionId === sessionId) return
  boundSessionId = sessionId
  commit(EMPTY_TASK_BOARD_SNAPSHOT)
}

export function selectCeoTask(taskId: string | undefined): void {
  if (snapshot.selectedTaskId === taskId) return
  commit({ ...snapshot, selectedTaskId: taskId })
}

/**
 * 归一 view 结果。
 * 失败时保留上一次的 tasks（局部不可用不该把已知列表也清掉）。
 */
function applyView(sessionId: string, result: RemoteResult<TeamViewDuck> | undefined): void {
  void sessionId
  if (result === undefined) {
    commit({ ...snapshot, loading: false, error: '任务板不可用' })
    return
  }
  if (result.ok !== true) {
    commit({ ...snapshot, loading: false, error: result.error?.message ?? '任务板不可用' })
    return
  }
  // 单层信封：任务在 result.value.tasks（官方 ui-agent-team 的 refresh()
  // 就是 setView(result.value)）。此处曾读 result.tasks，恒为 undefined
  // → 画布任务泳道永远空、右坞却正常（右坞走 task-board-data 的正确解包）。
  const tasks = (result.value?.tasks ?? []).filter((task) => task.status !== 'deleted')
  const selectedTaskId = snapshot.selectedTaskId !== undefined
    && tasks.some((task) => task.id === snapshot.selectedTaskId)
    ? snapshot.selectedTaskId
    : undefined
  commit({ tasks, loading: false, error: undefined, selectedTaskId })
}

/** 拉取任务板（workspace/canvas 挂载与操作后调用）。 */
export async function reloadTaskBoard(api: TaskBoardApi, sessionId: string): Promise<void> {
  resetTaskBoardForSession(sessionId)
  if (snapshot.loading) return
  commit({ ...snapshot, loading: true })
  try {
    applyView(sessionId, await api.view(sessionId))
  } catch (cause) {
    commit({
      ...snapshot,
      loading: false,
      error: cause instanceof Error ? cause.message : String(cause),
    })
  }
}
