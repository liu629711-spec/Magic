// Tool 卡键控分发：toolName → vendored 卡片（注册表对照 ui-tool apply.ts 的
// slots.register 键：read/read_image/grep/glob/edit/write/bash/web_search/
// web_fetch/todo_write/ask_user_question；未命中回退 GenericToolCard）。
import type { ComponentType, ReactNode } from 'react'
import {
  BashRow,
  FileMutationRow,
  ReadImageRow,
  ReadRow,
  SearchRow,
  TodoRow,
  WebRow,
} from '../vendor/dsh-chat/index.ts'
import type { ConversationTranslate } from '../vendor/dsh-chat/index.ts'
import type { ToolCallOwnerProps } from '../vendor/dsh-chat/tool/slots.ts'

type ToolView = ComponentType<ToolCallOwnerProps & { t: ConversationTranslate }>

const TOOL_VIEWS: Readonly<Record<string, ToolView>> = {
  read: ReadRow,
  read_image: ReadImageRow,
  grep: SearchRow,
  glob: SearchRow,
  edit: FileMutationRow,
  write: FileMutationRow,
  bash: BashRow,
  web_search: WebRow,
  web_fetch: WebRow,
  todo_write: TodoRow,
}

/** 造一个 ToolCallTree.renderToolview 分发闭包（未命中返回 undefined 走回退卡）。 */
export function makeRenderToolview(t: ConversationTranslate): (owner: ToolCallOwnerProps) => ReactNode {
  return owner => {
    const View = TOOL_VIEWS[owner.toolName]
    return View === undefined ? undefined : <View {...owner} t={t} />
  }
}
