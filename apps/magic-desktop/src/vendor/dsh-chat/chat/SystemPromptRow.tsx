// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/SystemPromptRow.tsx
// （纯 props 渲染：primitives + 本目录已搬的 OpaqueBody 与
// ContextInjectionRow.module.css，原样搬入。）

import { memo, useState } from 'react'
import type { ChatNodeViewProps, ChatViewSlotProps } from '../contract/slots.ts'
import { DisclosureRow, IconBrowseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import { OpaqueBody } from './ContextBody.tsx'
import css from './ContextInjectionRow.module.css'

/** Props for one complete system prompt disclosure. */
export interface SystemPromptRowProps {
  /** Complete model-visible prompt text. */
  text: string
  /** True when the prompt replaced an earlier one from this position in the history. */
  update?: boolean
  /** The owning view's locale seat. */
  t: ChatViewSlotProps['t']
}

/**
 * Render one complete system prompt as a collapsed disclosure whose expanded
 * body is the same opaque context chrome: 141px code-block scrollport and
 * model-facing text with its real line breaks. An in-history update uses the
 * same row under its own title.
 * @param props - Complete prompt text, whether it is an update, and the locale seat.
 * @returns The system-prompt disclosure row.
 */
export function SystemPromptRow({ text, update = false, t }: SystemPromptRowProps) {
  const [open, setOpen] = useState(false)
  return (
    <DisclosureRow
      // 换肤点（2026-09-17 用户裁定）：关闭 hover chevron 预览，与 ToolRow 一致。
      previewChevron={false}
      className={css.root}
      icon={<IconBrowseOutline16 size={14} />}
      chevronClassName={css.chevron}
      title={t(update ? 'message.systemPromptUpdate' : 'message.systemPrompt')}
      open={open}
      expandable
      expandOnRowClick
      onToggle={() => { setOpen(value => !value) }}
    >
      <div className={css.body} data-system-prompt-body>
        <OpaqueBody content={[{ type: 'text', text }]} source={null} t={t} />
      </div>
    </DisclosureRow>
  )
}

/** System-prompt keyed Chat renderer. */
export const SystemPromptNodeView = memo(function SystemPromptNodeView({
  node, t,
}: Pick<ChatNodeViewProps<'system-prompt'>, 'node' | 't'>) {
  return <SystemPromptRow text={node.data.text} update={node.data.update === true} t={t} />
})
