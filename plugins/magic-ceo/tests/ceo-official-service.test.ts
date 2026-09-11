/**
 * 官方 Agent Teams 服务读口（`readAgentTeams`）的隔离测试。
 *
 * 这一层只验一件事：**它是可选增强**。官方服务缺失或形状不符时必须返回
 * `undefined`，让 CEO 原样退回到 `ctx.subagents`，而不是抛错或半启用。
 * 这与 `readLedger` 是同一条准则，因此测试结构也照它写。
 *
 * 真实环境里"服务到底有没有注册"不靠单测证明 —— Cordis 的 inject 缺依赖是
 * **静默**的，只能靠真实启动日志（`agent-team service available/absent`）确认。
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { readAgentTeams } from '../src/index.ts'

const FULL = {
  spawnTeammate: async () => ({}),
  sendMessage: async () => ({}),
}

test('服务未挂载（服务名未注册）⇒ 返回 undefined', () => {
  assert.equal(readAgentTeams({ get: () => undefined }), undefined)
})

test('宿主没有 ctx.get（旧内核）⇒ 返回 undefined，不抛错', () => {
  assert.equal(readAgentTeams({}), undefined)
})

test('注册了同名服务但不是对象 ⇒ 返回 undefined', () => {
  assert.equal(readAgentTeams({ get: () => null }), undefined)
  assert.equal(readAgentTeams({ get: () => 'agentTeams' }), undefined)
})

test('形状不符：缺 spawnTeammate ⇒ 返回 undefined', () => {
  assert.equal(readAgentTeams({ get: () => ({ sendMessage: FULL.sendMessage }) }), undefined)
})

test('形状不符：缺 sendMessage ⇒ 返回 undefined', () => {
  assert.equal(readAgentTeams({ get: () => ({ spawnTeammate: FULL.spawnTeammate }) }), undefined)
})

test('形状不符：同名字段不是函数 ⇒ 返回 undefined', () => {
  assert.equal(readAgentTeams({ get: () => ({ spawnTeammate: 1, sendMessage: 2 }) }), undefined)
})

test('形状正确 ⇒ 原样返回该服务（不做包装、不复制）', () => {
  const service = { ...FULL }
  assert.equal(readAgentTeams({ get: name => (name === 'agentTeams' ? service : undefined) }), service)
})

test('只读 agentTeams，不误取别的服务名', () => {
  const seen: string[] = []
  readAgentTeams({ get: name => { seen.push(name); return undefined } })
  assert.deepEqual(seen, ['agentTeams'])
})
