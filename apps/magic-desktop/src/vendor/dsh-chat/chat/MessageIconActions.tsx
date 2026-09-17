// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/MessageIconActions.tsx

// Shared IconActions chrome for user and assistant messages: copy
// live, optional branch wiring, and an optional date-aware clock.

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import {
  IconBranchOutline16, IconCheckOutline16, IconCopyOutline16, Tooltip, writeClipboard,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { formatMessageClock } from './message-chrome.ts'
import { useCalendarDay } from './use-calendar-day.ts'
import css from './MessageIconActions.module.css'

export interface MessageIconActionsProps {
  /** 复制动作写入的纯文本。 */
  text: string
  /** 时钟标签的 Unix 纪元 ms；瞬态消息缺省。 */
  time?: number | undefined
  /** 图标前（用户）或后（assistant）的时钟。 */
  clock: 'start' | 'end'
  /** 在该消息处分叉会话；缺省隐藏分叉动作。 */
  onBranch?: (() => void) | undefined
  /** 非完整转录尾：分叉可见但不可用。 */
  branchUnavailable?: boolean | undefined
  /** 父布局组合到动作行上的 class。 */
  className?: string | undefined
  /** 内置复制与分叉控件之间由独立插件拥有的插槽动作。 */
  extraActions?: ReactNode
  /** 图标行轮用量触发器，位于图标簇末尾。 */
  usageAction?: ReactNode
  /** 所属视图的 locale 座位，按纯 prop 下传。 */
  t: ChatViewSlotProps['t']
}

/** 用户与 assistant chrome 共享的复制/分叉（/时钟）IconActions 行。 */
export function MessageIconActions({
  text, time, clock, onBranch, branchUnavailable = false, className,
  extraActions, usageAction, t,
}: MessageIconActionsProps) {
  const day = useCalendarDay()
  const reasonId = useId()
  // Same success chrome as CodeBlock: a short check swap after the write,
  // gated so re-clicks during the window neither re-copy nor stack timers.
  const [copied, setCopied] = useState(false)
  const copyPending = useRef(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const copyEpoch = useRef(0)
  useEffect(() => () => {
    copyEpoch.current += 1
    copyPending.current = false
    if (copyTimer.current !== null) clearTimeout(copyTimer.current)
  }, [])
  const onCopy = useCallback(() => {
    if (copied || copyPending.current) return
    const epoch = copyEpoch.current
    copyPending.current = true
    void writeClipboard(text).then((ok) => {
      if (epoch !== copyEpoch.current) return
      copyPending.current = false
      if (!ok) return
      setCopied(true)
      copyTimer.current = window.setTimeout(() => {
        copyTimer.current = null
        setCopied(false)
      }, 1000)
    })
  }, [copied, text])
  const clockEl = time === undefined ? null : (
    <span className={clock === 'start' ? css.timeStart : css.timeEnd}>
      {formatMessageClock(time, t, day)}
    </span>
  )
  return (
    <div className={className === undefined ? css.actions : `${css.actions} ${className}`}>
      {clock === 'start' ? clockEl : null}
      <Tooltip label={copied ? t('copied') : t('copy')} side="bottom">
        <button type="button" className={css.action} aria-label={copied ? t('copied') : t('copy')} onClick={onCopy}>
          {copied ? <IconCheckOutline16 /> : <IconCopyOutline16 />}
        </button>
      </Tooltip>
      {extraActions}
      {onBranch !== undefined && (
        <Tooltip label={branchUnavailable ? t('message.branchUnavailable') : t('message.branch')} side="bottom">
          {/* Native disabled buttons do not deliver the hover/focus events Tooltip needs. */}
          <button
            type="button"
            className={css.action}
            aria-label={t('message.branch')}
            aria-disabled={branchUnavailable || undefined}
            aria-describedby={branchUnavailable ? reasonId : undefined}
            data-unavailable={branchUnavailable || undefined}
            onClick={branchUnavailable ? undefined : onBranch}
          >
            <IconBranchOutline16 />
          </button>
        </Tooltip>
      )}
      {onBranch !== undefined && branchUnavailable && (
        <span id={reasonId} className={css.visuallyHidden}>{t('message.branchUnavailable')}</span>
      )}
      {usageAction}
      {clock === 'end' ? clockEl : null}
    </div>
  )
}
