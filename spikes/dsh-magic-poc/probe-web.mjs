import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const launchUrl = process.argv[2]
const evidencePath = process.argv[3] ?? resolve('evidence', 'remote-api.json')
if (launchUrl === undefined) {
  throw new Error('Usage: node probe-web.mjs <DSH launch URL> [evidence path]')
}

const tokenExchange = await fetch(launchUrl, { redirect: 'manual' })
const setCookie = tokenExchange.headers.get('set-cookie')
if (tokenExchange.status !== 303 || setCookie === null) {
  throw new Error(`DSH token exchange failed with HTTP ${tokenExchange.status}`)
}

const origin = new URL(launchUrl).origin
const response = await fetch(`${origin}/api/session/list`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    cookie: setCookie.split(';', 1)[0],
  },
  body: JSON.stringify({
    type: 'client-request',
    rpcId: `magic-dsh-poc-${randomUUID()}`,
    method: 'session/list',
    payload: { args: { _request: {} } },
  }),
})
if (!response.ok) throw new Error(`DSH session/list returned HTTP ${response.status}`)

const envelope = await response.json()
if (envelope?.result?.ok !== true) {
  throw new Error(`DSH session/list failed: ${JSON.stringify(envelope?.result?.error)}`)
}

await mkdir(dirname(evidencePath), { recursive: true })
await writeFile(evidencePath, `${JSON.stringify({
  phase: 'completed',
  transport: 'authenticated local HTTP Remote API',
  origin,
  sessionList: envelope.result.value,
}, null, 2)}\n`, 'utf8')
