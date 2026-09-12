import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { failureCardOf, waitingOnOf } from '../src/failure-card.ts'
import type { CeoTeamMember, CeoProcessStep } from '../src/team.ts'

function member(overrides: Partial<CeoTeamMember> = {}): CeoTeamMember {
  return {
    callId: 'b',
    batchCallId: 'c1',
    seq: 2,
    role: 'tester',
    task: '跑测试',
    dependsOn: [],
    status: 'ok',
    ...overrides,
  } as unknown as CeoTeamMember
}

function failedReport(status: 'failed' | 'blocked'): CeoTeamMember['report'] {
  return { status, notDone: '回归测试第 2 节', risksOrBlockers: '环境缺依赖' } as CeoTeamMember['report']
}

test('失败成员：取最后一个失败工具步的工具名与结果文本', () => {
  const steps: CeoProcessStep[] = [
    { kind: 'tool', toolCallId: 't1', name: '运行测试', result: 'ok', status: 'ok' },
    { kind: 'tool', toolCallId: 't2', name: '运行测试', result: 'AssertionError: expected 3', status: 'error' },
  ]
  const card = failureCardOf(member({ status: 'ok', report: failedReport('failed'), process: steps }))
  assert.equal(card?.kind, 'failed')
  assert.equal(card?.toolName, '运行测试')
  assert.equal(card?.errorText, 'AssertionError: expected 3')
  assert.equal(card?.notDone, '回归测试第 2 节')
})

test('失败成员：没有失败工具步时回退 lastMessage；原始 status=error 也算失败', () => {
  const card = failureCardOf(member({ status: 'error', lastMessage: '构建失败：缺少依赖' }))
  assert.equal(card?.kind, 'failed')
  assert.equal(card?.toolName, undefined)
  assert.equal(card?.errorText, '构建失败：缺少依赖')
})

test('阻塞成员：waitingOn 把 dependsOn 映射成上游角色名', () => {
  const upstream = member({ callId: 'a', seq: 1, role: 'researcher' })
  const roster = [upstream, member()]
  const blocked = member({ report: failedReport('blocked'), dependsOn: ['a', 'ghost'] })
  const card = failureCardOf(blocked, roster)
  assert.equal(card?.kind, 'blocked')
  assert.deepEqual(card?.waitingOn, ['researcher', 'ghost'])
  assert.equal(card?.blockers, '环境缺依赖')
  // 独立导出：画布徽标复用同一映射
  assert.deepEqual(waitingOnOf(blocked, roster), ['researcher', 'ghost'])
})

test('runId 缺省回退 rawId，供重试/重规划动作定位', () => {
  const card = failureCardOf(member({ status: 'ok', report: failedReport('failed'), rawId: 'run-9' }))
  assert.equal(card?.runId, 'run-9')
})

test('健康成员不出卡', () => {
  for (const candidate of [
    member({ status: 'running' }),
    member({ status: 'queued' }),
    member({ status: 'ok', report: { status: 'completed' } as CeoTeamMember['report'] }),
  ]) {
    assert.equal(failureCardOf(candidate, []), undefined)
  }
})

// CeoMemberInspector 依赖 react（测试环境解析不到），组件代码不被本套件加载——
// 与 TaskBoard 的先例相同，用静态契约钉住接线。
test('成员详情必须接失败卡（failureCardOf + MemberFailureCard）', async () => {
  const source = await readFile(new URL('../src/client/CeoMemberInspector.ts', import.meta.url), 'utf8')
  assert.match(source, /failureCardOf\(member, roster\)/)
  assert.match(source, /h\(MemberFailureCard, \{/)
  // 动作必须走既有 onIntervene 通道（ceo_replan），不得自造新 RPC
  assert.match(source, /onIntervene\('replan', replanNoteFor\(failureCard\)\)/)
})
