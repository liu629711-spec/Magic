/**
 * 「文件片段/评论」composer chip（Magic 本地补丁，dock order 12）：
 * 渲染完全镜像 createAnnotationChip（同 css.chipWrap/chip/chipPanel/chipRow
 * 类与交互：Esc/外点收起、会话切换收起、chipRemove/clearAll）——用户裁定
 * 「完全参考注释来做」。只统计未发送条目（发送后即从 chip 消失，与注释
 * 的「批注 ×N」一致）；条目本体在发送时已随协议块交付。
 * @module dsh-sidenote/file-notes-chip
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { IconCloseOutline16, IconListPenOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { FileNotesStore } from './file-notes.ts'
import { t } from '../locales.ts'
import { useLocaleTick } from '../locale-tick.ts'
import { AnnotateErrorBoundary } from './overlay.tsx'
import css from './annotate.module.css'

interface ChipProps {
  readonly session: { sessionId: string }
}

/** Create the slot component bound to one store instance. */
export function createFileNotesChip(fileNotes: FileNotesStore) {
  function FileNotesChip(props: ChipProps): ReactNode {
    useLocaleTick()
    const sessionId = props.session.sessionId
    useSyncExternalStore(
      useCallback((cb: () => void) => fileNotes.subscribe(cb), [fileNotes]),
      () => fileNotes.getSnapshot(),
    )
    const [expanded, setExpanded] = useState(false)
    const rootRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
      if (!expanded) return
      const onKeyDown = (event: KeyboardEvent): void => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          setExpanded(false)
        }
      }
      const onMouseDown = (event: MouseEvent): void => {
        const root = rootRef.current
        if (root === null || !(event.target instanceof Node)) return
        if (!root.contains(event.target)) setExpanded(false)
      }
      document.addEventListener('keydown', onKeyDown, true)
      document.addEventListener('mousedown', onMouseDown, true)
      return () => {
        document.removeEventListener('keydown', onKeyDown, true)
        document.removeEventListener('mousedown', onMouseDown, true)
      }
    }, [expanded])

    // 会话切换时收起展开态（slot 组件实例不随会话切换重建）。
    useEffect(() => {
      setExpanded(false)
    }, [sessionId])

    const active = fileNotes.listUnsent(sessionId)
    if (active.length === 0) return null

    return (
      <div ref={rootRef} className={css.chipWrap}>
        <button
          type="button"
          className={css.chip}
          aria-expanded={expanded}
          onClick={() => { setExpanded(open => !open) }}
        >
          <IconListPenOutline16 size={12} />
          <span>{t(active.length === 1 ? 'fileNotesChipOne' : 'fileNotesChipMany', { n: active.length })}</span>
        </button>
        {expanded && (
          <ul className={css.chipPanel}>
            {active.map(note => (
              <li key={note.id} className={css.chipRow}>
                <span className={css.chipText} title={note.quote}>
                  {note.quote}
                  {note.note !== undefined && <span className={css.chipNote}>{t('chipNote', { note: note.note })}</span>}
                  <span className={css.chipNumber}>{note.header}</span>
                </span>
                <button
                  type="button"
                  className={css.chipRemove}
                  title={t('removeTitle')}
                  aria-label={t('removeAria', { n: note.id })}
                  onClick={() => { fileNotes.remove(sessionId, note.id) }}
                >
                  <IconCloseOutline16 size={12} />
                </button>
              </li>
            ))}
            <li className={css.chipRow}>
              <button
                type="button"
                className={css.chipClearAll}
                onClick={() => { for (const note of active) fileNotes.remove(sessionId, note.id) }}
              >
                {t('clearAll')}
              </button>
            </li>
          </ul>
        )}
      </div>
    )
  }

  return function FileNotesChipEntry(props: ChipProps): ReactNode {
    return (
      <AnnotateErrorBoundary>
        <FileNotesChip {...props} />
      </AnnotateErrorBoundary>
    )
  }
}
