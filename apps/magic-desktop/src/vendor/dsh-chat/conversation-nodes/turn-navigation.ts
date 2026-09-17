// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/conversation-nodes/turn-navigation.ts

import type { ChatNode } from '../contract/chat-nodes.ts'
import type { ChatLocationNodeIndex, ChatNodeStore, TurnNavigationItem } from '../contract/snapshot.ts'

/** 预览预算，按轮卡片的钳制设定。 */
const PROMPT_PREVIEW_LIMIT = 50
const RESPONSE_PREVIEW_LIMIT = 120

/** 连接渲染文本、折叠空白，超过预算时加省略号截断。 */
function preview(parts: Iterable<string>, limit: number): string {
  let text = ''
  let unread = false
  for (const part of parts) {
    if (text.length >= limit * 2) {
      unread = true
      break
    }
    const clipped = part.length > limit * 2
    const chunk = clipped ? part.slice(0, limit * 2) : part
    text += text === '' ? chunk : ` ${chunk}`
    if (clipped) {
      unread = true
      break
    }
  }
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length > limit - 1) return `${normalized.slice(0, limit - 1).trimEnd()}…`
  return unread ? `${normalized}…` : normalized
}

function promptText(node: ChatNode): string {
  if (node.kind !== 'user') return ''
  return preview(node.data.content.flatMap(block => block.type === 'text' ? [block.text] : []), PROMPT_PREVIEW_LIMIT)
}

function responseText(node: ChatNode): string {
  if (node.kind !== 'assistant-step') return ''
  return preview(
    node.data.blocks.flatMap(block => block.kind === 'text' ? [block.text] : []),
    RESPONSE_PREVIEW_LIMIT,
  )
}

/** 两个条目是否携带同一轮次栏状态。 */
export function sameTurnNavigationItem(
  left: TurnNavigationItem | undefined,
  right: TurnNavigationItem | undefined,
): boolean {
  if (left === undefined || right === undefined) return left === right
  return left.turn === right.turn && left.anchorKey === right.anchorKey
    && left.prompt === right.prompt && left.response === right.response
}

/** 把一个已加载轮投影为其轮次栏条目。 */
export function turnNavigationItem(
  turn: number,
  locations: ChatLocationNodeIndex,
  nodes: ChatNodeStore,
): TurnNavigationItem | undefined {
  const loaded = locations.getTurn(turn)
    .map(key => nodes.get(key))
    .filter((node): node is ChatNode => node !== undefined && node.visibility === 'visible')
  const user = loaded.find(node => node.kind === 'user')
  const anchor = user ?? loaded[0]
  if (anchor === undefined) return undefined
  const response = loaded.findLast(node => responseText(node) !== '')
  return {
    turn,
    anchorKey: anchor.key,
    prompt: user === undefined ? '' : promptText(user),
    response: response === undefined ? '' : responseText(response),
  }
}
