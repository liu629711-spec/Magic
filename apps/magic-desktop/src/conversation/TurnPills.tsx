// 轮尾统计 pill + 输入框下方会话统计条（2026-09-17 会话区对齐 Magic 组合 web 端）。
// 形态/数据语义来自 DSH 原生 TurnUsagePanel / TurnTimePanel / StatsPills：
//   轮尾「用量 190K tok」「用时 2分27秒」——vendored TurnTailNodeView 的 usageAction 缝；
//   输入框下「1 轮 6 步 · 228 tok/s」「190K tok · 缓存命中 82%」——StatsPills 两 pill。
// M1 简化：token 记账从 turn-tail 聚合（DSH 用 sessionStats projection）；点击统计条
// 弹出详情面板（对应 DSH web 端 stat-dialog），聚合与弹层见 TurnStatsDialog.tsx。
import { memo, useCallback, useMemo, useState } from 'react'
import { IconDatabaseOutline16, IconGaugeOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatSnapshot, TurnTailChatData } from '../vendor/dsh-chat/index.ts'
import { TurnStatsDialog, deriveTurnStats, formatElapsed, formatTokens } from './TurnStatsDialog.tsx'
import css from './TurnPills.module.css'

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

/** 输入框下方的会话统计条（StatsPills 复刻）：无统计的会话整行不渲染；点击 pill 弹出详情。 */
export const ComposerStats = memo(function ComposerStats({ snapshot }: { snapshot: ChatSnapshot }) {
  const stats = useMemo(() => deriveTurnStats(snapshot), [snapshot])
  const [open, setOpen] = useState(false)
  const close = useCallback(() => { setOpen(false) }, [])
  if (stats.steps === 0 && stats.usage === null) return null
  return (
    <div className={css.statsRow} data-composer-stats>
      {stats.steps > 0 && (
        <button
          type="button"
          className={`${css.pill} ${css.pillButton}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => { setOpen(!open) }}
        >
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
        </button>
      )}
      {stats.usage !== null && (
        <button
          type="button"
          className={`${css.pill} ${css.pillButton}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => { setOpen(!open) }}
        >
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
        </button>
      )}
      {open && <TurnStatsDialog model={stats} onClose={close} />}
    </div>
  )
})