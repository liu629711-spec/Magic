import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildRunPlan, parseDelegateTasks } from '../src/builder.ts'
import { RunPlanError } from '../src/plan.ts'
import { WaveScheduler } from '../src/wave.ts'

test('independent tasks sit in one wave', () => {
  const plan = buildRunPlan(parseDelegateTasks({
    tasks: [
      { role: 'researcher', task: 'Survey options', id: 'survey' },
      { role: 'reviewer', task: 'List risks', id: 'risks' },
    ],
  }), 'del_1')
  const waves = plan.waves()
  assert.equal(waves.length, 1)
  assert.deepEqual(waves[0]?.map(node => node.rawId), ['survey', 'risks'])
})

test('depends_on occupies successive waves and resolves role names', () => {
  const plan = buildRunPlan(parseDelegateTasks({
    tasks: [
      { role: 'researcher', task: 'Survey options' },
      { role: 'implementer', task: 'Build it', depends_on: ['researcher'] },
    ],
  }), 'del_1')
  const waves = plan.waves()
  assert.equal(waves.length, 2)
  assert.equal(waves[0]?.[0]?.role, 'researcher')
  assert.equal(waves[1]?.[0]?.role, 'implementer')
  assert.equal(waves[1]?.[0]?.dependsOn[0], waves[0]?.[0]?.runId)
})

test('rejects a cycle', () => {
  assert.throws(() => buildRunPlan(parseDelegateTasks({
    tasks: [
      { id: 'a', role: 'one', task: 'A', depends_on: ['b'] },
      { id: 'b', role: 'two', task: 'B', depends_on: ['a'] },
    ],
  }), 'del_1'), RunPlanError)
})

test('scheduler starts a dependent node only after its producer finishes', async () => {
  const plan = buildRunPlan(parseDelegateTasks({
    tasks: [
      { id: 'survey', role: 'researcher', task: 'Survey' },
      { id: 'build', role: 'implementer', task: 'Build', depends_on: ['survey'] },
    ],
  }), 'del_1')
  const order: string[] = []
  const release = Promise.withResolvers<void>()
  const running = new WaveScheduler().run(plan, async (spec) => {
    order.push(`start:${spec.rawId}`)
    if (spec.rawId === 'survey') await release.promise
    order.push(`done:${spec.rawId}`)
    return { phase: 'completed', output: spec.rawId }
  })
  await new Promise<void>(resolve => { setImmediate(resolve) })
  assert.deepEqual(order, ['start:survey'])
  release.resolve()
  const results = await running
  assert.equal(results.get(plan.nodes[0]!.runId)?.phase, 'completed')
  assert.equal(results.get(plan.nodes[1]!.runId)?.phase, 'completed')
  assert.deepEqual(order, ['start:survey', 'done:survey', 'start:build', 'done:build'])
})

test('progress reports running roots while dependents stay queued', async () => {
  const plan = buildRunPlan(parseDelegateTasks({
    tasks: [
      { id: 'survey', role: 'researcher', task: 'Survey' },
      { id: 'build', role: 'implementer', task: 'Build', depends_on: ['survey'] },
    ],
  }), 'del_1')
  const ticks: string[][] = []
  const release = Promise.withResolvers<void>()
  const running = new WaveScheduler().run(plan, async (spec) => {
    if (spec.rawId === 'survey') await release.promise
    return { phase: 'completed', memberId: spec.rawId }
  }, undefined, (snapshot) => {
    ticks.push(plan.nodes.map(node => `${node.rawId}:${snapshot.get(node.runId)?.phase ?? 'missing'}`))
  })
  await new Promise<void>(resolve => { setImmediate(resolve) })
  assert.deepEqual(ticks[0], ['survey:running', 'build:queued'])
  release.resolve()
  const results = await running
  assert.ok(ticks.some(tick => tick[0] === 'survey:running' && tick[1] === 'build:queued'))
  assert.ok(ticks.some(tick => tick[0] === 'survey:completed' && tick[1] === 'build:running'))
  assert.deepEqual(ticks.at(-1), ['survey:completed', 'build:completed'])
  assert.equal(results.get(plan.nodes[0]!.runId)?.phase, 'completed')
  assert.equal(results.get(plan.nodes[1]!.runId)?.phase, 'completed')
})

test('a failed producer skips its dependents', async () => {
  const plan = buildRunPlan(parseDelegateTasks({
    tasks: [
      { id: 'survey', role: 'researcher', task: 'Survey' },
      { id: 'build', role: 'implementer', task: 'Build', depends_on: ['survey'] },
    ],
  }), 'del_1')
  const started: string[] = []
  const results = await new WaveScheduler().run(plan, async (spec) => {
    started.push(spec.rawId)
    return { phase: 'failed', error: 'no' }
  })
  assert.deepEqual(started, ['survey'])
  assert.equal(results.get(plan.nodes[0]!.runId)?.phase, 'failed')
  assert.equal(results.get(plan.nodes[1]!.runId)?.phase, 'skipped')
})
