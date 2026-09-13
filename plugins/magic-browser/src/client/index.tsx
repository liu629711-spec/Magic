/**
 * Client half: registers the live watch tab into better-sidebar's native
 * sidebar (deferred inject — better-sidebar's client may mount after ours),
 * or degrades to a no-op when it is absent.
 *
 * The tab is a frame canvas fed by the SSE stream at
 * /magic-browser/api/stream plus an input path at /magic-browser/api/input:
 * clicks/wheel on the canvas are scaled onto the agent browser's viewport
 * and dispatched via CDP (see host cast.ts).
 */
import { useEffect, useRef, useState } from 'react'

interface ClientContext {
  get: (name: string) => unknown
  betterSidebar?: SidebarService['betterSidebar']
  inject?: (names: readonly string[], fn: (scoped: unknown) => void) => void
}

interface SidebarService {
  betterSidebar?: {
    registerTab: (descriptor: {
      id: string
      title: string
      description?: string
      single?: boolean
      order?: number
      component: (props: { scope?: { sessionId?: string }; ctx?: unknown }) => unknown
    }) => unknown
  }
}

export const inject: readonly string[] = ['betterSidebar']

async function postInput(body: Record<string, unknown>): Promise<void> {
  await fetch('/magic-browser/api/input', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => undefined)
}

function WatchTab(_props: { scope?: { sessionId?: string }; ctx?: unknown }): unknown {
  const [frame, setFrame] = useState<string | undefined>(undefined)
  const [connected, setConnected] = useState(false)
  const [pageId, setPageId] = useState<string | undefined>(undefined)
  const [text, setText] = useState('')
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const source = new EventSource('/magic-browser/api/stream')
    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)
    source.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { type: string; data?: string; pageId?: string }
        if (parsed.type === 'frame' && parsed.data !== undefined) {
          setFrame(parsed.data)
          setPageId(parsed.pageId)
        }
      } catch {
        // a partial frame is dropped; the next one repaints
      }
    }
    return () => source.close()
  }, [])

  const sendClick = (event: React.MouseEvent<HTMLImageElement>): void => {
    const image = imageRef.current
    if (image === null) return
    const rect = image.getBoundingClientRect()
    void postInput({
      kind: 'mouse',
      action: 'click',
      button: event.button === 2 ? 'right' : 'left',
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
    })
  }

  const sendWheel = (event: React.WheelEvent<HTMLImageElement>): void => {
    const image = imageRef.current
    if (image === null) return
    const rect = image.getBoundingClientRect()
    void postInput({
      kind: 'wheel',
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      canvasWidth: rect.width,
      canvasHeight: rect.height,
    })
  }

  const sendText = (): void => {
    if (text === '') return
    void postInput({ kind: 'key', text })
    setText('')
  }

  const sendSpecial = (key: string): void => void postInput({ kind: 'key', key })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, padding: 8, boxSizing: 'border-box' }}>
      <div style={{ fontSize: 12, opacity: 0.65 }}>
        {connected ? '直播中' : '未连接（Agent 调用浏览器工具后自动开始）'}
        {pageId !== undefined ? ` · 页面 ${pageId}` : ''}
        {' · 点击画面 = 接管鼠标'}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: 6 }}>
        {frame !== undefined
          ? (
              <img
                ref={imageRef}
                src={`data:image/jpeg;base64,${frame}`}
                alt="Agent 浏览器直播"
                onClick={sendClick}
                onWheel={sendWheel}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'crosshair', userSelect: 'none' }}
              />
            )
          : (
              <div style={{ color: '#777', fontSize: 13 }}>还没有画面——让 Agent 调用 browser_* 工具即可开始</div>
            )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={text}
          placeholder="输入文字后回车 = 在页面里输入（先点一下输入框位置）"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') sendText()
          }}
          style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: '#eee', fontSize: 13 }}
        />
        <button onClick={() => sendSpecial('Enter')} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: '#eee', fontSize: 12 }}>Enter</button>
        <button onClick={() => sendSpecial('Escape')} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #333', background: '#1a1a1a', color: '#eee', fontSize: 12 }}>Esc</button>
      </div>
    </div>
  )
}

/** Client plugin body: betterSidebar comes in via the declared inject
 *  (same pattern as dsh-ego-browser src/client/index.ts:69) — the runtime
 *  guarantees the service exists before apply runs. */
export function apply(ctx: ClientContext): void {
  const debug = ((globalThis as unknown as { __mgbClient?: Record<string, unknown> }).__mgbClient = {
    applied: true,
    registered: false,
    error: null as string | null,
    servicePresent: false,
  })
  const sidebar = ctx.betterSidebar ?? (ctx.get('betterSidebar') as SidebarService | undefined)?.betterSidebar
  debug.servicePresent = sidebar !== undefined
  // Diagnostic handle: lets the page side inspect the live service registry.
  ;(globalThis as unknown as { __mgbSidebar?: unknown }).__mgbSidebar = sidebar
  if (sidebar === undefined) {
    debug.error = 'betterSidebar service missing on injected client context'
    return
  }
  sidebar.registerTab({
    id: 'magic-browser:watch',
    title: 'Agent 浏览器',
    description: 'Agent 正在操作的真实浏览器直播，可随时接管',
    single: true,
    order: 20,
    component: (props) => WatchTab(props),
  })
  debug.registered = true
}
