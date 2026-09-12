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
  error?: { code?: string; message?: string }
}

/**
 * 载波（transport）成功信封：载荷字段是 `value`，不是 `data`。
 * 依据：官方 `client-ui-agent-team/src/client/TeamAction.tsx:135,164,174`
 * 的 `result.value` / `result.value.ok` / `result.value.value`。
 * 此处曾误写为 `data`，与实现读取的 `result.value` 长期不一致（无类型检查兜底）。
 */
export type RemoteOk<T> = { ok: true; value: T }

export type RemoteResult<T> = RemoteOk<T> | RemoteFailure

/**
 * 写操作的内层业务结果。
 * 依据：官方 `experimental/agent-team/src/types.ts:203` `TeamTaskMutationResult`。
 */
export type TaskMutationResult =
  | { readonly ok: true; readonly value?: unknown }
  | {
    readonly ok: false
    readonly error?: {
      /** `team-task-conflict` 表示 expectedRevision 过期（CAS 冲突），需回源刷新。 */
      readonly code?: string
      readonly message?: string
    }
  }

/**
 * 写操作信封 = 载波包住业务结果（**双层**）。
 * 官方 `TeamAction.tsx:25` `TeamTaskActionResult = RemoteResult<TeamTaskMutationResult>`，
 * 所以成功是 `{ok:true,value:{ok:true,value:task}}`，
 * 业务拒绝是 `{ok:true,value:{ok:false,error}}`（载波仍然是 ok）。
 */
export type TaskMutationEnvelope = RemoteResult<TaskMutationResult>

/** 从写操作双层信封取出失败原因；成功返回 `undefined`（纯函数，测试盯这里）。 */
export function taskMutationFailure(result: TaskMutationEnvelope | undefined): string | undefined {
  if (result === undefined) return '任务板不可用'
  if (result.ok !== true) return result.error?.message ?? '任务板不可用'
  const inner = result.value
  if (inner === undefined) return '操作失败'
  if (inner.ok === true) return undefined
  // CAS 冲突单独给可行动的文案：本地 revision 已过期，刷新后重试即可。
  return inner.error?.code === 'team-task-conflict'
    ? `任务已被更新，请刷新后重试（${inner.error.message ?? 'team-task-conflict'}）`
    : inner.error?.message ?? '操作失败'
}

/** 官方 remote.agentTeams 里任务板用到的三个调用（鸭子类型）。 */
export interface TaskBoardApi {
  /** 单层信封：任务在 `result.value.tasks`。 */
  view: (sessionId: string) => Promise<RemoteResult<TeamViewDuck>>
  /** 双层信封：见 `TaskMutationEnvelope`。 */
  createTask: (sessionId: string, input: {
    subject: string
    description: string
    blockedBy: readonly string[]
    writeScopes: readonly string[]
  }) => Promise<TaskMutationEnvelope>
  /** 双层信封：见 `TaskMutationEnvelope`。 */
  updateTask: (sessionId: string, input: {
    taskId: string
    expectedRevision: number
    action: 'complete'
  }) => Promise<TaskMutationEnvelope>
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
  // RemoteResult 的载荷字段是 value（对齐官方 api-remotes 的 RemoteResult<T>）。
  const tasks = (result.value?.tasks ?? []).filter((task) => task.status !== 'deleted')
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
  statusText: TeamTaskDuck['status']
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

