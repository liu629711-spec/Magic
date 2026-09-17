// 轮尾统计 pill + 输入框下方会话统计条（2026-09-17 会话区对齐 Magic 组合 web 端）。
// 形态/数据语义来自 DSH 原生 TurnUsagePanel / TurnTimePanel / StatsPills：
//   轮尾「用量 190K tok」「用时 2分27秒」——vendored TurnTailNodeView 的 usageAction 缝；
//   输入框下「1 轮 6 步 · 228 tok/s」「190K tok · 缓存命中 82%」——StatsPills 两 pill。
// M1 简化：token 记账从 turn-tail 聚合（DSH 用 sessionStats projection）；统计弹窗
// （stat-dialog）待 SDK 接线后补（数据源切换为 projection 时一并恢复）。
import { memo, useMemo } from 'react'
import { IconDatabaseOutline16, IconGaugeOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatNode, ChatSnapshot, TurnTailChatData } from '../vendor/dsh-chat/index.ts'
import css from './TurnPills.module.css'

/** 人性化 token 计数：190K tok / 1.9M tok / 840 tok。 */
function formatTokens(total: number): string {
  if (total >= 1_000_000) return `${(Math.round(total / 10_000) / 100).toFixed(2).replace(/\.?0+$/, '')}M tok`
  if (total >= 1_000) return `${Math.round(total / 1_000)}K tok`
  return `${String(total)} tok`
}

/** 秒表：2m 27s / 45s（DSH formatElapsed 语义）。 */
function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return rest === 0 ? `${String(minutes)}m` : `${String(minutes)}m ${String(rest)}s`
}

interface UsageAggregate {
  total: number
  cacheHitPercent: number | null
}

function aggregateUsage(tails: readonly TurnTailChatData[]): UsageAggregate | null {
  let uncached = 0
  let read = 0
  let write = 0
  let output = 0
  let seen = false
  for (const tail of tails) {
    const usage = tail.tokenUsage
    if (usage === undefined) continue
    seen = true
    uncached += usage.uncachedInputTokens
    read += usage.cacheReadTokens ?? 0
    write += usage.cacheWriteTokens ?? 0
    output += usage.outputTokens
  }
  if (!seen) return null
  const denominator = uncached + read + write
  return {
    total: denominator + output,
    cacheHitPercent: denominator > 0 ? Math.round((read / denominator) * 100) : null,
  }
}

/** 轮尾行末尾的「用量 / 用时」pill 簇（无数据的 pill 不渲染）。 */
export const TurnTailPills = memo(function TurnTailPills({ turnTail, startTime, endTime }: {
  turnTail: TurnTailChatData | undefined
  startTime: number | undefined
  endTime: number | undefined
}) {
  const usageText = useMemo(() => {
    const usage = turnTail?.tokenUsage
    return usage !== undefined && usage.totalTokens > 0 ? formatTokens(usage.totalTokens) : null
  }, [turnTail])
  const timeText = useMemo(() => {
    if (startTime === undefined || endTime === undefined) return null
    return formatElapsed(Math.max(0, Math.floor((endTime - startTime) / 1000)))
  }, [startTime, endTime])
  if (usageText === null && timeText === null) return null
  return (
    <>
      {usageText !== null && (
        <span className={css.pill} data-turn-usage>
          <IconDatabaseOutline16 />
          <span>用量 {usageText}</span>
        </span>
      )}
      {timeText !== null && (
        <span className={css.pill} data-turn-time>
          <IconGaugeOutline16 />
          <span>用时 {timeText}</span>
        </span>
      )}
    </>
  )
})

/** 输入框下方的会话统计条（StatsPills 复刻）：无统计的会话整行不渲染。 */
export const ComposerStats = memo(function ComposerStats({ snapshot }: { snapshot: ChatSnapshot }) {
  const stats = useMemo(() => {
    let steps = 0
    let speedTps: number | null = null
    const turns = new Set<number>()
    const tails: TurnTailChatData[] = []
    for (const node of snapshot.nodes.values()) {
      if (node.kind === 'assistant-step') {
        steps += 1
        const turn = node.location.kind === 'turn' || node.location.kind === 'step'
          ? node.location.turn.turn
          : undefined
        if (turn !== undefined) turns.add(turn)
      } else if (node.kind === 'turn-tail') {
        const data = (node as ChatNode<'turn-tail'>).data
        tails.push(data)
        if (data.tokensPerSecond !== undefined && data.tokensPerSecond > 0) {
          speedTps = data.tokensPerSecond
        }
      }
    }
    return { turns: turns.size, steps, speedTps, usage: aggregateUsage(tails) }
  }, [snapshot])
  if (stats.steps === 0 && stats.usage === null) return null
  return (
    <div className={css.statsRow} data-composer-stats>
      {stats.steps > 0 && (
        <span className={css.pill}>
          <IconGaugeOutline16 />
          <span className={css.label}>
            {`${String(stats.turns)} 轮 ${String(stats.steps)} 步`}
            {stats.speedTps !== null && (
              <>
                <span className={css.sep} aria-hidden>·</span>
                {`${String(Math.round(stats.speedTps))} tok/s`}
              </>
            )}
          </span>
        </span>
      )}
      {stats.usage !== null && (
        <span className={css.pill}>
          <IconDatabaseOutline16 />
          <span className={css.label}>
            {formatTokens(stats.usage.total)}
            {stats.usage.cacheHitPercent !== null && (
              <>
                <span className={css.sep} aria-hidden>·</span>
                {`缓存命中 ${String(stats.usage.cacheHitPercent)}%`}
              </>
            )}
          </span>
        </span>
      )}
    </div>
  )
})
