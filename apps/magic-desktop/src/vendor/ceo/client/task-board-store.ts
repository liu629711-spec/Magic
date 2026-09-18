// 搬自 plugins/magic-ceo-ui/src/client/task-board-store.ts（2026-09-18 CEO 委派图卡接入；
// 2026-09-18 第二轮补齐 RPC 拉取）。数据源 = 官方 remote.agentTeams（经
// src/adapters/dsh-web/agent-teams.ts 的 viewAgentTeam 走 dshRpc），本模块不触碰 cordis。
//
//   - TaskBoardSnapshot / TeamTaskDuck 类型（与原文件同名同形，供画布任务泳道）
//   - EMPTY_TASK_BOARD_SNAPSHOT / getEmptyTaskBoardSnapshot（稳定空快照，避免
//     useSyncExternalStore 无限重渲染——见「关键不变量」）
//   - subscribeTaskBoard / getTaskBoardSnapshot / selectCeoTask（点选任务高亮）
//   - reloadTaskBoard（RPC 拉取 + 会话守卫）/ resetTaskBoardForSession / getTaskBoardSessionId
// 只读（PRD-04 §12）：任务生命周期由智能体驱动，本模块不含写操作。
//
// ## 关键不变量：快照引用必须稳定
// getTaskBoardSnapshot() 在状态未变时必须返回**同一个对象引用**；状态变更一律走
// commit()，由它做字段等价判定（否则 useSyncExternalStore 判定 store 一直在变 →
// 无限重渲染 React #185）。

import type { CeoFlowTask } from '../flow.ts'

/** 官方任务板任务行（对齐 task-board-data.ts 的 TeamTaskDuck 字段子集）。 */
export interface TeamTaskDuck {
  id: string
  revision: number
  subject: string
  description?: string
  status: CeoFlowTask['status']
  blockedBy?: readonly string[]
  ownerName?: string
  ready?: boolean
}

export interface TaskBoardSnapshot {
  readonly tasks: readonly TeamTaskDuck[]
  readonly loading: boolean
  readonly error?: string
  /** 当前选中的任务 id（画布点选 → 高亮任务节点）。 */
  readonly selectedTaskId?: string
}

type Listener = () => void

/**
 * 空快照常量：所有「通道缺席 / 初始态」降级路径共用**同一个对象**。
 * 严禁在组件里另写 `() => ({ tasks: [], loading: false })`——每次返回新对象
 * 会让 useSyncExternalStore 无限重渲染（React #185）。
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

/** 提交下一个快照，两级收敛（useSyncExternalStore 的硬要求）：任务数组等价回收旧引用；
 *  四字段全等价则连快照对象都不替换、不通知。 */
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

/** view 结果载荷（对齐官方 task-board-data.ts 的单层信封 `result.value.tasks`）。 */
export interface TeamViewDuck {
  tasks?: readonly TeamTaskDuck[]
}

/** 载波结果（对齐官方 RemoteResult：成功信封字段是 `value`）。 */
export type TaskBoardViewResult =
  | { ok: true; value: TeamViewDuck }
  | { ok: false; error?: { code?: string; message?: string } }

/** 调用方注入的任务板读接口（只读：PRD-04 §12）。shape 对齐官方 TaskBoardApi.view。 */
export interface TaskBoardViewApi {
  /** 按 lead 会话路由由调用方负责（agent-teams.ts 的 leadSessionIdOf）。 */
  view: (sessionId: string) => Promise<TaskBoardViewResult>
}

/** 归一 view 结果。失败时保留上一次的 tasks（局部不可用不该把已知列表也清掉）。 */
function applyView(result: TaskBoardViewResult | undefined): void {
  if (result === undefined) {
    commit({ ...snapshot, loading: false, error: '任务板不可用' })
    return
  }
  if (result.ok !== true) {
    commit({ ...snapshot, loading: false, error: result.error?.message ?? '任务板不可用' })
    return
  }
  const tasks = (result.value?.tasks ?? []).filter((task) => task.status !== 'deleted')
  const selectedTaskId = snapshot.selectedTaskId !== undefined
    && tasks.some((task) => task.id === snapshot.selectedTaskId)
    ? snapshot.selectedTaskId
    : undefined
  commit({ tasks, loading: false, error: undefined, selectedTaskId })
}

/** 拉取任务板（画布挂载时调用；会话守卫在 resetTaskBoardForSession）。 */
export async function reloadTaskBoard(api: TaskBoardViewApi, sessionId: string): Promise<void> {
  resetTaskBoardForSession(sessionId)
  if (snapshot.loading) return
  commit({ ...snapshot, loading: true })
  try {
    applyView(await api.view(sessionId))
  } catch (cause) {
    commit({
      ...snapshot,
      loading: false,
      error: cause instanceof Error ? cause.message : String(cause),
    })
  }
}