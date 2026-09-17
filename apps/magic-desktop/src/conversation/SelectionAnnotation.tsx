// 划选注释（M8，2026-09-18）：在对话区消息流内划选文本 → 浮出「添加注释」按钮 →
// 收进输入条上方的注释 chips；发送时把注释以引用块拼在用户文本前。
// 三个导出：SelectionAnnotation（划选监听 + 浮动按钮）、AnnotationChips（注释胶囊行）、
// composeWithAnnotations（发送文本拼接）。
import { useEffect, useRef, useState, type RefObject } from 'react'

/** 把注释拼成引用块前置到用户文本（`> 注释\n\n` 依次 + 原文本）。 */
export function composeWithAnnotations(text: string, annotations: readonly string[]): string {
  if (annotations.length === 0) return text
  return annotations.map(annotation => `> ${annotation}\n\n`).join('') + text
}

/** 注释胶囊行（输入条上方、PromptBar 之前）：N 条注释 + 每条 `> 摘要…` + 移除 ×。 */
export function AnnotationChips({ annotations, onRemove }: {
  annotations: readonly string[]
  onRemove: (index: number) => void
}) {
  if (annotations.length === 0) return null
  return (
    <div data-annotation-chips className="flex flex-wrap items-center gap-1.5 px-0.5 pb-2">
      <span className="shrink-0 text-[11px] text-ink-3">{annotations.length} 条注释</span>
      {annotations.map((text, index) => (
        <span
          key={`${String(index)}-${text}`}
          data-annotation-chip
          className="flex h-6 max-w-56 items-center gap-1.5 rounded-full border border-line bg-field py-1 pl-2 pr-1 text-[11.5px] text-ink-2"
        >
          <span className="truncate" title={text}>{`> ${text}`}</span>
          <button
            type="button"
            aria-label={`移除注释 ${String(index + 1)}`}
            onClick={() => onRemove(index)}
            className="-my-1 flex size-5 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-line/70 hover:text-ink cursor-pointer"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}

/** 划选监听 + 「添加注释」浮动按钮：挂在消息流容器上，位置随选区（getBoundingClientRect）。 */
export function SelectionAnnotation({ containerRef, onAdd }: {
  /** 消息流容器（ChatFlow 的 flowRef）。 */
  containerRef: RefObject<HTMLElement | null>
  /** 收下选中的文本。 */
  onAdd: (text: string) => void
}) {
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)
  const pendingRef = useRef('')
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return
    const clear = () => {
      pendingRef.current = ''
      setAnchor(null)
    }
    const onMouseUp = () => {
      // 等一帧：mouseup 时浏览器尚未更新 selection。
      window.requestAnimationFrame(() => {
        const selection = window.getSelection()
        if (selection === null || selection.isCollapsed) {
          clear()
          return
        }
        const text = selection.toString().trim()
        if (text.length === 0) {
          clear()
          return
        }
        const range = selection.getRangeAt(0)
        // 选区需落在消息流容器内，且落在某条消息节点（[data-chat-flow-key]）内。
        if (!container.contains(range.commonAncestorContainer)) {
          clear()
          return
        }
        const node = range.commonAncestorContainer
        const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
        if (element === null || element.closest('[data-chat-flow-key]') === null) {
          clear()
          return
        }
        const rect = range.getBoundingClientRect()
        pendingRef.current = text
        setAnchor({ top: rect.top, left: rect.left + rect.width / 2 })
      })
    }
    const onDocMouseDown = (event: MouseEvent) => {
      // 点浮层按钮时不清（按钮 click 随后触发 onAdd）；其它位置一律收起。
      if (
        buttonRef.current !== null
        && event.target instanceof Node
        && buttonRef.current.contains(event.target)
      ) {
        return
      }
      clear()
    }
    const onScroll = () => clear()
    container.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mousedown', onDocMouseDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      container.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mousedown', onDocMouseDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [containerRef])

  if (anchor === null) return null
  return (
    <button
      ref={buttonRef}
      type="button"
      data-add-annotation
      style={{
        position: 'fixed',
        top: Math.max(8, anchor.top - 40),
        left: anchor.left,
        transform: 'translateX(-50%)',
      }}
      // 阻止 mousedown 默认行为：保住选区，避免点按钮即清空。
      onMouseDown={event => event.preventDefault()}
      onClick={() => {
        if (pendingRef.current.length > 0) onAdd(pendingRef.current)
        window.getSelection()?.removeAllRanges()
        pendingRef.current = ''
        setAnchor(null)
      }}
      className="z-30 flex h-7 items-center whitespace-nowrap rounded-full border border-line bg-surface px-3 text-[12px] text-ink shadow-raised transition-colors hover:bg-hover cursor-pointer"
    >
      添加注释
    </button>
  )
}