// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/toolviews/todo-row.tsx
// （剥离注册壳：todoToolview 的 ctx.slots.inject + register 整体移除，仅保留
// TodoRow 卡片本体。）

import { IconChecklistOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '../slots.ts'
import { toolRowModel } from '../models/tool-call-model.ts'
import { ToolRow } from '../components/ToolRow.tsx'
import { planSummary, type PlanItemLike } from './plan-summary.ts'

function isItem(value: unknown): value is PlanItemLike {
  return typeof value === 'object' && value !== null
}

/** 行摘要在省略号边界处的拆分。 */
interface RowSummary {
  text: string
  extra: number
}

function summarize(argsRaw: string, t: ToolCallViewProps['t']): RowSummary | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(argsRaw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const todos = (parsed as { todos?: unknown }).todos
  if (!Array.isArray(todos) || !todos.every(isItem)) return null
  const { done, total, activeContent, activeExtra } = planSummary(todos)
  const head = t('todo.completed', { done, total })
  return {
    text: activeContent === null ? head : `${head} · ${activeContent}`,
    extra: activeExtra,
  }
}

/** Summarizes a plan update without presenting a cancelled call as completed. */
export function TodoRow({ toolName, block, inspect, t }: ToolCallViewProps) {
  const model = toolRowModel(toolName, block)
  const argsRaw = ('kind' in block ? block.call?.argsRaw : block.argsRaw) ?? ''
  const summary = summarize(argsRaw, t) ?? { text: model.summary, extra: 0 }
  return (
    <ToolRow
      t={t}
      variant={model.variant}
      toolName={toolName}
      icon={<IconChecklistOutline14 />}
      title={t('todo.rowTitle')}
      summary={summary.text}
      summarySuffix={summary.extra > 0 ? `+${summary.extra}` : null}
      bodyRaw={model.bodyRaw}
      output={model.output}
      errorSummary={model.errorSummary}
      state={model.state}
      inspect={inspect}
    />
  )
}
