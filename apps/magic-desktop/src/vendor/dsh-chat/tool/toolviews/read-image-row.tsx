// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/toolviews/read-image-row.tsx
// （剥离注册壳：readImageToolview 的 ctx.slots.inject + register 及其子插槽声明
// 整体移除，仅保留 ReadImageRow 卡片本体；画廊分发经 ReadImageRowProps.renderSlot
// 纯 prop 供应。）

import { imageCardModel } from '../models/image-card-model.ts'
import { readFamilyRow, type ReadImageRowProps } from './read-family-row.tsx'

/**
 * read_image row: the read-family chrome with the durably committed image as the
 * row's collapsed-by-default card body.
 */
export function ReadImageRow(props: ReadImageRowProps) {
  const { block, cwd, home, renderSlot, loadImage } = props
  return readFamilyRow(props, {
    image: imageCardModel(block, cwd, home),
    renderSlot,
    loadImage,
  })
}
