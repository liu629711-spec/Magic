import assert from 'node:assert/strict'
import { test } from 'node:test'
import { scalePoint } from '../src/driver.ts'

test('scalePoint maps canvas coordinates onto the viewport', () => {
  const viewport = { width: 1280, height: 800 }
  assert.deepEqual(scalePoint(0, 0, 640, 400, viewport), { x: 0, y: 0 })
  assert.deepEqual(scalePoint(640, 400, 640, 400, viewport), { x: 1280, y: 800 })
  assert.deepEqual(scalePoint(320, 200, 640, 400, viewport), { x: 640, y: 400 })
})

test('scalePoint degrades to passthrough on degenerate canvas sizes', () => {
  assert.deepEqual(scalePoint(12, 34, 0, 0, { width: 100, height: 100 }), { x: 12, y: 34 })
})
