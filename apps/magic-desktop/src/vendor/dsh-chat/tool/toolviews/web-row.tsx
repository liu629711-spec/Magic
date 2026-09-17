// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/toolviews/web-row.tsx
// （剥离注册壳：webToolview 的 ctx.slots.inject + register 生成器整体移除，
// 仅保留 WebRow 卡片本体。）

import { IconBrowseOutline16, IconGlobeOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '../slots.ts'
import { webCardModel } from '../models/web-card-model.ts'
import { toolRowModel } from '../models/tool-call-model.ts'
import { ToolRow } from '../components/ToolRow.tsx'

const WEB_TITLE_KEYS = {
  web_search: 'tool.title.webSearch',
  web_fetch: 'tool.title.webFetch',
} as const

/** Lets users expand a completed web search or fetch result. */
export function WebRow({ toolName, block, inspect, t }: ToolCallViewProps) {
  const model = toolRowModel(toolName, block)
  const web = webCardModel(block)
  const icon = toolName === 'web_fetch' ? <IconBrowseOutline16 size={14} /> : <IconGlobeOutline14 size={14} />
  return (
    <ToolRow
      t={t}
      variant={model.variant}
      toolName={toolName}
      icon={icon}
      title={t(toolName === 'web_search'
        ? WEB_TITLE_KEYS.web_search
        : toolName === 'web_fetch' ? WEB_TITLE_KEYS.web_fetch : model.titleKey)}
      summary={model.summary}
      output={model.output}
      errorSummary={model.errorSummary}
      web={web}
      state={model.state}
      inspect={inspect}
    />
  )
}
