/**
 * Preview comment cards: the MutationObserver re-scan must keep one card per
 * store row. The live bug was that buildCommentCardDom never set
 * data-dsh-file-comment, so every preview mutation inserted another copy.
 */
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { mountFileCommentCards, type FileNoteItem, type SidenoteFileNotes } from '../src/client/file-comment-cards.ts'

function note(id: number, overrides: Partial<FileNoteItem> = {}): FileNoteItem {
  return {
    id,
    kind: 'comment',
    header: 'readme.md:3',
    quote: '由「海外端游市场」',
    note: '你好',
    ...overrides,
  }
}

function bridge(rows: FileNoteItem[]): SidenoteFileNotes {
  const listeners = new Set<() => void>()
  return {
    add() { /* unused */ },
    list: () => rows,
    remove(sessionId, id) {
      const at = rows.findIndex(item => item.id === id)
      if (at !== -1) rows.splice(at, 1)
      void sessionId
      for (const listener of listeners) listener()
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
  }
}

describe('preview file comment cards', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  it('inserts one flagged card and does not duplicate on later mutations', async () => {
    const surface = document.createElement('div')
    surface.innerHTML = '<p>由「海外端游市场」「国内端游市场」两位成员并行调研汇总而成</p>'
    document.body.append(surface)
    const rows = [note(1)]
    const stop = mountFileCommentCards(bridge(rows), {
      getSessionId: () => 's1',
      getPath: () => 'readme.md',
      getCwd: () => undefined,
      getSurface: () => surface,
    })
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(surface.querySelectorAll('[data-dsh-file-comment]')).toHaveLength(1)
    expect(surface.querySelector('[data-dsh-file-comment="1"]')?.textContent).toContain('你好')

    const extra = document.createElement('p')
    extra.textContent = '详细来源与不确定性说明见两份分报告。'
    surface.append(extra)
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(surface.querySelectorAll('[data-dsh-file-comment]')).toHaveLength(1)
    stop()
  })

  it('folds identical store rows into a single card', async () => {
    const surface = document.createElement('div')
    surface.innerHTML = '<p>由「海外端游市场」两位成员并行调研汇总而成</p>'
    document.body.append(surface)
    const rows = [note(1), note(2), note(3), note(4)]
    const stop = mountFileCommentCards(bridge(rows), {
      getSessionId: () => 's1',
      getPath: () => 'readme.md',
      getCwd: () => undefined,
      getSurface: () => surface,
    })
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(surface.querySelectorAll('[data-dsh-file-comment]')).toHaveLength(1)
    stop()
  })

  it('collapses leftover unflagged cards from the previous insert bug', async () => {
    const surface = document.createElement('div')
    const paragraph = document.createElement('p')
    paragraph.textContent = '由「海外端游市场」两位成员并行调研汇总而成'
    surface.append(paragraph)
    for (let i = 0; i < 3; i += 1) {
      const leftover = document.createElement('div')
      leftover.textContent = '你 你 第 3 行的本地评论 你好 删除'
      paragraph.after(leftover)
    }
    document.body.append(surface)
    const rows = [note(1)]
    const stop = mountFileCommentCards(bridge(rows), {
      getSessionId: () => 's1',
      getPath: () => 'readme.md',
      getCwd: () => undefined,
      getSurface: () => surface,
    })
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(surface.querySelectorAll('[data-dsh-file-comment]')).toHaveLength(1)
    expect([...surface.children].filter(node => node !== paragraph)).toHaveLength(1)
    stop()
  })
})
