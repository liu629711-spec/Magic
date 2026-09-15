import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import {
  producedFileName,
  producedFilesFromProcess,
  resolveProducedPath,
} from '../src/produced-files.ts'
import type { CeoProcessStep } from '../src/team.ts'

function tool(
  name: string,
  args: string | undefined,
  status: 'running' | 'ok' | 'error' = 'ok',
): CeoProcessStep {
  return {
    kind: 'tool',
    toolCallId: `${name}-${args ?? 'none'}`,
    name,
    ...args === undefined ? {} : { args },
    status,
  }
}

test('producedFilesFromProcess：只收成功 write/edit，路径去重保序', () => {
  const steps: CeoProcessStep[] = [
    { kind: 'reasoning', text: '想一想' },
    tool('read', '{"file_path":"notes.md"}'),
    tool('write', '{"file_path":"out/report.md","content":"# ok"}'),
    tool('edit', '{"file_path":"out/report.md","old_string":"a","new_string":"b"}'),
    tool('write', '{"file_path":"out/notes.md","content":"x"}', 'error'),
    tool('write', '{"file_path":"out/draft.md","content":"y"}', 'running'),
    tool('web_search', '{"query":"market"}'),
    tool('write', '{"file_path":"out/slides.md","content":"z"}'),
  ]
  assert.deepEqual(producedFilesFromProcess(steps), ['out/report.md', 'out/slides.md'])
})

test('producedFilesFromProcess：str_replace_editor 只收会改文件的 command', () => {
  assert.deepEqual(producedFilesFromProcess([
    tool('str_replace_editor', '{"command":"view","path":"a.ts"}'),
    tool('str_replace_editor', '{"command":"create","path":"b.ts","file_text":"x"}'),
    tool('str_replace_editor', '{"command":"str_replace","path":"c.ts","old_str":"a","new_str":"b"}'),
  ]), ['b.ts', 'c.ts'])
})

test('producedFilesFromProcess：空过程、读文件、失败调用都不出清单', () => {
  assert.deepEqual(producedFilesFromProcess([]), [])
  assert.deepEqual(producedFilesFromProcess([
    tool('read', '{"file_path":"a.ts"}'),
    tool('write', '{"file_path":"b.ts","content":"x"}', 'error'),
  ]), [])
})

test('producedFilesFromProcess：截断 write JSON 仍能从 file_path 或结果信封取路径', () => {
  const truncated = `{"content":"# ${'x'.repeat(80)}…`
  assert.throws(() => JSON.parse(truncated))
  assert.deepEqual(producedFilesFromProcess([
    tool('write', '{"content":"# long","file_path":"海外端游市场调研.md","extra":'),
  ]), ['海外端游市场调研.md'])
  assert.deepEqual(producedFilesFromProcess([{
    kind: 'tool',
    toolCallId: 'write-result',
    name: 'write',
    args: truncated,
    result: '<path>海外端游市场调研.md</path>\n<type>file</type>\n<content>\nCreated file\n</content>',
    status: 'ok',
  }]), ['海外端游市场调研.md'])
})

test('producedFileName / resolveProducedPath：芯片短名，相对路径接到 cwd', () => {
  assert.equal(producedFileName('out/report.md'), 'report.md')
  assert.equal(producedFileName('C:\\tmp\\a.md'), 'a.md')
  assert.equal(resolveProducedPath('/ws', 'out/a.md'), '/ws/out/a.md')
  assert.equal(resolveProducedPath('/ws', '/abs/a.md'), '/abs/a.md')
  assert.equal(resolveProducedPath('D:\\ws', 'out\\a.md'), 'D:\\ws\\out\\a.md')
})

test('右坞成员详情必须画出本轮文件改动芯片并接到打开入口', async () => {
  const inspector = await readFile(new URL('../src/client/CeoMemberInspector.ts', import.meta.url), 'utf8')
  assert.match(inspector, /producedFilesFromProcess/)
  assert.match(inspector, /data-magic-ceo-produced/)
  assert.match(inspector, /onOpenFile/)
  const workspace = await readFile(new URL('../src/client/CeoWorkspace.ts', import.meta.url), 'utf8')
  assert.match(workspace, /onOpenFile/)
  const register = await readFile(new URL('../src/client/register.ts', import.meta.url), 'utf8')
  assert.match(register, /betterSidebar/)
  assert.match(register, /resolveProducedPath/)
  assert.match(register, /produced\.label/)
})
