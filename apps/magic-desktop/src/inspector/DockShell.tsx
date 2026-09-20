/**
 * dockkit 右栏的 mount 组合层。两层职责：
 *
 * 1. better-sidebar 插件面（官方 plugins/dsh-better-sidebar client apply 的
 *    本环境等价）：createSidebarStore → createBetterSidebarService →
 *    registerBuiltins（builtinTabs 产物 = editor/files/terminal/browser/
 *    subagent/sidechat/diff 描述符）→ chunk module system / locale / prefs →
 *    createNativeTabRecords + createNativeSurface（service 的 native 写面）→
 *    registerNativeSurface（native/index.ts：每个描述符注册成 dockkit tab
 *    type + `sidebar.right.pane.tab`/`…title` 的 body/chip slot——对应官方
 *    index.tsx:148-154/187-190 序列）；
 * 2. dockkit 右栏面：DockkitSidebarRight（ui-sidebar-right 平移包的 host，
 *    官方 apply 序列）渲染 <SidebarRight> 竖向面板 + 顶部 tab 行。
 *
 * 旧 bottom workbench（vendor Sidebar.tsx）不再渲染；文件保留作追溯。
 * RenderBoundary 维持壳级错误边界：某面板内部错误不拖垮整体。
 */
import { useEffect, useRef, useState } from 'react'
import { RenderBoundary } from '../vendor/dsh-better-sidebar/src/client/RenderBoundary.tsx'
import { createSidebarStore } from '../vendor/dsh-better-sidebar/src/client/state.ts'
import { createBetterSidebarService } from '../vendor/dsh-better-sidebar/src/client/service.ts'
import { registerBuiltins } from '../vendor/dsh-better-sidebar/src/client/builtins/index.ts'
import { setChunkModuleSystem } from '../vendor/dsh-better-sidebar/src/client/chunk-loader.ts'
import { attachLocale, t } from '../vendor/dsh-better-sidebar/src/client/locales.ts'
import { loadBootDecision } from '../vendor/dsh-better-sidebar/src/client/prefs.ts'
import { api } from '../vendor/dsh-better-sidebar/src/client/api.ts'
import css from '../vendor/dsh-better-sidebar/src/client/sidebar.module.css'
// 官方样式链：token 桥（--dsw-alias-* → stitch token）——dockkit/ui-sidebar-right
// 的 module css 消费同一 token 链。
import '../vendor/dsh-better-sidebar/src/client/tokens.css'
import { createNativeTabRecords } from '../vendor/dsh-better-sidebar/src/client/native/tab-adapter.tsx'
import { registerNativeSurface } from '../vendor/dsh-better-sidebar/src/client/native/index.ts'
import { createNativeSurface } from '../vendor/dsh-better-sidebar/src/client/native/surface.ts'
import { createDockContext } from './dock-context'
import { resolveFilePath } from './file-path'
import { DockkitSidebarRight } from './DockkitSidebarRight'
import type { DockSessionBridge } from './DockPanels'

/** 自写壳 dockTabRequest.tab → 官方 tab descriptor id（builtins/tabs.tsx）。 */
const DOCK_TAB_KIND: Record<string, string> = {
  files: 'editor',
  changes: 'git',
  jobs: 'subagent',
  terminal: 'terminal',
  browser: 'browser',
  sidechat: 'sidechat',
  // sidenote fork 式侧聊（2026-09-18）：顶栏「⊕侧边」的承接 tab。
  side: 'dsh-sidenote:side',
  // 调用轨迹（2026-09-19）：⋯ 菜单「查看调用轨迹」的承接 tab（descriptor
  // hidden——不进开始页 guide）。
  trajectory: 'magic:trajectory',
  // 计划 tab（2026-09-20，PRD-02 §15.4）：胶囊计划段/计划卡的承接 tab。
  plan: 'magic:plan',
  // 'team'（CeoWorkspace）：官方无对应 tab，warn 后忽略。
}

export interface DockShellProps {
  sessionId: string
  cwd: string | undefined
  bridge: DockSessionBridge
  /** conversation.input 桥：树 @ 引用 / 划选「添加到对话」经 ctx.conversation 到这里。 */
  onDraftText?: (text: string) => void
  /**
   * 会话对话流读取面（官方 ISessions.binding 的本环境等价）：Side Chat 面板
   * fork 子会话的转录/发送/运行态从这里读。App 侧由 ChatSessionStore 注册表 +
   * web.follow/prompt 语义实现（DockContextOptions.getBinding 的完整形状）。
   */
  getBinding?: Parameters<typeof createDockContext>[0]['getBinding']
  /** dockkit 全屏模式（⛶）报告；RightDock 切 aside 宽度。 */
  onFullscreenChange?: (fullscreen: boolean) => void
  /** dockkit 收起按钮（◨）报告；RightDock → App onToggleCollapsed。 */
  onCollapse?: () => void
  dockTabRequest?: { tab: string; seq: number; sessionId: string } | null
  fileRequest?: { path: string; seq: number; sessionId: string } | null
}

export function DockShell({
  sessionId,
  cwd,
  bridge,
  onDraftText,
  getBinding,
  onFullscreenChange,
  onCollapse,
  dockTabRequest,
  fileRequest,
}: DockShellProps) {
  // latest-ref：bundle/options 在 mount 时闭包一次，读值全部经 latest 解引用，
  // props 更新无需重建 ctx（订阅随之保持稳定）。
  const latest = useRef({ sessionId, cwd, bridge, onDraftText, getBinding, onFullscreenChange, onCollapse })
  latest.current = { sessionId, cwd, bridge, onDraftText, getBinding, onFullscreenChange, onCollapse }

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
    getBinding: (id) => latest.current.getBinding?.(id),
    onDraftText: (text) => { latest.current.onDraftText?.(text) },
    // dockkit 右栏自持 expanded（store.layout.expanded）；该 face 仅供
    // better-sidebar 的窄屏停靠读面（use-host-feeds），恒展开。
    isExpanded: () => true,
    toggleExpanded: () => { latest.current.onCollapse?.() },
  }))
  const ctx = bundle.ctx

  // native surface（官方 index.tsx:148-154）：records + service 写面，一次创建。
  // setSurface 在注册 effect 里做（StrictMode 的 cleanup 会清掉，remount 需重装）。
  const [native] = useState(() => {
    const records = createNativeTabRecords()
    const surface = createNativeSurface(ctx, records)
    return { records, surface }
  })

  // 注册序列（官方 index.tsx：dictionaries/builtins/native registrations）。
  useEffect(() => {
    setChunkModuleSystem(ctx.modules)
    attachLocale(ctx.locale)
    service.setSurface(native.surface)
    // sidenote fork 式侧聊的宿主面（dock-context 的 fork/binding 复用；
    // latest 解引用保 props 更新无需重注册）。
    const sideNote = {
      onFork: (sessionId: string) => latest.current.bridge.fork(sessionId),
      bindingOf: (id: string) => {
        const binding = latest.current.getBinding?.(id)
        if (binding === undefined) return undefined
        return {
          events: binding.events,
          subscribe: binding.subscribe,
          prompt: binding.prompt,
          running: binding.running,
        }
      },
      parentRunning: () => {
        const current = latest.current
        return current.bridge.sessions.find(row => row.sessionId === current.sessionId)?.running === true
      },
      // 分身 composer 数据面（2026-09-19）：与主会话同源（bridge），按子会话 id
      // 参数化——SideNoteView 据此渲染与主会话一致的完整 composer。
      chat: {
        modelCatalog: latest.current.bridge.modelCatalog,
        sessionModelOf: (id: string) => latest.current.bridge.sessionModelOf?.(id),
        selectModel: (id: string, provider: string, model: string, reasoningEffort?: string) => {
          void latest.current.bridge.selectModel(id, provider, model, reasoningEffort).catch(() => undefined)
        },
        runCommand: (id: string, line: string) => latest.current.bridge.runCommand?.(id, line),
        mentionOptions: latest.current.bridge.mentionOptions,
        commandOptions: latest.current.bridge.commandOptions,
      },
    }
    const disposeBuiltins = registerBuiltins(ctx, service, { sideNote })
    const disposeSurface = () => {
      native.surface.dispose()
      service.setSurface(undefined)
    }
    // dockkit host（子组件）的 provide effect 先于本 effect 执行——
    // ctx.inject(['sidebarRightTabs']) 在此立即可用（native/index.ts:137）。
    const disposeNative = registerNativeSurface({ ctx, store, service, records: native.records })
    let disposed = false
    // Side card 偏好引导（官方 loadBootDecision 自带失败兜底 → schema 默认值）。
    void loadBootDecision(api)
      .then(decision => { if (!disposed) store.setPrefs(decision.prefs) })
      .catch(() => { /* 保持默认 prefs */ })
    return () => {
      disposed = true
      disposeNative()
      disposeBuiltins()
      disposeSurface()
    }
  }, [ctx, store, service, native])

  // props 驱动的 sessions 快照变化 → 通知官方 uSES 订阅者（native surface 的
  // flushPending 也挂在这个订阅流上）。
  useEffect(() => { bundle.refreshSessions() }, [bundle, sessionId, cwd, bridge.sessions])

  // better-sidebar store 的 active session（官方 Sidebar.tsx:207 的同款 effect）：
  // service.openTab 的 native 分支用它解析无 scope open 的目标会话。
  useEffect(() => { store.setSession(sessionId || undefined) }, [store, sessionId])

  // fileRequest 通道 → 官方 openFile（native openResource，editor tab per-path 去重）。
  // 同 dockTabRequest：重挂载时的过期请求在 seat 未就绪时会抛，包保护诚实丢弃。
  const lastFileSeq = useRef(0)
  useEffect(() => {
    if (fileRequest === null || fileRequest === undefined) return
    if (fileRequest.sessionId !== sessionId || fileRequest.seq === lastFileSeq.current) return
    // cwd 未解析时相对路径先等待（deps 带 cwd，解析后重跑消费；自写壳同规则）。
    if (cwd === undefined && !/^(?:[a-z]:[\\/]|[/\\])/i.test(fileRequest.path)) return
    lastFileSeq.current = fileRequest.seq
    const resolved = resolveFilePath(fileRequest.path, cwd)
    if (resolved === null) return
    try {
      service.openFile({ sessionId, cwd }, resolved)
    } catch (error) {
      console.warn("[magic-desktop] fileRequest 打开失败（seat 未就绪，已丢弃）:", error)
    }
  }, [fileRequest, sessionId, cwd, service])

  // dockTabRequest 通道 → 官方 openTab（native surface → dockkit openTab）。
  // 2026-09-19 黑屏修复：本 effect 在右坞重挂载时会因 App 持久的 dockTabRequest
  // 重新开火，而此刻 dockkit seat 的 binding 可能尚未发布（controller.require 抛
  // "no session surface is mounted"，effect 异常无上层边界 → 整棵树卸载=全屏黑）。
  // 故 openTab 包 try/catch 诚实丢弃过期请求（坞内容有默认开始页兜底）。
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
    try {
      if (kind === 'editor') service.openTab({ type: 'editor', title: t('files') })
      else service.openTab({ type: kind })
    } catch (error) {
      console.warn("[magic-desktop] dockTabRequest 打开失败（seat 未就绪，已丢弃）:", error)
    }
  }, [dockTabRequest, sessionId, service])

  return (
    // 根错误边界（官方 RenderBoundary）：壳级渲染失败显示错误条，不拖垮右坞。
    <RenderBoundary className={css.boundaryError}>
      <DockkitSidebarRight
        ctx={ctx}
        slotCore={bundle.slotCore}
        sessionId={sessionId}
        onFullscreenChange={onFullscreenChange}
        onCollapse={onCollapse}
      />
    </RenderBoundary>
  )
}
