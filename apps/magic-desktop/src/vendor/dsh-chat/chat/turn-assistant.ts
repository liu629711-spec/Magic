// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/turn-assistant.ts
// （AssistantBlock 改从 ../vendor-types.ts 导入——目标 contract/snapshot.ts
// 未收敛该类型，其余零改动。）

import type { AssistantBlock } from '../vendor-types.ts'

/**
 * Collect visible prose from one Assistant lifecycle.
 * @param blocks - Assistant content blocks.
 * @returns concatenated text blocks.
 */
export function assistantText(blocks: readonly AssistantBlock[]): string {
  return blocks.flatMap(block => block.kind === 'text' ? [block.text] : []).join('')
}
