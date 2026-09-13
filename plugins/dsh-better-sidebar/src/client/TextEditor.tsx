/**
 * The code/markdown file viewer: a CodeMirror 6 editor with line wrapping,
 * syntax highlighting (extension-keyed language), a dirty dot and Ctrl/Cmd+S
 * save, and a preview/edit toggle for markdown files. Registered as the
 * `code` (catch-all) and `markdown` built-in viewers; the editor tab host
 * fetches the content through the fsRead strategy and passes it in props,
 * so this component never fetches or dispatches — it only edits.
 *
 * The toolbar (mode toggle / dirty dot / save / status) renders as its own
 * row below the host's title bar, VSCode-style — unless the host passes
 * `toolbar: 'host'` (the merged editor-explorer mode), in which case this
 * component skips the row and reports state + registers commands through
 * the FileViewerProps toolbar callbacks so the host's path-input header
 * renders the controls instead.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { EditorState } from '@codemirror/state'
import { EditorView as CodeMirrorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { IconCheckOutline16, MarkdownText } from '@deepseek-ai/dsh-client-ui-primitives'
import { markdownTextProps } from './markdown-labels.tsx'
import { api, htmlUrl } from './api.ts'
import { markdownPreviewSource } from './markdown-frontmatter.ts'
import { rewriteLocalImageUrls } from './markdown-images.ts'
import { languageForPath } from './lang.ts'
import { cmSurfaceTheme, CmThemeCompartment } from './cm-themes.ts'
import { isDarkScheme, subscribeColorScheme } from './theme.ts'
import { SandboxStatusBar } from './SandboxStatusBar.tsx'
import { appendToDraft } from './conversation-draft.ts'
import { useSelectionPopup, type FileSelectionPayload } from './selection-popup.ts'
import { mountFileCommentCards, sidenoteFileNotes } from './file-comment-cards.ts'
import { buildCommentCardDom, buildCommentEditorDom, fileCommentExtensions, hideCommentEditorWidget, setCommentCardWidgets, showCommentEditorWidget } from './file-comment-widgets.ts'
import { relativeTo } from './paths.ts'
import { buildSelectionInsert, headerOf, linesOfSelection } from './selection-payload.ts'
import { analyzeMarkdownHtml } from './markdown-html.ts'
import { LazyMermaidMarkdown, MarkdownDocument, type MarkdownHtmlMedia } from './MarkdownHtml.tsx'
import { MdToc } from './md-toc.tsx'
import { splitMermaidBlocks } from './mermaid-blocks.ts'
import { t } from './locales.ts'
import { HTML_IFRAME_SANDBOX } from './html-preview.ts'
import type { EditorToolbarState, FileViewerProps } from './service.ts'

const popupButtonStyle = {
  border: '1px solid rgba(127,127,127,.4)',
  borderRadius: 8,
  background: 'var(--dsw-bg, #fff)',
  color: 'inherit',
  padding: '4px 12px',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
}
import css from './sidebar.module.css'

/** Previewable files (rendered output vs source editing). */
type ViewMode = 'preview' | 'edit'

/** Per-file preview scroll memory. Module-level so it survives viewer
 *  remounts: the save-then-switch-to-preview reload (EditorHost #215 case B)
 *  rebuilds the whole TextEditor instance, and without this the preview
 *  would remount at the top. Keyed by session + path; a fresh entry reads 0
 *  (new file opens at the top), re-opens/toggles restore the last position. */
const previewScrollMemory = new Map<string, number>()
const previewScrollKey = (scope: { sessionId: string }, path: string): string => `${scope.sessionId}::${path}`

export function TextEditor(props: FileViewerProps) {
  const { ctx, scope, path, viewerId, content, truncated } = props
  const [mode, setMode] = useState<ViewMode>('preview')
  /** The editor's current text (null while clean); preview renders this. */
  const [draft, setDraft] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<CodeMirrorView | null>(null)
  const savingRef = useRef(false)
  /** The theme compartment of the current view (reconfigured on scheme flip). */
  const themeCompRef = useRef<CmThemeCompartment | null>(null)
  /** The app's resolved color scheme; the editor re-themes in place on flips. */
  const [dark, setDark] = useState(() => isDarkScheme())
  /** The markdown preview container (selection-containment + line lookup). */
  const mdRef = useRef<HTMLDivElement>(null)
  const markdown = viewerId === 'markdown'
  const html = viewerId === 'html'
  /** Preview scroll position across the preview<->edit toggle. The preview
   *  container re-mounts on every mode switch and its scrollTop lives on that
   *  element, so capture it on scroll and restore after each remount. Seeded
   *  from the module-level per-file memory so a full viewer rebuild
   *  (save-then-switch-to-preview reload) also keeps the position. */
  const previewScrollRef = useRef(previewScrollMemory.get(previewScrollKey(scope, path)) ?? 0)
  /** True while a programmatic restore is in flight; raw scroll events caused
   *  by the restore (or by the browser clamping a collapsed reload container
   *  to 0) must not overwrite the remembered position. */
  const restoringRef = useRef(false)
  /** Preview-side handoff data for the preview -> edit switch: the text at the
   *  top of the preview viewport (best-effort) plus the scroll ratio. Captured
   *  throttled on preview scroll; consumed when entering edit mode so the
   *  editor opens where the reader was instead of at the file top. */
  const previewSyncRef = useRef<{ text: string | null; ratio: number }>({ text: null, ratio: 0 })
  const anchorThrottleRef = useRef(false)

  /**
   * The floating "add to conversation" popup (viewport-anchored; null =
   * hidden). The hook owns show/hide/commit plus the global dismissal
   * listeners (outside mousedown, Escape, hidden tab/window, surface
   * leaving the viewport) — see selection-popup.ts.
   */
  // Magic local patch (2026-09-13): the「评论」inline editor state + the
  // sidenote file-notes bridge (snippet/comment chips instead of a draft
  // dump; legacy fallback when dsh-sidenote is not loaded).
  const [commentEditor, setCommentEditor] = useState<{ left: number; top: number; payload: FileSelectionPayload; sessionId: string } | null>(null)
  // Magic local patch: re-anchor the CodeMirror comment-card widgets from the
  // store (single source of truth; called after add/remove/view creation).
  const syncFileCommentCardWidgets = (): void => {
    const view = viewRef.current
    const notes = sidenoteFileNotes()
    if (view === null || notes === null) return
    const rel = scope.cwd !== undefined ? relativeTo(scope.cwd, path) : path
    const items: { pos: number; dom: HTMLElement; id: number }[] = []
    for (const note of notes.list(scope.sessionId)) {
      if (note.kind !== 'comment') continue
      const file = note.header.includes(':') ? note.header.slice(0, note.header.indexOf(':')) : note.header
      if (file !== rel) continue
      const lineMatch = /:(\d+)/.exec(note.header)
      const line = lineMatch !== null ? Number(lineMatch[1]) : 1
      const pos = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines)).to
      items.push({
        pos,
        id: note.id,
        dom: buildCommentCardDom(line, note.note ?? '', () => {
          notes.remove(scope.sessionId, note.id)
          syncFileCommentCardWidgets()
        }),
      })
    }
    setCommentCardWidgets(view, items)
  }
  // Magic local patch (2026-09-13): in-file comment cards (preview only) —
  // comments render under their anchored block and are deletable in place.
  useEffect(() => {
    const notes = sidenoteFileNotes()
    if (notes === null) return
    if (markdown !== true || mode !== 'preview') return
    return mountFileCommentCards(notes, {
      getSessionId: () => scope.sessionId,
      getPath: () => path,
      getCwd: () => scope.cwd,
      getSurface: () => (markdown && mode === 'preview' ? mdRef.current : null),
    })
  }, [markdown, mode, path, content])
  // Magic local patch (2026-09-13): store changes re-anchor the CodeMirror
  // comment-card widgets (add/remove from any surface, incl. the sidenote
  // chip panel).
  useEffect(() => {
    const notes = sidenoteFileNotes()
    if (notes === null) return
    return notes.subscribe(() => { syncFileCommentCardWidgets() })
  }, [scope.sessionId, path])
  const [commentText, setCommentText] = useState('')
  const saveFileComment = (): void => {
    const editor = commentEditor
    if (editor === null) return
    const note = commentText.trim()
    if (note === '') return
    sidenoteFileNotes()?.add(editor.sessionId, {
      kind: 'comment',
      header: headerOf(editor.payload.path, editor.payload.cwd, editor.payload.lines),
      quote: editor.payload.selected,
      note,
    })
    setCommentEditor(null)
    setCommentText('')
  }
  const selectionPopup = useSelectionPopup({
    onCommit: (insert, payload) => {
      if (payload !== undefined) {
        const notes = sidenoteFileNotes()
        if (notes !== null) {
          notes.add(scope.sessionId, {
            kind: 'snippet',
            header: headerOf(payload.path, payload.cwd, payload.lines),
            quote: payload.selected,
          })
          return
        }
      }
      appendToDraft(ctx, scope.sessionId, insert)
    },
    onComment: (payload) => {
      // Magic local patch (2026-09-13): edit mode opens the comment editor as
      // an in-flow CodeMirror line widget (Codex-style); preview mode keeps
      // the viewport-anchored editor.
      const view = viewRef.current
      if (mode === 'edit' && view !== null) {
        setCommentText('')
        setCommentEditor(null)
        showCommentEditorWidget(
          view,
          payload.lines?.end ?? 1,
          buildCommentEditorDom(
            headerOf(payload.path, payload.cwd, payload.lines),
            (note) => {
              sidenoteFileNotes()?.add(scope.sessionId, {
                kind: 'comment',
                header: headerOf(payload.path, payload.cwd, payload.lines),
                quote: payload.selected,
                note,
              })
              hideCommentEditorWidget(view)
              syncFileCommentCardWidgets()
            },
            () => { hideCommentEditorWidget(view); syncFileCommentCardWidgets() },
          ),
        )
        selectionPopup.hide()
        return
      }
      setCommentText('')
      setCommentEditor({ left: selectionPopup.popup?.left ?? 0, top: selectionPopup.popup?.top ?? 0, payload, sessionId: scope.sessionId })
      selectionPopup.hide()
    },
    // The surface that must stay on screen: the markdown preview container
    // in preview mode, the CodeMirror host otherwise.
    getSurface: () => (markdown && mode === 'preview' ? mdRef.current : hostRef.current),
  })

  useEffect(() => subscribeColorScheme(() => { setDark(isDarkScheme()) }), [])

  // A new file (tab switch) starts clean: fresh preview mode, no draft.
  useEffect(() => {
    setMode('preview')
    setDraft(null)
    setDirty(false)
    setSaveState('idle')
    selectionPopup.hide()
    // hide() reads a live ref; the reset must fire only on a content (file)
    // swap, and the hook object's identity churns on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])

  // A different file switches the remembered preview scroll position to that
  // file's own entry (first open: none, so the preview starts at the top).
  useEffect(() => {
    previewScrollRef.current = previewScrollMemory.get(previewScrollKey(scope, path)) ?? 0
  }, [scope, path])

  // Create the CodeMirror editor once the content is loaded. The view owns
  // the document; React only tracks dirty state through the update listener
  // (the draft — the preview's text — is snapshotted from the live view on
  // entering preview, not re-stringified per keystroke). For markdown the
  // view stays mounted while previewing (hidden), so unsaved edits survive
  // the preview/edit toggle. The theme + syntax colors live in a compartment
  // so a scheme flip reconfigures only that part — the document, undo
  // history and scroll position survive.
  useEffect(() => {
    if (content === undefined) return
    const host = hostRef.current
    if (host === null) return
    const language = languageForPath(path)
    const themeComp = new CmThemeCompartment()
    themeCompRef.current = themeComp
    const state = EditorState.create({
      doc: content,
      extensions: [
        CodeMirrorView.lineWrapping,
        lineNumbers(),
        history(),
        EditorState.tabSize.of(2),
        CodeMirrorView.contentAttributes.of({ spellcheck: 'false' }),
        cmSurfaceTheme,
        themeComp.of(dark),
        // Magic local patch (2026-09-13): in-flow comment modules (Codex-style
        // line widgets — the input editor and saved comment cards live in the
        // document, not floating above it).
        ...fileCommentExtensions(),
        ...(language !== null ? [language] : []),
        CodeMirrorView.updateListener.of((update) => {
          if (update.docChanged) {
            setDirty(true)
          }
        }),
        keymap.of([
          {
            key: 'Mod-s',
            preventDefault: true,
            run: () => { save(); return true },
          },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        // Selection popup (the code and markdown editors): a non-empty
        // selection anchors the floating "add to conversation" button above
        // its head. Scrolling (geometry/viewport change) or losing focus
        // hides it; typing collapses the selection and hides it too.
        ...(viewerId === 'code' || viewerId === 'markdown' ? [
          CodeMirrorView.updateListener.of((update) => {
            if (update.geometryChanged || update.viewportChanged) {
              selectionPopup.hide()
              return
            }
            if (!update.view.hasFocus) {
              selectionPopup.hide()
              return
            }
            if (!(update.selectionSet || update.docChanged || update.focusChanged)) return
            const sel = update.state.selection.main
            if (sel.empty) {
              selectionPopup.hide()
              return
            }
            const text = update.state.sliceDoc(sel.from, sel.to)
            if (text.trim() === '') {
              selectionPopup.hide()
              return
            }
            // Page coordinates (the document root may scroll); the popup is
            // position:fixed, so convert to viewport coordinates.
            const rect = update.view.coordsAtPos(sel.head)
            if (rect === null) {
              selectionPopup.hide()
              return
            }
            const doc = update.state.doc
            const payload: FileSelectionPayload = {
              path,
              cwd: scope.cwd,
              lines: { start: doc.lineAt(sel.from).number, end: doc.lineAt(sel.to).number },
              selected: text,
            }
            selectionPopup.show(
              buildSelectionInsert(payload.path, payload.cwd, payload.lines, payload.selected),
              rect.left - window.scrollX + (rect.right - rect.left) / 2,
              rect.top - window.scrollY,
              payload,
            )
          }),
        ] : []),
      ],
    })
    const view = new CodeMirrorView({ state, parent: host })
    viewRef.current = view
    syncFileCommentCardWidgets()
    return () => {
      view.destroy()
      viewRef.current = null
      themeCompRef.current = null
    }
    // The keymap's save() reads live refs; scope/path are stable for a
    // tab's lifetime, and the dark flip is handled by the reconfigure
    // effect below (recreating the view here would drop the draft).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, path])

  // Scheme flip: re-theme in place (the compartment holds only the
  // scheme-dependent extensions; everything else is untouched).
  useEffect(() => {
    const view = viewRef.current
    const themeComp = themeCompRef.current
    if (view === null || themeComp === null) return
    view.dispatch({ effects: themeComp.reconfigure(dark) })
  }, [dark])

  // The editor may have been display:none while previewing; re-measure when
  // it becomes visible again (CodeMirror sizes itself on reveal). A mode
  // flip also invalidates any anchored selection popup. When entering edit
  // from a scrolled preview, the editor opens where the reader was: the line
  // mapped from the text anchored at the preview viewport top (or, failing a
  // unique text match, the proportional scroll position).
  useEffect(() => {
    selectionPopup.hide()
    if (mode !== 'edit') return
    const view = viewRef.current
    if (view === null) return
    const sync = previewSyncRef.current
    if (!markdown) return
    const doc = view.state.doc
    let target: number | undefined
    if (sync.text !== null) {
      const lines = linesOfSelection(mdText, sync.text)
      if (lines !== null) target = doc.line(Math.min(lines.start, doc.lines)).from
    }
    // ratio === 1 means the reader was at the very bottom (e.g. the last
    // block's text is a repeated filler line that linesOfSelection rejects
    // as ambiguous) — it must still land the editor at the bottom.
    if (target === undefined && sync.ratio > 0 && sync.ratio <= 1) {
      target = Math.max(1, Math.min(doc.length - 1, Math.round(doc.length * sync.ratio)))
    }
    if (target === undefined) return
    // Position the editor by writing its OWN scroller directly (after a fresh
    // measure) instead of CodeMirror's scrollIntoView: that path walks every
    // scrollable ancestor — and even the window when the browser is zoomed
    // (visualViewport < innerHeight) — to reveal the target, which dragged
    // the whole sidebar up when the reader was at the very end of the
    // document. A plain scrollTop write on the editor scroller can never
    // touch anything outside the editor.
    view.requestMeasure()
    view.dispatch({ selection: { anchor: target } })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const block = view.lineBlockAt(target)
        view.scrollDOM.scrollTop = Math.max(0, block.top - 8)
        // Force CodeMirror to re-measure and re-render its virtualized
        // viewport at the NEW scroll position (its scroll-observer is async
        // and can lag a direct write).
        view.requestMeasure()
      })
    })
    // The reveal reads the live document/view refs; only the flip into
    // preview triggers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  // Snapshot the live document into the draft whenever the preview needs
  // it: entering preview (the markdown preview renders `draft ?? content`)
  // and a content swap (the view was just re-created above, so the read is
  // the new document — matching the reset-to-null of a clean tab). The
  // updateListener used to re-stringify the WHOLE document on every
  // keystroke (O(docLength) per key) for a draft only preview reads.
  useEffect(() => {
    const view = viewRef.current
    setDraft(view === null ? null : view.state.doc.toString())
  }, [mode, content])

  const save = (): void => {
    const view = viewRef.current
    if (view === null || savingRef.current) return
    savingRef.current = true
    setSaveState('saving')
    api.fsWrite(scope, path, view.state.doc.toString()).then(() => {
      savingRef.current = false
      setDraft(null)
      setDirty(false)
      setSaveState('saved')
    }).catch(() => {
      savingRef.current = false
      setSaveState('failed')
    })
  }

  /** The markdown source the preview renders (draft wins over saved content). */
  const mdText = draft ?? content ?? ''
  /** Preview-only source with a closed leading YAML frontmatter block hidden.
   *  The raw `mdText` stays untouched for editing, saving, and selection line
   *  lookup. All preview renderers share this source so plain Markdown,
   *  Mermaid, and documents containing raw HTML behave consistently. */
  const previewMdText = markdown ? markdownPreviewSource(mdText) : mdText

  // Re-apply the remembered preview scroll position whenever the preview
  // container mounts or its content changes (mode flip back to preview, or a
  // same-file reload — e.g. the save-then-switch-to-preview reload — which
  // temporarily collapses the container and clamps scrollTop to 0). Restored
  // in a before-paint layout effect so the user never sees the top flash.
  useLayoutEffect(() => {
    if (mode !== 'preview') return
    const el = mdRef.current
    if (el === null || previewScrollRef.current <= 0) return
    if (el.scrollHeight <= el.clientHeight) return
    if (el.scrollTop === previewScrollRef.current) return
    restoringRef.current = true
    el.scrollTop = previewScrollRef.current
    requestAnimationFrame(() => { restoringRef.current = false })
  }, [mode, previewMdText])

  /** The preview source with local image destinations rewritten to absolute
   *  media URLs (see {@link rewriteLocalImageUrls}). */
  const previewText = markdown
    ? rewriteLocalImageUrls(previewMdText, scope, path, window.location.origin)
    : previewMdText
  /** md/mermaid block split for the preview (mermaid fences lift out). Split
   *  only in preview mode: edit-mode keystrokes must not re-scan the source. */
  const mdBlocks = useMemo(
    () => (markdown && mode === 'preview' ? splitMermaidBlocks(previewMdText) : []),
    [markdown, mode, previewMdText],
  )
  /** Raw-HTML analysis (block runs lifted out + inline gate). Non-null for
   *  every markdown preview, so the render below always takes the split
   *  renderer — its markdown runs rewrite local image destinations internally
   *  (see MarkdownHtml.tsx). The legacy single-pass branches (fed the
   *  pre-rewritten `previewText`) are dead in the current wiring. */
  const htmlInfo = useMemo(
    () => (markdown && mode === 'preview' ? analyzeMarkdownHtml(previewMdText) : null),
    [markdown, mode, previewMdText],
  )
  const hasMermaid = useMemo(
    () => htmlInfo !== null
      ? htmlInfo.segments.some((segment) => segment.kind === 'markdown'
        && splitMermaidBlocks(segment.text).some((block) => block.kind === 'mermaid'))
      : mdBlocks.some((block) => block.kind === 'mermaid'),
    [htmlInfo, mdBlocks],
  )
  /** The media context for the split renderer (local-src rewriting inside
   *  sanitized HTML). Memoized on primitives: MarkdownDocument sanitizes per
   *  `media` identity, so a fresh object per render would re-sanitize every
   *  keystroke. */
  const htmlMedia = useMemo<MarkdownHtmlMedia>(
    () => ({ scope, path, origin: window.location.origin }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope.sessionId, scope.cwd, path],
  )
  const codeLabels = { copyLabel: t('copy'), copiedLabel: t('copied') }

  /**
   * Selection popup for the markdown preview: a mouse-up inside the preview
   * container anchors the floating "add to conversation" button above the
   * selection. Line numbers come from a best-effort reverse-search of the
   * selected text in the source ({@link linesOfSelection} — an ambiguous or
   * missing hit omits them). The button's own mousedown preventDefaults so
   * the selection survives until the click commits.
   */
  const handlePreviewMouseUp = (): void => {
    const sel = window.getSelection()
    if (sel === null || sel.isCollapsed || sel.anchorNode === null || sel.focusNode === null) {
      selectionPopup.hide()
      return
    }
    const host = mdRef.current
    if (host === null || !host.contains(sel.anchorNode) || !host.contains(sel.focusNode)) {
      selectionPopup.hide()
      return
    }
    const text = sel.toString()
    if (text.trim() === '') {
      selectionPopup.hide()
      return
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect()
    const lines = linesOfSelection(mdText, text)
    const payload: FileSelectionPayload = {
      path,
      cwd: scope.cwd,
      lines: lines ?? undefined,
      selected: text,
    }
    selectionPopup.show(
      buildSelectionInsert(payload.path, payload.cwd, payload.lines, payload.selected),
      rect.left + rect.width / 2,
      rect.top,
      payload,
    )
  }
  const editable = content !== undefined
  const saveLabel = saveState === 'saving' ? t('loading') : saveState === 'saved' ? t('saved') : saveState === 'failed' ? t('saveFailed') : ''
  // Per-feature sandbox escape hatch: the global side card setting (warned)
  // plus a per-surface temporary unlock. The unlock state starts at the
  // "default unsafe" pref so a preview can open straight into the red
  // unsandboxed state (still restorable from the status row). With the
  // sandbox OFF the preview iframe drops its sandbox attribute entirely —
  // the previewed page then runs on the GUI's own origin with full session
  // access.
  const [localUnlock, setLocalUnlock] = useState(() => props.store?.getPrefs().htmlViewerDefaultUnsafe === true)
  const htmlNoSandbox = props.store?.getPrefs().htmlViewerNoSandbox === true || localUnlock

  // Host-toolbar mode (the merged editor header renders the controls): skip
  // the own toolbar row, report the state after every relevant render (the
  // JSON key guards redundant calls), and register the commands on mount.
  const hostToolbar = props.toolbar === 'host'
  const lastToolbarRef = useRef('')
  useEffect(() => {
    if (!hostToolbar) return
    const state: EditorToolbarState = { modes: markdown || html, mode, dirty, editable, saveState }
    const key = JSON.stringify(state)
    if (lastToolbarRef.current === key) return
    lastToolbarRef.current = key
    props.onToolbarState?.(state)
  })
  useEffect(() => {
    if (!hostToolbar) return
    // `save` reads live refs only, and `setMode` is the stable state setter —
    // registering this render's closures is safe for the mount's lifetime.
    props.onToolbarControls?.({ setMode, save })
    return () => { props.onToolbarControls?.(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostToolbar])

  return (
    <>
      {!hostToolbar && (
      <div className={css.editorHeader}>
        {(markdown || html) && (
          <div className={css.editorModeToggle}>
            <button
              type="button"
              className={clsx(css.editorModeButton, mode === 'preview' && css.editorModeActive)}
              onClick={() => { setMode('preview') }}
            >
              {t('preview')}
            </button>
            <button
              type="button"
              className={clsx(css.editorModeButton, mode === 'edit' && css.editorModeActive)}
              onClick={() => { setMode('edit') }}
            >
              {t('edit')}
            </button>
          </div>
        )}
        {dirty && <span className={css.dirtyDot} title={t('unsaved')} />}
        {editable && (
          <button
            type="button"
            className={css.iconButton}
            aria-label={t('save')}
            title={`${t('save')} (Ctrl/Cmd+S)`}
            onClick={save}
          >
            <IconCheckOutline16 />
          </button>
        )}
        {saveLabel !== '' && <span className={clsx(css.editorStatus, saveState === 'failed' && css.editorStatusError)}>{saveLabel}</span>}
      </div>
      )}
      {editable && (
        <>
          {truncated === true && mode === 'edit' && <div className={css.editorBanner}>{t('truncation')}</div>}
          <div
            className={clsx(css.editorCm, (markdown || html) && mode === 'preview' && css.editorCmHidden)}
            ref={hostRef}
          />
        </>
      )}
      {markdown && mode === 'preview' && (
        <div
          className={css.editorMd}
          ref={mdRef}
          onMouseUp={handlePreviewMouseUp}
          onScroll={(event) => {
            const el = event.currentTarget
            if (!restoringRef.current && el.scrollHeight > el.clientHeight) {
              previewScrollRef.current = el.scrollTop
              previewScrollMemory.set(previewScrollKey(scope, path), el.scrollTop)
            }
            if (!anchorThrottleRef.current) {
              anchorThrottleRef.current = true
              setTimeout(() => { anchorThrottleRef.current = false }, 120)
              const ratio = el.scrollHeight > el.clientHeight
                ? el.scrollTop / (el.scrollHeight - el.clientHeight)
                : 0
              // The first block below the viewport's top edge, chosen with
              // layout coordinates (caretRangeFromPoint needs an in-viewport
              // point and returns null when the panel is partially off-screen).
              // Its text is the anchor the editor syncs to on preview -> edit.
              let text: string | null = null
              const base = el.getBoundingClientRect()
              const blocks = el.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li')
              for (const block of blocks) {
                if (block.getBoundingClientRect().top - base.top + el.scrollTop >= el.scrollTop - 2) {
                  const t = (block.textContent ?? '').replace(/[ \t\r\n]+/g, ' ').trim()
                  if (t.length >= 8) text = t
                  break
                }
              }
              previewSyncRef.current = { text, ratio }
            }
            selectionPopup.hide()
          }}
        >
          {/* The fence copy-button labels must come from this plugin's own
              dictionary: the DSH MarkdownText/CodeBlock are cordis-free and
              fall back to hardcoded Chinese otherwise (same pattern as the
              chat's AssistantMarkdown). Render-time t() keeps them following
              the active locale on live switches. Plain markdown (no HTML)
              renders exactly as before — one MarkdownText pass for the whole
              document, or the mermaid lazy chunk (single markdown parse;
              cross-fence references/footnotes stay intact) when a mermaid
              fence exists. Documents containing HTML (block runs or inline
              tags) render through the split document renderer: markdown runs
              keep the MarkdownText/mermaid path while raw-HTML runs render
              as sanitized DOM (see markdown-html.tsx). */}
          {/* The outline button rides on top of the preview scroll container
              (sticky, zero-height — first child so it pins from the very
              top) once the document has enough headings. */}
          <MdToc />
          {htmlInfo !== null
            ? <MarkdownDocument info={htmlInfo} media={htmlMedia} codeLabels={codeLabels} />
            : hasMermaid
              ? <LazyMermaidMarkdown text={previewText} codeLabels={codeLabels} />
              : <MarkdownText {...markdownTextProps(previewText, codeLabels)} />}
        </div>
      )}
      {html && mode === 'preview' && (
        <>
          <SandboxStatusBar
            sandboxed={!htmlNoSandbox}
            local={localUnlock}
            dangerCopy={t('htmlNoSandboxWarning')}
            onUnlock={() => { setLocalUnlock(true) }}
            onRestore={() => { setLocalUnlock(false) }}
          />
          {/* Route-src (never srcdoc — a srcdoc frame inherits the parent
              origin when unsandboxed; the route URL keeps the frame
              cross-origin by construction). The preview shows the SAVED
              file; the draft is only visible in edit mode. */}
          <iframe
            className={css.editorHtml}
            src={htmlUrl(scope, path)}
            sandbox={htmlNoSandbox ? undefined : HTML_IFRAME_SANDBOX}
            referrerPolicy="no-referrer"
            allow=""
            title={path}
          />
        </>
      )}
      {selectionPopup.popup !== null && createPortal(
        <div
          ref={selectionPopup.rootRef}
          style={{ position: 'fixed', left: selectionPopup.popup.left, top: selectionPopup.popup.top, transform: 'translate(-50%, calc(-100% - 8px))', display: 'flex', gap: 6, zIndex: 50 }}
        >
          <button
            type="button"
            style={popupButtonStyle}
            // Keep the selection (and CodeMirror focus) alive until the click
            // commits — without this the popup unmounts before click lands.
            onMouseDown={(event) => { event.preventDefault() }}
            onClick={selectionPopup.commit}
          >
            {t('addToConversation')}
          </button>
          {sidenoteFileNotes() !== null && selectionPopup.popup.payload !== undefined && (
            <button
              type="button"
              style={popupButtonStyle}
              onMouseDown={(event) => { event.preventDefault() }}
              onClick={() => {
                const popup = selectionPopup.popup
                if (popup?.payload === undefined) return
                setCommentText('')
                setCommentEditor({ left: popup.left, top: popup.top, payload: popup.payload, sessionId: scope.sessionId })
                selectionPopup.hide()
              }}
            >
              {t('fileComment')}
            </button>
          )}
        </div>,
        document.body,
      )}
      {commentEditor !== null && createPortal(
        <div
          style={{
            position: 'fixed',
            // Magic local patch: clamp inside the preview surface so the panel
            // never overflows the dock's right edge.
            left: (() => {
              const surface = markdown && mode === 'preview' ? mdRef.current : hostRef.current
              const rect = surface?.getBoundingClientRect()
              const max = rect !== undefined ? rect.right - 300 : window.innerWidth - 300
              return Math.max(8, Math.min(commentEditor.left, Math.max(8, max)))
            })(),
            top: commentEditor.top + 34,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: 8,
            minWidth: 264,
            background: 'var(--dsw-bg, #fff)',
            color: 'inherit',
            border: '1px solid rgba(127,127,127,.4)',
            borderRadius: 10,
            boxShadow: '0 8px 28px rgba(0,0,0,.22)',
            zIndex: 51,
          }}
          onMouseDown={(event) => { event.stopPropagation() }}
        >
          <div style={{ fontSize: 11, opacity: 0.7, fontFamily: 'ui-monospace, Consolas, monospace', wordBreak: 'break-all' }}>
            {headerOf(commentEditor.payload.path, commentEditor.payload.cwd, commentEditor.payload.lines)}
          </div>
          <textarea
            autoFocus
            value={commentText}
            onChange={(event) => { setCommentText(event.target.value) }}
            onKeyDown={(event) => {
              // Enter submits (Shift+Enter newline; IME composition guarded).
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                saveFileComment()
              }
            }}
            placeholder={t('fileComment')}
            style={{ width: '100%', height: 56, fontSize: 13, resize: 'vertical', border: '1px solid rgba(127,127,127,.4)', borderRadius: 6, padding: 6, background: 'transparent', color: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button
              type="button"
              style={popupButtonStyle}
              onClick={() => { setCommentEditor(null); setCommentText('') }}
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              style={{ ...popupButtonStyle, background: '#2563eb', borderColor: '#2563eb', color: '#fff' }}
              onClick={saveFileComment}
            >
              {t('save')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
