/**
 * 成员过程摘要（P0-1 阶段一，对标 codex-ui MessageList.tsx:141-221 的工具摘要行）：
 * 把成员的工具步骤按 探索/搜索/编辑/运行 分类计数，产出一行「正在/已 …」摘要。
 * 纯数据层，测试直接驱动；分类是容忍性子串匹配，DSH 工具名映射不到的进 other。
 */

import type { CeoProcessStep } from './team.ts'

export type ProcessCategory = 'explore' | 'search' | 'edit' | 'run' | 'other'

export interface ProcessSummary {
  /** 任一工具步还在跑。 */
  running: boolean
  /** 工具步总数（reasoning/content 不计）。 */
  total: number
  counts: Record<ProcessCategory, number>
}

/** 完成态时间线默认折叠的工具步阈值（codex-ui 语义：过程藏进摘要行）。 */
export const TIMELINE_COLLAPSE_THRESHOLD = 8

/** 容忍性分类：顺序敏感（edit 先于 explore，避免 'todo_write' 落进探索）。 */
export function classifyToolName(name: string): ProcessCategory {
  const lower = name.toLowerCase()
  if (/(edit|write|patch|apply)/.test(lower)) return 'edit'
  if (/(grep|search|find)/.test(lower)) return 'search'
  if (/(bash|exec|command|shell|run|test|build|install)/.test(lower)) return 'run'
  if (/(read|view|list|glob|dir|open|fetch|browse|source)/.test(lower)) return 'explore'
  return 'other'
}

export function summarizeProcessSteps(steps: readonly CeoProcessStep[]): ProcessSummary {
  const counts: Record<ProcessCategory, number> = { explore: 0, search: 0, edit: 0, run: 0, other: 0 }
  let running = false
  let total = 0
  for (const step of steps) {
    if (step.kind !== 'tool') continue
    total += 1
    if (step.status === 'running') running = true
    counts[classifyToolName(step.name)] += 1
  }
  return { running, total, counts }
}

/** 完成态下步骤够多才默认折叠；运行中永远展开（实时流不藏）。 */
export function timelineDefaultExpanded(summary: ProcessSummary): boolean {
  return summary.running || summary.total < TIMELINE_COLLAPSE_THRESHOLD
}
