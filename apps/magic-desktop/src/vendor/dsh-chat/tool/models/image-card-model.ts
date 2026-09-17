// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/models/image-card-model.ts

import type { AttachmentId, ImageAttachmentRef, ImageMediaType } from '../../vendor-types.ts'
import { abbreviateHomePath, relativizeToCwd } from '../../vendor-types.ts'
import type { ToolCallBlock } from './tool-call-model.ts'
import { parsedToolCall } from './raw-tool-call.ts'

/** 一次落定调用贡献的图片卡片材料：展示标签加持久引用。 */
export interface ImageCardModel {
  label: string
  images: readonly { readonly attachment: ImageAttachmentRef }[]
  text: string
}

/** 该卡片读取的持久 `presentationMeta`：仅已解析展示路径。 */
interface ImageMeta {
  path: string
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

/** `formatImageReadOutput` 写出的信封，按形状匹配。 */
const IMAGE_ENVELOPE = /^<path>[^\n]*<\/path>\n<type>image<\/type>\n<content>\n[\s\S]*\n<\/content>$/u

const IMAGE_MEDIA_TYPES: ReadonlySet<ImageMediaType> = new Set([
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
])

function isImageMediaType(value: string): value is ImageMediaType {
  return IMAGE_MEDIA_TYPES.has(value as ImageMediaType)
}

/** 防御性收窄持久元数据。 */
function imageMeta(meta: unknown): ImageMeta | null {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return null
  const { path } = meta as Record<string, unknown>
  if (typeof path !== 'string' || path === '') return null
  return { path }
}

/** 按顺序收窄结果图片块携带的每个附件引用。 */
function imageReferences(content: readonly unknown[]): ImageAttachmentRef[] | null {
  const refs: ImageAttachmentRef[] = []
  for (const part of content) {
    if (typeof part !== 'object' || part === null) continue
    const { type, attachment } = part as { type?: unknown; attachment?: unknown }
    if (type !== 'image') continue
    if (typeof attachment !== 'object' || attachment === null || Array.isArray(attachment)) return null
    const {
      attachmentId, mediaType, bytes, width, height, name, originalDimensions,
    } = attachment as Record<string, unknown>
    if (typeof attachmentId !== 'string' || attachmentId === '') return null
    if (typeof mediaType !== 'string' || !isImageMediaType(mediaType)) return null
    if (!positiveInteger(bytes) || !positiveInteger(width) || !positiveInteger(height)) return null
    if (name !== undefined && typeof name !== 'string') return null
    let inputDimensions: ImageAttachmentRef['originalDimensions'] | undefined
    if (originalDimensions !== undefined) {
      if (typeof originalDimensions !== 'object' || originalDimensions === null || Array.isArray(originalDimensions)) return null
      const { width: inputWidth, height: inputHeight } = originalDimensions as Record<string, unknown>
      if (!positiveInteger(inputWidth) || !positiveInteger(inputHeight)) return null
      inputDimensions = { width: inputWidth, height: inputHeight }
    }
    refs.push({
      attachmentId: attachmentId as AttachmentId,
      mediaType,
      bytes,
      width,
      height,
      ...name === undefined ? {} : { name },
      ...inputDimensions === undefined ? {} : { originalDimensions: inputDimensions },
    })
  }
  return refs.length > 0 ? refs : null
}

/** 读取落定图片结果每个文本块的文本，按序连接。 */
function imageTexts(content: readonly { type: string; text?: string }[]): string | null {
  const parts: string[] = []
  let sawEnvelope = false
  for (const part of content) {
    if (part.type !== 'text' || typeof part.text !== 'string') continue
    if (IMAGE_ENVELOPE.test(part.text)) sawEnvelope = true
    parts.push(part.text)
  }
  return sawEnvelope && parts.length > 0 ? parts.join('\n') : null
}

/** 内容是否只携带卡片消费的块。 */
function fullyRendered(content: readonly unknown[]): boolean {
  return content.every((part) => {
    if (typeof part !== 'object' || part === null) return false
    const { type, text } = part as { type?: unknown; text?: unknown }
    return type === 'image' || (type === 'text' && typeof text === 'string')
  })
}

/** 校验调用头、持久元数据与图片信封后推导落定图片卡片。 */
export function imageCardModel(
  block: ToolCallBlock,
  sessionCwd?: string,
  home?: string,
): ImageCardModel | null {
  if (!('kind' in block) || block.isError) return null
  const call = parsedToolCall(block)
  if (call?.name !== 'read_image') return null
  const { file_path: filePath } = call.args
  if (typeof filePath !== 'string' || filePath.trim() === '') return null
  const metaPath = imageMeta(block.meta)?.path
  const path = metaPath ?? (block.parentCallId !== undefined ? filePath : null)
  if (path === null) return null
  if (!fullyRendered(block.content)) return null
  const refs = imageReferences(block.content)
  if (refs === null) return null
  const text = imageTexts(block.content)
  if (text === null) return null
  return {
    label: abbreviateHomePath(relativizeToCwd(path, sessionCwd), home),
    images: refs.map(ref => ({ attachment: ref })),
    text,
  }
}
