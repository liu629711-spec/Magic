// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/components/ToolRow.tsx

import { useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import {
  CodeBlock, DiffBlock, DisclosureRow, IconInspectOutline12, ReadBlock, SearchBlock, StateDot, TerminalBlock, WebBlock,
  diffTotals,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { OpenFileOptions } from '../../contract/slots.ts'
import type { MessageImageLoader } from '../../vendor-types.ts'
import type { PropsRenderSlots } from '../../vendor-types.ts'
import { CHAT_DIFF_MAX_LINES, type DiffCardModel } from '../models/diff-card-model.ts'
import { CHAT_READ_MAX_LINES, type ReadCardModel } from '../models/read-card-model.ts'
import type { ImageCardModel } from '../models/image-card-model.ts'
import { CHAT_SEARCH_MAX_LINES, type SearchCardModel } from '../models/search-card-model.ts'
import {
  localizeTerminalCardModel, terminalBlockLabels, type TerminalCardModel,
} from '../models/terminal-card-model.ts'
import {
  diffBlockLabels, readBlockLabels, searchBlockLabels, webBlockLabels,
} from '../models/primitive-labels.ts'
import type { AskQuestionCardModel } from '../models/ask-question-card-model.ts'
import {
  formatToolBody, type ToolRowState, type ToolRowVariant,
} from '../models/tool-call-model.ts'
import type { WebCardModelProps } from '../models/web-card-model.ts'
import { AskQuestionCard } from './AskQuestionCard.tsx'
import type { ConversationTranslate } from '../../locale/conversation.ts'
import css from './ToolRow.module.css'

export interface ToolRowProps {
  t: ConversationTranslate
  variant: ToolRowVariant
  /** 叠在泛型变体之上的工具自有样式的 wire 工具名。 */
  toolName?: string | undefined
  icon: ReactNode
  title: string
  summary: string
  /** 在省略号摘要文本之外渲染的尾部摘要片段。 */
  summarySuffix?: string | null | undefined
  /** 仅在行展开时格式化的原始参数 JSON。 */
  bodyRaw?: string | null | undefined
  /** 展开 Output 区的扁平结果文本。 */
  output?: string | null | undefined
  /** ask-user 转录卡；卡字段互斥并替换文本区。 */
  askQuestion?: AskQuestionCardModel | null | undefined
  /** 错误行折叠摘要显示的错误首行。 */
  errorSummary?: string | null | undefined
  /** 终端卡；卡字段互斥并替换文本区。 */
  terminal?: TerminalCardModel | null | undefined
  diff?: DiffCardModel | null | undefined
  read?: ReadCardModel | null | undefined
  /** 结果为图片的调用的图片卡材料。 */
  image?: ImageCardModel | null | undefined
  /** 经 tool 拥有的 `tool.call.images` 插槽分发图片画廊。 */
  renderSlot?: PropsRenderSlots<'tool.call.images', { images: readonly import('../../vendor-types.ts').MessageImageSource[]; loadImage: MessageImageLoader; align: 'start' | 'end' }>['renderSlot'] | undefined
  /** 画廊插槽的会话授权图片 URL 加载器。 */
  loadImage?: MessageImageLoader | undefined
  search?: SearchCardModel | null | undefined
  web?: WebCardModelProps | null | undefined
  state: ToolRowState
  /** 工具参数中的文件系统路径。 */
  filePath?: string | undefined
  /** 调用针对的 1-based 行。 */
  filePathLine?: number | undefined
  /** 打开路径（已按 cwd 解析）。 */
  onOpenFile?: ((path: string, options?: OpenFileOptions) => void) | undefined
  /** 展开主体上悬停显现的 Inspect 药丸。 */
  inspect?: (() => void) | undefined
}

function leadingFor(state: ToolRowState, icon: ReactNode): ReactNode {
  switch (state) {
    case 'error': return <StateDot state="error" />
    case 'stopped': return <StateDot state="warning" />
    default: return icon
  }
}

/** 视觉隐藏的运行状态标签。 */
function stateStatus(state: ToolRowState, t: ConversationTranslate): string | null {
  switch (state) {
    case 'running': return t('row.running')
    case 'error': return t('row.failed')
    case 'stopped': return t('row.stopped')
    default: return null
  }
}

export function ToolRow({
  t,
  variant,
  toolName,
  icon,
  title,
  summary,
  summarySuffix,
  bodyRaw,
  output,
  askQuestion,
  errorSummary,
  terminal,
  diff,
  read,
  image,
  renderSlot,
  loadImage,
  search,
  web,
  state,
  filePath,
  filePathLine,
  onOpenFile,
  inspect,
}: ToolRowProps) {
  const [expanded, setExpanded] = useState(false)
  const terminalLabels = useMemo(() => terminalBlockLabels(t), [t])
  const diffLabels = useMemo(() => diffBlockLabels(t), [t])
  const readLabels = useMemo(() => readBlockLabels(t), [t])
  const searchLabels = useMemo(() => searchBlockLabels(t), [t])
  const webLabels = useMemo(() => webBlockLabels(t), [t])
  const terminalBody = terminal === undefined || terminal === null
    ? null
    : localizeTerminalCardModel(terminal, t)
  const diffBody = diff ?? null
  const readBody = read ?? null
  const imageBody = image !== undefined && image !== null && renderSlot !== undefined && loadImage !== undefined
    ? image
    : null
  const searchBody = search ?? null
  const webBody = web ?? null
  const askQuestionBody = askQuestion ?? null
  const outputText = output ?? null
  const card = askQuestionBody ?? terminalBody ?? diffBody ?? readBody ?? imageBody ?? searchBody ?? webBody
  const expandable = bodyRaw != null || outputText !== null || card !== null
  const open = expanded && expandable
  const bodyText = useMemo(
    () => open && card === null && bodyRaw != null ? formatToolBody(variant, bodyRaw) : null,
    [bodyRaw, card, open, variant],
  )
  const status = stateStatus(state, t)
  // A failure must replace, not supplement, the normal summary.
  const failureLine = state === 'error' ? errorSummary ?? null : null
  const summaryText = failureLine ?? terminalBody?.description ?? summary
  const diffStat = useMemo(() => {
    if (diffBody === null) return null
    const { added, removed } = diffTotals(diffBody.card.diffs)
    return `+${added} -${removed}`
  }, [diffBody])
  const suffix = failureLine === null ? summarySuffix ?? diffStat : null
  const fileLink = filePath !== undefined && onOpenFile !== undefined && failureLine === null
  const toggleExpand = () => {
    setExpanded(v => !v)
  }
  const openFile = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (filePath === undefined || onOpenFile === undefined) return
    if (filePathLine === undefined) onOpenFile(filePath)
    else onOpenFile(filePath, { line: filePathLine })
  }
  const fileLinkKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') event.stopPropagation()
  }
  const cardBody = variant === 'code' ? null : bodyText
  return (
    <div className={css.root} data-variant={variant} data-tool={toolName} data-state={state}>
      {status !== null && <span className={css.visuallyHidden}>{status}</span>}
      <DisclosureRow
        // 换肤点（2026-09-17 用户裁定）：关闭 hover 时的 chevron 预览（DSH 原生
        // previewChevron 会把闲置图标交叉淡化为向下箭头，被误读为「已展开」）。
        // 收起态恒显工具图标，点开后由 DisclosureRow 显示向下 chevron。
        previewChevron={false}
        rowClassName={css.row}
        leadingClassName={css.leading}
        titleClassName={css.title}
        chevronClassName={css.chevron}
        icon={leadingFor(state, icon)}
        title={title}
        open={open}
        expandable={expandable}
        expandOnRowClick
        keepContentWhenOpen
        onToggle={toggleExpand}
        collapsedContent={summaryText !== '' && (
          <>
            <span className={css.sep} aria-hidden />
            {fileLink ? (
              <button
                type="button"
                className={css.fileLink}
                onClick={openFile}
                onKeyDown={fileLinkKeyDown}
              >
                {summaryText}
              </button>
            ) : (
              <span
                className={clsx(css.summary, failureLine !== null && css.errorSummary)}
              >
                {summaryText}
              </span>
            )}
            {suffix !== null && (
              <span className={clsx(css.summarySuffix, suffix === diffStat && css.diffStat)}>{suffix}</span>
            )}
          </>
        )}
      >
        <div className={css.bodyWrap}>
          {askQuestionBody !== null
            ? <AskQuestionCard card={askQuestionBody} />
            : terminalBody !== null
              ? (
                <TerminalBlock
                  {...terminalBody.card}
                  maxLines={Infinity}
                  labels={terminalLabels}
                  className={css.terminalBody}
                />
              )
              : diffBody !== null
                ? <DiffBlock {...diffBody.card} labels={diffLabels} maxLines={CHAT_DIFF_MAX_LINES} className={css.diffBody} />
                : readBody !== null
                  ? <ReadBlock {...readBody} labels={readLabels} maxLines={CHAT_READ_MAX_LINES} className={css.readBody} />
                  : imageBody !== null
                    ? (
                      <div className={css.imageBody}>
                        <div className={css.imageLabel}>{imageBody.label}</div>
                        {renderSlot !== undefined && loadImage !== undefined && renderSlot('tool.call.images', {
                          images: imageBody.images,
                          loadImage,
                          align: 'start',
                        })}
                        <div className={css.imageMeta}>{imageBody.text}</div>
                      </div>
                    )
                    : searchBody !== null
                      ? (
                        <>
                          <SearchBlock
                            {...searchBody.card}
                            labels={searchLabels}
                            maxLines={CHAT_SEARCH_MAX_LINES}
                            className={css.searchBody}
                          />
                          {searchBody.recovery !== undefined && (
                            <div className={css.searchRecovery}>{searchBody.recovery}</div>
                          )}
                        </>
                      )
                      : webBody !== null
                        ? <WebBlock {...webBody} labels={webLabels} className={css.webBody} />
                        : (
                          <>
                            {variant === 'code' && bodyText !== null && (
                              <div className={css.bodyScroll}>
                                <CodeBlock code={bodyText} lang="typescript" copyLabel={t('copy')} copiedLabel={t('copied')} className={css.codeBody} />
                              </div>
                            )}
                            {(cardBody !== null || outputText !== null) && (
                              <div className={css.ioCard}>
                                {cardBody !== null && (
                                  <div className={css.ioSection}>
                                    <span className={css.ioLabel}>{t('row.input')}</span>
                                    <span className={css.ioText}>{cardBody}</span>
                                  </div>
                                )}
                                {cardBody !== null && outputText !== null && (
                                  <span className={css.ioDivider} aria-hidden />
                                )}
                                {outputText !== null && (
                                  <div className={css.ioSection}>
                                    <span className={css.ioLabel}>{t('row.output')}</span>
                                    <span className={css.ioText} data-error={state === 'error' || undefined}>
                                      {outputText}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
          {inspect !== undefined && (
            <button
              type="button"
              className={css.inspectButton}
              onClick={inspect}
            >
              <IconInspectOutline12 />
              {t('row.inspect')}
            </button>
          )}
        </div>
      </DisclosureRow>
    </div>
  )
}
