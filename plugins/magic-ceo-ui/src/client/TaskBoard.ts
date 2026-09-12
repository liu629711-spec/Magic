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
        ? h('div', { style: { fontSize: 12, color: 'rgba(220,120,120,1)', textAlign: 'center', padding: '6px 0' } }, t('tasks.unavailable'))
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
                  row.completable
                    ? h('button', {
                      type: 'button',
                      disabled: busy,
                      title: t('tasks.complete'),
                      onClick: () => {
                        if (task !== undefined) void run(() => api.updateTask(sessionId, completePayload(task)))
                      },
                      style: { marginLeft: 'auto', flex: '0 0 auto', border: 0, borderRadius: 6, padding: '2px 7px', cursor: busy ? 'default' : 'pointer', fontSize: 11, background: 'transparent', color: 'inherit', opacity: 0.55 },
                    }, t('tasks.complete'))
                    : null,
                ),
                row.blockedByByText === '' ? null : h('div', { style: { fontSize: 11, opacity: 0.6, paddingLeft: 15 } }, row.blockedByByText),
              )
            })),
    h('div', { style: { display: 'flex', gap: 6 } },
      h('input', {
        value: draft,
        placeholder: t('tasks.subject'),
        disabled: busy,
        onChange: (event: { target: { value: string } }) => { setDraft(event.target.value) },
        onKeyDown: (event: { key: string }) => {
          if (event.key === 'Enter' && draft.trim() !== '' && !busy) {
            void run(() => api.createTask(sessionId, { subject: draft.trim(), description: '', blockedBy: [], writeScopes: [] }))
            setDraft('')
          }
        },
        style: { flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '5px 10px', borderRadius: 7, border: '0.5px solid rgba(255,255,255,0.14)', background: 'rgba(0,0,0,0.2)', color: 'inherit', fontSize: 12 },
      }),
      h('button', {
        type: 'button',
        disabled: busy || draft.trim() === '',
        onClick: () => {
          void run(() => api.createTask(sessionId, { subject: draft.trim(), description: '', blockedBy: [], writeScopes: [] }))
          setDraft('')
        },
        style: {
          flex: '0 0 auto', padding: '5px 12px', borderRadius: 7, border: 0, cursor: busy || draft.trim() === '' ? 'default' : 'pointer',
          fontSize: 12, fontWeight: 510,
          background: draft.trim() === '' || busy ? 'rgba(255,255,255,0.08)' : 'var(--dsw-alias-state-business-primary, #3b82f6)',
          color: draft.trim() === '' || busy ? 'rgba(255,255,255,0.5)' : '#fff',
        },
      }, t('tasks.create')),
    ),
    error === '' ? null : h('div', { style: { fontSize: 11, color: 'rgba(220,120,120,1)' } }, error),
  )
}

export type { TaskBoardApi, TeamTaskDuck, TaskBoardState } from './task-board-data.ts'
