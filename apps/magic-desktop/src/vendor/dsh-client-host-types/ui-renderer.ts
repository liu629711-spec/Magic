/**
 * Vendor shim of `@deepseek-ai/dsh-client-ui-renderer/client`（type-only）。
 * 上游在这里把 SlotRegistry 服务 merge 进 cordis Context；ui-sidebar-right 的
 * apply（ClientContext = 纯 cordis Context）依赖该 augmentation 才能引用
 * ctx.slots。face 取宽结构（本环境的 slots 实现是 dock-context 的 SlotCore
 * wrapper，注册 options 的静态检查由调用点 / SidebarSlotRegisterOptions 承担；
 * index signature 放过平移包官方字面量里的全部字段，inject 的 contextual
 * any 承接官方 apply 未注解的 sessionId 参数）。
 */
export interface WideSlotRegisterOptions {
  name?: string
  key?: string
  id?: string
  order?: number
  label?: string | (() => string)
  priority?: number
  locale?: string
  registrant?: string
  select?: (owner: unknown) => unknown
  children?: Record<string, unknown>
  store?: unknown
  /** Business-face factory; args depend on the slot scope（宽结构，见文件头）。 */
  inject?: (...args: any[]) => object
}

export interface WideSlotsService {
  register(options: WideSlotRegisterOptions, component: unknown): () => void
  /** 等声明出现后运行 factory；声明塌缩回滚、重声明重跑（官方 SlotRegistry.inject）。 */
  inject(name: string, callback: () => (() => void) | Iterable<() => void>): () => void
  subscribe(name: string, fn: () => void): () => void
  entries(name: string): readonly unknown[]
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The client slot registry（上游由 ui-renderer 的 SlotRegistry 提供）。 */
    slots: WideSlotsService
  }
}
