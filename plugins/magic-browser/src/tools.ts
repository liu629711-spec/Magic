/**
 * The M1 tool surface: ten structured `browser_*` tools over one shared
 * Chromium (PRD-02 §18). Snapshot-first paradigm — the model reads the
 * accessibility tree (`browser_snapshot`) and acts by ref/selector/role,
 * instead of driving by pixels. All tools serialize (`isConcurrencySafe:
 * false`) because the browser is a single shared resource.
 *
 * Every tool returns ABSOLUTE paths for anything written to disk — the
 * artifact cards and the media route require absolute paths (this is the
 * class of bug that broke ego's screenshot previews).
 *
 * DSH's tool registry requires every tool to declare
 * `output: { schema, render }`; render text is what the model and the
 * transcript see, so the useful payload rides inside it.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Locator, Page } from 'playwright-core'
import type { BrowserDriver } from './driver.ts'

export interface ToolDeps {
  driver: BrowserDriver
  /** Session cwd for artifact placement; undefined → fall back to the OS temp dir. */
  getSessionCwd: (sessionId: string) => string | undefined
}

type JsonSchema = Record<string, unknown>

interface ToolShell {
  name: string
  description: string
  parameters: JsonSchema
  output: { schema: JsonSchema; render: (args: Record<string, unknown>, value: Record<string, unknown>) => Array<{ type: 'text'; text: string }> }
  isConcurrencySafe?: () => boolean
  execute: (args: Record<string, unknown>, exec: { agent?: { session?: { id?: string } } }) => Promise<Record<string, unknown>>
}

const objectSchema = (properties: JsonSchema, required: string[] = []): JsonSchema => ({
  type: 'object',
  additionalProperties: false,
  properties,
  ...(required.length > 0 ? { required } : {}),
})

const text = (value: Record<string, unknown>): Array<{ type: 'text'; text: string }> => [
  { type: 'text', text: typeof value.text === 'string' ? value.text : JSON.stringify(value) },
]

/** Resolve the element locator for action tools, per the documented precedence. */
async function resolveLocator(page: Page, args: Record<string, unknown>): Promise<Locator> {
  const ref = typeof args.ref === 'string' ? args.ref : undefined
  const selector = typeof args.selector === 'string' ? args.selector : undefined
  const role = typeof args.role === 'string' ? args.role : undefined
  const name = typeof args.name === 'string' ? args.name : undefined
  const nth = typeof args.nth === 'number' ? args.nth : 0
  if (ref !== undefined) {
    // Playwright ≥1.51 understands `aria-ref=` selectors from ariaSnapshot refs.
    return page.locator(`aria-ref=${ref}`)
  }
  if (selector !== undefined) return page.locator(selector).nth(nth)
  if (role !== undefined) return page.getByRole(role as never, name === undefined ? undefined : { name }).nth(nth)
  throw new Error('需要 ref / selector / role 至少一个定位参数（先调 browser_snapshot 拿 ref）')
}

function str(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key]
  return typeof value === 'string' ? value : undefined
}

function bool(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key]
  return typeof value === 'boolean' ? value : undefined
}

function num(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key]
  return typeof value === 'number' ? value : undefined
}

function artifactPath(cwd: string | undefined, name: string): string {
  const base = cwd !== undefined && cwd !== '' ? cwd : join(process.cwd(), 'magic-browser-fallback')
  const dir = join(base, 'magic-browser')
  mkdirSync(dir, { recursive: true })
  return join(dir, name)
}

export function createBrowserTools(deps: ToolDeps): ToolShell[] {
  const { driver } = deps

  const navigate: ToolShell = {
    name: 'browser_navigate',
    description: 'Open a URL in the agent browser (or navigate the current page). Prefer browser_snapshot afterwards to read the page.',
    parameters: objectSchema({ url: { type: 'string', description: 'Absolute http(s) URL to open.' } }, ['url']),
    output: {
      schema: objectSchema({ url: { type: 'string' }, title: { type: 'string' } }, ['url']),
      render: (_args, value) => text({ text: `已打开 ${String(value.title ?? '')}（${String(value.url ?? '')}）。用 browser_snapshot 读取页面结构。` }),
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      const url = str(args, 'url')
      if (url === undefined) throw new Error('url is required')
      const page = await driver.activeOrNew(url)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      return { url: page.url(), title: await page.title() }
    },
  }

  const snapshot: ToolShell = {
    name: 'browser_snapshot',
    description: 'Capture the accessibility tree of the current page as text with element refs. Read this before acting; use the refs in browser_click/browser_type.',
    parameters: objectSchema({}),
    output: {
      schema: objectSchema({ url: { type: 'string' }, snapshot: { type: 'string' } }, ['url', 'snapshot']),
      render: (_args, value) => text({ text: `页面 ${String(value.url ?? '')} 的可访问性快照：\n${String(value.snapshot ?? '')}` }),
    },
    isConcurrencySafe: () => false,
    async execute() {
      const page = await driver.activeOrNew()
      const shot = await page.locator('body').ariaSnapshot()
      return { url: page.url(), snapshot: shot }
    },
  }

  const click: ToolShell = {
    name: 'browser_click',
    description: 'Click an element, by ref from browser_snapshot (preferred), a CSS selector, or role+name.',
    parameters: objectSchema({
      ref: { type: 'string', description: 'Element ref from browser_snapshot, e.g. e12.' },
      selector: { type: 'string', description: 'CSS selector fallback.' },
      role: { type: 'string', description: 'ARIA role fallback, e.g. button/link/tab.' },
      name: { type: 'string', description: 'Accessible name for the role fallback.' },
      nth: { type: 'number', description: 'Zero-based index among matches (selector/role fallback).' },
    }),
    output: {
      schema: objectSchema({ clicked: { type: 'boolean' }, url: { type: 'string' } }, ['clicked']),
      render: (_args, value) => text({ text: `已点击，当前页面 ${String(value.url ?? '')}` }),
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      const page = await driver.activeOrNew()
      const locator = await resolveLocator(page, args)
      await locator.click({ timeout: 10_000 })
      return { clicked: true, url: page.url() }
    },
  }

  const typeTool: ToolShell = {
    name: 'browser_type',
    description: 'Fill a text field (replaces content) and optionally press Enter.',
    parameters: objectSchema({
      text: { type: 'string' },
      submit: { type: 'boolean', description: 'Press Enter after filling.' },
      ref: { type: 'string' }, selector: { type: 'string' }, role: { type: 'string' }, name: { type: 'string' }, nth: { type: 'number' },
    }, ['text']),
    output: {
      schema: objectSchema({ typed: { type: 'number' } }, ['typed']),
      render: (_args, value) => text({ text: `已输入 ${String(value.typed ?? 0)} 个字符` }),
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      const page = await driver.activeOrNew()
      const value = str(args, 'text') ?? ''
      const locator = await resolveLocator(page, args)
      await locator.fill(value, { timeout: 10_000 })
      if (bool(args, 'submit') === true) await locator.press('Enter')
      return { typed: value.length }
    },
  }

  const select: ToolShell = {
    name: 'browser_select',
    description: 'Pick an option in a <select> element.',
    parameters: objectSchema({
      value: { type: 'string' },
      ref: { type: 'string' }, selector: { type: 'string' }, role: { type: 'string' }, name: { type: 'string' }, nth: { type: 'number' },
    }, ['value']),
    output: {
      schema: objectSchema({ selected: { type: 'string' } }, ['selected']),
      render: (_args, value) => text({ text: `已选择 ${String(value.selected ?? '')}` }),
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      const page = await driver.activeOrNew()
      const locator = await resolveLocator(page, args)
      await locator.selectOption(str(args, 'value') ?? '', { timeout: 10_000 })
      return { selected: str(args, 'value') ?? '' }
    },
  }

  const scroll: ToolShell = {
    name: 'browser_scroll',
    description: 'Scroll the page by pixels; direction up/down/left/right.',
    parameters: objectSchema({
      direction: { type: 'string', description: 'up/down/left/right' },
      amount: { type: 'number', description: 'Pixels, default 600.' },
    }, ['direction']),
    output: {
      schema: objectSchema({ scrolled: { type: 'number' } }, ['scrolled']),
      render: (_args, value) => text({ text: `已滚动 ${String(value.scrolled ?? 0)} 像素` }),
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      const page = await driver.activeOrNew()
      const direction = str(args, 'direction') ?? 'down'
      const amount = num(args, 'amount') ?? 600
      const dx = direction === 'left' ? -amount : direction === 'right' ? amount : 0
      const dy = direction === 'up' ? -amount : direction === 'down' ? amount : 0
      await page.mouse.wheel(dx, dy)
      return { scrolled: amount }
    },
  }

  const screenshot: ToolShell = {
    name: 'browser_screenshot',
    description: 'Save a PNG screenshot of the current page into the session workspace and return its ABSOLUTE path (artifact cards need absolute paths).',
    parameters: objectSchema({
      fullPage: { type: 'boolean', description: 'Capture the whole scrollable page.' },
    }),
    output: {
      schema: objectSchema({ path: { type: 'string' }, bytes: { type: 'number' } }, ['path']),
      render: (_args, value) => text({ text: `截图已保存：${String(value.path ?? '')}` }),
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const page = await driver.activeOrNew()
      const sessionId = exec.agent?.session?.id ?? ''
      const path = artifactPath(deps.getSessionCwd(sessionId), `shot-${Date.now()}.png`)
      const buffer = await page.screenshot({ fullPage: bool(args, 'fullPage') === true, timeout: 30_000 })
      writeFileSync(path, buffer)
      return { path, bytes: buffer.length }
    },
  }

  const tabs: ToolShell = {
    name: 'browser_tabs',
    description: 'List / open / select / close browser tabs. The watch panel follows the selected tab.',
    parameters: objectSchema({
      action: { type: 'string', description: 'list/new/select/close' },
      index: { type: 'number', description: 'Tab index for select/close (from list).' },
      url: { type: 'string', description: 'URL for new.' },
    }, ['action']),
    output: {
      schema: { type: 'object', properties: {}, additionalProperties: true },
      render: (_args, value) => text({ text: JSON.stringify(value) }),
    },
    isConcurrencySafe: () => false,
    async execute(args) {
      const action = str(args, 'action') ?? 'list'
      if (action === 'list') return { tabs: driver.pages(), activeId: driver.activeId }
      if (action === 'new') {
        const page = await driver.openNew(str(args, 'url'))
        return { opened: page.url() }
      }
      if (action === 'select' || action === 'close') {
        const index = num(args, 'index') ?? 0
        const all = driver.pages()
        const target = all[index]
        if (target === undefined) throw new Error(`no tab at index ${index}`)
        const page = await driver.pageById(target.id)
        if (action === 'select') return { selected: target }
        await page?.close().catch(() => undefined)
        return { closed: target }
      }
      throw new Error(`unknown action ${action}`)
    },
  }

  const consoleTool: ToolShell = {
    name: 'browser_console',
    description: 'Read the recent console messages and page errors of the current browser session (ring buffer, newest last).',
    parameters: objectSchema({}),
    output: {
      schema: objectSchema({ lines: { type: 'array', items: { type: 'object', additionalProperties: true } } }),
      render: (_args, value) => text({ text: JSON.stringify(value.lines ?? []) }),
    },
    isConcurrencySafe: () => false,
    async execute() {
      return { lines: driver.consoleLines.slice(-100) }
    },
  }

  const close: ToolShell = {
    name: 'browser_close',
    description: 'Close the agent browser entirely. Login state persists on disk.',
    parameters: objectSchema({}),
    output: {
      schema: objectSchema({ closed: { type: 'boolean' } }, ['closed']),
      render: (_args, value) => text({ text: '浏览器已关闭（登录态已保留）' }),
    },
    isConcurrencySafe: () => false,
    async execute() {
      await driver.close()
      return { closed: true }
    },
  }

  return [navigate, snapshot, click, typeTool, select, scroll, screenshot, tabs, consoleTool, close]
}
