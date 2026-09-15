/**
 * 文件划选片段/评论（Magic 本地补丁 2026-09-13）：better-sidebar 文件页的
 * 划选经 window 桥（__dshSidenoteFileNotes）进入本 store，随下一条主会话
 * 消息由 send.ts 拦截器统一序列化（草稿零污染，与注释/回流同纪律）。
 *
 * - kind 'snippet'：纯引用（Codex「已选文本片段」同型）；
 * - kind 'comment'：引用 + 用户评论（Codex 文件评论同型）。
 * - sent 标记：发送成功后翻转，chip 只数未发送；条目保留（文件内可见性
 *   与内嵌卡片由后续迭代承接，当前 chip 展开可看/可删）。
 * @module dsh-sidenote/file-notes
 */

export interface FileNote {
  readonly id: number
  readonly sessionId: string
  readonly kind: 'snippet' | 'comment'
  /** 引用头：`相对路径[:起[-止]]`（better-sidebar selection-payload 生成）。 */
  readonly header: string
  readonly quote: string
  readonly note?: string
  readonly sent?: boolean
  readonly createdAt: number
}

export interface FileNoteSeed {
  readonly kind: 'snippet' | 'comment'
  readonly header: string
  readonly quote: string
  readonly note?: string
}

export interface FileNotesStore {
  getSnapshot(): number
  subscribe(fn: () => void): () => void
  list(sessionId: string): readonly FileNote[]
  listUnsent(sessionId: string): readonly FileNote[]
  add(sessionId: string, seed: FileNoteSeed): FileNote
  remove(sessionId: string, id: number): void
  markSent(sessionId: string, ids: readonly number[]): void
}

const STORAGE_PREFIX = 'dsh-sidenote:filenotes:v1:'

/** Two rows are the same note when every user-facing field matches. */
function sameNote(a: FileNote, b: FileNote): boolean {
  return a.sessionId === b.sessionId
    && a.kind === b.kind
    && a.header === b.header
    && a.quote === b.quote
    && (a.note ?? '') === (b.note ?? '')
}

function revive(value: unknown): FileNote | null {
  if (typeof value !== 'object' || value === null) return null
  const r = value as Record<string, unknown>
  if (typeof r.id !== 'number' || typeof r.sessionId !== 'string' || r.sessionId === '') return null
  if ((r.kind !== 'snippet' && r.kind !== 'comment') || typeof r.header !== 'string' || typeof r.quote !== 'string') return null
  return {
    id: r.id,
    sessionId: r.sessionId,
    kind: r.kind,
    header: r.header,
    quote: r.quote,
    ...(typeof r.note === 'string' && r.note.trim() !== '' ? { note: r.note } : {}),
    ...(r.sent === true ? { sent: true } : {}),
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : 0,
  }
}

export function createFileNotesStore(
  now: () => number = () => Date.now(),
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'> | null,
): FileNotesStore {
  let items: FileNote[] = []
  let nextId = 1
  let version = 0
  const listeners = new Set<() => void>()

  const store = storage === undefined
    ? (typeof localStorage !== 'undefined' ? localStorage : null)
    : storage

  const emit = (): void => {
    version += 1
    for (const listener of listeners) listener()
  }
  const persist = (sessionId: string): void => {
    if (store == null) return
    const rows = items.filter(item => item.sessionId === sessionId)
    try {
      if (rows.length === 0) store.removeItem(STORAGE_PREFIX + sessionId)
      else store.setItem(STORAGE_PREFIX + sessionId, JSON.stringify(rows))
    } catch (error) {
      console.warn('[dsh-sidenote] 文件片段持久化写入失败:', error)
    }
  }

  if (store != null) {
    try {
      const keys: string[] = []
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i)
        if (typeof key === 'string' && key.startsWith(STORAGE_PREFIX)) keys.push(key)
      }
      const foldedSessions = new Set<string>()
      for (const key of keys) {
        const parsed: unknown = JSON.parse(store.getItem(key) ?? 'null')
        if (!Array.isArray(parsed)) continue
        for (const raw of parsed) {
          const item = revive(raw)
          if (item === null) continue
          // 折叠历史重复行（旧版本 add 无去重写入的脏数据）：保留最小 id，
          // sent 取并集；被折叠的会话回写一次持久化。
          const dup = items.find(prev => sameNote(prev, item))
          if (dup !== undefined) {
            foldedSessions.add(item.sessionId)
            if (item.id < dup.id) {
              items = items.map(prev => prev === dup
                ? { ...item, sent: dup.sent === true || item.sent === true ? true : item.sent }
                : prev)
              nextId = Math.max(nextId, item.id + 1)
            } else if (item.sent === true && dup.sent !== true) {
              items = items.map(prev => prev === dup ? { ...prev, sent: true } : prev)
            }
            continue
          }
          items.push(item)
          nextId = Math.max(nextId, item.id + 1)
        }
      }
      for (const sessionId of foldedSessions) persist(sessionId)
    } catch (error) {
      console.warn('[dsh-sidenote] 文件片段持久化读取失败（按空起步）:', error)
    }
  }

  const store_: FileNotesStore = {
    getSnapshot: () => version,
    subscribe(fn) {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    list(sessionId) {
      return items.filter(item => item.sessionId === sessionId)
    },
    listUnsent(sessionId) {
      return items.filter(item => item.sessionId === sessionId && item.sent !== true)
    },
    add(sessionId, seed) {
      // 内容去重：同一会话里 kind/header/quote/note 完全相同的条目只存一份。
      // 提交路径可能因双击/重试触发两次 add，重复卡片即源于此；已有行保持
      // 原 id 与 sent 状态（重发窗口内不重复拼进协议块）。
      const existing = items.find(item => item.sessionId === sessionId
        && item.kind === seed.kind
        && item.header === seed.header
        && item.quote === seed.quote
        && item.note === (seed.note !== undefined && seed.note.trim() !== '' ? seed.note : undefined))
      if (existing !== undefined) return existing
      const item: FileNote = {
        id: nextId,
        sessionId,
        kind: seed.kind,
        header: seed.header,
        quote: seed.quote,
        ...(seed.note !== undefined && seed.note.trim() !== '' ? { note: seed.note } : {}),
        createdAt: now(),
      }
      nextId += 1
      items.push(item)
      persist(sessionId)
      emit()
      return item
    },
    remove(sessionId, id) {
      const target = items.find(item => item.sessionId === sessionId && item.id === id)
      if (target === undefined) return
      // 按 id 删除目标行，再兜底清掉同内容残留（历史重复未折叠时的
      // 幸存行）：保证卡片上的「删除」一次点击即清空该评论。
      items = items.filter(item => !(item.sessionId === sessionId
        && (item.id === id || (item.id !== target.id && sameNote(item, target)))))
      persist(sessionId)
      emit()
    },
    markSent(sessionId, ids) {
      const idSet = new Set(ids)
      let touched = false
      items = items.map(item => {
        if (item.sessionId !== sessionId || !idSet.has(item.id) || item.sent === true) return item
        touched = true
        return { ...item, sent: true }
      })
      if (!touched) return
      persist(sessionId)
      emit()
    },
  }
  return store_
}

/** 协议块（XML 族，与注释/回流同型）：每条一个 <file-note>。 */
export function buildFileNotesBlock(notes: readonly FileNote[]): string {
  const lines = notes.map(note => {
    const attrs = note.kind === 'comment' && note.note !== undefined
      ? ` note="${note.note.replace(/"/g, "'").replace(/\n/g, ' ')}"`
      : ''
    return `<file-note file="${note.header}"${attrs}>${note.quote}</file-note>`
  })
  return `<file-notes source="工作区文件划选">\n${lines.join('\n')}\n</file-notes>`
}

/** The window bridge better-sidebar's file viewers call into (optional hop).
 *  Magic 本地补丁扩了 list/remove/subscribe——文件内评论卡（better-sidebar
 *  预览 DOM）靠它读全量（含已发送）并响应增删。 */
interface FileNotesBridge {
  add(sessionId: string, seed: FileNoteSeed): void
  list(sessionId: string): readonly FileNote[]
  remove(sessionId: string, id: number): void
  subscribe(fn: () => void): () => void
}

const BRIDGE_KEY = '__dshSidenoteFileNotes'

/** Install the global bridge (idempotent; sidenote owns the key). */
export function installFileNotesBridge(store: FileNotesStore): void {
  ;(window as unknown as Record<string, unknown>)[BRIDGE_KEY] = {
    add: (sessionId: string, seed: FileNoteSeed): void => { store.add(sessionId, seed) },
    list: (sessionId: string): readonly FileNote[] => store.list(sessionId),
    remove: (sessionId: string, id: number): void => { store.remove(sessionId, id) },
    subscribe: (fn: () => void): (() => void) => store.subscribe(fn),
  } satisfies FileNotesBridge
}

/** Read the bridge from the other side (better-sidebar); null when absent. */
export function readSidenoteFileNotesBridge(): FileNotesBridge | null {
  const candidate = (window as unknown as Record<string, unknown>)[BRIDGE_KEY]
  if (typeof candidate !== 'object' || candidate === null) return null
  const add = (candidate as { add?: unknown }).add
  return typeof add === 'function' ? (candidate as FileNotesBridge) : null
}
