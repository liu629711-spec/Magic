import assert from 'node:assert/strict'
import { test } from 'node:test'
import { apply, resetEngineeringStateForTests } from '../src/index.ts'

test('does not create engineering until the user confirms a name', () => {
  resetEngineeringStateForTests()

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

  const status = handler({ agent, rawInput: 'status' })
  assert.match(status.text, /No engineering organization exists/)

  const rejected = handler({ agent, rawInput: 'create demo' })
  assert.equal(rejected.kind, 'error')

  const confirmed = handler({ agent, rawInput: 'confirm Demo Project' })
  assert.equal(confirmed.kind, 'success')
  assert.match(confirmed.text, /Demo Project/)
})
