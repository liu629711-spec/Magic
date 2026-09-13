import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dispatchInput, type WatchInput } from '../src/cast.ts'

function fakeCdp() {
  const calls: Array<{ method: string; params?: Record<string, unknown> }> = []
  return {
    calls,
    // The real CDPSession.send is generically keyed; the test only needs the
    // runtime shape, so it is cast at the boundary.
    send: (method: never, params?: never): Promise<any> => {
      calls.push({ method, params })
      return Promise.resolve()
    },
  }
}

const viewport = { width: 1000, height: 500 }

function run(cdp: ReturnType<typeof fakeCdp>, input: WatchInput): Promise<void> {
  return dispatchInput(cdp as unknown as Parameters<typeof dispatchInput>[0], viewport, input)
}

test('dispatchInput maps a canvas click onto scaled press+release', async () => {
  const cdp = fakeCdp()
  await dispatchInput(cdp, viewport, { kind: 'mouse', action: 'click', x: 500, y: 250, canvasWidth: 500, canvasHeight: 250 })
  assert.equal(cdp.calls.length, 2)
  assert.equal(cdp.calls[0].method, 'Input.dispatchMouseEvent')
  assert.equal((cdp.calls[0].params as { type: string }).type, 'mousePressed')
  assert.equal((cdp.calls[0].params as { x: number }).x, 1000)
  assert.equal((cdp.calls[0].params as { y: number }).y, 500)
  assert.equal((cdp.calls[1].params as { type: string }).type, 'mouseReleased')
})

test('dispatchInput maps wheel to mouseWheel with deltas', async () => {
  const cdp = fakeCdp()
  await dispatchInput(cdp, viewport, { kind: 'wheel', deltaY: -120, x: 100, y: 100, canvasWidth: 200, canvasHeight: 100 })
  assert.equal(cdp.calls[0].method, 'Input.dispatchMouseEvent')
  assert.equal((cdp.calls[0].params as { type: string }).type, 'mouseWheel')
  assert.equal((cdp.calls[0].params as { deltaY: number }).deltaY, -120)
})

test('dispatchInput sends insertText for text and two events for special keys', async () => {
  const cdp = fakeCdp()
  await dispatchInput(cdp, viewport, { kind: 'key', text: '你好' })
  assert.deepEqual(cdp.calls.map((call) => call.method), ['Input.insertText'])
  await dispatchInput(cdp, viewport, { kind: 'key', key: 'Enter' })
  assert.deepEqual(
    cdp.calls.slice(1).map((call) => (call.params as { type: string }).type),
    ['rawKeyDown', 'keyUp'],
  )
})

test('dispatchInput ignores unknown special keys', async () => {
  const cdp = fakeCdp()
  await dispatchInput(cdp, viewport, { kind: 'key', key: 'F13' })
  assert.equal(cdp.calls.length, 0)
})
