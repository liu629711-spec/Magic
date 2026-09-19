/**
 * dockkit 右栏 host：把 ui-sidebar-right 平移包（shell/registry/store/
 * controller/guide）按官方 client apply（ui-sidebar-right/src/client/index.tsx
 * apply, L94-206）的序列挂进 magic-desktop 的右坞容器。
 *
 * 与官方宿主的差异（本环境无 DSH frame/ui-renderer）：
 * - 声明链自建：官方 'rightbar' 由 AppFrame 的 register children 声明；这里由
 *   root 占位 entry 声明（SlotCore 的 'root' 内置），RightbarRoot/RightbarSeat
 *   仍按官方两席注册（rightbar.session 的 children 即三个 tab seat 的声明，
 *   声明级 inject.hooks 指向平移包 tab-info.ts 的官方 hook factory）；
 * - RightbarSeat 经 mini slot renderer 派发（dockkit-slot-renderer.tsx），
 *   props 四 share 与官方渲染机等价（runtime/sessionId、store、inject hooks、
 *   locale t）；
 * - syncPresentation 只消费 fullscreen（aside 宽度切换走 RightDock 的
 *   onFullscreenChange）；shown/track 是 frame 布局事实，本环境无 track；
 * - dockkit 收起按钮（PanelChrome ◨）经 store 订阅上报 onCollapse，RightDock
 *   转发给 App 的 onToggleCollapsed（aside 整体消失，顶栏 ◨ 恢复，与旧壳一致）；
 * - ctx.resources.pin 缺位：Tab domain 的资源保留降级为 noop（本环境资源
 *   字节由 better-sidebar 自己的 fetch 通道加载，无 host resource 模型）；
 * - store handle 的 create 按 host 侧单实例幂等（一次 create + adopt；官方
 *   每 session mint 一例，本 host 一次只服务一个 dockSessionId——RightDock
 *   key={dockSessionId} 保证会话切换整体 remount）。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { RightbarRoot } from '../vendor/ui-sidebar-right/src/client/shell/RightbarRoot.tsx'
import { RightbarSeat, type SidebarRightInjected } from '../vendor/ui-sidebar-right/src/client/shell/SidebarRight.tsx'
import { createSidebarRightController } from '../vendor/ui-sidebar-right/src/client/service.ts'
import { SidebarRightTabRegistry } from '../vendor/ui-sidebar-right/src/client/tab-registry.ts'
import { createSidebarRightStore } from '../vendor/ui-sidebar-right/src/client/stores.ts'
import { en, zh } from '../vendor/ui-sidebar-right/src/client/locales.ts'
import { GUIDE_ID, guideDefinition } from '../vendor/ui-sidebar-right/src/client/tabs/guide/definition.ts'
import { GuideBody, type GuideInjected } from '../vendor/ui-sidebar-right/src/client/tabs/guide/GuideBody.tsx'
import { GuideTitle } from '../vendor/ui-sidebar-right/src/client/tabs/guide/GuideTitle.tsx'
import { tabInfoFactory, guideTabInfoFactory } from '../vendor/ui-sidebar-right/src/client/tab-info.ts'
import { defaultSeed } from '../vendor/ui-sidebar-right/src/client/contract/seed.ts'
import type { TabId } from '@deepseek-ai/dsh-client-ui-dockkit'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createSlotDispatch } from './dockkit-slot-renderer'
import type { Context } from '../vendor/dsh-better-sidebar/src/context-types.ts'

export interface DockkitSidebarRightProps {
  ctx: Context
  /** dockkit 右栏的 slot 注册表（dock-context 持有，native surface 共用）。 */
  slotCore: import('@deepseek-ai/dsh-client-ui-slots').SlotCore
  sessionId: string
  /** dockkit 全屏模式报告（RightDock 切 aside 宽度；false = 回到 520px 列）。 */
  onFullscreenChange?: (fullscreen: boolean) => void
  /** dockkit 收起按钮报告（RightDock → App onToggleCollapsed）。 */
  onCollapse?: () => void
}

/** Sidebar-right store 实例（从工厂返回类型推导，actions 面完整类型化）。 */
type SidebarRightStoreHandle = ReturnType<typeof createSidebarRightStore>
type SidebarRightStoreInstance = ReturnType<SidebarRightStoreHandle['create']>

/** root 席的占位组件：只承担 children 声明（官方由 AppFrame 占据）。 */
function RootHostPlaceholder(): ReactNode { return null }

export function DockkitSidebarRight({ ctx, slotCore, sessionId, onFullscreenChange, onCollapse }: DockkitSidebarRightProps): ReactNode {
  // 官方 apply 顶层规则：registry/controller 不能建在 effect 内（register 会把
  // effect 挂到当前 fiber——在另一插件 apply 里做会静默卡死 boot）。
  const [tabs] = useState(() => new SidebarRightTabRegistry(ctx as never))
  const [{ controller, adopt }] = useState(() => createSidebarRightController(tabs, () => {}))
  const [handle] = useState(() => createSidebarRightStore(() => defaultSeed(tabs)))

  // store wrap（照官方 apply L129-136）：create 幂等返回同一实例并在首次
  // create(scopeKey) 时 adopt——Tab domain 从该实例的 commit 同步。
  const created = useRef<{ instance?: SidebarRightStoreInstance }>({})
  const [storeHandle] = useState(() => ({
    ...handle,
    create: (scopeKey?: string): SidebarRightStoreInstance => {
      if (created.current.instance === undefined) {
        const instance = handle.create(scopeKey)
        created.current.instance = instance
        if (scopeKey !== undefined) adopt(scopeKey as SessionId, instance)
      }
      return created.current.instance
    },
  }))

  // 服务面注入（parent 的 registerNativeSurface 依赖这两个名字；本 effect 先
  // 于 parent effect 执行——React 自底向上的 effect 序）。官方 provide 第二参
  // 是惰性 factory。
  useEffect(() => {
    ctx.provide('sidebarRightTabs', () => tabs)
    ctx.provide('sidebarRight', () => controller)
  }, [ctx, tabs, controller])

  // 官方 apply 的 seats/registry/词典注册序列（L114-206）。
  useEffect(() => {
    const t = ctx.locale.bind('sidebarRight')
    const disposeDicts = ctx.locale.register('sidebarRight', { zh, en })
    // 官方 AppFrame 声明 'rightbar'；mini host 由 root 占位 entry 承担。
    const disposeRoot = ctx.slots.register({
      name: 'root',
      children: { 'rightbar': { kind: 'single', scope: 'root' } },
    }, RootHostPlaceholder)
    const disposeTypes = [tabs.register(guideDefinition(t))]
    // 右栏两席（照官方 L138-168）：seat 注入面闭包 controller，Tab domain 的
    // keyed navigation/occurrence 走同一入口。
    const injected: Omit<SidebarRightInjected, 'keyedHooks' | 'occurrence'> = {
      syncPresentation: (presentation) => { onFullscreenChange?.(presentation.fullscreen) },
      bindService: binding => controller.bind(binding),
      openTab: (kind, options) => { controller.openTab(kind, options) },
      hooks: { tabTypes: { subscribe: listener => tabs.subscribe(listener), getSnapshot: () => tabs.entries() } },
    }
    const disposeSeat = ctx.slots.inject('rightbar', function* () {
      yield ctx.slots.register({
        name: 'rightbar',
        children: { 'rightbar.session': { kind: 'single', scope: 'session' } },
      }, RightbarRoot)
      yield ctx.slots.register({
        name: 'rightbar.session',
        locale: 'sidebarRight',
        children: {
          'sidebar.right.pane.tab': { kind: 'keyed', scope: 'session', inject: { hooks: { tabInfo: tabInfoFactory } } },
          'sidebar.right.pane.tab.title': { kind: 'keyed', scope: 'session', inject: { hooks: { tabInfo: tabInfoFactory } } },
          'sidebar.right.tab.menu.item': { kind: 'list', scope: 'session' },
        },
        store: storeHandle,
        inject: (sessionKey: string) => ({
          ...injected,
          keyedHooks: { tabNavigation: (key: string) => controller.tabDomain.occurrence(sessionKey as SessionId, { id: key as TabId }).navigation },
          occurrence: (tab: { readonly id: string }) => controller.tabDomain.occurrence(sessionKey as SessionId, tab as never),
        }),
      }, RightbarSeat)
    })
    // guide 两阶段（照官方 L181-197）。
    const guideInjected: GuideInjected = {
      hooks: { guideEntries: { subscribe: listener => tabs.subscribe(listener), getSnapshot: () => tabs.guide() } },
    }
    const disposeGuide = ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
      name: 'sidebar.right.pane.tab',
      key: GUIDE_ID,
      children: {
        'sidebar.right.tab.guide': { kind: 'chain', scope: 'session', inject: { hooks: { tabInfo: guideTabInfoFactory } } },
      },
      inject: () => guideInjected,
    }, GuideBody))
    const disposeGuideTitle = ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register(
      { name: 'sidebar.right.pane.tab.title', key: GUIDE_ID },
      GuideTitle,
    ))
    return () => {
      disposeGuideTitle()
      disposeGuide()
      disposeSeat()
      for (const dispose of disposeTypes.reverse()) dispose()
      disposeRoot()
      disposeDicts()
    }
  }, [ctx, tabs, storeHandle, controller, onFullscreenChange])

  // mount 展开：官方 boot 由用户点开；magic 右坞默认展开（与旧壳一致）。
  useEffect(() => {
    const instance = storeHandle.create(sessionId)
    const surface = instance.getSnapshot().bySession[sessionId]
    if (surface === undefined || !surface.layout.expanded) {
      instance.actions.setExpanded(sessionId, true)
    }
  }, [storeHandle, sessionId])

  // dockkit 收起按钮 → App 级收起（aside null；顶栏 ◨ 恢复，与旧壳一致）。
  // 黑屏根因备忘（2026-09-19）：最后一个非 guide tab 关闭时官方 plan 会自动把列
  // 收起（stores.ts closeTab: closeTab+setExpanded(false)）→ App 隐藏 aside →
  // 重开时本组件重挂载、defaultSeed 重新播种开始页——无需也无法在 notify 期
  // openTab 补种（此时 surface 已随 RightbarSeat 卸载，require() 会抛
  // "no session surface is mounted"，未捕获异常会卸载整棵 React 树=全屏黑）。
  const collapseReported = useRef(false)
  useEffect(() => {
    const instance = storeHandle.create(sessionId)
    collapseReported.current = false
    return instance.subscribe(() => {
      const surface = instance.getSnapshot().bySession[sessionId]
      if (surface !== undefined && !surface.layout.expanded && !collapseReported.current) {
        collapseReported.current = true
        onCollapse?.()
      }
    })
  }, [storeHandle, sessionId, onCollapse, controller])

  // 面板宽度：aside 内容宽（ResizeObserver 首帧即回调；初值 520 与列宽一致）。
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(520)
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  useLayoutEffect(() => {
    const element = containerRef.current
    if (element === null) return
    const observer = new ResizeObserver(entries => {
      const next = entries[0]?.contentRect.width
      if (next !== undefined && next > 0) setWidth(next)
    })
    observer.observe(element)
    const onResize = (): void => { setViewportWidth(window.innerWidth) }
    window.addEventListener('resize', onResize)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // mini dispatch：单 session 绑定（RightDock key 保证 remount）。
  const dispatch = createSlotDispatch(
    slotCore,
    { bind: ns => ctx.locale.bind(ns) },
    entry => (entry.store === undefined ? undefined : storeHandle.create()),
    sessionId,
  )

  return (
    <div ref={containerRef} className="vendor-bs flex-1 min-h-0 min-w-0 flex flex-col" data-dockkit-sidebar-right="">
      {dispatch.renderSlot('rightbar.session', { width, viewportWidth, canShow: true })}
    </div>
  )
}
