/**
 * Magic local patch (2026-09-13): in-file comment cards for the markdown
 * preview. Comments captured through the sidenote file-notes bridge render
 * as bordered cards directly under the tightest block containing the quoted
 * text (Codex-style), deletable in place. The layer only lives while a
 * preview surface is mounted (edit mode idles); a MutationObserver re-anchors
 * cards when the host re-renders the preview, and store changes re-scan via
 * the bridge subscription. All styling is inline (local patch, no css-module
 * churn); the delete label rides the shared locale.
 * @module better-sidebar/file-comment-cards
 */
import { relativeTo } from './paths.ts'
import { buildCommentCardDom } from './comment-dom.ts'

/** Structural mirror of sidenote's FileNotesBridge (window contract). */
export interface SidenoteFileNotes {
  add(sessionId: string, seed: { kind: 'snippet' | 'comment'; header: string; quote: string; note?: string }): void
  list(sessionId: string): readonly FileNoteItem[]
  remove(sessionId: string, id: number): void
  subscribe(fn: () => void): () => void
}

export interface FileNoteItem {
  readonly id: number
  readonly kind: 'snippet' | 'comment'
  readonly header: string
  readonly quote: string
  readonly note?: string
  readonly sent?: boolean
}

/** Read sidenote's file-notes bridge; null when dsh-sidenote is not loaded. */
export function sidenoteFileNotes(): SidenoteFileNotes | null {
  const candidate = (window as unknown as Record<string, unknown>).__dshSidenoteFileNotes
  if (typeof candidate !== 'object' || candidate === null) return null
  const bridge = candidate as Partial<SidenoteFileNotes>
  return typeof bridge.add === 'function' && typeof bridge.list === 'function'
    && typeof bridge.remove === 'function' && typeof bridge.subscribe === 'function'
    ? (candidate as SidenoteFileNotes)
    : null
}

const CARD_FLAG = 'data-dsh-file-comment'

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/** The file part of a note header `rel[:start[-end]]`. */
function filePartOf(header: string): string {
  const at = header.indexOf(':')
  return at === -1 ? header : header.slice(0, at)
}

/** The tightest block element whose text contains the quoted text. */
export function findAnchorBlock(surface: HTMLElement, quote: string): Element | null {
  const needle = normalize(quote).slice(0, 80)
  if (needle === '') return null
  let best: Element | null = null
  let bestLength = Number.POSITIVE_INFINITY
  for (const block of surface.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, pre, blockquote, td')) {
    const length = normalize(block.textContent ?? '').length
    if (length < needle.length) continue
    if (!normalize(block.textContent ?? '').includes(needle)) continue
    if (length < bestLength) {
      best = block
      bestLength = length
    }
  }
  return best
}

function commentIdentity(item: FileNoteItem): string {
  return `${item.header}\0${item.quote}\0${item.note ?? ''}`
}

function isSavedCommentCard(node: Element): boolean {
  if (node.classList.contains('dsh-file-comment-editor') || node.querySelector('textarea') !== null) return false
  if (node.hasAttribute(CARD_FLAG) || node.classList.contains('dsh-file-comment-card')) return true
  // Legacy unflagged cards from the duplicate-insert bug: avatar row + 删除, no textarea.
  const text = node.textContent ?? ''
  return text.includes('本地评论') && text.includes('删除')
}

function commentsForFile(items: readonly FileNoteItem[], rel: string): FileNoteItem[] {
  const wanted: FileNoteItem[] = []
  const seen = new Set<string>()
  for (const item of items) {
    if (item.kind !== 'comment' || filePartOf(item.header) !== rel) continue
    const key = commentIdentity(item)
    if (seen.has(key)) continue
    seen.add(key)
    wanted.push(item)
  }
  return wanted
}

function buildCard(item: FileNoteItem, remove: (id: number) => void, cwd: string | undefined, path: string): HTMLElement {
  const rel = cwd !== undefined ? relativeTo(cwd, path) : path
  const lineMatch = /:(\d+)/.exec(item.header)
  const line = lineMatch !== null && item.header.slice(0, lineMatch.index) === rel ? Number(lineMatch[1]) : undefined
  const card = buildCommentCardDom({
    line,
    note: item.note ?? '',
    deletable: true,
    onDelete: () => { remove(item.id) },
  })
  // The rescan layer keys cards by this flag. Without it, MutationObserver
  // re-inserts a new card on every preview mutation (the duplicate-card bug).
  card.setAttribute(CARD_FLAG, String(item.id))
  return card
}

export interface FileCommentCardsOptions {
  getSessionId(): string
  getPath(): string
  getCwd(): string | undefined
  /** The preview container (cards inject into it); null/idle = no-op. */
  getSurface(): HTMLElement | null
}

/**
 * Mount the card layer for one editor tab. Returns the disposer (cards
 * removed, observer disconnected, store unsubscribed).
 */
export function mountFileCommentCards(bridge: SidenoteFileNotes, opts: FileCommentCardsOptions): () => void {
  let timer = 0

  const removeAll = (): void => {
    for (const card of Array.from(document.querySelectorAll(`[${CARD_FLAG}], .dsh-file-comment-card`))) card.remove()
  }

  const rescan = (): void => {
    const surface = opts.getSurface()
    const sessionId = opts.getSessionId()
    const cwd = opts.getCwd()
    const rel = cwd !== undefined ? relativeTo(cwd, opts.getPath()) : opts.getPath()
    if (surface === null || sessionId === '' || rel === '') { removeAll(); return }
    const wanted = commentsForFile(bridge.list(sessionId), rel)
    const wantedIds = new Set(wanted.map(item => String(item.id)))
    // Drop stale/mis-anchored cards (quote edited away, file switched back, …).
    for (const card of Array.from(surface.querySelectorAll(`[${CARD_FLAG}]`))) {
      const id = card.getAttribute(CARD_FLAG)
      const item = id !== null ? wanted.find(entry => String(entry.id) === id) : undefined
      const anchor = item !== undefined ? findAnchorBlock(surface, item.quote) : null
      const stillValid = item !== undefined && anchor !== null
        && (anchor.nextElementSibling === card || anchor.contains(card) || card.previousElementSibling === anchor)
      if (!stillValid) card.remove()
    }
    for (const item of wanted) {
      const anchor = findAnchorBlock(surface, item.quote)
      if (anchor === null) continue
      // Collapse leftover copies sitting after this block — unflagged legacy
      // cards from the duplicate-insert bug, plus extras that are not in the
      // unique wanted set. Keep other live comments that share the same block.
      let sibling = anchor.nextElementSibling
      while (sibling !== null && isSavedCommentCard(sibling)) {
        const next = sibling.nextElementSibling
        const id = sibling.getAttribute(CARD_FLAG)
        if (id !== null && wantedIds.has(id)) {
          sibling = next
          continue
        }
        sibling.remove()
        sibling = next
      }
      if (surface.querySelector(`[${CARD_FLAG}="${item.id}"]`) !== null) continue
      anchor.after(buildCard(item, id => { bridge.remove(sessionId, id) }, cwd, opts.getPath()))
    }
  }

  const debounced = (): void => {
    if (timer !== 0) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      timer = 0
      try { rescan() } catch (error) {
        console.warn('[dsh-better-sidebar] 文件评论卡重锚失败（本轮跳过）:', error)
      }
    }, 100)
  }

  const observer = new MutationObserver(debounced)
  const offSubscribe = bridge.subscribe(debounced)

  const attach = (): void => {
    const surface = opts.getSurface()
    if (surface !== null) observer.observe(surface, { childList: true, subtree: true, characterData: true })
  }
  attach()
  debounced()

  return () => {
    window.clearTimeout(timer)
    observer.disconnect()
    offSubscribe()
    removeAll()
  }
}
