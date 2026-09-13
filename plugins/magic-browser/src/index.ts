/**
 * Magic agent browser (PRD-02 §18): Playwright-core driven Chromium with a
 * live watch panel and mouse takeover, registered as a better-sidebar tab.
 *
 * Host half — injects `tools` (the ten browser_* tools), `sessions` (artifact
 * placement under the session workspace), and `webServer` (the fenced
 * /magic-browser/api routes: SSE frame stream, watch-panel input, health).
 *
 * Configuration (M1, env-based; M2 moves to a declarative schema):
 *   MAGIC_BROWSER_HEADLESS=1   run without an OS window (live panel stays;
 *                              frame rate drops, see PRD-02 §18 alignment)
 *   MAGIC_BROWSER_CHROME=<path> explicit browser binary; default auto-detect
 *                              via channel chrome → msedge.
 *
 * The web routes use a loopback-Host fence (same trust idea as the official
 * gateway and the community sidebar plugins); LAN exposure is a non-goal for
 * M1 and documented as such.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { BrowserDriver } from './driver.ts'
import { CastHub, dispatchInput, type WatchInput } from './cast.ts'
import { createBrowserTools } from './tools.ts'

export const inject = ['tools', 'sessions', 'webServer']

interface MagicBrowserContext {
  tools: { register: (tool: unknown) => unknown }
  sessions: { get: (sessionId: string) => { header: { cwd: string } } | undefined }
  webServer: {
    register: (spec: {
      kind: 'prefix'
      path: string
      handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void
    }) => unknown
  }
  get: (name: string) => unknown
}

export function isLoopbackHost(host: string | undefined): boolean {
  if (host === undefined) return false
  const hostname = host.split(':')[0]?.toLowerCase() ?? ''
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]' || hostname === '::1'
}

export function apply(ctx: MagicBrowserContext): void {
  const driver = new BrowserDriver({
    headless: process.env.MAGIC_BROWSER_HEADLESS === '1',
    chromePath: process.env.MAGIC_BROWSER_CHROME,
  })
  const cast = new CastHub(driver)

  // Tools: the session cwd feeds artifact placement (absolute paths out).
  const tools = createBrowserTools({
    driver,
    getSessionCwd: (sessionId) => ctx.sessions.get(sessionId)?.header.cwd,
  })
  for (const tool of tools) ctx.tools.register(tool)

  // Watch routes (loopback-fenced, session-agnostic: one shared browser).
  ctx.webServer.register({
    kind: 'prefix',
    path: '/magic-browser/api',
    handler: async (req, res) => {
      if (!isLoopbackHost(req.headers.host)) {
        res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: false, error: 'forbidden' }))
        return
      }
      const url = new URL(req.url ?? '/', 'http://dsh.internal')
      const route = url.pathname.replace(/^\/magic-browser\/api/, '')
      if (route === '/health') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, running: driver.running, tabs: driver.pages().length }))
        return
      }
      if (route === '/pages') {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true, tabs: driver.pages(), activeId: driver.activeId }))
        return
      }
      if (route === '/stream' && req.method === 'GET') {
        res.writeHead(200, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
        })
        const sink = (event: { type: string } & Record<string, unknown>): void => {
          res.write(`data: ${JSON.stringify(event)}\n\n`)
        }
        cast.addSink(sink)
        const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000)
        req.on('close', () => {
          clearInterval(heartbeat)
          cast.removeSink(sink)
        })
        return
      }
      if (route === '/input' && req.method === 'POST') {
        const chunks: Buffer[] = []
        for await (const chunk of req) chunks.push(chunk as Buffer)
        let input: WatchInput
        try {
          input = JSON.parse(Buffer.concat(chunks).toString('utf8')) as WatchInput
        } catch {
          res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ ok: false, error: 'bad json' }))
          return
        }
        const page = await driver.activeOrNew()
        const cdp = await driver.cdpFor(page)
        await dispatchInput(cdp, driver.viewport, input)
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify({ ok: true }))
        return
      }
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ ok: false, error: 'not found' }))
    },
  })
}
