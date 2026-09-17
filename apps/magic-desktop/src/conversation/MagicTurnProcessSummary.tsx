// 搬自 Magic plugins/magic-ceo-ui/src/client/TurnProcessSummary.ts（2026-09-17 用户裁定：
// 折叠头复用 Magic 组合网页端已验收的 codex 式摘要行「已处理 2m27s · 已探索 2 项 · …」，
// 替换 ui-chat 原生「N 次工具调用 · N 条消息」计数行）。
// 适配点：①t 词典收敛为内部中文文案表（Magic 中文产品，接 locale 体系时再外置）；
// ②useChat 直接吃 vendor/dsh-chat 的 ChatSnapshot（legacy 切片契约一致）。
// 展开后的过程明细仍由 DSH seat 渲染——本组件只是披露行，open/setOpen 语义不变。
import { createElement as h, useEffect, useState, type ReactNode } from 'react'
import type { ChatNode, ChatTranslate, TurnProcessOwnerProps } from '../vendor/dsh-chat/index.ts'
import {
  categorizeToolNames,
  EMPTY_TURN_TOOL_SUMMARY,
  selectTurnTools,
  type TurnSnapshotLike,
  type TurnToolSummary,
} from './turn-summary.ts'

type TurnProcessNode = Extract<ChatNode, { kind: 'turn-process' }>

type UseChatLike = (select: (snapshot: TurnSnapshotLike) => TurnToolSummary) => TurnToolSummary

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${String(minutes)}m` : `${String(minutes)}m ${String(rest)}s`
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

/** magic-ceo-ui register.ts 的摘要文案（中文，键名保持源插件命名）。 */
const ZH = {
  'process.summary.explore.done': '已探索 {count} 项',
  'process.summary.search.done': '已搜索 {count} 次',
  'process.summary.edit.done': '已编辑 {count} 个文件',
  'process.summary.run.done': '已运行 {count} 条命令',
  'process.summary.other.done': '已执行 {count} 个操作',
  'turn.processing': '正在处理 {duration}',
  'turn.processed': '已处理 {duration}',
  'turn.toolCalls': '工具调用 {count}',
  'turn.messages': '消息 {count}',
  'turn.subagents': '子代理 {count}',
  'turn.thought': '处理了一会儿',
} as const

type ZhKey = keyof typeof ZH

function translate(key: ZhKey, params?: Record<string, unknown>): string {
  let text: string = ZH[key]
  if (params !== undefined) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

export interface MagicTurnProcessSummaryProps {
  node: TurnProcessNode
  turnProcess: TurnProcessOwnerProps
  /** session 标准套件里的 useChat（快照 legacy 切片契约）。测试/降级路径可缺席。 */
  useChat?: UseChatLike
  /** 保留 t 座位（当前未消费，接 locale 体系时替换内部文案表）。 */
  t?: ChatTranslate
}

/** Turn 折叠摘要行：codex 式「已处理 2m27s · 已探索 3 项 · 已编辑 1 个文件 · …」。 */
export function MagicTurnProcessSummary({ node, turnProcess, useChat, t: _t }: MagicTurnProcessSummaryProps): ReactNode {
  // hooks 无条件调用（rules of hooks）；useChat 缺席时走空摘要降级。
  const summary = useChat !== undefined
    ? useChat((snapshot) => selectTurnTools(snapshot, node.data))
    : EMPTY_TURN_TOOL_SUMMARY
  const timingRunning = summary.startTime !== undefined && summary.endTime === undefined
  const now = useTickingNow(timingRunning)

  if (!turnProcess.foldable) return null

  const counts = categorizeToolNames(summary.names)
  const parts: string[] = []
  for (const category of ['explore', 'search', 'edit', 'run', 'other'] as const) {
    const count = counts[category]
    if (count > 0) parts.push(translate(`process.summary.${category}.done` as ZhKey, { count }))
  }
  // 窗口截断拿不到工具名时，退回 DSH 规格里的计数。
  if (parts.length === 0 && node.data.toolCallCount > 0) {
    parts.push(translate('turn.toolCalls', { count: node.data.toolCallCount }))
  }
  if (node.data.messageCount > 0) parts.push(translate('turn.messages', { count: node.data.messageCount }))
  if (node.data.subagentCount > 0) parts.push(translate('turn.subagents', { count: node.data.subagentCount }))

  let duration: string | null = null
  if (summary.startTime !== undefined) {
    const seconds = timingRunning
      ? Math.max(0, Math.floor((now - summary.startTime) / 1000))
      : summary.endTime !== undefined
        ? Math.max(0, Math.floor((summary.endTime - summary.startTime) / 1000))
        : null
    if (seconds !== null) {
      duration = timingRunning
        ? translate('turn.processing', { duration: formatElapsed(seconds) })
        : translate('turn.processed', { duration: formatElapsed(seconds) })
    }
  }

  const label = [duration, ...parts].filter(part => part !== null && part !== '').join(' · ')
  const finalLabel = label === '' ? translate('turn.thought') : label

  return h('button', {
    type: 'button',
    'data-magic-ceo-turn-summary': 'true',
    'data-turn-process': String(node.data.turn),
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
      color: 'var(--gl-ink-3, #8c909f)',
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
