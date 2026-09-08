import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inject, registerWorkModeUi } from '../src/client/register.ts'
import {
  applyClientWorkModeLine,
  getClientWorkMode,
  resetClientWorkModeForTests,
} from '../src/client/state.ts'
import { describeMode } from '../src/mode.ts'

test('registers the composer-left work-mode control', async () => {
  resetClientWorkModeForTests()
  const sections: string[] = []
  const slots: Array<{ name: string; id?: string }> = []
  let execute: ((line: string) => Promise<string | null>) | undefined
  let executed: ((sessionId: unknown, name: unknown, result: unknown) => void) | undefined

  registerWorkModeUi({
    locale: {
      register: (ns, dicts) => {
        sections.push(ns)
        assert.equal(dicts.zh['chip.agent'], '代理')
        assert.equal(dicts.zh['chip.ceo'], 'CEO')
        assert.equal(dicts.zh['scope.input'], '本次输入')
        assert.equal(dicts.zh['menu.onceCeo'], 'CEO · 本次输入')
        assert.equal(dicts.zh['menu.sessionCeo'], 'CEO · 当前会话')
        assert.equal(dicts.en['menu.agentHint'].includes('Later inputs'), true)
        return () => {}
      },
    },
    remote: {
      commands: {
        execute: async (_sessionId, line) => ({
          ok: true,
          value: {
            result: {
              kind: 'success',
              text: describeMode({
                sessionMode: 'agent',
                inputMode: line.includes('once') ? 'ceo' : null,
              }),
            },
          },
        }),
      },
    },
    slots: {
      inject: (_name, factory) => factory(),
      register: (spec) => {
        slots.push({
          name: String(spec.name),
          id: spec.id === undefined ? undefined : String(spec.id),
        })
        const injected = typeof spec.inject === 'function'
          ? spec.inject('session-1') as { executeMode?: (line: string) => Promise<string | null> }
          : undefined
        execute = injected?.executeMode
      },
    },
    effect: (factory) => factory(),
    on: (event, listener) => {
      if (event === 'command/executed') executed = listener as (sessionId: unknown, name: unknown, result: unknown) => void
    },
  }, 'chip')

  assert.deepEqual(inject, ['slots', 'remote', 'remote.commands', 'locale'])
  assert.equal(sections[0], 'magicWorkMode')
  assert.deepEqual(slots, [{ name: 'conversation.input.left', id: 'magic-work-mode' }])
  assert.equal(typeof execute, 'function')
  assert.ok(executed)

  assert.equal(await execute?.('/mode once ceo'), null)
  assert.deepEqual(getClientWorkMode('session-1'), { sessionMode: 'agent', inputMode: 'ceo' })

  executed?.('session-1', 'mode', {
    kind: 'success',
    text: describeMode({ sessionMode: 'ceo', inputMode: null }),
  })
  assert.deepEqual(getClientWorkMode('session-1'), { sessionMode: 'ceo', inputMode: null })
})

test('client mirror records once-CEO separately from the session default', () => {
  resetClientWorkModeForTests()
  applyClientWorkModeLine('session-1', '/mode once ceo')
  assert.deepEqual(getClientWorkMode('session-1'), { sessionMode: 'agent', inputMode: 'ceo' })
  applyClientWorkModeLine('session-1', '/mode ceo')
  assert.deepEqual(getClientWorkMode('session-1'), { sessionMode: 'ceo', inputMode: null })
  applyClientWorkModeLine('session-1', '/mode agent')
  assert.deepEqual(getClientWorkMode('session-1'), { sessionMode: 'agent', inputMode: null })
})
