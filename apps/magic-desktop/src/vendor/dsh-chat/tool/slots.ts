// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/contract/slots.ts
// （剥离 ui-slots 的 declare module 插槽声明；仅保留渲染器用到的 owner 货币与
// props 类型。）

import type { ToolCallBlock } from '../vendor-types.ts'
import type { MessageImageLoader, MessageImageSource } from '../vendor-types.ts'
import type { OpenFileOptions } from '../contract/slots.ts'
import type { ToolCallId } from '../contract/store.ts'
import type { ConversationTranslate } from '../locale/conversation.ts'

/** Tool 图片画廊插槽的 owner 货币：引用加加载器。 */
export interface ToolImagesOwnerProps {
  /** 结果序的持久引用或提交回声预览。 */
  images: readonly MessageImageSource[]
  /** 持久臂使用的会话授权图片 URL 加载器。 */
  loadImage: MessageImageLoader
  /** 所属记录内的水平位置。 */
  align: 'start' | 'end'
}

/** 每个原子 Tool 视图收到的标准 owner 货币。 */
export interface ToolCallOwnerProps {
  /** 跨运行与落定形态保持稳定的 Tool 调用身份。 */
  callId: string
  /** wire Tool 名，也是键控分发值。 */
  toolName: string
  /** 冻结的运行中调用或落定结果节点。 */
  block: ToolCallBlock
  /** 相对路径摘要用的会话工作区根。 */
  cwd?: string | undefined
  /** Host 账户 home；POSIX home 根路径显示为 `~`。 */
  home?: string | undefined
  /** 打开一个 Tool 参数路径。 */
  openFile: (path: string, options?: OpenFileOptions) => void
  /** `tool.call.images` 插槽的会话授权图片加载器。 */
  loadImage: MessageImageLoader
  /** 在轨迹视图中检视该调用（可用时）。 */
  inspect?: (() => void) | undefined
}

/** 键控 Tool 视图渲染器收到的完整 props（收敛自 ToolCallViewProps & PropsLocale<'conversation'>）。 */
export type ToolCallViewProps = ToolCallOwnerProps & {
  t: ConversationTranslate
}

/** 注册为 `tool-call` Chat Node 的 Tool 树渲染器 props（剥离 slots/useHostInfo 注入面）。 */
export interface ToolTreeProps {
  /** tool-call Chat 节点（node.data.root 为根调用块）。 */
  node: import('../contract/chat-nodes.ts').ChatNode<'tool-call'>
  cwd?: string | undefined
  /** Host 账户 home（原经 useHostInfo 注入 hook 读取；本地收敛为纯 prop）。 */
  home?: string | undefined
  openFile: (path: string, options?: OpenFileOptions) => void
  inspectCall: (callId: ToolCallId) => void
  loadImage: MessageImageLoader
  /**
   * 可选的键控 Tool 视图分发（替代框架的 renderSlot('tool.call.toolview')）。
   * 返回 undefined/null 时回退 GenericToolCard。
   */
  renderToolview?: ((owner: ToolCallOwnerProps) => React.ReactNode | null | undefined) | undefined
  t: ConversationTranslate
}
