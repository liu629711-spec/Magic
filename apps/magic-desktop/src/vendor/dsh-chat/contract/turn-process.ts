// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/contract/turn-process.ts

import type { ChatNode } from './chat-nodes.ts'

/** 从一轮推导的当前过程区间与定稿回答边界。 */
export interface TurnProcessSpec {
  readonly turn: number
  /** 稳定的控制节点锚来源，含当前不合格的证据。 */
  readonly controlAnchorSeq: number
  readonly processStartSeq: number
  readonly answerAnchorSeq: number | null
  readonly answerStep: number | null
  readonly inlineReasoning: boolean
  /** 定稿回答之前的持久带回复 Assistant 消息数。 */
  readonly messageCount: number
  /** 本轮记录的持久非 subagent Tool 调用数。 */
  readonly toolCallCount: number
  /** 配置名标识 subagent 委派的 Tool 调用数。 */
  readonly subagentCount: number
}

const TURN_PROCESS_INDEPENDENT_KIND_LIST = [
  'system-prompt',
  'user',
  'steering',
  'turn-process',
  'turn-error',
  'turn-max-tokens',
  'turn-tail',
] as const satisfies readonly ChatNode['kind'][]

/** 与轮过程披露保持独立的 Chat Node kind。 */
export const TURN_PROCESS_INDEPENDENT_KINDS: ReadonlySet<string> = new Set(
  TURN_PROCESS_INDEPENDENT_KIND_LIST,
)

/** 按已发布字段比较不可变的轮过程规格。 */
export function sameTurnProcessSpec(left: TurnProcessSpec, right: TurnProcessSpec): boolean {
  return left.turn === right.turn
    && left.controlAnchorSeq === right.controlAnchorSeq
    && left.processStartSeq === right.processStartSeq
    && left.answerAnchorSeq === right.answerAnchorSeq
    && left.answerStep === right.answerStep
    && left.inlineReasoning === right.inlineReasoning
    && left.messageCount === right.messageCount
    && left.toolCallCount === right.toolCallCount
    && left.subagentCount === right.subagentCount
}

/** 识别内置 subagent 委派工具名及其变体。 */
export function isSubagentDelegationTool(name: string): boolean {
  return name === 'subagent' || name.startsWith('subagent_')
}
