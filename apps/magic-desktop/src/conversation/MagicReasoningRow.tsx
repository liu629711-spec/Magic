// Magic reasoning 换肤适配（对话区 v2）：把 DSH ReasoningRow 的 props 契约
// {text, running, t} 映射到 stitch ThinkingState Reasoning 变体。
// 替代 vendor/dsh-chat/chat/ReasoningRow.tsx 在 AssistantMarkdown 中的位置。
import ThinkingState from '../vendor/stitch-chat/ThinkingState.tsx'
import type { ChatViewSlotProps } from '../vendor/dsh-chat/contract/slots.ts'

export function MagicReasoningRow({ text, running }: {
  text: string
  running: boolean
  t: ChatViewSlotProps['t']
}) {
  // reasoning 原文按换行拆段；空行过滤后每段一行，长段整段显示（Reasoning 变体自然换行）
  const rows = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(primary => ({ primary }))
  return (
    <ThinkingState
      variant="Reasoning"
      running={running}
      rows={rows.length > 0 ? rows : undefined}
      active="思考中"
      done="已深度思考"
    />
  )
}
