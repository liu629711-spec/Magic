// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/message-chrome.ts

import type { Translate } from '../vendor-types.ts'

/** 时钟消费的对话词典日期模板份额。 */
export type ClockTranslate = Translate<'clock.md' | 'clock.ymd'>

/** 时长词典份额。 */
export type RunDurationTranslate =
  Translate<'duration.seconds' | 'duration.minutes' | 'duration.hours'>

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** 某时刻的本地日历日纪元（本地午夜 ms）。 */
export function startOfLocalDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 距 `ms` 之后下一个本地午夜的延迟（至少 1ms）。 */
export function msUntilNextLocalMidnight(ms: number): number {
  const next = new Date(ms)
  next.setHours(24, 0, 0, 0)
  return Math.max(next.getTime() - ms, 1)
}

/** 运行与落定轮 chrome 共享的本地化耗时标签。 */
export function formatRunDuration(ms: number, t: RunDurationTranslate): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total / 60) % 60
  const seconds = total % 60
  if (hours > 0) {
    return t('duration.hours', { hours, minutes: pad2(minutes), seconds: pad2(seconds) })
  }
  return minutes > 0
    ? t('duration.minutes', { minutes, seconds: pad2(seconds) })
    : t('duration.seconds', { seconds })
}

/** 子轮延迟数字：十秒内一位小数，之后整秒。 */
export function formatLatencySeconds(ms: number): string {
  const s = Math.max(0, ms) / 1000
  return s < 10 ? String(Math.round(s * 10) / 10) : String(Math.round(s))
}

/** 解码吞吐数字：十以上整 token，以下一位小数。 */
export function formatTokensPerSecond(tps: number): string {
  const clamped = Math.max(0, tps)
  return clamped >= 10 ? String(Math.round(clamped)) : String(Math.round(clamped * 10) / 10)
}

/** 消息 IconActions 的紧凑本地时间戳。 */
export function formatMessageClock(time: number, t: ClockTranslate, now: number = Date.now()): string {
  const d = new Date(time)
  const n = new Date(now)
  const clock = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  if (
    d.getFullYear() === n.getFullYear()
    && d.getMonth() === n.getMonth()
    && d.getDate() === n.getDate()
  ) {
    return clock
  }
  const params = { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }
  const md = d.getFullYear() === n.getFullYear() ? t('clock.md', params) : t('clock.ymd', params)
  return `${md} ${clock}`
}
