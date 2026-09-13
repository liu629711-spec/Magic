/**
 * Magic local patch (2026-09-13): in-flow comment modules for the CodeMirror
 * editor — the Codex-style direction the user ruled on. Comment editors AND
 * saved comment cards are rendered as CodeMirror 6 line widgets (decoration
 * widgets below their anchor line), so they live IN the document flow: they
 * scroll with the content, push lines apart, and die with the view.
 *
 * Two state fields:
 *  - cardsField:  the saved comment cards (one per store entry for this file);
 *  - editorField: the single transient comment-input widget.
 * The store is the single source of truth — after every add/remove the caller
 * re-syncs cards from the sidenote file-notes bridge.
 * @module better-sidebar/file-comment-widgets
 */
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import { StateEffect, StateField } from '@codemirror/state'

/** Cards: one widget per saved comment (id-keyed for diffing). */
const setCards = StateEffect.define<readonly { readonly pos: number; readonly dom: HTMLElement; readonly id: number }[]>()
/** The transient comment-input widget (null = hide). */
const setEditor = StateEffect.define<{ readonly pos: number; readonly dom: HTMLElement } | null>()

class DomWidget extends WidgetType {
  constructor(readonly dom: HTMLElement, readonly eqKey: string) { super() }
  eq(other: DomWidget): boolean { return other.eqKey === this.eqKey }
  toDOM(): HTMLElement { return this.dom }
  /** Interactive widget: the textarea/buttons keep their events untouched. */
  ignoreEvent(): boolean { return true }
}

const cardsField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    value = value.map(tr.changes)
    let out = value
    for (const effect of tr.effects) {
      if (!effect.is(setCards)) continue
      const ranges = effect.value
        .map(({ pos, dom, id }) => Decoration.widget({ widget: new DomWidget(dom, `card:${id}`), side: 1 }).range(pos))
        .sort((a, b) => a.from - b.from)
      out = Decoration.set(ranges, true)
    }
    return out
  },
  provide: field => EditorView.decorations.from(field),
})

const editorField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    value = value.map(tr.changes)
    let out = value
    for (const effect of tr.effects) {
      if (!effect.is(setEditor)) continue
      out = effect.value === null
        ? Decoration.none
        : Decoration.set(Decoration.widget({ widget: new DomWidget(effect.value.dom, 'editor'), side: 1 }).range(effect.value.pos))
    }
    return out
  },
  provide: field => EditorView.decorations.from(field),
})

/** The extensions to append to the editor state. */
export function fileCommentExtensions(): readonly [] {
  return [cardsField, editorField] as unknown as readonly []
}

/** Show the inline comment-input widget below `lineNumber` (1-based). */
export function showCommentEditorWidget(view: EditorView, lineNumber: number, dom: HTMLElement): void {
  const pos = view.state.doc.line(Math.min(Math.max(lineNumber, 1), view.state.doc.lines)).to
  view.dispatch({ effects: setEditor.of({ pos, dom }) })
  window.setTimeout(() => { dom.querySelector('textarea')?.focus() }, 0)
}

export function hideCommentEditorWidget(view: EditorView): void {
  view.dispatch({ effects: setEditor.of(null) })
}

/** Replace every card widget with the given set (pos = end of anchor line). */
export function setCommentCardWidgets(view: EditorView, items: readonly { readonly pos: number; readonly dom: HTMLElement; readonly id: number }[]): void {
  view.dispatch({ effects: setCards.of(items) })
}

/** The saved-comment card DOM: 「你 · 第 N 行的本地评论」+ note + 删除. */
export function buildCommentCardDom(startLine: number, note: string, onDelete: () => void): HTMLElement {
  const card = document.createElement('div')
  card.style.cssText = 'margin:2px 0 8px 32px;border:1px solid rgba(127,127,127,.35);border-left:3px solid #2563eb;border-radius:10px;padding:8px 10px;font-size:13px;line-height:1.5;background:var(--dsw-alias-bg-layer-1, rgba(127,127,127,.05));color:inherit'
  const head = document.createElement('div')
  head.style.cssText = 'display:flex;justify-content:space-between;gap:8px;align-items:center'
  const who = document.createElement('span')
  who.style.cssText = 'display:inline-flex;align-items:center;gap:6px;opacity:.75'
  const avatar = document.createElement('span')
  avatar.style.cssText = 'width:18px;height:18px;border-radius:50%;background:var(--dsw-alias-bg-layer-2, #d0d7de);display:inline-flex;align-items:center;justify-content:center;font-size:10px'
  avatar.textContent = '你'
  const label = document.createElement('span')
  label.textContent = `第 ${startLine} 行的本地评论`
  who.append(avatar, label)
  const del = document.createElement('button')
  del.type = 'button'
  del.textContent = '删除'
  del.style.cssText = 'border:none;background:transparent;color:inherit;opacity:.6;cursor:pointer;font-size:12px;padding:0'
  del.addEventListener('click', () => { onDelete() })
  head.append(who, del)
  const body = document.createElement('div')
  body.style.cssText = 'white-space:pre-wrap;word-break:break-word;margin-top:4px'
  body.textContent = note
  card.append(head, body)
  return card
}

/** The inline comment-input widget DOM: header + textarea + 取消/保存. */
export function buildCommentEditorDom(header: string, onSubmit: (note: string) => void, onCancel: () => void): HTMLElement {
  const box = document.createElement('div')
  box.style.cssText = 'margin:2px 0 8px 32px;border:1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.4));border-radius:10px;padding:8px 10px;font-size:13px;background:var(--dsw-alias-bg-layer-2, #fff);color:inherit'
  const head = document.createElement('div')
  head.style.cssText = 'font-family:ui-monospace,Consolas,monospace;font-size:11px;opacity:.72;word-break:break-all;margin-bottom:6px'
  head.textContent = header
  const ta = document.createElement('textarea')
  ta.placeholder = '评论'
  ta.style.cssText = 'width:100%;height:56px;font-size:13px;resize:vertical;border:1px solid rgba(127,127,127,.4);border-radius:6px;padding:6px;background:transparent;color:inherit;box-sizing:border-box'
  const row = document.createElement('div')
  row.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;margin-top:6px'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.textContent = '取消'
  cancel.style.cssText = popupishButton
  const save = document.createElement('button')
  save.type = 'button'
  save.textContent = '保存'
  save.style.cssText = popupishButton + 'background:#2563eb;border-color:#2563eb;color:#fff'
  cancel.addEventListener('click', () => { onCancel() })
  save.addEventListener('click', () => {
    const note = ta.value.trim()
    if (note === '') return
    onSubmit(note)
  })
  ta.addEventListener('keydown', event => {
    event.stopPropagation()
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault()
      const note = ta.value.trim()
      if (note !== '') onSubmit(note)
    }
  })
  row.append(cancel, save)
  box.append(head, ta, row)
  return box
}

const popupishButton = 'border:1px solid rgba(127,127,127,.4);border-radius:8px;padding:4px 12px;font-size:12px;cursor:pointer;background:transparent;color:inherit;'
