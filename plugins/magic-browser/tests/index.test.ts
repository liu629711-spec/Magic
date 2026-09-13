import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isLoopbackHost } from '../src/index.ts'
import { createBrowserTools } from '../src/tools.ts'
import { BrowserDriver } from '../src/driver.ts'

test('loopback fence accepts loopback hosts and rejects the rest', () => {
  assert.equal(isLoopbackHost('127.0.0.1:3080'), true)
  assert.equal(isLoopbackHost('localhost:3080'), true)
  assert.equal(isLoopbackHost('192.168.1.5:3080'), false)
  assert.equal(isLoopbackHost(undefined), false)
})

test('the M1 tool surface is the documented ten browser_* tools', () => {
  const tools = createBrowserTools({ driver: new BrowserDriver({}), getSessionCwd: () => undefined })
  assert.deepEqual(
    tools.map((tool) => tool.name),
    [
      'browser_navigate',
      'browser_snapshot',
      'browser_click',
      'browser_type',
      'browser_select',
      'browser_scroll',
      'browser_screenshot',
      'browser_tabs',
      'browser_console',
      'browser_close',
    ],
  )
  for (const tool of tools) {
    assert.equal(typeof tool.description, 'string')
    assert.equal((tool.parameters as { type: string }).type, 'object')
    // The browser is a single shared resource: every mutating tool serializes.
    assert.equal(tool.isConcurrencySafe?.(), false)
  }
})
