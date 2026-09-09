import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply, listCeoMembers, resetCeoStateForTests, CEO_MEMBER_RESULT, CEO_RUN_JOURNAL, CEO_RUN_PROCESS } from '../src/index.ts'

function journalSession(id: string) {
  const events: Array<{ type: string; seq: number; time: number; data: unknown; ignorable?: true }> = [
    { type: 'turn/start', seq: 0, time: 1, data: { turn: 4 } },
  ]
  return {
    id,
    events,
    snapshotEvents: () => events,
    append: (type: string, data: unknown) => {
      const event = { type, seq: events.length, time: Date.now(), data }
      Object.freeze(event)
      events.push(event)
      return event
    },
  }
}

function harness(mode: 'agent' | 'ceo' = 'ceo') {
  resetCeoStateForTests()

  const sections: Array<{
    name: string
    order: number
    text?: string | ((context?: { agent?: { session?: { id?: string } } }) => string)
  }> = []
  const tools = new Map<string, Parameters<Parameters<typeof apply>[0]['tools']['register']>[0]>()
  const started: Array<{ provider: string; label: string; prompt: string; parentId: string }> = []
  const release = new Map<string, () => void>()
  const listeners: Array<(session: { id: string }, event: unknown) => void> = []

  apply({
    magicWorkMode: {
      getMode: () => mode,
    },
    systemPrompt: {
      section: (section) => {
        sections.push(section)
      },
    },
    tools: {
      register: (definition) => {
        tools.set(definition.name, definition)
      },
    },
    subagents: {
      start: async (provider, request) => {
        const id = `member-${String(started.length + 1)}`
        started.push({
          provider,
          label: request.label,
          prompt: request.prompt[0]?.text ?? '',
          parentId: request.parent.session.id,
        })
        let resolve!: (value: { output: Array<{ type: 'text'; text: string }>; stopReason: string }) => void
        const result = new Promise<{ output: Array<{ type: 'text'; text: string }>; stopReason: string }>((next) => {
          resolve = next
        })
        release.set(id, (output = `done by ${id}`, stopReason = 'completed') => {
          resolve({
            output: [{ type: 'text', text: output }],
            stopReason,
          })
        })
        return {
          id,
          localAgent: {
            session: {
              id,
              snapshotEvents: () => [],
            },
          },
          result,
          dispose: async () => {},
        }
      },
    },
    on: (_event, listener) => {
      listeners.push(listener as (session: { id: string }, event: unknown) => void)
    },
  })

  const emitChild = (id: string, event: { type: string; seq: number; data: unknown }) => {
    for (const listener of listeners) listener({ id }, event)
  }

  return { sections, tool: () => tools.get('ceo_delegate'), plan: () => tools.get('ceo_plan'), started, release, emitChild }
}

async function recordPlan(
  plan: ReturnType<typeof harness>['plan'],
  tasks: unknown[],
  session = journalSession('session-1'),
) {
  const tool = plan()
  assert.ok(tool)
  await tool.execute({
    summary: 'Deliver a researched answer.',
    analysis: 'Split independent evidence gathering, then synthesize only after sources and acceptance are clear.',
    tasks,
  }, { agent: { session }, signal: new AbortController().signal })
  return session
}

test('registers a CEO prompt section and ceo_delegate tool', () => {
  const { sections, tool, plan } = harness()
  assert.equal(sections[0]?.name, 'magic-ceo')
  assert.equal(tool()?.name, 'ceo_delegate')
  assert.equal(plan()?.name, 'ceo_plan')
  const text = typeof sections[0]?.text === 'function' ? sections[0].text() : ''
  assert.match(text, /tasks\[\]/)
  assert.match(text, /send_message/)
  assert.match(text, /Do not paste JSON schemas/)
  assert.match(text, /Do not call ceo_delegate/)
})

test('CEO session prompt hard-routes breadth research to ceo_delegate', () => {
  const { sections } = harness('ceo')
  const textFn = sections[0]?.text
  assert.equal(typeof textFn, 'function')
  const text = textFn({ agent: { session: { id: 'session-1' } } })
  assert.match(text, /in CEO mode now/)
  assert.match(text, /first stream a useful analysis/)
  assert.match(text, /ceo_plan/)
  assert.match(text, /Do not perform breadth web research yourself/)
  assert.match(text, /海内外/)
  assert.doesNotMatch(text, /Do not call ceo_delegate/)
})

test('agent session prompt still forbids ceo_delegate', () => {
  const { sections } = harness('agent')
  const textFn = sections[0]?.text
  assert.equal(typeof textFn, 'function')
  const text = textFn({ agent: { session: { id: 'session-1' } } })
  assert.match(text, /in agent mode/)
  assert.match(text, /Do not call ceo_delegate/)
  assert.doesNotMatch(text, /in CEO mode now/)
})

test('rejects delegation unless the session is in CEO mode', async () => {
  const { tool } = harness('agent')
  const delegate = tool()
  assert.ok(delegate)

  await assert.rejects(
    () => delegate.execute(
      { tasks: [{ role: 'reviewer', task: 'Review the API.' }] },
      { agent: { session: { id: 'session-1' } }, signal: new AbortController().signal },
    ),
    /CEO work mode/,
  )
})

test('requires a matching plan before complex delegation', async () => {
  const { tool, plan } = harness('ceo')
  const delegate = tool()
  assert.ok(delegate)

  const tasks = [
    { role: 'market researcher', task: 'Survey the market', id: 'market' },
    { role: 'source reviewer', task: 'Validate the sources', id: 'sources' },
  ]
  await assert.rejects(
    () => delegate.execute(
      { tasks },
      { agent: { session: { id: 'session-1' } }, signal: new AbortController().signal },
    ),
    /requires ceo_plan first/,
  )

  await recordPlan(plan, tasks)
  await assert.rejects(
    () => delegate.execute(
      { tasks: [{ role: 'market researcher', task: 'Survey another market', id: 'market' }] },
      { agent: { session: { id: 'session-1' } }, signal: new AbortController().signal },
    ),
    /do not match the latest CEO plan/,
  )
})

test('starts independent tasks together and records the run graph', async () => {
  const { tool, plan, started, release } = harness('ceo')
  const delegate = tool()
  assert.ok(delegate)

  await recordPlan(plan, [
    { role: 'researcher', task: 'Survey options', id: 'survey' },
    { role: 'reviewer', task: 'List risks', id: 'risks' },
  ])

  const pending = delegate.execute(
    {
      tasks: [
        { role: 'researcher', task: 'Survey options', id: 'survey' },
        { role: 'reviewer', task: 'List risks', id: 'risks' },
      ],
    },
    { agent: { session: { id: 'session-1' } }, signal: new AbortController().signal },
  )

  await Promise.resolve()
  assert.equal(started.length, 2)
  assert.equal(started[0]?.provider, 'spawn')
  assert.match(started[0]?.prompt ?? '', /status: completed \| blocked \| failed \| partial/)
  assert.match(started[0]?.prompt ?? '', /Survey options/)
  release.get('member-1')?.()
  release.get('member-2')?.()
  const result = await pending
  assert.equal(result.runs.length, 2)
  assert.equal(result.runs[0]?.phase, 'completed')
  assert.equal(listCeoMembers('session-1')[0]?.role, 'researcher')
  assert.equal(listCeoMembers('session-1')[0]?.task, 'Survey options')
})

test('does not start a dependent task until the producer finishes', async () => {
  const { tool, plan, started, release } = harness('ceo')
  const delegate = tool()
  assert.ok(delegate)

  await recordPlan(plan, [
    { role: 'researcher', task: 'Survey options', id: 'survey' },
    { role: 'implementer', task: 'Build it', depends_on: ['survey'] },
  ])

  const pending = delegate.execute(
    {
      tasks: [
        { role: 'researcher', task: 'Survey options', id: 'survey' },
        { role: 'implementer', task: 'Build it', depends_on: ['survey'] },
      ],
    },
    { agent: { session: { id: 'session-1' } }, signal: new AbortController().signal },
  )

  await Promise.resolve()
  assert.equal(started.length, 1)
  assert.equal(started[0]?.label, 'researcher')
  release.get('member-1')?.()
  for (let i = 0; i < 20 && started.length < 2; i++) {
    await new Promise<void>(resolve => { setImmediate(resolve) })
  }
  assert.equal(started.length, 2)
  assert.match(started[1]?.prompt ?? '', /Upstream results/)
  release.get('member-2')?.()
  const result = await pending
  assert.equal(result.runs[1]?.phase, 'completed')
  assert.equal(listCeoMembers('session-1')[1]?.dependsOn[0], result.runs[0]?.runId)
})

test('appends an ignorable run journal while the graph is in flight', async () => {
  const { tool, plan, started, release } = harness('ceo')
  const delegate = tool()
  assert.ok(delegate)
  const session = journalSession('session-1')
  await recordPlan(plan, [
    { role: 'researcher', task: 'Survey options', id: 'survey' },
    { role: 'implementer', task: 'Build it', id: 'build', depends_on: ['survey'] },
  ], session)

  const pending = delegate.execute(
    {
      tasks: [
        { role: 'researcher', task: 'Survey options', id: 'survey' },
        { role: 'implementer', task: 'Build it', id: 'build', depends_on: ['survey'] },
      ],
    },
    {
      agent: { session },
      callId: 'call-1',
      signal: new AbortController().signal,
    },
  )

  await Promise.resolve()
  const journals = () => session.events.filter(event => event.type === CEO_RUN_JOURNAL)
  assert.ok(journals().length >= 2)
  assert.equal(journals()[0]?.ignorable, true)
  assert.equal((journals()[0]?.data as { turn?: number }).turn, 4)
  const firstRuns = (journals()[0]?.data as { runs: Array<{ rawId: string; phase: string }> }).runs
  assert.deepEqual(firstRuns.map(run => `${run.rawId}:${run.phase}`), ['survey:queued', 'build:queued'])
  const live = journals().at(-1)?.data as { runs: Array<{ rawId: string; phase: string }> }
  assert.equal(live.runs.find(run => run.rawId === 'survey')?.phase, 'running')
  assert.equal(live.runs.find(run => run.rawId === 'build')?.phase, 'queued')

  release.get('member-1')?.()
  for (let i = 0; i < 20 && started.length < 2; i++) {
    await new Promise<void>(resolve => { setImmediate(resolve) })
  }
  const mid = journals().at(-1)?.data as { runs: Array<{ rawId: string; phase: string; memberId?: string }> }
  assert.equal(mid.runs.find(run => run.rawId === 'survey')?.phase, 'completed')
  assert.equal(mid.runs.find(run => run.rawId === 'build')?.phase, 'running')
  release.get('member-2')?.()
  await pending
  const last = journals().at(-1)?.data as { runs: Array<{ rawId: string; phase: string }> }
  assert.deepEqual(last.runs.map(run => `${run.rawId}:${run.phase}`), ['survey:completed', 'build:completed'])
  assert.ok(journals().every(event => event.ignorable === true))
})

test('records the final worker output without relying on send_message and blocks unverified research', async () => {
  const { tool, plan, release } = harness('ceo')
  const delegate = tool()
  assert.ok(delegate)
  const session = journalSession('session-1')
  const tasks = [{ role: 'market researcher', task: 'Survey the market', id: 'market' }]
  await recordPlan(plan, tasks, session)
  const pending = delegate.execute({ tasks }, {
    agent: { session }, callId: 'call-1', signal: new AbortController().signal,
  })
  await Promise.resolve()
  release.get('member-1')?.(
    '{"status":"partial","done":"Drafted a report","risks_or_blockers":"无法联网核验核心数字，仅估计"}',
  )
  const result = await pending
  assert.equal(result.runs[0]?.phase, 'failed')
  const event = session.events.find(item => item.type === CEO_MEMBER_RESULT)
  assert.equal(event?.ignorable, true)
  assert.match(String((event?.data as { output?: string } | undefined)?.output), /无法联网核验/)
})

test('stamps memberId while the child is still running and mirrors its process', async () => {
  const { tool, plan, started, release, emitChild } = harness('ceo')
  const delegate = tool()
  assert.ok(delegate)
  const session = journalSession('session-1')
  await recordPlan(plan, [{ role: 'researcher', task: 'Survey options', id: 'survey' }], session)
  const pending = delegate.execute(
    { tasks: [{ role: 'researcher', task: 'Survey options', id: 'survey' }] },
    {
      agent: { session },
      callId: 'call-1',
      signal: new AbortController().signal,
    },
  )
  await Promise.resolve()
  const journals = () => session.events.filter(event => event.type === CEO_RUN_JOURNAL)
  const live = journals().at(-1)?.data as { runs: Array<{ rawId: string; phase: string; memberId?: string }> }
  assert.equal(live.runs[0]?.phase, 'running')
  assert.equal(live.runs[0]?.memberId, 'member-1')
  assert.equal(started.length, 1)

  emitChild('member-1', {
    type: 'tool/call',
    seq: 1,
    data: { callId: 'tool-1', name: 'web_search', arguments: '{}' },
  })
  const process = session.events.filter(event => event.type === CEO_RUN_PROCESS)
  assert.equal(process.length, 1)
  assert.equal(process[0]?.ignorable, true)
  assert.equal((process[0]?.data as { op: { kind: string; name?: string } }).op.kind, 'tool-start')
  assert.equal((process[0]?.data as { op: { name?: string } }).op.name, 'web_search')

  release.get('member-1')?.()
  await pending
})
