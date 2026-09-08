import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  apply,
  getSessionWorkMode,
  getSessionWorkModeState,
  resetWorkModeStateForTests,
} from '../src/index.ts'
import {
  applyModeCommand,
  describeMode,
  parseDescribedMode,
  parseModeCommand,
  resolveMode,
} from '../src/mode.ts'

test('registers a prompt section and /mode command', () => {
  resetWorkModeStateForTests()

  const sections: Array<{
    name: string
    order: number
    text: string | ((context?: { agent?: { session?: { id?: string } } }) => string)
  }> = []
  const commands: Array<{ name: string; handler: Function }> = []
  const provided: Array<{ name: string; value: unknown }> = []

  apply({
    provide: (name, value) => {
      provided.push({ name, value })
    },
    systemPrompt: {
      section: (section) => {
        sections.push(section)
      },
    },
    commands: {
      register: (definition) => {
        commands.push(definition)
      },
    },
  })

  assert.equal(sections[0]?.name, 'magic-work-mode')
  assert.equal(commands[0]?.name, 'mode')
  assert.equal(provided[0]?.name, 'magicWorkMode')
  const text = typeof sections[0]?.text === 'function' ? sections[0].text() : ''
  assert.match(text, /once-CEO/)
  assert.match(text, /Current work mode: agent/)
})

test('defaults to agent and can switch the session to CEO', () => {
  resetWorkModeStateForTests()

  let handler: ((invocation: { agent: { session: { id: string } }; rawInput: string }) => { kind: string; text: string }) | undefined

  apply({
    systemPrompt: { section: () => undefined },
    commands: {
      register: (definition) => {
        handler = definition.handler
      },
    },
  })

  assert.ok(handler)
  const agent = { session: { id: 'session-1' } }

  const shown = handler({ agent, rawInput: '' })
  assert.equal(shown.kind, 'success')
  assert.match(shown.text, /agent/i)
  assert.match(shown.text, /session default/i)

  const switched = handler({ agent, rawInput: 'ceo' })
  assert.equal(switched.kind, 'success')
  assert.match(switched.text, /CEO/)
  assert.equal(getSessionWorkMode('session-1'), 'ceo')
  assert.deepEqual(getSessionWorkModeState('session-1'), { sessionMode: 'ceo', inputMode: null })

  const invalid = handler({ agent, rawInput: 'team' })
  assert.equal(invalid.kind, 'error')
})

test('CEO session prompt states current mode and does not keep the agent default', () => {
  resetWorkModeStateForTests()

  const sections: Array<{
    name: string
    text: string | ((context?: { agent?: { session?: { id?: string } } }) => string)
  }> = []
  let handler: ((invocation: { agent: { session: { id: string } }; rawInput: string }) => { kind: string; text: string }) | undefined

  apply({
    systemPrompt: {
      section: (section) => {
        sections.push(section)
      },
    },
    commands: {
      register: (definition) => {
        handler = definition.handler
      },
    },
  })

  assert.ok(handler)
  handler({ agent: { session: { id: 'session-ceo' } }, rawInput: 'ceo' })

  const textFn = sections[0]?.text
  assert.equal(typeof textFn, 'function')
  const ceoText = textFn({ agent: { session: { id: 'session-ceo' } } })
  assert.match(ceoText, /Current work mode: CEO/)
  assert.match(ceoText, /already CEO/)
  assert.doesNotMatch(ceoText, /Default to agent mode/)

  const agentText = textFn({ agent: { session: { id: 'session-other' } } })
  assert.match(agentText, /Current work mode: agent/)
  assert.match(agentText, /Default to agent mode/)
})

test('once CEO applies only until the current turn ends', () => {
  resetWorkModeStateForTests()

  let handler: ((invocation: { agent: { session: { id: string } }; rawInput: string }) => { kind: string; text: string }) | undefined
  let onEvent: ((session: unknown, event: unknown) => void) | undefined

  apply({
    on: (event, listener) => {
      if (event === 'session/event') onEvent = listener as (session: unknown, event: unknown) => void
    },
    systemPrompt: { section: () => undefined },
    commands: {
      register: (definition) => {
        handler = definition.handler
      },
    },
  })

  assert.ok(handler)
  assert.ok(onEvent)
  const agent = { session: { id: 'session-1' } }

  const once = handler({ agent, rawInput: 'once ceo' })
  assert.equal(once.kind, 'success')
  assert.match(once.text, /this input only/)
  assert.equal(getSessionWorkMode('session-1'), 'ceo')
  assert.deepEqual(getSessionWorkModeState('session-1'), { sessionMode: 'agent', inputMode: 'ceo' })

  onEvent({ id: 'session-1' }, { type: 'user/message', data: { source: { kind: 'user' } } })
  assert.equal(getSessionWorkMode('session-1'), 'ceo')

  onEvent({ id: 'session-1' }, { type: 'turn/end' })
  assert.equal(getSessionWorkMode('session-1'), 'agent')
  assert.deepEqual(getSessionWorkModeState('session-1'), { sessionMode: 'agent', inputMode: null })
})

test('parses session default, once-CEO, and once-clear', () => {
  assert.deepEqual(parseModeCommand(''), { kind: 'show' })
  assert.deepEqual(parseModeCommand('ceo'), { kind: 'session', mode: 'ceo' })
  assert.deepEqual(parseModeCommand('once ceo'), { kind: 'once', mode: 'ceo' })
  assert.deepEqual(parseModeCommand('once'), { kind: 'once-clear' })
  assert.deepEqual(parseModeCommand('team'), { kind: 'invalid' })

  const once = applyModeCommand({ sessionMode: 'agent', inputMode: null }, { kind: 'once', mode: 'ceo' })
  assert.equal(resolveMode(once), 'ceo')
  assert.match(describeMode(once), /this input only/)

  const session = applyModeCommand(once, { kind: 'session', mode: 'ceo' })
  assert.deepEqual(session, { sessionMode: 'ceo', inputMode: null })
  assert.deepEqual(parseDescribedMode(describeMode(once)), once)
  assert.deepEqual(parseDescribedMode(describeMode(session)), session)
})
