// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/ContextInjectionRow.tsx

import { useState } from 'react'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { DisclosureRow, IconContextInjectionOutline16, ReferenceIcon } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ContextChatData } from '../contract/chat-nodes.ts'
import { contextBody } from './ContextBody.tsx'
import css from './ContextInjectionRow.module.css'

/** 持久非用户消息呈现的 props。 */
export interface ContextInjectionRowProps {
  content: ContextChatData['content']
  source: ContextChatData['source']
  /** 由持久 source 投影出的角色与生产者名。 */
  provenance: ContextChatData['provenance']
  /** 生产者声明的信息形态；null 渲染不透明主体。 */
  form: ContextChatData['form']
  /** 所属视图的 locale 座位，按纯 prop 下传。 */
  t: ChatViewSlotProps['t']
}

/** 以 Figma 的 Tool calls 折叠 chrome 渲染持久上下文。 */
export function ContextInjectionRow({ content, source, provenance, form, t }: ContextInjectionRowProps) {
  const [open, setOpen] = useState(false)
  // Resolved rather than declared: a form whose fields are unreadable renders
  // the opaque body, and the marker must say what the row actually shows.
  const { rendered, summary, body } = contextBody(form, { content, source, t })

  return (
    <DisclosureRow
      // 换肤点（2026-09-17 用户裁定）：关闭 hover chevron 预览，与 ToolRow 一致。
      previewChevron={false}
      className={css.root}
      icon={provenance.role === 'recall'
        ? <span data-context-recall-icon><ReferenceIcon kind="session" /></span>
        : <IconContextInjectionOutline16 size={14} />}
      chevronClassName={css.chevron}
      title={t(provenance.role === 'recall' ? 'message.contextRecall' : 'message.contextInjection')}
      collapsedContent={provenance.label === null ? undefined : (
        <>

          <span className={css.sep} aria-hidden />
          <span className={css.source} data-context-source>{provenance.label}</span>
          {summary !== null && (
            <>
              <span className={css.sep} aria-hidden />
              <span className={css.summary} data-context-summary>{summary}</span>
            </>
          )}
        </>
      )}
      keepContentWhenOpen
      open={open}
      expandable
      expandOnRowClick
      onToggle={() => { setOpen(value => !value) }}
    >
      <div className={css.body} data-context-injection-body data-context-form={rendered ?? undefined}>
        {body}
      </div>
    </DisclosureRow>
  )
}
