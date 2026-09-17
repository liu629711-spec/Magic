// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/conversation-nodes/request-prompt.ts
// （剥离：cordis Context 注册函数；inspectSystemPrompt / inspectRequestPrompt
// 由本地等价实现 prompt-inspection.ts 直接供应，不再经 uiConversation 服务注入。）

import type {
  ConversationMatch, ConversationNodeContext, ConversationNodeDefinition,
} from '../vendor-types.ts'
import type {
  RequestPromptInspector, SystemPromptInspector, SystemPromptState,
} from './prompt-inspection.ts'
import type { ChatNode } from '../contract/chat-nodes.ts'
import { chatNode } from './common.ts'
import { inspectRequestPrompt, inspectSystemPrompt } from './prompt-inspection.ts'

type RequestPromptState = {
  readonly anchorSeq: number
  readonly showsPrompt: boolean
  readonly turn?: number
  readonly step?: number
} & ReturnType<RequestPromptInspector>

/** 把请求的系统提示词放在其可见消息序列的开头。 */
function requestPromptAnchor(
  match: ConversationMatch,
  previous: Readonly<RequestPromptState> | undefined,
  isInitial: boolean,
): number {
  if (match.location.kind !== 'step') return match.event.seq
  if (previous === undefined && !isInitial) return match.event.seq
  if (previous?.turn === match.location.turn.turn
    && previous.step === match.location.step.step) return match.event.seq
  return match.location.step.step === 1
    ? match.location.turn.start?.seq ?? match.location.step.start?.seq ?? match.event.seq
    : match.location.step.start?.seq ?? match.event.seq
}

/** 让已渲染的提示保持在其页面生命周期的呈现锚上。 */
function stableRequestPromptAnchor(
  context: ConversationNodeContext<RequestPromptState>,
  match: ConversationMatch,
  previous: Readonly<RequestPromptState> | undefined,
  isInitial: boolean,
): number {
  const current = context.current.get('chat') as ChatNode | null | undefined
  return current?.kind === 'system-prompt'
    ? current.anchorSeq
    : requestPromptAnchor(match, previous, isInitial)
}

/** Chat 目标的 system-prompt surface 节点 Definition。 */
export function systemMessageDefinition(inspect: SystemPromptInspector): ConversationNodeDefinition<SystemPromptState> {
  return {
    kind: 'system-message',
    target: 'chat',
    match: event => event.type === 'system/message'
      || ('surfaceOp' in event && event.surfaceOp !== 'append')
      ? { id: String(event.seq), role: 'start' }
      : null,
    start: (_context, match, reader) => {
      return inspect(reader.previous<SystemPromptState>('system-message')?.state, match.event)
    },
    update: context => context.state,
    buildViewNode: (context) => {
      const state = context.state?.introduced
      if (state === undefined || state.text === ''
        || context.start?.event.type !== 'system/message' || context.start.event.surfaceOp !== 'append') return null
      const anchor = state.update ? state.seq : requestPromptAnchor(context.start, undefined, true)
      return chatNode(context, 'system-prompt', anchor, { text: state.text, ...state.update ? { update: true } : {} })
    },
  }
}

/** Chat 目标的请求头提示 Definition。 */
export function requestPromptDefinition(inspect: RequestPromptInspector): ConversationNodeDefinition<RequestPromptState> {
  return {
    kind: 'request-prompt',
    target: 'chat',
    match: event => event.type === 'request/header'
      ? { id: String(event.seq), role: 'start' }
      : null,
    start: (context, match, reader) => {
      if (match.event.type !== 'request/header') {
        throw new Error('request-prompt start requires request/header')
      }
      const previous = reader.previous<RequestPromptState>('request-prompt')?.state
      const systemContext = reader.previous<SystemPromptState>('system-message')
      const system = systemContext?.state.effective
      const location = match.location.kind === 'step'
        ? { turn: match.location.turn.turn, step: match.location.step.step }
        : {}
      const inspection = inspect(previous?.prompt, match.event, system)
      const change = inspection.change?.kind
      // Appended prompts own their cards; a same-step header must not repeat them.
      const systemEvent = systemContext?.matches[0]?.event
      const shownByUpdate = system !== undefined
        && systemEvent?.type === 'system/message' && systemEvent.surfaceOp === 'append'
        && (system.update || previous === undefined)
        && system.turn === location.turn
        && system.step === location.step
      return {
        anchorSeq: stableRequestPromptAnchor(
          context,
          match,
          previous,
          match.event.data.reason === 'initial',
        ),
        showsPrompt: !shownByUpdate && (previous === undefined
          || match.event.data.reason !== 'change'
          || match.event.data.startsSeries === true
          || change === 'system'
          || change === 'system-and-tools'),
        ...location,
        ...inspection,
      }
    },
    update: context => context.state,
    buildViewNode: (context) => {
      const state = context.state
      if (state === undefined) return null
      const current = context.current.get('chat') as ChatNode | null | undefined
      const visible = state.showsPrompt && state.prompt.system !== ''
      if (!visible && current?.kind !== 'system-prompt') return null
      return chatNode(
        context,
        'system-prompt',
        state.anchorSeq,
        { text: state.prompt.system },
        { visibility: visible ? 'visible' : 'hidden' },
      )
    },
  }
}

/** 本地直接组装的两个提示 Definition（原经服务注入 inspect 函数）。 */
export const systemMessageChatDefinition: ConversationNodeDefinition<SystemPromptState>
  = systemMessageDefinition(inspectSystemPrompt)

export const requestPromptChatDefinition: ConversationNodeDefinition<RequestPromptState>
  = requestPromptDefinition(inspectRequestPrompt)
