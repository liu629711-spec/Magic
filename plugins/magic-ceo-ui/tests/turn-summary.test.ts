import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  categorizeToolNames,
  collectTurnToolNames,
  EMPTY_TURN_TOOL_SUMMARY,
  selectTurnTools,
  type TurnNodeLike,
  type TurnProcessSpecLike,
} from '../src/turn-summary.ts'

function spec(overrides: Partial<TurnProcessSpecLike> = {}): TurnProcessSpecLike {
  return {
    turn: 3,
    processStartSeq: 10,
    answerAnchorSeq: 30,
    toolCallCount: 2,
    messageCount: 0,
    subagentCount: 0,
    ...overrides,
  }
}

function node(seq: number, kind: string, name?: string): TurnNodeLike {
  return { kind, seq, ...(kind === 'tool-result' ? { call: name === undefined ? null : { name } } : {}) }
}

test('collectTurnToolNames：按 process 区间收集 tool-result 的工具名', () => {
  const nodes: TurnNodeLike[] = [
    node(5, 'user'),
    node(8, 'tool-result', 'read'),      // 上一轮的（区间前）
    node(12, 'tool-result', 'grep'),
    node(14, 'tool-result', 'edit'),
    node(16, 'tool-result'),             // 窗口截断：call 缺头
    node(40, 'tool-result', 'bash'),     // 答案锚点之后（下一轮）
  ]
  const names = collectTurnToolNames(nodes, spec())
  assert.deepEqual(names, ['grep', 'edit', 'unknown'])
})

test('collectTurnToolNames：answerAnchorSeq 为 null（轮次未收口）时不设上界', () => {
  const nodes: TurnNodeLike[] = [
    node(12, 'tool-result', 'bash'),
    node(14, 'tool-result', 'read'),
  ]
  assert.deepEqual(collectTurnToolNames(nodes, spec({ answerAnchorSeq: null })), ['bash', 'read'])
})

test('categorizeToolNames：复用 process-summary 的分类', () => {
  const counts = categorizeToolNames(['read', 'read', 'grep', 'edit', 'bash', 'mystery'])
  assert.deepEqual(counts, { explore: 2, search: 1, edit: 1, run: 1, other: 1 })
})

test('selectTurnTools：快照缺 legacy 切片时返回稳定空摘要', () => {
  assert.equal(selectTurnTools({}, spec()), EMPTY_TURN_TOOL_SUMMARY)
  assert.equal(selectTurnTools({ legacy: {} }, spec()), EMPTY_TURN_TOOL_SUMMARY)
})

test('selectTurnTools：同快照同区间返回同一引用（useChat Object.is 硬要求）', () => {
  const timings = new Map([[3, { startTime: 1000, endTime: 4000 }]])
  const snapshot = { legacy: { nodes: [node(12, 'tool-result', 'grep')], turnTimings: timings } }
  const first = selectTurnTools(snapshot, spec())
  const second = selectTurnTools(snapshot, spec())
  assert.equal(second, first)
  assert.equal(first.startTime, 1000)
  assert.equal(first.endTime, 4000)
  assert.deepEqual(first.names, ['grep'])
  // 节点数组身份变化才重算
  const nextSnapshot = { legacy: { nodes: [node(12, 'tool-result', 'edit')], turnTimings: timings } }
  assert.notEqual(selectTurnTools(nextSnapshot, spec()), first)
  assert.deepEqual(selectTurnTools(nextSnapshot, spec()).names, ['edit'])
})

// register.ts 不 import react（组件走 components 袋子注入），静态契约钉住：
// turn-process 替换渲染器确实注册进了 keyed 槽位。
test('turn-process 渲染器替换必须注册（同 key 替换语义）', async () => {
  const source = await readFile(new URL('../src/client/register.ts', import.meta.url), 'utf8')
  assert.match(source, /key: 'turn-process'/)
  assert.match(source, /components\.turnProcess/)
  const entry = await readFile(new URL('../src/client/index.ts', import.meta.url), 'utf8')
  assert.match(entry, /turnProcess: TurnProcessSummary/)
})
