// 替代 @deepseek-ai/dsh-client-ui-conversation/client 的 inspectSystemPrompt /
// inspectRequestPrompt，行为等价（源：ui-conversation client/contract/system-prompt.ts
// 与 request-inspection.ts；request-prompt.ts 经 uiConversation 服务注入这两个
// 纯函数，本地直接收敛，消除服务依赖）。

import type { ToolSchema, SessionEvent } from '../vendor-types.ts'
import { isSurfaceEvent } from '../vendor-types.ts'
import type {
  ConversationPromptSnapshot, RequestPromptInspection, RequestPromptInspector,
  SystemPromptNode,
} from '../vendor-types.ts'

interface PositionedSystem {
  readonly position: number
  readonly node: SystemPromptNode
}

/** 一个日志前缀处的提示事实；更早的实例对历史卡片保持有效。 */
export interface SystemPromptState {
  readonly firstSeq: number
  readonly uncertain: boolean
  readonly nodes: readonly PositionedSystem[]
  readonly replacements: ReadonlyMap<number, number>
  readonly effective: SystemPromptNode | undefined
  readonly introduced: SystemPromptNode | undefined
}

/** 纯 system 解释函数签名（收敛自 ui-conversation 契约的 SystemPromptInspector）。 */
export type SystemPromptInspector = (
  previous: SystemPromptState | undefined,
  event: SessionEvent,
) => SystemPromptState

/**
 * 应用一个 system 事件或位置替换而不保留普通消息。
 * 替换位置继承其 start 端点，而非时间序 seq。
 */
export function inspectSystemPrompt(previous: SystemPromptState | undefined, event: SessionEvent): SystemPromptState {
  const op = isSurfaceEvent(event) ? event.surfaceOp : undefined
  const firstSeq = previous?.firstSeq ?? event.seq
  let nodes = previous?.nodes ?? []
  let replacements = previous?.replacements ?? new Map<number, number>()
  const unknownEndpoint = (seq: number): boolean => seq < firstSeq && !replacements.has(seq)
  const uncertain = previous?.uncertain === true || (op !== undefined && op !== 'append'
    && (unknownEndpoint(op.startSeq) || unknownEndpoint(op.endSeq)))
  if (uncertain) {
    return { firstSeq, uncertain, nodes: [], replacements: new Map(), effective: undefined, introduced: undefined }
  }
  let position: number = event.seq
  if (op !== undefined && op !== 'append') {
    position = replacements.get(op.startSeq) ?? op.startSeq
    const end = replacements.get(op.endSeq) ?? op.endSeq
    nodes = nodes.filter(item => item.position < position || item.position > end)
    const retained = new Map([...replacements].filter(([, value]) => value < position || value > end))
    retained.set(event.seq, position)
    replacements = retained
  }
  const introduced: SystemPromptNode | undefined = event.type === 'system/message'
    ? {
      seq: event.seq,
      time: event.time,
      turn: event.data.turn,
      step: event.data.step,
      text: event.data.message.content.flatMap(block => block.type === 'text' ? [block.text] : []).join(''),
      update: op === 'append' && previous?.nodes.some(item => item.node.text !== '') === true,
    }
    : undefined
  if (introduced !== undefined) {
    nodes = [...nodes, { position, node: introduced }].sort((a, b) => a.position - b.position)
  }
  const surviving = nodes.findLast(item => item.node.text !== '')?.node
  const effective = surviving === previous?.nodes.findLast(item => item.node.text !== '')?.node
    ? previous?.effective
    : introduced !== undefined && introduced === surviving
      ? introduced
      : {
        seq: event.seq,
        time: event.time,
        turn: surviving?.turn ?? 0,
        step: surviving?.step ?? 0,
        text: surviving?.text ?? '',
        update: false,
      }
  return { firstSeq, uncertain, nodes, replacements, effective, introduced }
}

/**
 * 相对前一个已加载请求头规范化一个请求头并分类模型可见提示变化。
 * （签名即 ui-conversation 契约中的 RequestPromptInspector。）
 */
export const inspectRequestPrompt: RequestPromptInspector = (
  previous,
  event,
  system,
) => {
  const header = event.data.header
  const rawTools: unknown = header.tools
  const prompt: ConversationPromptSnapshot = {
    config: header.config,
    system: system?.text ?? '',
    tools: Array.isArray(rawTools) ? rawTools as readonly ToolSchema[] : [],
  }
  if (previous === undefined && event.data.reason !== 'initial') return { prompt }
  const systemChanged = previous !== undefined && previous.system !== prompt.system && system?.update !== true
  const toolsChanged = previous !== undefined
    && JSON.stringify(previous.tools) !== JSON.stringify(prompt.tools)
  if (previous !== undefined && !systemChanged && !toolsChanged) return { prompt }
  const origin = system !== undefined && (previous === undefined || systemChanged) ? system : event
  return {
    prompt,
    change: {
      seq: origin.seq,
      time: origin.time,
      kind: previous === undefined
        ? 'initial'
        : systemChanged && toolsChanged
          ? 'system-and-tools'
          : systemChanged ? 'system' : 'tools',
      ...(previous === undefined ? {} : { previous }),
    },
  }
}

/** 请求检查的公共类型再出口（与源包一致）。 */
export type { RequestPromptInspection, RequestPromptInspector, SystemPromptNode }
