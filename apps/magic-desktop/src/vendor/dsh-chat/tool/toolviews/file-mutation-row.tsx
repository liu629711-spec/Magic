// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/toolviews/file-mutation-row.tsx
// （剥离注册壳：fileMutationToolview 的 ctx.slots.inject + register 生成器整体
// 移除，仅保留 FileMutationRow 卡片本体。）

import { IconEditOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '../slots.ts'
import { diffCardModel } from '../models/diff-card-model.ts'
import { toolRowModel } from '../models/tool-call-model.ts'
import { ToolRow } from '../components/ToolRow.tsx'

/**
 * Lets users expand an applied file diff and open the reported path.
 */
export function FileMutationRow({ toolName, block, cwd, home, openFile, inspect, t }: ToolCallViewProps) {
  const model = toolRowModel(toolName, block, cwd, home)
  const diff = diffCardModel(block)
  return (
    <ToolRow
      t={t}
      variant={model.variant}
      toolName={toolName}
      icon={<IconEditOutline16 size={14} />}
      title={t(model.titleKey)}
      summary={model.summary}
      output={model.output}
      errorSummary={model.errorSummary}
      diff={diff}
      state={model.state}
      filePath={model.filePath}
      onOpenFile={openFile}
      inspect={inspect}
    />
  )
}
