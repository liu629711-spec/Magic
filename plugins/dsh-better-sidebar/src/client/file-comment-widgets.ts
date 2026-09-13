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

/** The saved-comment card and input builders live in comment-dom.ts (shared
 *  with the markdown preview card layer) — the look must stay identical. */
