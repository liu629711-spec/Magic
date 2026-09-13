/**
 * Magic local patch (2026-09-13): page-annotation tools over the shared
 * browser. The human toggles an in-page annotation layer (floating pill →
 * select an element → style card → comment), the annotation lands in the
 * page's localStorage keyed by URL, and `browser_annotations` hands the
 * structured list (selector / text / styles / comment) back to the model —
 * so "调整这块元素" carries a precise pointer instead of a vague description.
 *
 * Deliberately INSIDE tool-browser: the tools must reuse the calling task's
 * browser session (`provider.open()` does not dedupe by label, so a sibling
 * plugin opening its own session would spawn a second window).
 *
 * Injection runs through the seam's `execute` (CDP `Runtime.evaluate`) — no
 * provider changes, no addInitScript hook. The layer does NOT survive
 * navigation (each navigation mints a fresh document); the enable tool is
 * idempotent and cheap to call again, and the annotations themselves persist
 * in the page origin's localStorage.
 * @module dsh-browser/tool-browser/annotate
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Context } from '@deepseek-ai/cordis'
import type { BrowserSessionId } from '../browser/types.js'
import type { ToolBrowserState } from './index.js'

type BrowserSeam = NonNullable<Context['browser']>

interface ExecAgentLike {
  ctx?: Context
}

interface AnnotateHelpers {
  ensureSession: (browser: BrowserSeam, state: ToolBrowserState, key: string, agent?: ExecAgentLike) => Promise<BrowserSessionId>
  taskKey: (exec: { agent?: { id?: string } | undefined } | undefined) => string
  agentOf: (exec: unknown) => ExecAgentLike | undefined
  timeoutMs: number
}

interface AnnotateContext {
  tools: { register(tool: ReturnType<typeof defineTool>): void }
  get(name: 'browser'): BrowserSeam | undefined
}

/** One annotation as stored in the page and returned to the model. */
export interface PageAnnotation {
  readonly ts: number
  readonly url: string
  readonly tag: string
  readonly selector: string
  readonly text: string
  readonly rect: { readonly w: number; readonly h: number }
  readonly color: string
  readonly font: string
  readonly comment: string
}

/**
 * The in-page layer, as one evaluation expression. String.raw on purpose;
 * the script body avoids backticks and `${}` so the literal stays verbatim.
 * Injected through Runtime.evaluate — its return value is the layer's ack.
 */
export const ANNOTATE_LAYER_SCRIPT = String.raw`(function () {
  if (window.__magicAnnotate) { window.__magicAnnotate.show(); return 'already-loaded' }
  var HOST_ID = '__magic-annotate-host'
  var storeKey = '__magicAnnotate:v1:' + location.href
  function load() { try { return JSON.parse(localStorage.getItem(storeKey) || '[]') || [] } catch (e) { return [] } }
  function save(items) { try { localStorage.setItem(storeKey, JSON.stringify(items)) } catch (e) {} }

  var host = document.getElementById(HOST_ID)
  if (!host) {
    host = document.createElement('div')
    host.id = HOST_ID
    document.documentElement.appendChild(host)
  }
  host.style.display = ''
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host.createShadowRoot()
  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif}' +
    '.bar{position:fixed;right:16px;bottom:16px;z-index:2147483647;display:flex;gap:8px;align-items:center}' +
    'button{border:1px solid #d0d7de;border-radius:999px;background:#fff;color:#1f2328;padding:6px 14px;font-size:13px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.18)}' +
    'button:hover{background:#f6f8fa}' +
    'button.on{background:#2563eb;border-color:#2563eb;color:#fff}' +
    '.panel{position:fixed;right:16px;bottom:56px;z-index:2147483647;width:340px;max-height:60vh;overflow:auto;background:#fff;border:1px solid #d0d7de;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.22);padding:10px;font-size:13px;color:#1f2328}' +
    '.panel h4{margin:2px 4px 8px;font-size:13px}' +
    '.item{border:1px solid #eaeef2;border-radius:8px;padding:8px;margin-bottom:8px}' +
    '.item .sel{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#57606a;word-break:break-all}' +
    '.item .txt{color:#57606a;margin:4px 0;word-break:break-all}' +
    '.item .cmt{margin-top:4px;white-space:pre-wrap}' +
    '.item .del{margin-top:6px;padding:2px 10px;font-size:12px}' +
    '.editor{position:fixed;z-index:2147483648;width:300px;background:#fff;border:1px solid #2563eb;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.28);padding:10px;font-size:13px;color:#1f2328}' +
    '.editor .meta{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#57606a;margin-bottom:6px;word-break:break-all}' +
    '.editor textarea{width:100%;height:56px;border:1px solid #d0d7de;border-radius:6px;padding:6px;font-size:13px;resize:vertical}' +
    '.editor .row{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}' +
    '</style>' +
    '<div class="bar"><button id="ma-list" style="display:none">列表</button><button id="ma-pill">注释 · 0</button></div>' +
    '<div class="panel" id="ma-panel" style="display:none"><h4>本页注释</h4><div id="ma-items"></div></div>' +
    '<div class="editor" id="ma-editor" style="display:none"></div>'

  var pill = root.getElementById('ma-pill')
  var listBtn = root.getElementById('ma-list')
  var panel = root.getElementById('ma-panel')
  var itemsBox = root.getElementById('ma-items')
  var editor = root.getElementById('ma-editor')
  var selecting = false
  var hoverEl = null
  var hoverPrev = ''

  function items() { return load() }
  function updateChrome() {
    var n = items().length
    pill.textContent = selecting ? '选取元素中…（Esc 取消）' : '注释 · ' + n
    pill.className = selecting ? 'on' : ''
    listBtn.style.display = n > 0 ? '' : 'none'
    if (panel.style.display !== 'none') renderList()
  }
  function renderList() {
    var list = items()
    itemsBox.innerHTML = ''
    if (list.length === 0) { itemsBox.textContent = '（本页暂无注释）'; return }
    list.forEach(function (a, i) {
      var box = document.createElement('div')
      box.className = 'item'
      var head = document.createElement('div')
      head.className = 'sel'
      head.textContent = '[' + (i + 1) + '] ' + a.tag + ' · ' + a.selector
      var txt = document.createElement('div')
      txt.className = 'txt'
      txt.textContent = a.text || ''
      var cmt = document.createElement('div')
      cmt.className = 'cmt'
      cmt.textContent = a.comment ? '💬 ' + a.comment : ''
      var del = document.createElement('button')
      del.className = 'del'
      del.textContent = '删除'
      del.addEventListener('click', function () {
        var cur = items(); cur.splice(i, 1); save(cur); renderList(); updateChrome()
      })
      box.appendChild(head); box.appendChild(txt); box.appendChild(cmt); box.appendChild(del)
      itemsBox.appendChild(box)
    })
  }
  function setSelect(on) {
    selecting = on
    if (!on && hoverEl) { hoverEl.style.outline = hoverPrev; hoverEl = null }
    editor.style.display = 'none'
    updateChrome()
  }
  function cssPath(el) {
    if (el.id) return '#' + el.id
    var parts = []
    var node = el
    while (node && node.nodeType === 1 && node !== document.body && node !== document.documentElement) {
      var seg = node.tagName.toLowerCase()
      var parent = node.parentElement
      if (parent) {
        var same = Array.prototype.filter.call(parent.children, function (c) { return c.tagName === node.tagName })
        if (same.length > 1) seg += ':nth-of-type(' + (Array.prototype.indexOf.call(same, node) + 1) + ')'
      }
      parts.unshift(seg)
      node = parent
    }
    return parts.join(' > ') || el.tagName.toLowerCase()
  }

  document.addEventListener('mouseover', function (e) {
    if (!selecting || !e.target || (e.target instanceof Node && host.contains(e.target))) return
    var el = e.target
    if (hoverEl && hoverEl !== el) hoverEl.style.outline = hoverPrev
    if (hoverEl !== el) { hoverPrev = el.style.outline || ''; hoverEl = el }
    el.style.outline = '2px solid #2563eb'
  }, true)

  document.addEventListener('click', function (e) {
    if (!selecting) return
    if (e.target instanceof Node && host.contains(e.target)) return
    e.preventDefault(); e.stopPropagation()
    var el = e.target
    if (!el || el.nodeType !== 1) return
    setSelect(false)
    var r = el.getBoundingClientRect()
    var cs = getComputedStyle(el)
    var text = (el.innerText || el.textContent || '').trim().slice(0, 120)
    var meta = el.tagName.toLowerCase() +
      ' · ' + Math.round(r.width) + 'x' + Math.round(r.height) +
      ' · 颜色 ' + cs.color +
      ' · 字体 ' + cs.fontSize + ' ' + String(cs.fontFamily || '').split(',')[0]
    editor.innerHTML = ''
    var m = document.createElement('div'); m.className = 'meta'; m.textContent = meta
    var ta = document.createElement('textarea'); ta.placeholder = '添加评论…（告诉 Agent 要改什么）'
    var row = document.createElement('div'); row.className = 'row'
    var cancel = document.createElement('button'); cancel.textContent = '取消'
    var ok = document.createElement('button'); ok.className = 'on'; ok.textContent = '保存注释'
    row.appendChild(cancel); row.appendChild(ok)
    editor.appendChild(m); editor.appendChild(ta); editor.appendChild(row)
    var x = Math.min(e.clientX, window.innerWidth - 320)
    var y = Math.min(e.clientY + 12, window.innerHeight - 160)
    editor.style.left = Math.max(8, x) + 'px'
    editor.style.top = Math.max(8, y) + 'px'
    editor.style.display = ''
    ta.focus()
    var annotation = {
      ts: Date.now(),
      url: location.href,
      tag: el.tagName.toLowerCase(),
      selector: cssPath(el),
      text: text,
      rect: { w: Math.round(r.width), h: Math.round(r.height) },
      color: cs.color,
      font: cs.fontSize + ' ' + String(cs.fontFamily || '').split(',')[0],
      comment: ''
    }
    function close() { editor.style.display = 'none' }
    cancel.addEventListener('click', close)
    ok.addEventListener('click', function () {
      annotation.comment = ta.value.trim()
      var cur = items(); cur.push(annotation); save(cur)
      close(); updateChrome()
    })
  }, true)

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && selecting) setSelect(false)
  }, true)

  pill.addEventListener('click', function () { setSelect(!selecting) })
  listBtn.addEventListener('click', function () {
    panel.style.display = panel.style.display === 'none' ? '' : 'none'
    renderList()
  })
  updateChrome()

  window.__magicAnnotate = {
    version: 1,
    show: function () { host.style.display = ''; updateChrome() },
    hide: function () { host.style.display = 'none' },
    list: function () { return items() },
    clear: function () { save([]); updateChrome() }
  }
  return 'installed'
})()`

/**
 * Register the two annotation tools. They reuse the calling task's session
 * through the shared {@link ToolBrowserState}, so annotations always land in
 * the browser window the rest of the browser_* tools drive.
 */
export function registerAnnotateTools(
  ctx: AnnotateContext,
  state: ToolBrowserState,
  helpers: AnnotateHelpers,
): void {
  const listSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      present: { type: 'boolean', required: true },
      items: {
        type: 'array',
        required: true,
        items: {
          type: 'object',
          additionalProperties: true,
          properties: {},
        },
      },
    },
  } as const

  ctx.tools.register(defineTool({
    name: 'browser_annotate_enable',
    description: 'Enable the page-annotation layer in the shared browser window: a floating "注释" pill appears on the current page. The human clicks it, then clicks any element to see its tag/size/color/font and attach a comment. Call this AFTER the page has loaded, and call it AGAIN after every navigation (the layer does not survive navigation). Then use browser_annotations to read what the human annotated.',
    parameters: {},
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { state: { type: 'string', required: true } },
      },
      render: (_args, value) => [{
        type: 'text',
        text: value.state === 'already-loaded'
          ? 'Annotation layer already active on this page.'
          : 'Annotation layer enabled — the "注释" pill is visible bottom-right of the shared browser window. Tell the human to click it, then click an element to annotate.',
      }],
    },
    timeoutMs: helpers.timeoutMs,
    isConcurrencySafe: () => false,
    async execute(_args, exec) {
      assertBrowserAvailable()
      const browser = ctx.get('browser')!
      const session = await helpers.ensureSession(browser, state, helpers.taskKey(exec), helpers.agentOf(exec))
      const result = await browser.execute(session, { script: ANNOTATE_LAYER_SCRIPT })
      if (!result.ok) throw new Error(`browser_annotate_enable: ${result.exception}`)
      return { state: String(result.value) }
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_annotations',
    description: 'Read the human\'s page annotations for the CURRENT page in the shared browser (selector, matched text, size/color/font, and their comment). Empty result usually means the layer is not enabled on this page yet — call browser_annotate_enable first. Use the selector to locate the exact element the human wants changed.',
    parameters: {
      clear: { type: 'boolean', description: 'Also delete all annotations stored for the current page.' },
    },
    output: {
      schema: listSchema,
      render: (_args, value) => {
        if (value.present !== true) return [{ type: 'text', text: 'Annotation layer is not enabled on this page — call browser_annotate_enable first.' }]
        const items = value.items as unknown as PageAnnotation[]
        if (items.length === 0) return [{ type: 'text', text: 'No annotations on this page yet.' }]
        const lines = items.map((a, i) =>
          `[${i + 1}] <${a.tag}> ${a.selector} — "${a.text}" (${a.rect.w}x${a.rect.h}, ${a.color}, ${a.font})${a.comment ? ` — 💬 ${a.comment}` : ''}`)
        return [{ type: 'text', text: `${items.length} annotation(s) on this page:\n${lines.join('\n')}` }]
      },
    },
    timeoutMs: helpers.timeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      assertBrowserAvailable()
      const browser = ctx.get('browser')!
      const session = await helpers.ensureSession(browser, state, helpers.taskKey(exec), helpers.agentOf(exec))
      const script = args.clear === true
        ? 'window.__magicAnnotate ? (function(){ var l = window.__magicAnnotate.list(); window.__magicAnnotate.clear(); return JSON.stringify({ ok: true, items: l }) })() : JSON.stringify({ ok: false })'
        : 'window.__magicAnnotate ? JSON.stringify({ ok: true, items: window.__magicAnnotate.list() }) : JSON.stringify({ ok: false })'
      const result = await browser.execute(session, { script })
      if (!result.ok) throw new Error(`browser_annotations: ${result.exception}`)
      let parsed: { ok?: boolean; items?: PageAnnotation[] }
      try {
        parsed = JSON.parse(String(result.value)) as { ok?: boolean; items?: PageAnnotation[] }
      } catch {
        throw new Error(`browser_annotations: unreadable layer response: ${String(result.value).slice(0, 200)}`)
      }
      if (parsed.ok !== true) return { present: false, items: [] }
      return { present: true, items: (parsed.items ?? []) as never }
    },
  }))

  function assertBrowserAvailable(): void {
    if (ctx.get('browser') === undefined) throw new Error('tool-browser: browser service unavailable')
  }
}
