// 任务板组件：渲染与交互（依赖 react，见 package.json 说明——react 由 DSH 客户端运行时提供）。

import { createElement as h, useEffect, useState, type ReactNode } from 'react'
import {
  completePayload,
  statusDotColor,
  taskRowOf,
  taskRowsFromResult,
  type TaskBoardApi,
  type TaskBoardState,
  type TeamTaskDuck,
} from './task-board-data.ts'
import { line } from './theme.ts'


type Translate = (key: string, params?: Record<string, unknown>) => string

/** 任务板卡片：加载 → 列表 → 新建/完成；api 缺席或失败时降级文案。 */
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
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const reload = async (): Promise<void> => {
      if (api === undefined || sessionId === undefined) {
        setState({ kind: 'unavailable', tasks: [] })
        return
      }
      try {
        setState(taskRowsFromResult(await api.view(sessionId)))
      } catch {
        setState({ kind: 'unavailable', tasks: [] })
      }
    }
    void reload()
  }, [sessionId, api, busy])

  const run = async (operation: () => Promise<unknown>): Promise<void> => {
    setBusy(true)
    setError('')
    try {
      await operation()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
    try {
      if (api !== undefined && sessionId !== undefined) setState(taskRowsFromResult(await api.view(sessionId)))
    } catch {
      // 刷新失败保留现状
    }
    setBusy(false)
  }

  if (api === undefined || sessionId === undefined) {
    return h('div', { 'data-magic-ceo-taskboard': true, style: { padding: '10px 12px', color: 'rgba(160,160,175,1)', fontSize: 12 } },
      t('tasks.unavailable'))
  }

  // 完成的任务下沉到列表尾部，视觉聚焦未完成
  const sorted = [...state.tasks].sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0))
  const rows = sorted.map(taskRowOf)

  return h('div', { 'data-magic-ceo-taskboard': true, style: { display: 'flex', flexDirection: 'column', gap: 8, padding: '8px 10px' } },
    state.kind === 'loading'
      ? h('div', { style: { fontSize: 12, opacity: 0.7 } }, t('tasks.loading'))
      : state.kind === 'unavailable'
        ? h('div', { style: { fontSize: 12, color: 'rgba(220,120,120,1)' } }, t('tasks.unavailable'))
        : state.kind === 'empty'
          ? h('div', { style: { fontSize: 12, opacity: 0.7 } }, t('tasks.empty'))
          : h('div', {
            style: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 240, overflowY: 'auto' },
          },
            rows.map((row, index) => {
              const task = sorted[index]
              const done = row.statusText === 'completed'
              return h('div', {
                key: task?.id ?? String(index),
                style: { display: 'flex', flexDirection: 'column', gap: 2, padding: '5px 8px', borderRadius: 8, background: done ? 'transparent' : 'rgba(255,255,255,0.04)', opacity: done ? 0.55 : 1 },
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                  h('span', {
                    'aria-hidden': true,
                    title: t(`tasks.status.${row.statusText}`),
                    style: { flex: '0 0 auto', width: 7, height: 7, borderRadius: 99, background: statusDotColor(row.statusText) },
                  }),
                  h('span', { style: { fontSize: 12, fontWeight: done ? 400 : 510, textDecoration: done ? 'line-through' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, row.title),
                  row.completable
                    ? h('button', {
                      type: 'button',
                      disabled: busy,
                      title: t('tasks.complete'),
                      onClick: () => {
                        if (task !== undefined) void run(() => api.updateTask(sessionId, completePayload(task)))
                      },
                      style: { marginLeft: 'auto', flex: '0 0 auto', border: `0.5px solid ${line.subtle}`, borderRadius: 6, padding: '1px 8px', cursor: busy ? 'default' : 'pointer', fontSize: 11, background: 'transparent', color: 'inherit', opacity: busy ? 0.5 : 1 },
                    }, t('tasks.complete'))
                    : null,
                ),
                row.blockedByByText === '' ? null : h('div', { style: { fontSize: 11, opacity: 0.65, paddingLeft: 15 } }, row.blockedByByText),
              )
            })),
    h('div', { style: { display: 'flex', gap: 6 } },
      h('input', {
        value: draft,
        placeholder: t('tasks.subject'),
        onChange: (event: { target: { value: string } }) => { setDraft(event.target.value) },
        style: { flex: 1, fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'inherit' },
      }),
      h('button', {
        type: 'button',
        disabled: busy || draft.trim() === '',
        onClick: () => {
          const subject = draft.trim()
          if (subject === '') return
          void run(() => api.createTask(sessionId, { subject, description: '', blockedBy: [], writeScopes: [] }))
          setDraft('')
        },
        style: { border: 0, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
      }, t('tasks.create')),
    ),
    error === '' ? null : h('div', { style: { fontSize: 11, color: 'rgba(220,120,120,1)' } }, error),
  )
}

export type { TaskBoardApi, TeamTaskDuck, TaskBoardState } from './task-board-data.ts'
