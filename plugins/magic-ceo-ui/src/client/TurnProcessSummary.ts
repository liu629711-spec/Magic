// Turn 折叠摘要行（P0-1 阶段二）：替换 ui-chat 的 turn-process 渲染器。
// DSH 原行只显示「N 次工具调用 · N 条消息 · N 个子代理」；本行升级为 codex 式
// 「已处理 2m15s · 已探索 3 项 · 已编辑 1 个文件 · 已运行 2 条命令」。
// 展开后的过程明细仍由 DSH seat 渲染——本组件只是披露行，open/setOpen 语义不变。

import { createElement as h, useEffect, useState, type ReactNode } from 'react'
import {
  categorizeToolNames,
  EMPTY_TURN_TOOL_SUMMARY,
  selectTurnTools,
  type TurnProcessSpecLike,
  type TurnSnapshotLike,
  type TurnToolSummary,
} from '../turn-summary.ts'
import { formatElapsed } from './elapsed.ts'

type Translate = (key: string, params?: Record<string, unknown>) => string

type UseChatLike = (select: (snapshot: TurnSnapshotLike) => TurnToolSummary) => TurnToolSummary

export interface TurnProcessSummaryProps {
  node: { data: TurnProcessSpecLike }
  turnProcess?: { readonly foldable: boolean; readonly open: boolean; setOpen: (open: boolean) => void }
  /** session 标准套件里的 useChat（DSH SessionStandardProps）；测试/降级路径可缺席。 */
  useChat?: UseChatLike
  t: Translate
}

/** running 时每秒走动的 now（挂在时长上，避免整棵树跟着秒针重渲染）。 */
function useTickingNow(active: boolean): number {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!active) return undefined
    const id = setInterval(() => { setTick(value => value + 1) }, 1000)
    return () => { clearInterval(id) }
  }, [active])
  return Date.now()
}

export function TurnProcessSummary({ node, turnProcess, useChat, t }: TurnProcessSummaryProps): ReactNode {
  // hooks 无条件调用（rules of hooks）；useChat 缺席时走空摘要降级。
  const summary = useChat !== undefined
    ? useChat((snapshot) => selectTurnTools(snapshot, node.data))
    : EMPTY_TURN_TOOL_SUMMARY
  const timingRunning = summary.startTime !== undefined && summary.endTime === undefined
  const now = useTickingNow(timingRunning)

  if (turnProcess === undefined || !turnProcess.foldable) return null

  const counts = categorizeToolNames(summary.names)
  const parts: string[] = []
  for (const category of ['explore', 'search', 'edit', 'run', 'other'] as const) {
    const count = counts[category]
    if (count > 0) parts.push(t(`process.summary.${category}.done`, { count }))
  }
  // 窗口截断拿不到工具名时，退回 DSH 规格里的计数。
  if (parts.length === 0 && node.data.toolCallCount > 0) {
    parts.push(t('turn.toolCalls', { count: node.data.toolCallCount }))
  }
  if (node.data.messageCount > 0) parts.push(t('turn.messages', { count: node.data.messageCount }))
  if (node.data.subagentCount > 0) parts.push(t('turn.subagents', { count: node.data.subagentCount }))

  let duration: string | null = null
  if (summary.startTime !== undefined) {
    const seconds = timingRunning
      ? Math.max(0, Math.floor((now - summary.startTime) / 1000))
      : summary.endTime !== undefined
        ? Math.max(0, Math.floor((summary.endTime - summary.startTime) / 1000))
        : null
    if (seconds !== null) {
      duration = timingRunning
        ? t('turn.processing', { duration: formatElapsed(seconds) })
        : t('turn.processed', { duration: formatElapsed(seconds) })
    }
  }

  const label = [duration, ...parts].filter(part => part !== null && part !== '').join(' · ')
  const finalLabel = label === '' ? t('turn.thought') : label

  return h('button', {
    type: 'button',
    'data-magic-ceo-turn-summary': 'true',
    'data-turn-process': String(node.data.turn),
    'data-open': turnProcess.open || undefined,
    'aria-expanded': turnProcess.open,
    onClick: (event: { currentTarget: { focus: () => void } }) => {
      event.currentTarget.focus()
      turnProcess.setOpen(!turnProcess.open)
    },
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      width: '100%',
      padding: '4px 8px',
      border: 0,
      borderRadius: 8,
      background: 'transparent',
      color: 'var(--dsw-alias-label-tertiary, #9a9a9a)',
      cursor: 'pointer',
      fontSize: 12,
      lineHeight: '18px',
      textAlign: 'left',
    },
  },
    h('span', {
      'aria-hidden': true,
      style: {
        flex: '0 0 auto',
        fontSize: 10,
        transition: 'transform .15s ease',
        transform: turnProcess.open ? 'rotate(0deg)' : 'rotate(-90deg)',
      },
    }, '▾'),
    h('span', {
      style: {
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      },
    }, finalLabel),
  )
}
