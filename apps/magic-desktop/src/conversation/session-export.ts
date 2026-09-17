// 会话导出（裁定 19）：把快照序列化为 Markdown 下载。M1 纯前端实现；
// SDK 接线后可换 trajectory 投影做更完整的导出（含工具结果/思考全文）。
import type { ChatNode, ChatSnapshot } from '../vendor/dsh-chat/index.ts'

type ContentPart = { type: string; text?: string }

const partText = (parts: readonly ContentPart[] | undefined, type: string): string =>
  (parts ?? [])
    .filter(p => p.type === type && typeof p.text === 'string' && p.text.length > 0)
    .map(p => p.text as string)
    .join('\n')

export function buildSessionMarkdown(title: string, snapshot: ChatSnapshot): string {
  const lines: string[] = [`# ${title}`, '', `- 导出时间：${new Date().toLocaleString()}`, '', '---', '']
  for (const key of snapshot.order) {
    const node = snapshot.nodes.get(key) as ChatNode | undefined
    if (node === undefined || node.visibility === 'hidden') continue
    const data = node.data as unknown as Record<string, unknown>
    if (node.kind === 'user' || node.kind === 'steering' || node.kind === 'context') {
      const message = data.message as { content?: readonly ContentPart[] } | undefined
      const text = partText(message?.content, 'text')
      if (text.length > 0) lines.push('**用户**', '', text, '')
    } else if (node.kind === 'assistant-step') {
      const message = data.message as { content?: readonly ContentPart[] } | undefined
      const reasoning = partText(message?.content, 'reasoning')
      if (reasoning.length > 0) lines.push(reasoning.split('\n').map(l => `> ${l}`).join('\n'), '')
      const text = partText(message?.content, 'text')
      if (text.length > 0) lines.push(text, '')
    } else if (node.kind === 'tool-call') {
      const root = data.root as
        | { name?: string; argsRaw?: string; call?: { name?: string; argsRaw?: string } }
        | undefined
      const name = root?.call?.name ?? root?.name
      if (typeof name === 'string' && name.length > 0) {
        const argsRaw = root?.call?.argsRaw ?? root?.argsRaw ?? ''
        const args = (argsRaw.split('\n')[0] ?? '').slice(0, 160)
        lines.push(`- 工具 \`${name}\`${args.length > 0 ? `：\`${args}\`` : ''}`, '')
      }
    } else if (node.kind === 'command') {
      const name = typeof data.name === 'string' ? data.name : ''
      const args = typeof data.args === 'string' ? data.args : ''
      if (name.length > 0) lines.push(`- 命令 \`/${name}${args.length > 0 ? ` ${args}` : ''}\``, '')
    }
  }
  return lines.join('\n')
}
