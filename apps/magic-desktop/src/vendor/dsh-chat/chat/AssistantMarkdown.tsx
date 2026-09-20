// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/AssistantMarkdown.tsx

import { Fragment, memo, useMemo } from 'react'
import type { ReactNode } from 'react'
import { JsonBlock, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import type { MarkdownFileMentions, MarkdownPathImages } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatNodeOwnerProps, ChatViewSlotProps } from '../contract/slots.ts'
import type { AssistantBlock } from '../vendor-types.ts'
import { markdownLabels } from '../markdown-labels.ts'
import { MagicReasoningRow } from '../../../conversation/MagicReasoningRow.tsx'
import { useSearchableHidden } from './searchable-hidden.ts'
import css from './AssistantMarkdown.module.css'

/** 把一个作者书写的媒体目标映射到同源工作区文件 URL。 */
export function localPathMediaUrl(protocol: string, origin: string, value: string): string | undefined {
  if (protocol !== 'http:' && protocol !== 'https:') return undefined
  if (value.length === 0 || !value.startsWith('/') || value.startsWith('//')) return undefined
  return `${origin}/api/file?path=${encodeURIComponent(value)}`
}

export interface AssistantMarkdownProps {
  blocks: readonly AssistantBlock[]
  streaming: boolean
  /** 中止轮的冻结部分：带停止标记渲染。 */
  interrupted?: boolean | undefined
  /** 经附件插槽渲染连续图片块。 */
  renderMessageImages: ChatNodeOwnerProps['renderMessageImages']
  /** 隐藏属于轮级过程披露的推理。 */
  reasoningHidden?: boolean | undefined
  /** 展开所属的轮级过程披露。 */
  revealProcess?: (() => void) | undefined
  /** 该 Assistant 收尾轮已解析的散文文件提及。 */
  mentions?: MarkdownFileMentions | undefined
  /** 所属视图的 locale 座位，按纯 prop 下传。 */
  t: ChatViewSlotProps['t']
}

/**
 * 剥离文本块里内联的 `<think>…</think>` 段（部分模型/中转把思考以字面标签混在
 * 正文里，官方折叠层只认 kind:'reasoning' 块）：think 段转为独立 reasoning 块
 * （Think 折叠行呈现），残留的孤立 `</think>` 字面量清除——否则思考全文以
 * 不可见形态占位（消息区大片空白）且闭合标签原样泄漏到正文。
 * 未闭合的 `<think>`（流式进行中）视为思考持续到文本尾。
 */
function normalizeThinkBlocks(blocks: readonly AssistantBlock[]): readonly AssistantBlock[] {
  const hasThink = blocks.some(
    block => block.kind === 'text' && (block.text.includes('<think>') || block.text.includes('</think>')),
  )
  if (!hasThink) return blocks
  const out: AssistantBlock[] = []
  for (const block of blocks) {
    if (block.kind !== 'text') {
      out.push(block)
      continue
    }
    const text = block.text
    let cursor = 0
    while (cursor < text.length) {
      const open = text.indexOf('<think>', cursor)
      if (open === -1) break
      const head = text.slice(cursor, open)
      if (head.replace(/<\/think>/g, '').trim() !== '') {
        out.push({ kind: 'text', text: head.replace(/<\/think>/g, '') })
      }
      const close = text.indexOf('</think>', open + 7)
      if (close === -1) {
        const body = text.slice(open + 7)
        if (body.trim() !== '') out.push({ kind: 'reasoning', text: body.trim() })
        cursor = text.length
      } else {
        const body = text.slice(open + 7, close)
        if (body.trim() !== '') out.push({ kind: 'reasoning', text: body.trim() })
        cursor = close + 8
      }
    }
    const tail = text.slice(cursor).replace(/<\/think>/g, '')
    if (tail.trim() !== '') out.push({ kind: 'text', text: tail })
  }
  return out
}

export const AssistantMarkdown = memo(function AssistantMarkdown({
  blocks, streaming, interrupted, renderMessageImages,
  reasoningHidden = false, revealProcess, mentions, t,
}: AssistantMarkdownProps) {
  // Stable per locale revision (t identity changes on switch): a fresh object
  // per render would rebuild MarkdownText's component table every chunk.
  const labels = useMemo(() => markdownLabels(t), [t])
  // Local media paths in the closing prose rewrite to the same-origin file
  // API (policy re-validation lives host-side). The vocabulary identity is
  // stable per page load because MarkdownText memoizes on it.
  const pathImages = useMemo<MarkdownPathImages>(() => {
    const { protocol, origin } = window.location
    return { resolve: value => localPathMediaUrl(protocol, origin, value) }
  }, [])
  // <think> 内联段剥离（见 normalizeThinkBlocks）：blocks 引用随折叠快照重建，
  // memo 保持幂等输入不重算。
  const displayBlocks = useMemo(() => normalizeThinkBlocks(blocks), [blocks])
  const last = displayBlocks.length - 1
  // Tool-call heads render as tool rows in the chat view's grouping pass, so
  // a node that is only those heads (or empty) would paint an empty root
  // between tool groups — skip the shell unless something visible remains.
  const hasVisible = streaming
    || interrupted === true
    || displayBlocks.some(block => block.kind !== 'tool-call')
  if (!hasVisible) return null
  const rendered: ReactNode[] = []
  for (let i = 0; i < displayBlocks.length; i++) {
    const block = displayBlocks[i]
    if (block === undefined) continue
    switch (block.kind) {
      case 'text':
        rendered.push(
          <MarkdownText
            key={i}
            text={block.text}
            streaming={streaming}
            labels={labels}
            fileMentions={mentions}
            pathImages={pathImages}
          />,
        )
        break
      case 'reasoning':
        rendered.push(
          <ProcessReasoning
            key={i}
            hidden={reasoningHidden}
            reveal={revealProcess}
          >
            <MagicReasoningRow text={block.text} running={streaming && i === last} t={t} />
          </ProcessReasoning>,
        )
        break
      case 'image': {
        // Consecutive image blocks share one gallery so several images tile
        // into rows instead of each opening a one-image group of its own.
        // Keyed by the group's FIRST block index: a streaming append that
        // extends the group then only grows `images` instead of remounting
        // the gallery under a shifted key.
        const start = i
        const group = [block]
        while (i + 1 < displayBlocks.length) {
          const next = displayBlocks[i + 1]
          if (next === undefined || next.kind !== 'image') break
          group.push(next)
          i += 1
        }
        rendered.push(
          <Fragment key={start}>
            {renderMessageImages({
              images: group.map(({ attachment }) => ({ attachment })),
              align: 'start',
            })}
          </Fragment>,
        )
        break
      }
      // Grouped into tool rows by ChatView; hasVisible above skips an empty shell.
      case 'tool-call':
        break
      default:
        rendered.push(
          <JsonBlock
            key={i}
            label={t('message.unknownBlock')}
            payload={block.block}
            truncatedLabel={total => t('json.truncated', { total })}
          />,
        )
    }
  }
  return (
    <div className={css.root} data-streaming={streaming || undefined}>
      <div className={css.body}>
        {rendered}
        {interrupted && <span className={css.stopped}>{t('message.stopped')}</span>}
      </div>
      {/* 完成态操作行（复制/分叉/时间）由轮尾 TurnTailNodeView 的
          MessageIconActions 提供（DSH 原生，用户验收基准）；此处不再重复挂载。 */}
    </div>
  )
})

function ProcessReasoning({ hidden, reveal, children }: {
  hidden: boolean
  reveal?: (() => void) | undefined
  children: ReactNode
}) {
  const ref = useSearchableHidden(hidden, reveal ?? NOOP)
  return <div ref={ref} data-turn-process-inline={hidden || undefined}>{children}</div>
}

const NOOP = (): void => {}
