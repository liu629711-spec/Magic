/**
 * 「文件片段/评论」composer chip（Magic 本地补丁）：conversation.input.dock
 * 席位（order 12，注释 10 / 回流 11 之后），统计未发送条数，展开可预览/
 * 删除全部条目。内联样式——局部补丁不进上游 css module。
 * @module dsh-sidenote/file-notes-chip
 */
import { useCallback, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { FileNotesStore } from './file-notes.ts'

interface ChipProps {
  readonly session: { sessionId: string }
}

const chipStyle: React.CSSProperties = {
  border: '1px solid rgba(127,127,127,.4)',
  borderRadius: 999,
  background: 'rgba(127,127,127,.08)',
  color: 'inherit',
  padding: '3px 12px',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 'calc(100% + 8px)',
  left: 0,
  width: 340,
  maxHeight: 280,
  overflow: 'auto',
  background: 'var(--dsw-bg, #fff)',
  color: 'inherit',
  border: '1px solid rgba(127,127,127,.35)',
  borderRadius: 10,
  boxShadow: '0 8px 28px rgba(0,0,0,.2)',
  padding: 10,
  zIndex: 50,
}

const itemStyle: React.CSSProperties = {
  border: '1px solid rgba(127,127,127,.25)',
  borderRadius: 8,
  padding: '6px 8px',
  marginBottom: 6,
  fontSize: 12,
}

const headStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
}

const kindStyle: React.CSSProperties = { opacity: 0.72 }

const delStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'inherit',
  opacity: 0.6,
  cursor: 'pointer',
  fontSize: 12,
}

const headerStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, Consolas, monospace',
  fontSize: 11,
  opacity: 0.72,
  wordBreak: 'break-all',
  margin: '3px 0',
}

const quoteStyle: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
  maxHeight: 72,
  overflow: 'hidden',
}

const noteStyle: React.CSSProperties = { marginTop: 4, whiteSpace: 'pre-wrap' }

export function createFileNotesChip(store: FileNotesStore) {
  return function FileNotesChip(props: ChipProps): ReactNode {
    const sessionId = props.session.sessionId
    useSyncExternalStore(
      useCallback((cb: () => void) => store.subscribe(cb), [store]),
      () => store.getSnapshot(),
    )
    const [expanded, setExpanded] = useState(false)
    const items = store.list(sessionId)
    if (items.length === 0) return null
    const unsent = items.filter(item => item.sent !== true).length
    return (
      <div style={{ position: 'relative', display: 'inline-flex' }}>
        <button
          type="button"
          style={chipStyle}
          onClick={() => { setExpanded(value => !value) }}
        >
          📄 文件片段/评论{unsent > 0 ? ` · ${unsent} 未发送` : ` · ${items.length}`}
        </button>
        {expanded && (
          <div style={panelStyle}>
            {items.map(item => (
              <div key={item.id} style={itemStyle}>
                <div style={headStyle}>
                  <span style={kindStyle}>
                    {item.kind === 'comment' ? '评论' : '片段'}{item.sent === true ? ' · 已发送' : ''}
                  </span>
                  <button
                    type="button"
                    style={delStyle}
                    onClick={() => { store.remove(sessionId, item.id) }}
                  >删除</button>
                </div>
                <div style={headerStyle}>{item.header}</div>
                <div style={quoteStyle}>{item.quote}</div>
                {item.note !== undefined && <div style={noteStyle}>💬 {item.note}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
}
