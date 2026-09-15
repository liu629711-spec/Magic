/**
 * Magic local patch (2026-09-13): Codex-style comment DOM builders shared by
 * the CodeMirror widgets (edit mode) and the markdown preview card layer —
 * the user ruled the look must mirror Codex: rounded card, avatar 「你」,
 * right-aligned gray 「第 N 行的本地评论」, no colored bars, gray 注释 button.
 * All styling inline; the module is framework-free.
 * @module better-sidebar/comment-dom
 */

const AVATAR_BG = '#6b7280'

function el<K extends keyof HTMLElementTagNameMap>(tag: K, style: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.style.cssText = style
  if (text !== undefined) node.textContent = text
  return node
}

export interface CommentCardOptions {
  /** 1-based anchor line (displayed as 第 N 行); omitted when unknown. */
  readonly line?: number
  readonly note: string
  readonly deletable: boolean
  readonly onDelete: () => void
}

/** The saved-comment card: avatar row + body + right-aligned 删除. */
export function buildCommentCardDom(options: CommentCardOptions): HTMLElement {
  const card = el('div', 'margin:4px 0 10px;padding:12px 14px;border:1px solid rgba(127,127,127,.28);border-radius:14px;background:var(--dsw-alias-bg-layer-2, #fff);color:inherit;font-size:13px;line-height:1.55')
  card.className = 'dsh-file-comment-card'
  const head = el('div', 'display:flex;align-items:center;gap:8px')
  head.append(
    el('span', `width:22px;height:22px;border-radius:50%;background:${AVATAR_BG};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex:none`, '你'),
    el('span', 'font-weight:600', '你'),
    el('span', 'flex:1'),
    el('span', 'opacity:.6;font-size:12px', options.line !== undefined ? `第 ${options.line} 行的本地评论` : '本地评论'),
  )
  const body = el('div', 'white-space:pre-wrap;word-break:break-word;margin-top:8px', options.note)
  const foot = el('div', 'display:flex;justify-content:flex-end;margin-top:8px')
  if (options.deletable) {
    const del = el('button', 'border:none;background:transparent;color:inherit;opacity:.65;cursor:pointer;font-size:12px;padding:2px 4px', '删除')
    del.type = 'button'
    del.addEventListener('click', () => { options.onDelete() })
    foot.append(del)
  }
  card.append(head, body, foot)
  return card
}

export interface CommentEditorOptions {
  /** 1-based anchor line (displayed as 第 N 行); omitted when unknown. */
  readonly line?: number
  readonly placeholder?: string
  readonly submitLabel?: string
  readonly onSubmit: (note: string) => void
  readonly onCancel: () => void
}

/**
 * The inline comment-input card: avatar row + textarea (placeholder 请求更改)
 * + right-aligned 取消 / 注释. Enter submits, Shift+Enter newlines, IME-safe;
 * key events stop here so the CodeMirror keymap never sees them.
 */
export function buildCommentEditorDom(options: CommentEditorOptions): HTMLElement {
  const box = el('div', 'margin:4px 0 10px;padding:12px 14px;border:1px solid rgba(127,127,127,.28);border-radius:14px;background:var(--dsw-alias-bg-layer-2, #fff);color:inherit;font-size:13px;line-height:1.55')
  box.className = 'dsh-file-comment-editor'
  const head = el('div', 'display:flex;align-items:center;gap:8px')
  head.append(
    el('span', `width:22px;height:22px;border-radius:50%;background:${AVATAR_BG};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex:none`, '你'),
    el('span', 'font-weight:600', '你'),
    el('span', 'flex:1'),
    el('span', 'opacity:.6;font-size:12px', options.line !== undefined ? `第 ${options.line} 行的本地评论` : '本地评论'),
  )
  const ta = el('textarea', 'width:100%;box-sizing:border-box;height:52px;margin-top:8px;font-size:13px;font-family:inherit;resize:vertical;border:1px solid rgba(127,127,127,.3);border-radius:8px;padding:8px;background:transparent;color:inherit')
  ta.placeholder = options.placeholder ?? '请求更改'
  const foot = el('div', 'display:flex;gap:8px;justify-content:flex-end;margin-top:8px')
  const cancel = el('button', 'border:none;background:transparent;color:inherit;opacity:.7;cursor:pointer;font-size:12px;padding:4px 10px;border-radius:8px', '取消')
  cancel.type = 'button'
  cancel.addEventListener('click', () => { options.onCancel() })
  const submit = el('button', `border:none;background:#8a8f98;color:#fff;cursor:pointer;font-size:12px;padding:5px 14px;border-radius:8px`, options.submitLabel ?? '注释')
  submit.type = 'button'
  // 一次性防重：双击或 Enter 重触不再产生第二条评论（提交后按钮禁用 +
  // 回调短路；Enter 重复 keydown 也走这里）。
  let settled = false
  const submitNow = (): void => {
    if (settled) return
    settled = true
    submit.disabled = true
    cancel.disabled = true
    const note = ta.value.trim()
    if (note !== '') options.onSubmit(note)
  }
  submit.addEventListener('click', submitNow)
  ta.addEventListener('keydown', event => {
    event.stopPropagation()
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      submitNow()
    }
    if (event.key === 'Escape' && !settled) {
      event.stopPropagation()
      options.onCancel()
    }
  })
  foot.append(cancel, submit)
  box.append(head, ta, foot)
  return box
}
