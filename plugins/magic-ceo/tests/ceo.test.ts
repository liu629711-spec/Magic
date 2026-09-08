import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply, listCeoMembers, resetCeoStateForTests, CEO_RUN_JOURNAL, CEO_RUN_PROCESS } from '../src/index.ts'

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
  let tool: Parameters<Parameters<typeof apply>[0]['tools']['register']>[0] | undefined
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
        tool = definition
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
        release.set(id, () => {
          resolve({
            output: [{ type: 'text', text: `done by ${id}` }],
            stopReason: 'completed',
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

  return { sections, tool, started, release, emitChild }
}

test('registers a CEO prompt section and ceo_delegate tool', () => {
  const { sections, tool } = harness()
  assert.equal(sections[0]?.name, 'magic-ceo')
  assert.equal(tool?.name, 'ceo_delegate')
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
  assert.match(text, /call ceo_delegate immediately/)
  assert.match(text, /Do not call web_search yourself/)
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
  assert.ok(tool)

  await assert.rejects(
    () => tool.execute(
      { tasks: [{ role: 'reviewer', task: 'Review the API.' }] },
      { agent: { session: { id: 'session-1' } }, signal: new AbortController().signal },
    ),
    /CEO work mode/,
  )
})

test('starts independent tasks together and records the run graph', async () => {
  const { tool, started, release } = harness('ceo')
  assert.ok(tool)

  const pending = tool.execute(
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
  const { tool, started, release } = harness('ceo')
  assert.ok(tool)

  const pending = tool.execute(
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
  const { tool, started, release } = harness('ceo')
  assert.ok(tool)
  const session = journalSession('session-1')

  const pending = tool.execute(
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

test('stamps memberId while the child is still running and mirrors its process', async () => {
  const { tool, started, release, emitChild } = harness('ceo')
  assert.ok(tool)
  const session = journalSession('session-1')
  const pending = tool.execute(
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
