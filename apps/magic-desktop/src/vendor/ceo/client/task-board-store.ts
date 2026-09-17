// 精简自 plugins/magic-ceo-ui/src/client/task-board-store.ts + task-board-data.ts
// （2026-09-18 CEO 委派图卡接入）。
//
// 范围控制：原 store 的数据源是官方 remote.agentTeams RPC（经 cordis 注入），
// 本轮不接任务板通道，只保留图卡消费的最小面：
//   - TaskBoardSnapshot / TeamTaskDuck 类型（与原文件同名同形，供画布任务泳道）
//   - EMPTY_TASK_BOARD_SNAPSHOT / getEmptyTaskBoardSnapshot（稳定空快照，避免
//     useSyncExternalStore 无限重渲染——见原文件头「关键不变量」）
//   - subscribeTaskBoard / getTaskBoardSnapshot / selectCeoTask（点选任务高亮）
// 原文件的 reloadTaskBoard（RPC 拉取 / 会话守卫）与写操作信封解码本轮未搬（遗留）。

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
const listeners = new Set<Listener>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function subscribeTaskBoard(listener: Listener): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function getTaskBoardSnapshot(): TaskBoardSnapshot {
  return snapshot
}

export function selectCeoTask(taskId: string | undefined): void {
  if (snapshot.selectedTaskId === taskId) return
  snapshot = { ...snapshot, selectedTaskId: taskId }
  notify()
}