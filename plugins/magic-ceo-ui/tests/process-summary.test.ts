import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  classifyToolName,
  summarizeProcessSteps,
  timelineDefaultExpanded,
  type ProcessSummary,
} from '../src/process-summary.ts'
import type { CeoProcessStep } from '../src/team.ts'

function tool(name: string, status: 'running' | 'ok' | 'error' = 'ok'): CeoProcessStep {
  return { kind: 'tool', toolCallId: `${name}-${String(Math.random())}`, name, status }
}

test('classifyToolName：DSH 工具名映射到 探索/搜索/编辑/运行，未知进 other', () => {
  assert.equal(classifyToolName('read'), 'explore')
  assert.equal(classifyToolName('glob'), 'explore')
  assert.equal(classifyToolName('web_fetch'), 'explore')
  assert.equal(classifyToolName('grep'), 'search')
  assert.equal(classifyToolName('web_search'), 'search')
  assert.equal(classifyToolName('edit'), 'edit')
  assert.equal(classifyToolName('write'), 'edit')
  // 顺序敏感：todo_write 含 write，归编辑而非探索
  assert.equal(classifyToolName('todo_write'), 'edit')
  assert.equal(classifyToolName('bash'), 'run')
  assert.equal(classifyToolName('run_command'), 'run')
  assert.equal(classifyToolName('mystery_tool'), 'other')
})

test('summarizeProcessSteps：只数工具步，running 优先呈现', () => {
  const steps: CeoProcessStep[] = [
    { kind: 'reasoning', text: '想一想' },
    tool('read'),
    tool('grep'),
    tool('edit'),
    tool('bash', 'error'),
    tool('bash', 'running'),
    { kind: 'content', text: '正文' },
  ]
  const summary = summarizeProcessSteps(steps)
  assert.equal(summary.total, 5)
  assert.equal(summary.running, true)
  assert.equal(summary.counts.explore, 1)
  assert.equal(summary.counts.search, 1)
  assert.equal(summary.counts.edit, 1)
  assert.equal(summary.counts.run, 2)
})

test('timelineDefaultExpanded：运行中永远展开；完成态超过阈值默认折叠', () => {
  const running: ProcessSummary = {
    running: true,
    total: 20,
    counts: { explore: 0, search: 0, edit: 0, run: 20, other: 0 },
  }
  assert.equal(timelineDefaultExpanded(running), true)
  const few: ProcessSummary = {
    running: false,
    total: 7,
    counts: { explore: 7, search: 0, edit: 0, run: 0, other: 0 },
  }
  assert.equal(timelineDefaultExpanded(few), true)
  const many: ProcessSummary = {
    running: false,
    total: 8,
    counts: { explore: 8, search: 0, edit: 0, run: 0, other: 0 },
  }
  assert.equal(timelineDefaultExpanded(many), false)
})

// CeoProcessTimeline 依赖 react（测试环境解析不到），静态契约钉住接线：
// 摘要行必须真的消费 summarizeProcessSteps，且折叠判定走 timelineDefaultExpanded。
test('时间线组件必须接过程摘要与折叠判定', async () => {
  const timeline = await readFile(new URL('../src/client/CeoProcessTimeline.ts', import.meta.url), 'utf8')
  assert.match(timeline, /summarizeProcessSteps\(steps\)/)
  assert.match(timeline, /timelineDefaultExpanded\(summary\)/)
  assert.match(timeline, /data-magic-ceo-process-summary/)
  const inspector = await readFile(new URL('../src/client/CeoMemberInspector.ts', import.meta.url), 'utf8')
  assert.match(inspector, /useElapsedSeconds\(true\)/)
})
