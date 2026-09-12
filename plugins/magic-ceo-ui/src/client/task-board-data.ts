/**
 * 任务板数据层（无 React）：行为纯函数 + 鸭子类型，测试直接驱动。
 *
 * 数据通道与官方面板一致（client-ui-agent-team/src/client/mount.ts）：
 * ctx.remote.agentTeams.view / createTask / updateTask，按 lead 会话 id 路由
 * （成员子会话映射到父会话）。官方工具薄适配器的语义在此复刻：
 * createTask 必填 subject/description/blockedBy/writeScopes；
 * updateTask 带 expectedRevision（CAS）+ TeamTaskAction。
 */

export interface TeamTaskDuck {
  id: string
  revision: number
  subject: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'deleted'
  blockedBy?: readonly string[]
  ownerName?: string
  ready?: boolean
}

export interface TeamViewDuck {
  tasks?: readonly TeamTaskDuck[]
}

export interface RemoteFailure {
  ok: false
  error?: { message?: string }
}

export type RemoteOk<T> = { ok: true; data: T }

export type RemoteResult<T> = RemoteOk<T> | RemoteFailure

/** 官方 remote.agentTeams 里任务板用到的三个调用（鸭子类型）。 */
export interface TaskBoardApi {
  view: (sessionId: string) => Promise<RemoteResult<TeamViewDuck>>
  createTask: (sessionId: string, input: {
    subject: string
    description: string
    blockedBy: readonly string[]
    writeScopes: readonly string[]
  }) => Promise<RemoteResult<unknown>>
  updateTask: (sessionId: string, input: {
    taskId: string
    expectedRevision: number
    action: 'complete'
  }) => Promise<RemoteResult<unknown>>
}

/** 任务板加载状态。 */
export interface TaskBoardState {
  kind: 'loading' | 'unavailable' | 'empty' | 'ready'
  tasks: readonly TeamTaskDuck[]
  message?: string
}

/** 从 view 结果归一任务行（纯函数，测试盯这里）。 */
export function taskRowsFromResult(result: RemoteResult<TeamViewDuck> | undefined): TaskBoardState {
  if (result === undefined) return { kind: 'loading', tasks: [] }
  if (result.ok !== true) {
    return { kind: 'unavailable', tasks: [], message: result.error?.message }
  }
  const tasks = (result.data.tasks ?? []).filter((task) => task.status !== 'deleted')
  return { kind: tasks.length === 0 ? 'empty' : 'ready', tasks }
}

/** 状态点颜色（对齐主题语义：进行中蓝 / 完成绿 / 待处理灰）。 */
export function statusDotColor(status: TeamTaskDuck['status']): string {
  if (status === 'completed') return 'var(--dsw-alias-state-success, #16a34a)'
  if (status === 'in_progress') return 'var(--dsw-alias-state-business-primary, #3b82f6)'
  return 'var(--dsw-alias-border-l3, #6b6b7a)'
}

/** 一行任务的展示数据（纯函数）。 */
export function taskRowOf(task: TeamTaskDuck): {
  title: string
  statusText: 'pending' | 'in_progress' | 'completed'
  blockedByText: string
  completable: boolean
} {
  const blockedBy = task.blockedBy ?? []
  return {
    title: task.subject,
    statusText: task.status,
    blockedByText: blockedBy.length === 0 ? '' : `阻塞于：${blockedBy.join('、')}`,
    completable: task.status !== 'completed',
  }
}

/** 完成动作的 CAS 载荷（纯函数，测试盯 expectedRevision）。 */
export function completePayload(task: TeamTaskDuck): {
  taskId: string
  expectedRevision: number
  action: 'complete'
} {
  return { taskId: task.id, expectedRevision: task.revision, action: 'complete' }
}

