import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply, resetWorkModeStateForTests } from '../src/index.ts'

test('registers a prompt section and /mode command', () => {
  resetWorkModeStateForTests()

  const sections: Array<{ name: string; order: number; text: string | (() => string) }> = []
  const commands: Array<{ name: string; handler: Function }> = []

  apply({
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

  const switched = handler({ agent, rawInput: 'ceo' })
  assert.equal(switched.kind, 'success')
  assert.match(switched.text, /CEO/)

  const invalid = handler({ agent, rawInput: 'team' })
  assert.equal(invalid.kind, 'error')
})
