// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/toolviews/read-family-row.tsx
// （共享组装；本文件原本无注册壳。）

// Shared assembly for the read-family toolview rows (`read`, `read_image`).

import type { ReactNode } from 'react'
import { IconBrowseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '../slots.ts'
import { toolRowModel } from '../models/tool-call-model.ts'
import { ToolRow, type ToolRowProps } from '../components/ToolRow.tsx'

/** read-family toolview 行的完整行 props：运行时份额加 locale 座位。 */
export type ReadFamilyRowProps = ToolCallViewProps

/** read_image 行 props：运行时份额、声明的图片子插槽与 locale 座位。 */
export type ReadImageRowProps = ReadFamilyRowProps & {
  /** `tool.call.images` 画廊分发（原为框架 renderSlot；本地收敛为纯 prop）。 */
  renderSlot?: ((slot: 'tool.call.images', owner: { images: readonly import('../../vendor-types.ts').MessageImageSource[]; loadImage: import('../../vendor-types.ts').MessageImageLoader; align: 'start' | 'end' }) => React.ReactNode) | undefined
}

/** 一个 read-family 行贡献的卡片材料。 */
export type ReadFamilyCard = Pick<ToolRowProps, 'read' | 'image' | 'renderSlot' | 'loadImage' | 'filePathLine'>

/** 组装一个 read-family 行：共享 chrome 与模型推导字段，加调用者的卡片材料。 */
export function readFamilyRow(
  { toolName, block, cwd, home, openFile, inspect, t }: ReadFamilyRowProps,
  card: ReadFamilyCard,
): ReactNode {
  const model = toolRowModel(toolName, block, cwd, home)
  return (
    <ToolRow
      t={t}
      variant={model.variant}
      toolName={toolName}
      icon={<IconBrowseOutline16 size={14} />}
      title={t(model.titleKey)}
      summary={model.summary}
      bodyRaw={null}
      output={model.output}
      errorSummary={model.errorSummary}
      {...card}
      state={model.state}
      filePath={model.filePath}
      onOpenFile={openFile}
      inspect={inspect}
    />
  )
}
