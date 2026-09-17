// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/ContextBody.tsx

// Expanded bodies for the context disclosure, one per durable context form.
// The producer declares the form; this module only chooses a presentation for
// it. Every form falls back to OpaqueBody, which is the documented default for
// an absent, unknown, or malformed form.

import type { ReactNode } from 'react'
import { JsonBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import type { ContextChatData } from '../contract/chat-nodes.ts'
import type { KnownContextForm } from '../vendor-types.ts'
import css from './ContextBody.module.css'

/** Model-facing text stays bounded at the disclosure, not at the producer. */
const MAX_CHARS = 20_000

/** Rows a list body materializes before summarizing the remainder. */
const MAX_ENTRIES = 200

type Translate = ChatViewSlotProps['t']

/** One durable source narrowed to the readable-record shape; null for anything else. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

/** One run of the model-facing content: adjacent text, or one unknown block. */
type ContentRun = { text: string } | { block: unknown }

/** The content blocks as runs, IN THE ORDER the model received them. */
function contentRuns(content: ContextChatData['content']): ContentRun[] {
  const runs: ContentRun[] = []
  for (const block of content) {
    if (block.type !== 'text') {
      runs.push({ block })
      continue
    }
    const last = runs[runs.length - 1]
    if (last !== undefined && 'text' in last) last.text += block.text
    else runs.push({ text: block.text })
  }
  return runs
}

/** Only the blocks this UI version does not know, for bodies that replace the text. */
function unknownBlocks(content: ContextChatData['content']): unknown[] {
  return contentRuns(content).flatMap(run => 'block' in run ? [run.block] : [])
}

/** The model-facing text, truncated to the display bound. */
function boundedText(text: string, t: Translate): string {
  return text.length > MAX_CHARS
    ? `${text.slice(0, MAX_CHARS)}\n${t('json.truncated', { total: text.length })}`
    : text
}

/** One source field rendered as a value row; nested shapes stay compact JSON. */
function fieldValue(value: unknown, t: Translate): string {
  const text = typeof value === 'string'
    ? value
    : typeof value === 'number' || typeof value === 'boolean' ? String(value) : JSON.stringify(value)
  return boundedText(text, t)
}

/** Source fields as a key/value list. */
function SourceFields({ source, formRendered, t }: {
  source: unknown
  formRendered: boolean
  t: Translate
}): ReactNode {
  const record = asRecord(source)
  if (record === null) return null
  const hidden = formRendered ? ['kind', 'form'] : ['kind']
  const rows = Object.entries(record).filter(([key]) => !hidden.includes(key))
  if (rows.length === 0) return null
  return (
    <dl className={css.fields} data-context-fields>
      {rows.map(([key, value]) => (
        <div key={key} className={css.field}>
          <dt className={css.fieldKey}>{key}</dt>
          <dd className={css.fieldValue}>{fieldValue(value, t)}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Content blocks this UI version does not know, kept visible rather than dropped. */
function UnknownBlocks({ blocks, t }: { blocks: readonly unknown[]; t: Translate }): ReactNode {
  return (
    <>
      {blocks.map((block, index) => (
        <JsonBlock
          key={index}
          label={t('message.unknownBlock')}
          payload={block}
          truncatedLabel={total => t('json.truncated', { total })}
        />
      ))}
    </>
  )
}

/** The model-facing content of one context, shared by every form that shows it. */
function ModelFacingContent({ content, t }: {
  content: ContextChatData['content']
  t: Translate
}): ReactNode {
  return (
    <>
      {contentRuns(content).map((run, index) => ('text' in run
        ? run.text !== '' && (
          <pre key={index} className={css.text} data-context-text>{boundedText(run.text, t)}</pre>
        )
        : (
          <JsonBlock
            key={index}
            label={t('message.unknownBlock')}
            payload={run.block}
            truncatedLabel={total => t('json.truncated', { total })}
          />
        )))}
    </>
  )
}

/** Default presentation: the model-facing text as text, with the remaining source fields beneath it. */
export function OpaqueBody({ content, source, t }: {
  content: ContextChatData['content']
  source: unknown
  t: Translate
}): ReactNode {
  return (
    <>
      <ModelFacingContent content={content} t={t} />
      <SourceFields source={source} formRendered={false} t={t} />
    </>
  )
}

/** One reconciled instruction file, as the durable source records it. */
interface InstructionChange {
  action: 'set' | 'replace' | 'remove'
  path: string
  digest?: string
}

/** Instruction changes read off the source, or null when the record is not a usable instruction list. */
function instructionChanges(source: unknown): InstructionChange[] | null {
  const record = asRecord(source)
  const list = record === null ? undefined : record['changes']
  if (!Array.isArray(list)) return null
  const changes: InstructionChange[] = []
  const seen = new Set<string>()
  for (const entry of list as readonly unknown[]) {
    const change = asRecord(entry)
    if (change === null) return null
    const path = change['path']
    if (typeof path !== 'string' || path === '') return null
    const action = change['action']
    if (action !== 'set' && action !== 'replace' && action !== 'remove') return null
    const digest = change['digest']
    if (seen.has(path)) continue
    seen.add(path)
    changes.push({ action, path, ...typeof digest === 'string' ? { digest } : {} })
  }
  return changes.length === 0 ? null : changes
}

/** Locale key for one reconciled file. */
function instructionAction(
  action: InstructionChange['action'],
  baseline: boolean,
): 'message.context.instructions.removed' | 'message.context.instructions.loaded'
  | 'message.context.instructions.added' | 'message.context.instructions.updated' {
  if (action === 'remove') return 'message.context.instructions.removed'
  if (baseline) return 'message.context.instructions.loaded'
  return action === 'set' ? 'message.context.instructions.added' : 'message.context.instructions.updated'
}

/** `instructions` form: the files this context reconciled, then their text. */
export function InstructionsBody({ content, source, t }: {
  content: ContextChatData['content']
  source: unknown
  t: Translate
}): ReactNode {
  const changes = instructionChanges(source)
  if (changes === null) return <OpaqueBody content={content} source={source} t={t} />
  const baseline = asRecord(source)?.['baseline'] === true
  return (
    <>
      <ul className={css.files} data-context-files>
        {changes.map(change => (
          <li key={change.path} className={css.file} title={change.digest}>
            <span className={css.filePath}>{change.path}</span>
            <span className={css.fileAction}>
              {t(instructionAction(change.action, baseline))}
            </span>
          </li>
        ))}
      </ul>
      <ModelFacingContent content={content} t={t} />
    </>
  )
}

/** One catalog entry, as the durable source records it. */
interface CatalogEntry {
  name: string
  description: string
}

/** Catalog entries read off the source, or null when the record is not a usable catalog. */
function catalogEntries(source: unknown): CatalogEntry[] | null {
  const record = asRecord(source)
  const list = record === null ? undefined : record['entries']
  if (!Array.isArray(list)) return null
  const entries: CatalogEntry[] = []
  for (const item of list as readonly unknown[]) {
    const entry = asRecord(item)
    if (entry === null) return null
    const name = entry['name']
    const description = entry['description']
    if (typeof name !== 'string' || name === '' || typeof description !== 'string') return null
    entries.push({ name, description })
  }
  return entries
}

/** `catalog` form: the published entries as a list, read from the source. */
export function CatalogBody({ content, source, t }: {
  content: ContextChatData['content']
  source: unknown
  t: Translate
}): ReactNode {
  const entries = catalogEntries(source)
  if (entries === null) return <OpaqueBody content={content} source={source} t={t} />
  const update = asRecord(source)?.['update'] === true
  const shown = entries.slice(0, MAX_ENTRIES)
  const rest = unknownBlocks(content)
  return (
    <>
      {update && <p className={css.catalogNotice} data-context-catalog-update>{t('message.context.catalog.replaced')}</p>}
      <ul className={css.entries} data-context-entries>
        {shown.map((entry, index) => (
          <li key={index} className={css.entry}>
            <code className={css.entryName}>{entry.name}</code>
            <span className={css.entryDescription}>{entry.description}</span>
          </li>
        ))}
      </ul>
      {shown.length < entries.length && (
        <p className={css.catalogNotice} data-context-entries-truncated>
          {t('message.context.catalog.more', { count: entries.length - shown.length })}
        </p>
      )}
      <UnknownBlocks blocks={rest} t={t} />
    </>
  )
}

/** One named contribution to a runtime snapshot, as the durable source records it. */
interface SnapshotSection {
  name: string
  text: string
}

/** Snapshot sections read off the source, or null when the record is unusable. */
function snapshotSections(source: unknown): SnapshotSection[] | null {
  const record = asRecord(source)
  const list = record === null ? undefined : record['sections']
  if (!Array.isArray(list)) return null
  const sections: SnapshotSection[] = []
  for (const item of list as readonly unknown[]) {
    const section = asRecord(item)
    if (section === null) return null
    const name = section['name']
    const text = section['text']
    if (typeof name !== 'string' || name === '' || typeof text !== 'string') return null
    sections.push({ name, text })
  }
  return sections.length === 0 ? null : sections
}

/** `snapshot` form: the named contributions this snapshot assembled, in order. */
export function SnapshotBody({ content, source, t }: {
  content: ContextChatData['content']
  source: unknown
  t: Translate
}): ReactNode {
  const sections = snapshotSections(source)
  if (sections === null) return <OpaqueBody content={content} source={source} t={t} />
  return (
    <>
      <p className={css.catalogNotice} data-context-snapshot-supersedes>
        {t('message.context.snapshot.supersedes')}
      </p>
      <dl className={css.sections} data-context-sections>
        {sections.map((section, index) => (
          <div key={index} className={css.section}>
            <dt className={css.sectionName}>{section.name}</dt>
            <dd className={css.sectionText}>{boundedText(section.text, t)}</dd>
          </div>
        ))}
      </dl>
    </>
  )
}

/** `notice` form: what just happened, with the model-facing text beneath it. */
export function NoticeBody({ content, t }: {
  content: ContextChatData['content']
  source: unknown
  t: Translate
}): ReactNode {
  return <ModelFacingContent content={content} t={t} />
}

/** `relay` form: which agent sent this, then what it said. */
export function RelayBody({ content, source, t }: {
  content: ContextChatData['content']
  source: unknown
  t: Translate
}): ReactNode {
  const sender = relaySender(source)
  if (sender === null) return <OpaqueBody content={content} source={source} t={t} />
  return (
    <>
      <p className={css.relaySender} data-context-relay-sender>
        {t('message.context.relay.from', { session: sender })}
      </p>
      <ModelFacingContent content={content} t={t} />
    </>
  )
}

/** The sending agent's session id, or null when the record does not name one. */
function relaySender(source: unknown): string | null {
  const sender = asRecord(source)?.['senderSessionId']
  return typeof sender === 'string' && sender !== '' ? sender : null
}

/** One recalled session, as the durable source records it. */
interface RecalledSession {
  label: string
  retained: number
  omitted: number
  truncated: boolean
}

/** Recalled sessions read off the source, or null when the record is unusable. */
function recalledSessions(source: unknown): RecalledSession[] | null {
  const record = asRecord(source)
  const list = record === null ? undefined : record['references']
  if (!Array.isArray(list)) return null
  const sessions: RecalledSession[] = []
  for (const item of list as readonly unknown[]) {
    const reference = asRecord(item)
    if (reference === null) return null
    const label = reference['label']
    const retained = reference['retainedMessages']
    const omitted = reference['omittedMessages']
    const truncated = reference['truncated']
    if (typeof label !== 'string' || label === ''
      || typeof retained !== 'number' || typeof omitted !== 'number'
      || typeof truncated !== 'boolean') return null
    sessions.push({ label, retained, omitted, truncated })
  }
  return sessions.length === 0 ? null : sessions
}

/** `recall` form: which sessions this material came from and how much of each survived. */
export function RecallBody({ content, source, t }: {
  content: ContextChatData['content']
  source: unknown
  t: Translate
}): ReactNode {
  const sessions = recalledSessions(source)
  if (sessions === null) return <OpaqueBody content={content} source={source} t={t} />
  return (
    <>
      <ul className={css.recalls} data-context-recalls>
        {sessions.map((session, index) => (
          <li key={index} className={css.recall}>
            <span className={css.recallLabel}>{session.label}</span>
            <span className={css.recallCounts}>
              {t('message.context.recall.counts', {
                retained: session.retained,
                omitted: session.omitted,
              })}
            </span>
            {session.truncated && (
              <span className={css.recallCounts}>{t('message.context.recall.truncated')}</span>
            )}
          </li>
        ))}
      </ul>
      <ModelFacingContent content={content} t={t} />
    </>
  )
}

/** The one-line account a `notice` puts on its collapsed row, when it records one. */
function noticeSummary(source: unknown): string | null {
  const summary = asRecord(source)?.['summary']
  return typeof summary === 'string' && summary !== '' ? summary : null
}

/** 为一个上下文节点选择主体。 */
export function contextBody(
  form: ContextChatData['form'],
  props: { content: ContextChatData['content']; source: unknown; t: Translate },
): { rendered: KnownContextForm | null; summary: string | null; body: ReactNode } {
  const opaque = { rendered: null, summary: null, body: <OpaqueBody {...props} /> }
  switch (form) {
    case 'instructions':
      return instructionChanges(props.source) === null
        ? opaque
        : { rendered: 'instructions', summary: null, body: <InstructionsBody {...props} /> }
    case 'catalog':
      return catalogEntries(props.source) === null
        ? opaque
        : { rendered: 'catalog', summary: null, body: <CatalogBody {...props} /> }
    case 'snapshot':
      return snapshotSections(props.source) === null
        ? opaque
        : { rendered: 'snapshot', summary: null, body: <SnapshotBody {...props} /> }
    case 'notice': {
      const summary = noticeSummary(props.source)
      return summary === null
        ? opaque
        : { rendered: 'notice', summary, body: <NoticeBody {...props} /> }
    }
    case 'relay':
      return relaySender(props.source) === null
        ? opaque
        : { rendered: 'relay', summary: null, body: <RelayBody {...props} /> }
    case 'recall':
      return recalledSessions(props.source) === null
        ? opaque
        : { rendered: 'recall', summary: null, body: <RecallBody {...props} /> }
    case null:
      return opaque
    default: {
      const unreachable: never = form
      throw new Error(`unreachable context form: ${String(unreachable)}`)
    }
  }
}
