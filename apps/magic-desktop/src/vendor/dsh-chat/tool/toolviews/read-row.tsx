// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/toolviews/read-row.tsx
// （剥离注册壳：readToolview 的 ctx.slots.inject + ctx.slots.register 包裹整体
// 移除，仅保留 ReadRow 卡片本体。）

import type { ToolCallViewProps } from '../slots.ts'
import { readCallLine, readCardModel } from '../models/read-card-model.ts'
import { readFamilyRow } from './read-family-row.tsx'

/**
 * Lets users expand a completed read result and open its reported path at the
 * line the call started from.
 */
export function ReadRow(props: ToolCallViewProps) {
  const { block, cwd, home } = props
  return readFamilyRow(props, {
    read: readCardModel(block, cwd, home),
    filePathLine: readCallLine(block),
  })
}
