// 任务板组件：渲染与交互（依赖 react，见 package.json 说明——react 由 DSH 客户端运行时提供）。
// PRD-04 §12（2026-09-13 裁定）：任务板是只读视图——任务生命周期由智能体驱动
// （CEO 拆解派发、成员带证据完成），前端不提供人工新建/完成入口。

import { createElement as h, useEffect, useState, type ReactNode } from 'react'
import {
  statusDotColor,
  taskRowOf,
  taskRowsFromResult,
  type TaskBoardApi,
  type TaskBoardState,
  type TeamTaskDuck,
} from './task-board-data.ts'


type Translate = (key: string, params?: Record<string, unknown>) => string

/** 任务板卡片：加载 → 列表；api 缺席或失败时降级文案。只读，无写操作。 */
export function TaskBoardCard({
  sessionId,
  api,
  t,
}: {
  sessionId?: string
  api?: TaskBoardApi
  t: Translate
}): ReactNode {
  const [state, setState] = useState<TaskBoardState>({ kind: 'loading', tasks: [] })
  /** RPC 通道未就绪时的有界自动重试（页面加载初期网关可能尚未连上）。 */
  const [attempt, setAttempt] = useState(0)

  const reload = async (): Promise<void> => {
    if (api === undefined || sessionId === undefined) {
      setState({ kind: 'unavailable', tasks: [] })
      return
    }
    try {
      setState(taskRowsFromResult(await api.view(sessionId)))
    } catch (cause) {
      // 传输异常（如页面加载初期网关未连上）→ 有界自动重试；详情透出到界面。
      const message = cause instanceof Error ? cause.message : String(cause)
      setState({ kind: 'unavailable', tasks: [], message })
      if (attempt < 3) {
        window.setTimeout(() => { setAttempt(value => value + 1) }, 2500)
      }
    }
  }
  useEffect(() => { void reload() }, [sessionId, api, attempt])

  if (api === undefined || sessionId === undefined) {
    return h('div', { 'data-magic-ceo-taskboard': true, style: { padding: '10px 12px', color: 'rgba(160,160,175,1)', fontSize: 12 } },
      t('tasks.unavailable'))
  }

  // 完成的任务下沉到列表尾部，视觉聚焦未完成
  const sorted = [...state.tasks].sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0))
  const rows = sorted.map(taskRowOf)

  return h('div', {
    'data-magic-ceo-taskboard': true,
    style: {
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: 10, borderRadius: 10,
      border: '0.5px solid rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.03)',
    },
  },
    state.kind === 'loading'
      ? h('div', { style: { fontSize: 12, opacity: 0.7, textAlign: 'center', padding: '6px 0' } }, t('tasks.loading'))
      : state.kind === 'unavailable'
        ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center', padding: '6px 0', fontSize: 12, color: 'rgba(220,120,120,1)' } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            h('span', null, t('tasks.unavailable')),
            h('button', {
              type: 'button',
              onClick: () => { void reload() },
              style: {
                marginLeft: 'auto', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: 6,
                padding: '2px 8px', cursor: 'pointer', fontSize: 11,
                background: 'transparent', color: 'inherit',
              },
            }, t('tasks.retry'))),
          state.message !== undefined
            ? h('div', { style: { fontSize: 11, opacity: 0.85, textAlign: 'center' } }, state.message)
            : null)
        : state.kind === 'empty'
          ? h('div', { style: { fontSize: 12, opacity: 0.6, textAlign: 'center', padding: '10px 0' } }, t('tasks.empty'))
          : h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 240, overflowY: 'auto', margin: '-2px' },
          },
            rows.map((row, index) => {
              const task = sorted[index]
              const done = row.statusText === 'completed'
              return h('div', {
                key: task?.id ?? String(index),
                style: { display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 8px', borderRadius: 7, background: done ? 'transparent' : 'rgba(255,255,255,0.045)', opacity: done ? 0.5 : 1 },
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', {
                    'aria-hidden': true,
                    title: t(`tasks.status.${row.statusText}`),
                    style: { flex: '0 0 auto', width: 7, height: 7, borderRadius: 99, background: statusDotColor(row.statusText) },
                  }),
                  h('span', { style: { fontSize: 12, fontWeight: done ? 400 : 510, textDecoration: done ? 'line-through' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, row.title),
                ),
                row.blockedByText === '' ? null : h('div', { style: { fontSize: 11, opacity: 0.6, paddingLeft: 15 } }, row.blockedByText),
              )
            })),
  )
}

export type { TaskBoardApi, TeamTaskDuck, TaskBoardState } from './task-board-data.ts'

// ── 选中任务详情（画布点任务节点 → 右坞显示）────────────────────────────

/** 一个选中任务的只读详情卡：状态、主题。完成由成员工作回写，前端不提供动作。 */
export function TaskBoardDetail({
  task,
  t,
}: {
  task: { id: string; subject: string; status: string; revision: number }
  t: Translate
}): ReactNode {
  const done = task.status === 'completed'
  return h('div', {
    'data-magic-ceo-task-detail': task.id,
    style: { display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      h('span', {
        'aria-hidden': true,
        style: { flex: '0 0 auto', width: 8, height: 8, borderRadius: 99, background: done ? 'var(--dsw-alias-state-success, #16a34a)' : task.status === 'in_progress' ? 'var(--dsw-alias-state-business-primary, #3b82f6)' : 'var(--dsw-alias-border-l3, #6b6b7a)' },
      }),
      h('span', { style: { fontSize: 12, fontWeight: 510, textDecoration: done ? 'line-through' : undefined } }, task.subject),
    ),
    h('div', { style: { fontSize: 11, opacity: 0.65 } }, t(`tasks.status.${done ? 'completed' : task.status === 'in_progress' ? 'in_progress' : 'pending'}`)),
  )
}
