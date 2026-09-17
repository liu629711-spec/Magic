// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/toolviews/search-row.tsx
// （剥离注册壳：searchToolview 的 ctx.slots.inject + register 生成器整体移除，
// 仅保留 SearchRow 卡片本体。）

import { IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '../slots.ts'
import { searchCardModel } from '../models/search-card-model.ts'
import { toolRowModel } from '../models/tool-call-model.ts'
import { ToolRow } from '../components/ToolRow.tsx'

const SEARCH_TITLE_KEYS = {
  grep: 'tool.title.grep',
  glob: 'tool.title.glob',
} as const

/** Lets users expand grep or glob results and recover capped searches. */
export function SearchRow({ toolName, block, inspect, t }: ToolCallViewProps) {
  const model = toolRowModel(toolName, block)
  const search = searchCardModel(block)
  return (
    <ToolRow
      t={t}
      variant={model.variant}
      toolName={toolName}
      icon={<IconSearchOutline16 size={14} />}
      title={t(toolName === 'grep'
        ? SEARCH_TITLE_KEYS.grep
        : toolName === 'glob' ? SEARCH_TITLE_KEYS.glob : model.titleKey)}
      summary={model.summary}
      output={model.output}
      errorSummary={model.errorSummary}
      search={search}
      state={model.state}
      inspect={inspect}
    />
  )
}
