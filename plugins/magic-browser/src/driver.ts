/**
 * Playwright-core driver: one persistent Chromium instance per DSH process,
 * shared by every session (PRD-02 §18: "Agent 专用的一只 Chromium").
 *
 * - Launches the system Chrome/Edge (channel resolution, no browser download)
 *   with a dedicated userDataDir under the DSH home, so login state persists
 *   across restarts and never touches the user's daily profile.
 * - Tracks pages with a stable index-based id, keeps an "active" page the
 *   tools and the watch panel operate on, and notifies listeners when the
 *   active page or the page set changes (the cast follows it).
 *
 * M1 keeps the surface deliberately small; M2 adds download capture and
 * per-page console filters. Everything here is serialized through the tool
 * layer (`isConcurrencySafe: false`), so no internal locking is needed.
 */
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { chromium, type BrowserContext, type CDPSession, type Page } from 'playwright-core'

export interface DriverPage {
  id: string
  url: string
  title: string
}

export interface DriverEvents {
  onActivePage?: (page: Page | undefined) => void
  onPagesChanged?: () => void
  onConsole?: (line: { level: string; text: string }) => void
}

export interface DriverOptions {
  headless?: boolean
  chromePath?: string
  viewportWidth?: number
  viewportHeight?: number
}

const CHANNELS = ['chrome', 'msedge'] as const

export class BrowserDriver {
  private context: BrowserContext | undefined
  private cdpSessions = new Map<Page, CDPSession>()
  private ids = new Map<Page, string>()
  private activePageIndex: string | undefined
  private starting: Promise<void> | undefined
  readonly userDataDir: string
  events: DriverEvents = {}
  consoleLines: { level: string; text: string }[] = []
  viewport = { width: 1280, height: 800 }

  private readonly options: DriverOptions

  constructor(options: DriverOptions = {}) {
    this.options = options
    this.userDataDir = join(homedir(), '.dsh', 'magic-browser-profile')
  }

  get running(): boolean {
    return this.context !== undefined
  }

  /** Launch once; concurrent callers await the same start. */
  async ensureStarted(): Promise<void> {
    if (this.context !== undefined) return
    this.starting ??= this.start().catch((error) => {
      this.starting = undefined
      throw error
    })
    await this.starting
  }

  private async start(): Promise<void> {
    mkdirSync(this.userDataDir, { recursive: true })
    const headless = this.options.headless === true
    this.viewport = {
      width: this.options.viewportWidth ?? 1280,
      height: this.options.viewportHeight ?? 800,
    }
    const base = {
      headless,
      viewport: this.viewport,
      args: ['--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling'],
    }
    let context: BrowserContext
    const executablePath = this.options.chromePath
    if (executablePath !== undefined && executablePath !== '') {
      context = await chromium.launchPersistentContext(this.userDataDir, { ...base, executablePath })
    } else {
      let lastError: unknown
      context = undefined as unknown as BrowserContext
      for (const channel of CHANNELS) {
        try {
          context = await chromium.launchPersistentContext(this.userDataDir, { ...base, channel })
          break
        } catch (error) {
          lastError = error
        }
      }
      if (context === undefined) {
        throw new Error(
          '未找到可用的 Chrome/Edge（channel 尝试失败）。'
          + '请安装 Chrome/Edge，或用环境变量 MAGIC_BROWSER_CHROME 指定浏览器路径。'
          + `最后错误：${String(lastError)}`,
        )
      }
    }
    this.context = context
    context.on('close', () => {
      this.context = undefined
      this.cdpSessions.clear()
      this.ids.clear()
      this.activePageIndex = undefined
      this.events.onActivePage?.(undefined)
      this.events.onPagesChanged?.()
    })
    // Pages opened by the agent AND by the human (target=_blank etc.) all join
    // the tracked set, so the watch panel can follow whatever is on screen.
    for (const page of context.pages()) this.track(page)
    context.on('page', (page) => {
      void this.track(page)
      this.setActive(page)
    })
  }

  private track(page: Page): void {
    if (this.ids.has(page)) return
    const id = `p${this.ids.size + 1}`
    this.ids.set(page, id)
    page.on('close', () => {
      this.ids.delete(page)
      this.cdpSessions.delete(page)
      if (this.activePageIndex === id) {
        const nextEntry = [...this.ids.entries()][0]
        this.activePageIndex = nextEntry?.[1]
        this.events.onActivePage?.(nextEntry?.[0])
      }
      this.events.onPagesChanged?.()
    })
    page.on('console', (message) => {
      this.consoleLines.push({ level: message.type(), text: message.text() })
      if (this.consoleLines.length > 200) this.consoleLines.splice(0, this.consoleLines.length - 200)
      this.events.onConsole?.({ level: message.type(), text: message.text() })
    })
    page.on('pageerror', (error) => {
      this.consoleLines.push({ level: 'pageerror', text: String(error) })
      this.events.onConsole?.({ level: 'pageerror', text: String(error) })
    })
    this.events.onPagesChanged?.()
  }

  pages(): DriverPage[] {
    return [...this.ids.keys()].map((page) => ({ id: this.ids.get(page)!, url: page.url(), title: '' }))
  }

  active(): Page | undefined {
    return [...this.ids.entries()].find(([, id]) => id === this.activePageIndex)?.[0]
  }

  get activeId(): string | undefined {
    return this.activePageIndex
  }

  /** Open a fresh tracked page (optionally navigate it) and make it active. */
  async openNew(url?: string): Promise<Page> {
    await this.ensureStarted()
    const page = await this.context!.newPage()
    this.track(page)
    this.setActive(page)
    if (url !== undefined) await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => undefined)
    return page
  }

  setActive(page: Page): void {
    this.activePageIndex = this.ids.get(page)
    this.events.onActivePage?.(page)
  }

  async activeOrNew(url?: string): Promise<Page> {
    await this.ensureStarted()
    const current = this.active()
    if (current !== undefined) return current
    const page = await this.context!.newPage()
    this.track(page)
    this.setActive(page)
    if (url !== undefined) await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => undefined)
    return page
  }

  async pageById(id: string): Promise<Page | undefined> {
    await this.ensureStarted()
    const page = [...this.ids.entries()].find(([, pid]) => pid === id)?.[0]
    if (page !== undefined) this.setActive(page)
    return page
  }

  /** CDP session for the cast pipeline (attached per page, reused). */
  async cdpFor(page: Page): Promise<CDPSession> {
    const existing = this.cdpSessions.get(page)
    if (existing !== undefined) return existing
    const session = await this.context!.newCDPSession(page)
    this.cdpSessions.set(page, session)
    return session
  }

  async close(): Promise<void> {
    await this.context?.close().catch(() => undefined)
    this.context = undefined
    this.cdpSessions.clear()
    this.ids.clear()
    this.activePageIndex = undefined
  }
}

/** Map a click from watch-panel canvas coordinates onto viewport coordinates. */
export function scalePoint(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  viewport: { width: number; height: number },
): { x: number; y: number } {
  if (canvasWidth <= 0 || canvasHeight <= 0) return { x, y }
  return {
    x: Math.round((x / canvasWidth) * viewport.width),
    y: Math.round((y / canvasHeight) * viewport.height),
  }
}
