// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/contract/slots.ts
// （ui-slots 的 PropsRuntime/PropsRenderSlots/PropsStore/InjectFace 组合面收敛为
// 显式接口：壳层只需提供这里列出的成员；declare module 合并全部剥离。）

import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives'
import type { CommandNode, MessageImageLoader, MessageImageSource, SessionId, SessionSeq } from '../vendor-types.ts'
import type { ChatConversationViewNode, ChatNode, ChatNodeKind } from './chat-nodes.ts'
import type {
  ChatNodeProcessSource, ChatNodeSource, ChatSnapshot, ChatTurnProcessPresentation,
} from './snapshot.ts'
import type { TurnProcessSpec } from './turn-process.ts'
import type { ToolCallId } from './store.ts'
import type { ChatTranslate } from '../locale/chat.ts'

/** 当前 Conversation 绑定 Chat 目标上的选择器 hook 面（壳可自行实现或省略）。 */
export type UseChat = (<S>(selector: (snapshot: ChatSnapshot) => S) => S) & {
  (selector: (snapshot: ChatSnapshot) => ChatSnapshot): ChatSnapshot
}

/** 一个 Chat Node 的 per-key 选择器 hook 面。 */
export type UseChatNode = (key: string) => ChatConversationViewNode | undefined

/** 一个 Chat Node 的 Turn-process 呈现 per-key 选择器 hook 面。 */
export type UseChatNodeProcess = (key: string) => ChatTurnProcessPresentation | undefined

/** 打开文件时的落点。 */
export interface OpenFileOptions {
  /** 要揭示的 1-based 行；缺省 = 文件开头。 */
  readonly line?: number
}

/** 完成轮扩展链的 owner 货币。 */
export interface TurnTailOwnerProps {
  turn: number
  seq: number
  openFile: (path: string) => void
}

/** 落定 Assistant 动作的 owner 货币。 */
export interface AssistantActionOwnerProps {
  messageId: string
}

/** Chat 可选的散文文件提及提供者。 */
export interface ChatFileMentions {
  forClosing(owner: TurnTailOwnerProps, sessionId: SessionId): MarkdownFileMentions | undefined
}

/** 键控 Chat 渲染器收到的稳定 owner 货币。 */
export interface ChatNodeOwnerProps {
  cwd?: string | undefined
  /** 打开消息引用的技能源文件。 */
  openSkill: (name: string) => void
  openFile: (path: string, options?: OpenFileOptions) => void
  inspectCall: (callId: ToolCallId) => void
  forkAt: (seq: number) => void
  /**
   * 会话授权的图片加载器，由 Chat 视图下穿，chat-node 渲染器可凭持久引用
   * 直接渲染附件呈现插槽。
   */
  loadImage: MessageImageLoader
  renderMessageImages: RenderMessageImages
  fileMentions: (owner: TurnTailOwnerProps) => MarkdownFileMentions | undefined
  /** 节点属于投影轮过程时的过程状态。 */
  turnProcess?: TurnProcessOwnerProps | undefined
}

/** 图片渲染闭包：按 owner 供给渲染一组持久/预览图片（收敛自 ui-conversation 的 RenderMessageImages）。 */
export type RenderMessageImages = (owner: {
  readonly images: readonly MessageImageSource[]
  readonly align: 'start' | 'end'
  readonly compact?: boolean
}) => React.ReactNode

/** 一个轮过程回答生成的共享呈现状态。 */
export interface TurnProcessOwnerProps {
  readonly spec: TurnProcessSpec
  readonly foldable: boolean
  readonly open: boolean
  setOpen(open: boolean): void
}

/** 一个键控 Chat 渲染器的完整 props（收敛自 PropsRuntime<'conversation.chat.node', Kind> & PropsLocale<'chat'>）。 */
export type ChatNodeViewProps<Kind extends ChatNodeKind = ChatNodeKind> =
  ChatNodeOwnerProps & ChatNodeRuntimeShare & {
    node: ChatNode<Kind>
    t: ChatTranslate
  }

/** 壳层以纯 props 供应的运行时份额（原由框架注入）。 */
export interface ChatNodeRuntimeShare {
  sessionId: string
}

/** 指令行 owner 份额（node 对齐源契约的 conversation 记录 CommandNode，与 ManualCompactionChatData.command 同形）。 */
export interface CommandRowOwnerProps {
  node: CommandNode
  compaction?: import('../vendor-types.ts').CompactionSummaryNode
}

/** 键控指令行的完整 props。 */
export type CommandRowProps = CommandRowOwnerProps & ChatNodeRuntimeShare & { t: ChatTranslate }

/** 滚动位置恢复用的稳定读者位置。 */
export interface ChatScrollPosition {
  readonly anchorKey: string
  readonly anchorTop: number
  readonly scrollTop: number
}

/** 注入 Chat 视图的业务回调（壳按需提供）。 */
export interface ChatViewInjected {
  keyedHooks: {
    chatNode: (key: string) => ChatNodeSource
    chatNodeProcess: (key: string) => ChatNodeProcessSource
  }
  openSkill: (name: string) => void
  openFile: (path: string, options?: OpenFileOptions) => Promise<void>
  loadOlder: () => void
  /** 跳转加载器：按 seq 向前翻页；窗口覆盖它时 resolve。 */
  loadThrough: (seq: SessionSeq) => Promise<void>
  loadImage: MessageImageLoader
  chatScroll: {
    save: (position: ChatScrollPosition | null) => void
    read: () => ChatScrollPosition | null
  }
  forkAt: (seq: number) => void
  fileMentions: (owner: TurnTailOwnerProps) => MarkdownFileMentions | undefined
}

/** Chat 视图的完整 props（收敛自 ChatViewSlotProps；壳以纯 props 组装）。 */
export type ChatViewSlotProps = ChatNodeOwnerProps & ChatViewInjected & {
  t: ChatTranslate
}
