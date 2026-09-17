// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/contract/store.ts

/** Chat 节点携带的 Tool 调用身份。 */
export type ToolCallId = string

/** 一次手动展开的轮回答生成。 */
export interface TurnProcessViewEntry {
  readonly turn: number
  readonly answerStep: number
}

/** Chat 视图与详情面共享的 per-Session 状态。 */
export interface ChatStoreState {
  turnProcesses: TurnProcessViewEntry[]
}
