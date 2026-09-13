/**
 * Live watch pipeline: CDP screencast frames → SSE → the sidebar watch tab,
 * and mouse/keyboard events from the watch tab back into the same page
 * (PRD-02 §18 "直播 + 接管"). Design follows dsh-ego-browser's cast-server
 * (MIT) — frame cache so a freshly opened panel paints instantly, one
 * broadcaster, input scaled from canvas coordinates onto the viewport.
 */
import type { CDPSession, Page } from 'playwright-core'
import { scalePoint, type BrowserDriver } from './driver.ts'

/** The slice of a CDP session the watch pipeline dispatches through. */
type CdpSender = Pick<CDPSession, 'send'>

export interface CastFrame {
  pageId: string
  data: string // base64 JPEG
}

type Sink = (event: { type: 'frame'; pageId: string; data: string } | { type: 'meta'; json: string }) => void

export class CastHub {
  private sinks = new Set<Sink>()
  private last: CastFrame | undefined
  private attachedPageId: string | undefined
  private detachers: Array<() => Promise<void> | void> = []
  private readonly driver: BrowserDriver

  constructor(driver: BrowserDriver) {
    this.driver = driver
    driver.events.onActivePage = (page) => {
      if (page === undefined) return
      void this.follow(page)
    }
  }

  addSink(sink: Sink): void {
    this.sinks.add(sink)
    if (this.last !== undefined) sink({ type: 'frame', pageId: this.last.pageId, data: this.last.data })
  }

  removeSink(sink: Sink): void {
    this.sinks.delete(sink)
  }

  broadcast(event: Parameters<Sink>[0]): void {
    for (const sink of this.sinks) {
      try {
        sink(event)
      } catch {
        this.sinks.delete(sink)
      }
    }
  }

  /** Attach the screencast to the given page; detaches the previous one. */
  async follow(page: Page): Promise<void> {
    const pageId = this.driver.pages().find((entry) => entry.url === page.url())?.id ?? 'p?'
    if (this.attachedPageId === pageId) return
    for (const detach of this.detachers) await detach()
    this.detachers = []
    this.attachedPageId = pageId
    const cdp = await this.driver.cdpFor(page)
    const onFrame = (params: { data: string; sessionId: number }): void => {
      const frame: CastFrame = { pageId: pageId ?? 'p?', data: params.data }
      this.last = frame
      this.broadcast({ type: 'frame', pageId: frame.pageId, data: frame.data })
      void cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => undefined)
    }
    cdp.on('Page.screencastFrame', onFrame)
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 60,
      maxWidth: 1280,
      maxHeight: 800,
      everyNthFrame: 1,
    }).catch(() => undefined)
    this.detachers.push(async () => {
      cdp.off('Page.screencastFrame', onFrame)
      await cdp.send('Page.stopScreencast').catch(() => undefined)
    })
  }

  get hasLast(): boolean {
    return this.last !== undefined
  }
}

/** Shared keyboard map for the watch panel's key events (M1: the common set). */
const SPECIAL_KEYS: Record<string, { vk: number; key: string }> = {
  Enter: { vk: 13, key: 'Enter' },
  Backspace: { vk: 8, key: 'Backspace' },
  Delete: { vk: 46, key: 'Delete' },
  Tab: { vk: 9, key: 'Tab' },
  Escape: { vk: 27, key: 'Escape' },
  ArrowUp: { vk: 38, key: 'ArrowUp' },
  ArrowDown: { vk: 40, key: 'ArrowDown' },
  ArrowLeft: { vk: 37, key: 'ArrowLeft' },
  ArrowRight: { vk: 39, key: 'ArrowRight' },
}

export interface WatchInput {
  kind: 'mouse' | 'wheel' | 'key'
  action?: 'click' | 'down' | 'up' | 'move'
  x?: number
  y?: number
  canvasWidth?: number
  canvasHeight?: number
  button?: 'left' | 'right' | 'middle'
  clicks?: number
  deltaX?: number
  deltaY?: number
  text?: string
  key?: string
}

/** Turn one watch-panel input into CDP calls on the given page. */
export async function dispatchInput(
  cdp: CdpSender,
  viewport: { width: number; height: number },
  input: WatchInput,
): Promise<void> {
  if (input.kind === 'key') {
    if (input.text !== undefined && input.text !== '') {
      await cdp.send('Input.insertText', { text: input.text })
      return
    }
    const special = SPECIAL_KEYS[input.key ?? '']
    if (special === undefined) return
    const base = { code: special.key, key: special.key, windowsVirtualKeyCode: special.vk, nativeVirtualKeyCode: special.vk }
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
    return
  }
  const point = scalePoint(input.x ?? 0, input.y ?? 0, input.canvasWidth ?? 0, input.canvasHeight ?? 0, viewport)
  const button = input.button ?? 'left'
  if (input.kind === 'wheel') {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: point.x,
      y: point.y,
      deltaX: input.deltaX ?? 0,
      deltaY: input.deltaY ?? 0,
    })
    return
  }
  const common = { x: point.x, y: point.y, button, clickCount: input.clicks ?? 1 }
  if (input.action === 'down') await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...common })
  else if (input.action === 'up') await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...common })
  else if (input.action === 'move') await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y, button: 'none' })
  else {
    // click = press + release
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...common })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...common })
  }
}
