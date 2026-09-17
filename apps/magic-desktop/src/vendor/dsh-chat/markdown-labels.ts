// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/markdown-labels.ts

import type { MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from './contract/slots.ts'

/** 为一个 locale 版次构建完整的 Markdown chrome 文案。 */
export function markdownLabels(t: ChatViewSlotProps['t']): MarkdownLabels {
  return {
    code: { copyLabel: t('copy'), copiedLabel: t('copied') },
    footnotes: t('markdown.footnotes'),
  }
}
