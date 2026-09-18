import { useEffect, useRef, useState } from 'react'
import { DisclosureRow, IconThinkOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from '../vendor/dsh-chat/chat/ReasoningRow.module.css'

/** 与上下文注入、读取行共用 DisclosureRow；只有展开正文拥有边框。 */
export function MagicReasoningRow({ text, running }: { text: string; running: boolean; t?: unknown }) {
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const summary = text.split('\n').find(line => line.trim().length > 0) ?? ''
  useEffect(() => {
    if (expanded && running && stickRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [expanded, running, text])
  return (
    <div className={css.root} data-variant="think" data-state={running ? 'running' : 'ok'} data-expanded={expanded || undefined} data-reasoning-toggle>
      <DisclosureRow
        previewChevron={false}
        rowClassName={css.row}
        leadingClassName={css.leading}
        titleClassName={css.title}
        chevronClassName={css.chevron}
        icon={<IconThinkOutline14 size={14} />}
        title={running ? '思考中' : '思考'}
        open={expanded}
        expandable
        expandOnRowClick
        onToggle={() => setExpanded(value => !value)}
        collapsedContent={<><span className={css.separator} aria-hidden /><span className={css.summary}><span className={css.summaryText}>{summary}</span></span></>}
      >
        <div ref={scrollRef} data-reasoning-body tabIndex={0}
          onScroll={() => {
            const el = scrollRef.current
            if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
          }}
          /* 与上下文注入/读取行同一套「方块」展开体（ContextInjectionRow.body 几何）：
           * 缩进 22px 对齐行头图标、max-height 141px 内部滚动、8px 圆角、code-block 底色、无边框。 */
          className="mt-1 ml-[22px] max-h-[141px] overflow-y-auto overscroll-contain rounded-[8px] bg-[var(--dsw-alias-markdown-code-block)] px-4 pb-3 pt-2.5 whitespace-pre-wrap break-words text-[12.5px] leading-5 text-on-surface-variant"
        >{text}</div>
      </DisclosureRow>
    </div>
  )
}
