// 对话区底部输入条（M1 壳自写；quiet 风格：中性按钮，inverse-surface 同左栏弹窗先例）。
// Enter 发送 / Shift+Enter 换行 / 输入法组词中不触发。
import { useRef, useState, type KeyboardEvent } from 'react'

export function Composer({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = value.trim() !== ''

  const send = () => {
    if (!canSend) return
    onSubmit(value.trim())
    setValue('')
    const el = areaRef.current
    if (el !== null) el.style.height = ''
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  return (
    <div className="shrink-0 border-t border-outline-variant/50 bg-surface" data-composer-seat>
      <div className="mx-auto w-full max-w-[var(--dsh-chat-content-width)] px-4 pb-4 pt-3">
        <div className="flex items-end gap-2 rounded-2xl border border-outline-variant/60 bg-surface-container-low px-4 py-2.5">
          <textarea
            ref={areaRef}
            rows={1}
            value={value}
            onChange={event => {
              setValue(event.target.value)
              autoResize(event.target)
            }}
            onKeyDown={onKeyDown}
            placeholder="输入消息，Enter 发送"
            className="max-h-40 flex-1 resize-none bg-transparent text-[14px] leading-5 text-on-surface outline-none placeholder:text-outline"
          />
          <button
            type="button"
            onClick={send}
            disabled={!canSend}
            className="shrink-0 rounded-lg bg-inverse-surface px-3 py-1.5 text-[13px] font-medium text-inverse-on-surface transition-opacity disabled:opacity-40"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
