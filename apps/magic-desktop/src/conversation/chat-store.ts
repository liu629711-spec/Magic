// 对话区壳的状态容器：事件窗口 → foldChatSnapshot 整窗折叠 → 渲染快照。
// 替代 @deepseek-ai/dsh-client-store 的 reactive 链路（M1 静态阶段整窗重算；
// SDK 接线后换增量 Assembler 路径——vendor/dsh-chat/conversation-nodes/engine.ts 已具备）。
import {
  EMPTY_CHAT_SNAPSHOT,
  foldChatSnapshot,
  notifySubscribers,
} from '../vendor/dsh-chat/index.ts'
import type {
  AssistantLiveChunkEvent,
  ChatSnapshot,
  MessageId,
  SessionEvent,
  SessionEventLikeEntry,
  SessionSeq,
} from '../vendor/dsh-chat/index.ts'

export interface ChatRenderState {
  readonly snapshot: ChatSnapshot
}

export class ChatSessionStore {
  private entries: SessionEventLikeEntry[] = []
  private readonly listeners = new Set<() => void>()
  private state: ChatRenderState = { snapshot: EMPTY_CHAT_SNAPSHOT }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): ChatRenderState => this.state

  /** 载入持久事件窗口（整窗替换）。 */
  seedWindow(events: readonly SessionEvent[]): void {
    this.entries = events.map(event => ({ type: 'event' as const, event }))
    this.publish()
  }

  /** 追加一条持久事件（SDK 接线后由 session.event 流驱动）。 */
  appendEvent(event: SessionEvent): void {
    this.entries.push({ type: 'event', event })
    this.publish()
  }

  /** 追加一条流式瞬态（assistant/live-chunk）。 */
  appendTransient(event: AssistantLiveChunkEvent): void {
    this.entries.push({ type: 'transient', event })
    this.publish()
  }

  /** 本地提交回声：M1 静态阶段把用户消息折叠进窗口（SDK 接线前无真实回包）。 */
  submit(text: string): void {
    let maxSeq = 0
    for (const entry of this.entries) {
      if (entry.type === 'event') maxSeq = Math.max(maxSeq, entry.event.seq as number)
    }
    const next = maxSeq + 1
    this.appendEvent({
      type: 'user/message',
      seq: next as SessionSeq,
      time: Date.now(),
      data: {
        id: `local-${next}` as MessageId,
        role: 'user',
        content: [{ type: 'text', text }],
        source: { kind: 'user' },
      },
      surfaceOp: 'append',
    } as SessionEvent)
  }

  private publish(): void {
    this.state = { snapshot: foldChatSnapshot(this.entries) }
    notifySubscribers(this.listeners, 'chat-session-store')
  }
}
