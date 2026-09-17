// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/contract/snapshot.ts
// （去掉 ConversationViewSnapshotMap 的 declare module 合并；其余照搬。）

import type {
  ConversationNode, ConversationTimelineSnapshot, PartialAssistant, RunningToolCall,
} from '../vendor-types.ts'
import type { ChatConversationViewNode } from './chat-nodes.ts'
import type { TurnProcessSpec } from './turn-process.ts'

/** 一个已挂载 Chat Node Seat 使用的 per-key 可观察值。 */
export interface ChatNodeSource {
  readonly getSnapshot: () => ChatConversationViewNode | undefined
  readonly subscribe: (listener: () => void) => () => void
}

/** 一个 Chat Node 周围 Turn-process 呈现的 per-key 可观察值。 */
export interface ChatNodeProcessSource {
  readonly getSnapshot: () => ChatTurnProcessPresentation | undefined
  readonly subscribe: (listener: () => void) => () => void
}

/** Chat 节点的稳定 per-key 实时读取器。 */
export interface ChatNodeStore {
  get(key: string): ChatConversationViewNode | undefined
  source(key: string): ChatNodeSource
  processSource(key: string): ChatNodeProcessSource
  values(): readonly ChatConversationViewNode[]
}

/** 投影进紧凑 Chat 导航栏的一个已加载轮。 */
export interface TurnNavigationItem {
  readonly turn: number
  readonly anchorKey: string
  readonly prompt: string
  readonly response: string
}

/** 已加载轮的稳定实时导航投影。 */
export interface ChatTurnNavigationIndex {
  items(): readonly TurnNavigationItem[]
}

/** Chat 节点的稳定实时 Location 索引。 */
export interface ChatLocationNodeIndex {
  getTurn(turn: number): readonly string[]
  getStep(turn: number, step: number): readonly string[]
}

/** 为一个 Turn process 推导的跨 Node 呈现事实。 */
export interface ChatTurnProcessPresentation {
  readonly turn: number
  readonly spec: TurnProcessSpec
  readonly turnClosed: boolean
  readonly hasExternalProcess: boolean
  readonly compactAnswer: boolean
}

/** 支撑统计与旧版顶层快照字段的兼容投影。 */
export interface LegacyConversationSlice {
  readonly nodes: readonly ConversationNode[]
  readonly turnTimings: ReadonlyMap<number, { readonly startTime: number; readonly endTime?: number }>
  readonly turnEnds: ReadonlyMap<number, number>
  readonly partial: PartialAssistant | null
  readonly runningCalls: readonly RunningToolCall[]
}

/** 增量 Chat 发布：不可变顺序 + 稳定的实时 keyed 读取器。 */
export interface ChatSnapshot {
  readonly order: readonly string[]
  readonly nodes: ChatNodeStore
  readonly locations: ChatLocationNodeIndex
  readonly navigation: ChatTurnNavigationIndex
  readonly timeline: ConversationTimelineSnapshot
  readonly legacy: LegacyConversationSlice
}

const EMPTY_LIST: readonly never[] = []
const EMPTY_TIMELINE: ConversationTimelineSnapshot = { turnOrder: EMPTY_LIST, turns: new Map() }
const EMPTY_NODE_SOURCE: ChatNodeSource = {
  getSnapshot: () => undefined,
  subscribe: () => () => {},
}
const EMPTY_NODE_PROCESS_SOURCE: ChatNodeProcessSource = {
  getSnapshot: () => undefined,
  subscribe: () => () => {},
}

/** 视图 builder 注册前使用的空 Chat 目标。 */
export const EMPTY_CHAT_SNAPSHOT: ChatSnapshot = {
  order: EMPTY_LIST,
  nodes: {
    get: () => undefined,
    source: () => EMPTY_NODE_SOURCE,
    processSource: () => EMPTY_NODE_PROCESS_SOURCE,
    values: () => EMPTY_LIST,
  },
  locations: {
    getTurn: () => EMPTY_LIST,
    getStep: () => EMPTY_LIST,
  },
  navigation: {
    items: () => EMPTY_LIST,
  },
  timeline: EMPTY_TIMELINE,
  legacy: {
    nodes: EMPTY_LIST,
    turnTimings: new Map(),
    turnEnds: new Map(),
    partial: null,
    runningCalls: EMPTY_LIST,
  },
}
