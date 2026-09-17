// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/contract/assistant-content.ts

import type { AssistantBlock } from '../vendor-types.ts'

/** 测试 Assistant 块是否含用户可见回复而非纯推理/Tool 协议材料。 */
export function hasAssistantReplyContent(blocks: readonly AssistantBlock[]): boolean {
  return blocks.some((block) => {
    if (block.kind === 'reasoning' || block.kind === 'tool-call') return false
    if (block.kind === 'text') return block.text.trim() !== ''
    return true
  })
}
