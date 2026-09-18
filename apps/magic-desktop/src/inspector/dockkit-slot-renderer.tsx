/**
 * ui-sidebar-right 平移包的 mini slot renderer：官方链路里由 ui-renderer 承担
 * 的「注册表 → 组件 props」这一段，按本环境已核对的消费面（RightbarSeat /
 * TabSlot / GuideBody / NativeTabBody / NativeTabTitle / ExpandButton）等价实现。
 *
 * 对照的官方语义（packages/client/ui-slots/src + ui-renderer 消费契约）：
 * - register/inject/entries/specDynamic/subscribeDeclaration 直接用官方
 *   SlotCore（vendor/dsh-client-ui-slots 全量平移），不做平行实现；
 * - inject face：entry.inject(sessionId, actions?) 产出的 hooks/keyedHooks
 *   隔离间转成 `use<Name>` selector hook（uSES 绑定 source，per source 缓存）；
 * - 声明级 inject.hooks（SlotHookFactory）在渲染时以 (standard, hookContext)
 *   绑定——hookContext 由宿主组件（SidebarRight.tsx 的 TabSlot）经 renderSlot
 *   opts 传入，与官方渲染机一致；
 * - store seat：entry.store（handle/factory）按 (handle, scopeKey) 缓存出
 *   instance，props.useStore（uSES）/ props.actions 官方四 share 中的两席；
 * - chain：select(owner) 首个非 null 当选，结果注入 `matched`，全 decline 回
 *   owner fallback。
 *
 * uSES 快照稳定性已核对：全部消费面 selector 返回引用稳定值
 * （state.bySession / tabs.entries() 缓存 / navigation SnapshotStore / 标量）。
 */
import { Fragment, createElement, useSyncExternalStore } from 'react'
import type { ComponentType, ReactNode } from 'react'
import {
  standardHookPropName,
  SlotCore,
  type HostObservable,
  type KeyedSnapshotSelectorHook,
  type KeyedStandardSource,
  type SnapshotSelectorHook,
  type StoredEntry,
} from '@deepseek-ai/dsh-client-ui-slots'

/** 一份渲染期 locale face：bind(ns) 出 namespace 绑定的 t（由 dock-context 供）。 */
export interface MiniLocaleFace {
  /** Bind a namespace to a translate function reading the active locale at call time. */
  bind(ns: string): (key: string, params?: Record<string, unknown>) => string
}

/** store 实例解析面：entry 声明的 handle/factory → (handle, scopeKey) 缓存的实例。 */
export interface StoreInstanceLike {
  getSnapshot(): unknown
  subscribe(fn: () => void): () => void
  readonly actions: Record<string, (...params: never[]) => void>
}

export type StoreResolver = (entry: StoredEntry, scopeKey: string | undefined) => StoreInstanceLike | undefined

/** renderSlot 的 dispatch options（官方 RenderOpts 的本环境消费面）。 */
export interface MiniRenderOpts {
  entryKey?: string
  fallback?: ReactNode
  hookContext?: unknown
}

const noopSubscribe = (): (() => void) => () => {}

const identity = <T,>(value: T): T => value

/** uSES selector hooks，per source 缓存（hook 绑定按 source 记忆，与官方一致）。 */
const selectorHooks = new WeakMap<object, SnapshotSelectorHook<unknown>>()

function selectorHookOf<T>(source: HostObservable<T>): SnapshotSelectorHook<T> {
  let hook = selectorHooks.get(source) as SnapshotSelectorHook<T> | undefined
  if (hook === undefined) {
    hook = ((sel: (value: T) => unknown) => useSyncExternalStore(
      source.subscribe,
      () => sel(source.getSnapshot()),
    )) as SnapshotSelectorHook<T>
    selectorHooks.set(source, hook as SnapshotSelectorHook<unknown>)
  }
  return hook
}

/** resolve(key) 的 undefined-safe 包装（occurrence 未就绪时官方 keyed source 可能抛）。 */
function resolveSource(resolve: KeyedStandardSource, key: string): HostObservable<unknown> | undefined {
  try {
    return resolve(key)
  } catch {
    return undefined
  }
}

/** keyed selector hook 家族：per resolver 缓存，键内再 per key 缓存绑定。 */
function keyedHookOf(resolve: KeyedStandardSource): KeyedSnapshotSelectorHook<unknown> {
  const hooks = new Map<string, (sel: (value: unknown) => unknown) => unknown>()
  return ((key: string, sel?: (value: unknown) => unknown, _eq?: (a: unknown, b: unknown) => boolean) => {
    let hook = hooks.get(key)
    if (hook === undefined) {
      hook = (selector: (value: unknown) => unknown) => {
        const source = resolveSource(resolve, key)
        return useSyncExternalStore(
          source?.subscribe ?? noopSubscribe,
          () => (source === undefined ? undefined : selector(source.getSnapshot())),
        )
      }
      hooks.set(key, hook)
    }
    return hook(sel ?? identity)
  }) as KeyedSnapshotSelectorHook<unknown>
}

/** store selector hooks，per instance 缓存（官方 renderer 同规则）。 */
const storeHooks = new WeakMap<object, SnapshotSelectorHook<unknown>>()

function useStoreHookOf(instance: StoreInstanceLike): SnapshotSelectorHook<unknown> {
  let hook = storeHooks.get(instance)
  if (hook === undefined) {
    hook = ((sel: (value: unknown) => unknown) => useSyncExternalStore(
      instance.subscribe,
      () => sel(instance.getSnapshot()),
    )) as SnapshotSelectorHook<unknown>
    storeHooks.set(instance, hook)
  }
  return hook
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

/**
 * 组装一个 entry 的完整组件 props（官方四 share：runtime + renderSlots 由
 * owner 传入、store share、inject face——hooks 隔离间绑定 + locale t 席）。
 */
function componentProps(
  core: SlotCore,
  name: string,
  entry: StoredEntry,
  sessionId: string,
  owner: Record<string, unknown>,
  opts: MiniRenderOpts | undefined,
  locale: MiniLocaleFace | undefined,
  storeOf: StoreResolver,
  renderSlot: (name: string, owner: Record<string, unknown>, opts?: MiniRenderOpts) => ReactNode,
  renderSlotChain: (name: string, owner: Record<string, unknown>, opts?: MiniRenderOpts) => ReactNode,
): Record<string, unknown> {
  const spec = core.specDynamic(name)
  const scope = spec?.scope
  const storeInstance = storeOf(entry, scope === 'session' ? sessionId : undefined)
  let injected: Record<string, unknown> = {}
  if (entry.inject !== undefined) {
    // InjectParams：session scope → (sessionId, actions?)；store 已声明才带 actions。
    injected = (scope === 'session'
      ? (storeInstance !== undefined
        ? (entry.inject as (id: string, actions: unknown) => Record<string, unknown>)(sessionId, storeInstance.actions)
        : (entry.inject as (id: string) => Record<string, unknown>)(sessionId))
      : (entry.inject as (...args: never[]) => Record<string, unknown>)()) ?? {}
  }
  const { hooks, keyedHooks, ...restInjected } = injected
  // runtime share 的 standard 席：session scope 由框架注入 sessionId（官方
  // SessionStandardProps；本环境裁剪后只有该成员）。
  const props: Record<string, unknown> = {
    ...owner,
    ...(scope === 'session' ? { sessionId } : {}),
    ...restInjected,
  }
  // 注册者 hooks 隔离间（HostObservable）→ use<Name> selector hook。
  if (isRecord(hooks)) {
    for (const [key, source] of Object.entries(hooks)) {
      props[standardHookPropName(key)] = selectorHookOf(source as HostObservable<unknown>)
    }
  }
  if (isRecord(keyedHooks)) {
    for (const [key, resolve] of Object.entries(keyedHooks)) {
      props[standardHookPropName(key)] = keyedHookOf(resolve as KeyedStandardSource)
    }
  }
  // 声明级 inject.hooks（SlotHookFactory）：以 (standard, hookContext) 绑定。
  const declared = spec?.inject
  if (isRecord(declared) && isRecord(declared.hooks)) {
    const standard = { sessionId }
    for (const [key, factory] of Object.entries(declared.hooks)) {
      props[standardHookPropName(key)] = (factory as (standard: unknown, context: unknown) => unknown)(
        standard, opts?.hookContext)
    }
  }
  if (storeInstance !== undefined) {
    props.useStore = useStoreHookOf(storeInstance)
    props.actions = storeInstance.actions
  }
  if (entry.locale !== undefined && locale !== undefined) props.t = locale.bind(entry.locale)
  // render share：renderSlot/renderSlotChain 由渲染机供给（官方 PropsRenderSlots
  // 的运行时形态），绑定同一 core/session；未声明 children 的组件不消费。
  props.renderSlot = renderSlot
  props.renderSlotChain = renderSlotChain
  return props
}

/**
 * 建一个绑定到单 session 的 dispatch 面（renderSlot / renderSlotChain），挂到
 * ctx.slots 的注册表上；渲染出口与官方 SlotRendererHost 的 entriesOfSlot 一致。
 */
export function createSlotDispatch(
  core: SlotCore,
  locale: MiniLocaleFace | undefined,
  storeOf: StoreResolver,
  sessionId: string,
): {
  renderSlot: (name: string, owner: Record<string, unknown>, opts?: MiniRenderOpts) => ReactNode
  renderSlotChain: (name: string, owner: Record<string, unknown>, opts?: MiniRenderOpts) => ReactNode
} {
  const renderEntry = (entry: StoredEntry, name: string, owner: Record<string, unknown>, opts: MiniRenderOpts | undefined, matched?: unknown): ReactNode =>
    createElement(
      entry.component as ComponentType<Record<string, unknown>>,
      matched === undefined
        ? componentProps(core, name, entry, sessionId, owner, opts, locale, storeOf, renderSlot, renderSlotChain)
        : { ...componentProps(core, name, entry, sessionId, owner, opts, locale, storeOf, renderSlot, renderSlotChain), matched },
    )

  function renderSlot(name: string, owner: Record<string, unknown>, opts?: MiniRenderOpts): ReactNode {
    const spec = core.specDynamic(name)
    if (spec === undefined) return opts?.fallback ?? null
    const entries = core.entriesOfSlot(name)
    if (spec.kind === 'list') {
      if (entries.length === 0) return null
      // list：渲染每个 cell 的 winner，key 用 list id（官方渲染机同序）。
      return <>{entries.map((entry, index) => (
        <Fragment key={entry.options.id ?? index}>{renderEntry(entry, name, owner, opts)}</Fragment>
      ))}</>
    }
    const entry = spec.kind === 'keyed'
      ? entries.find(candidate => candidate.options.key === opts?.entryKey)
      : entries[0]
    if (entry === undefined) return opts?.fallback ?? null
    return renderEntry(entry, name, owner, opts)
  }

  function renderSlotChain(name: string, owner: Record<string, unknown>, opts?: MiniRenderOpts): ReactNode {
    for (const entry of core.entriesOfSlot(name)) {
      const select = entry.select as ((owner: never) => unknown) | undefined
      const matched = select === undefined ? null : select(owner as never)
      if (matched === null || matched === undefined) continue
      return renderEntry(entry, name, owner, opts, matched)
    }
    return opts?.fallback ?? null
  }

  return { renderSlot, renderSlotChain }
}

/**
 * `ctx.slots.inject(name, factory)`：等声明出现后运行 factory，声明塌缩回滚、
 * 重声明重跑（官方语义，client AGENTS「Registering into another package's
 * slot」）；factory 返回单个 disposer 或 disposer 生成器均可。
 */
export function slotsInject(
  core: SlotCore,
  name: string,
  factory: () => (() => void) | Iterable<(() => void)>,
): () => void {
  let disposers: Array<() => void> = []
  const rollback = (): void => {
    for (const dispose of [...disposers].reverse()) dispose()
    disposers = []
  }
  const run = (): void => {
    const produced = factory()
    disposers = typeof produced === 'function' ? [produced] : [...produced]
  }
  if (core.specDynamic(name) !== undefined) run()
  const unsubscribe = core.subscribeDeclaration(name, () => {
    rollback()
    if (core.specDynamic(name) !== undefined) run()
  })
  return () => {
    unsubscribe()
    rollback()
  }
}
