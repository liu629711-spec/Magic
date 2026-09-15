/**
 * 文件划选片段/评论 store 的回归测试（2026-09-14 评论重复 bug）：
 * 内容去重、历史重复折叠、删除兜底。node 环境纯函数测试。
 */
import { describe, expect, it } from 'vitest'
import { createFileNotesStore } from '../src/client/annotate/file-notes.ts'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'> & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    get length() { return data.size },
    key: i => [...data.keys()][i] ?? null,
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v) },
    removeItem: k => { data.delete(k) },
  }
}

describe('file notes store', () => {
  it('add dedupes identical content and returns the existing row', () => {
    const store = createFileNotesStore(() => 1, memoryStorage())
    const seed = { kind: 'comment' as const, header: 'docs/readme.md:5', quote: 'hello world', note: '你好' }
    const a = store.add('s1', seed)
    const b = store.add('s1', { ...seed })
    expect(b.id).toBe(a.id)
    expect(store.list('s1')).toHaveLength(1)
  })

  it('add keeps rows that differ in note or quote', () => {
    const store = createFileNotesStore(() => 1, memoryStorage())
    store.add('s1', { kind: 'comment', header: 'f.md:1', quote: 'a', note: 'x' })
    store.add('s1', { kind: 'comment', header: 'f.md:1', quote: 'a', note: 'y' })
    store.add('s1', { kind: 'comment', header: 'f.md:1', quote: 'b', note: 'x' })
    expect(store.list('s1')).toHaveLength(3)
  })

  it('revive folds historical duplicate rows into one (min id, sent union)', () => {
    const storage = memoryStorage()
    storage.setItem('dsh-sidenote:filenotes:v1:s1', JSON.stringify([
      { id: 3, sessionId: 's1', kind: 'comment', header: 'f.md:2', quote: 'dup', note: 'n', sent: true, createdAt: 1 },
      { id: 1, sessionId: 's1', kind: 'comment', header: 'f.md:2', quote: 'dup', note: 'n', createdAt: 2 },
      { id: 2, sessionId: 's1', kind: 'comment', header: 'f.md:2', quote: 'dup', note: 'n', createdAt: 3 },
    ]))
    const store = createFileNotesStore(() => 1, storage)
    const rows = store.list('s1')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.id).toBe(1)
    expect(rows[0]!.sent).toBe(true)
  })

  it('remove is idempotent for an already-folded id and still clears stragglers', () => {
    const storage = memoryStorage()
    storage.setItem('dsh-sidenote:filenotes:v1:s1', JSON.stringify([
      { id: 1, sessionId: 's1', kind: 'comment', header: 'f.md:3', quote: 'q', note: 'n', createdAt: 1 },
      { id: 7, sessionId: 's1', kind: 'comment', header: 'f.md:3', quote: 'q', note: 'n', createdAt: 2 },
    ]))
    const store = createFileNotesStore(() => 1, storage)
    // 构造时折叠已把 7 并进 1，remove(7) 是幂等空操作。
    store.remove('s1', 7)
    expect(store.list('s1')).toHaveLength(1)
    // 删除幸存行即清空该评论（同内容兜底覆盖其它未折叠残留）。
    store.remove('s1', 1)
    expect(store.list('s1')).toHaveLength(0)
    expect(storage.getItem('dsh-sidenote:filenotes:v1:s1')).toBeNull()
  })

  it('remove across sessions or with a different id keeps other rows', () => {
    const store = createFileNotesStore(() => 1, memoryStorage())
    store.add('s1', { kind: 'comment', header: 'f.md:1', quote: 'q1' })
    store.add('s2', { kind: 'comment', header: 'f.md:1', quote: 'q1' })
    store.add('s1', { kind: 'comment', header: 'f.md:2', quote: 'q2' })
    store.remove('s1', 1)
    expect(store.list('s1')).toHaveLength(1)
    expect(store.list('s2')).toHaveLength(1)
  })
})
