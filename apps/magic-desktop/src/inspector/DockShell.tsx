/**
 * 官方 Sidebar 的 mount 组合层（对应 vendor client/index.tsx 的 apply 序列，
 * 跳过 slots / native 右栏面 / link-intercept / turn-tail——magic-desktop 没有
 * DSH native Sidebar 与 DSH 对话列）：
 *   createSidebarStore → createBetterSidebarService → registerBuiltins（照
 *   index.tsx:187-190 的 builtin tabs/viewers 注册；fileIcon 走内置 glyph 链，
 *   无外部 registerFileIcon）→ attachLocale / chunk module system / prefs 引导
 *   → <Sidebar ctx store>。
 *
 * DOM 锚点降级：官方 use-center-column 在 DSH 里锚定对话列
 * （`#root [data-slot="main.conversation"]`，center-column.ts:12），无锚点的
 * 失败路径是面板永远 visibility:hidden（Sidebar.tsx:743 centerMeasured 门）。
 * magic-desktop 没有该锚点，这里在容器内铺一个同 key 的透明假锚点：
 * resolveCenterColumn 命中它、columnOfSlotHost 停在本容器（第一个真实盒子
 * 祖先），centerRect = 右坞容器矩形——底部工作台水平贴合右坞、贴视口底
 * （layout.css 的 margin-bottom push 作用在 absolute 锚点上，无布局效果）。
 */
import { useEffect, useRef, useState } from 'react'
import { Sidebar } from '../vendor/dsh-better-sidebar/src/client/Sidebar.tsx'
import { RenderBoundary } from '../vendor/dsh-better-sidebar/src/client/RenderBoundary.tsx'
import { createSidebarStore } from '../vendor/dsh-better-sidebar/src/client/state.ts'
import { createBetterSidebarService } from '../vendor/dsh-better-sidebar/src/client/service.ts'
import { registerBuiltins } from '../vendor/dsh-better-sidebar/src/client/builtins/index.ts'
import { setChunkModuleSystem } from '../vendor/dsh-better-sidebar/src/client/chunk-loader.ts'
import { attachLocale, t } from '../vendor/dsh-better-sidebar/src/client/locales.ts'
import { loadBootDecision } from '../vendor/dsh-better-sidebar/src/client/prefs.ts'
import { api } from '../vendor/dsh-better-sidebar/src/client/api.ts'
import css from '../vendor/dsh-better-sidebar/src/client/sidebar.module.css'
// 官方样式链：token 桥（--dsw-alias-* → stitch token）+ 布局（panel host / bottom push）
// + 组件 module css（Sidebar 自 import）。css/* 的子样式由各组件自己 import。
import '../vendor/dsh-better-sidebar/src/client/tokens.css'
import '../vendor/dsh-better-sidebar/src/client/layout.css'
import { createDockContext } from './dock-context'
import { resolveFilePath } from './file-path'
import type { DockSessionBridge } from './DockPanels'

/** 自写壳 dockTabRequest.tab → 官方 tab descriptor id（builtins/tabs.tsx）。 */
const DOCK_TAB_KIND: Record<string, string> = {
  files: 'editor',
  changes: 'git',
  jobs: 'subagent',
  terminal: 'terminal',
  browser: 'browser',
  sidechat: 'sidechat',
  // 'team'（CeoWorkspace）：官方无对应 tab，warn 后忽略。
}

export interface DockShellProps {
  sessionId: string
  cwd: string | undefined
  bridge: DockSessionBridge
  /** conversation.input 桥：树 @ 引用 / 划选「添加到对话」经 ctx.conversation 到这里。 */
  onDraftText?: (text: string) => void
  /** ctx.get('sidebarRight').isExpanded 的取值（右坞可见性）。 */
  expanded?: boolean
  /** sidebarRight.toggleExpanded（官方窄屏停靠把右栏放回去的动作）。 */
  onToggleCollapsed?: () => void
  dockTabRequest?: { tab: string; seq: number; sessionId: string } | null
  fileRequest?: { path: string; seq: number; sessionId: string } | null
}

export function DockShell({
  sessionId,
  cwd,
  bridge,
  onDraftText,
  expanded = true,
  onToggleCollapsed,
  dockTabRequest,
  fileRequest,
}: DockShellProps) {
  // latest-ref：bundle/options 在 mount 时闭包一次，读值全部经 latest 解引用，
  // props 更新无需重建 ctx（Sidebar 的 uSES 订阅随之保持稳定）。
  const latest = useRef({ sessionId, cwd, bridge, onDraftText, expanded, onToggleCollapsed })
  latest.current = { sessionId, cwd, bridge, onDraftText, expanded, onToggleCollapsed }

  // 官方规则（vendor index.tsx:134-142）：每激活实例一套 store/service，无模块级单例。
  const [store] = useState(createSidebarStore)
  const [service] = useState(() => createBetterSidebarService(store))
  const [bundle] = useState(() => createDockContext({
    service,
    bridge: {
      openSession: (id) => { latest.current.bridge.openSession(id) },
      fork: (id) => latest.current.bridge.fork(id),
    },
    getSession: () => {
      const current = latest.current
      const row = current.bridge.sessions.find(item => item.sessionId === current.sessionId)
      return { sessionId: current.sessionId || undefined, cwd: current.cwd, title: row?.title }
    },
    getRows: () => latest.current.bridge.sessions,
    onDraftText: (text) => { latest.current.onDraftText?.(text) },
    isExpanded: () => latest.current.expanded,
    toggleExpanded: () => { latest.current.onToggleCollapsed?.() },
  }))
  const ctx = bundle.ctx

  // 注册序列（照 vendor index.tsx apply，跳过 slots/native/link-intercept/ime）。
  useEffect(() => {
    setChunkModuleSystem(ctx.modules)
    attachLocale(ctx.locale)
    const disposeBuiltins = registerBuiltins(ctx, service)
    let disposed = false
    // Side card 偏好引导（官方 loadBootDecision 自带失败兜底 → schema 默认值）。
    void loadBootDecision(api)
      .then(decision => { if (!disposed) store.setPrefs(decision.prefs) })
      .catch(() => { /* 保持默认 prefs */ })
    return () => {
      disposed = true
      disposeBuiltins()
    }
  }, [ctx, service, store])

  // 默认展开工作台：官方 per-session state bottomOpen 默认 false（DSH 里由
  // session header 的 BottomDockToggle 控制）；magic 右坞没有该 header 按钮，
  // mount 时展开一次（此后官方 localStorage 持久化接管，用户收起的选择被记住）。
  useEffect(() => {
    store.reduce(state => state.bottomOpen ? state : { ...state, bottomOpen: true })
  }, [store, sessionId])

  // props 驱动的 sessions 快照变化 → 通知官方 uSES 订阅者。
  useEffect(() => { bundle.refreshSessions() }, [bundle, sessionId, cwd, bridge.sessions])

  // 旧 fileRequest 通道 → 官方 openFile（editor tab per-path 去重聚焦）。
  const lastFileSeq = useRef(0)
  useEffect(() => {
    if (fileRequest === null || fileRequest === undefined) return
    if (fileRequest.sessionId !== sessionId || fileRequest.seq === lastFileSeq.current) return
    // cwd 未解析时相对路径先等待（deps 带 cwd，解析后重跑消费；自写壳同规则）。
    if (cwd === undefined && !/^(?:[a-z]:[\\/]|[/\\])/i.test(fileRequest.path)) return
    lastFileSeq.current = fileRequest.seq
    const resolved = resolveFilePath(fileRequest.path, cwd)
    if (resolved === null) return
    service.openFile({ sessionId, cwd }, resolved)
  }, [fileRequest, sessionId, cwd, service])

  // 旧 dockTabRequest 通道 → 官方 openTab（无 surface → 落底部工作台并展开）。
  const lastTabSeq = useRef(0)
  useEffect(() => {
    if (dockTabRequest === null || dockTabRequest === undefined) return
    if (dockTabRequest.sessionId !== sessionId || dockTabRequest.seq === lastTabSeq.current) return
    lastTabSeq.current = dockTabRequest.seq
    const kind = DOCK_TAB_KIND[dockTabRequest.tab]
    if (kind === undefined) {
      console.warn(`[magic-desktop] dockTabRequest "${dockTabRequest.tab}" 无官方 tab 映射，已忽略`)
      return
    }
    // 官方 files 窗口语义：无路径 editor 窗口即资源管理器（vendor intercept.tsx:51）。
    if (kind === 'editor') service.openTab({ type: 'editor', title: t('files') })
    else service.openTab({ type: kind })
  }, [dockTabRequest, sessionId, service])

  return (
    <div className="vendor-bs relative flex-1 min-h-0 min-w-0">
      {/* use-center-column 的降级锚点：铺满本容器，centerRect = 右坞容器矩形。 */}
      <div data-slot="main.conversation" aria-hidden="true" className="pointer-events-none absolute inset-0" />
      {/* 根错误边界（官方 RenderBoundary）：壳级渲染失败显示错误条，不拖垮右坞。 */}
      <RenderBoundary className={css.boundaryError}>
        <Sidebar ctx={ctx} store={store} />
      </RenderBoundary>
    </div>
  )
}
