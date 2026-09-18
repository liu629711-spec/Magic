/**
 * Vendor shim of `@deepseek-ai/dsh-client-store`（magic-desktop 不引 zustand/
 * immer，快照引擎按官方 index.ts 的对外语义以零依赖实现替代）。
 *
 * 与上游的实现差异（唯一消费面 ui-sidebar-right/tab-domain 已核对）：
 * - `update()` 不走 immer produce：官方 store 的 action 只做顶层字段整值赋值
 *   （stores.ts 的 `d.bySession = seat(d, …)` 模式），这里以「浅拷贝根对象 +
 *   原地改草稿」等价覆盖；draft 内嵌套对象仍是被共享引用，与官方 immer 的
 *   结构共享语义一致。
 * - flush 只有官方默认的 'sync' 分支（ui-sidebar-right/tab-domain 均未用
 *   'raf'）。
 * - notifySubscribers/shallowEqual 照官方契约（shallowEqual 为自写浅比较）。
 * React selector hook 仍由渲染侧（ui-renderer/本仓 mini renderer）合成，
 * 引擎保持 bare observable。
 */
import type {
  ActionsDecl, BakedActions, ObservableSnapshot, StoreHandle, StoreInstance, StoreSpec,
} from './contract.ts'

// Store contract types are ui-slots authority; re-exported beside the engine
// so store consumers get one import path.
export type {
  ActionsDecl, BakedActions, BoundActions, DefineStore, HandleOf, MaybeSnapshotSelectorHook,
  ObservableSnapshot, PropsStore, SnapshotSelectorHook, StoreDecl, StoreFactory,
  StoreHandle, StoreInstance, StoreSpec,
} from './contract.ts'

/** Writable snapshot store (bare data face; React selector hooks are synthesized in ui-renderer). */
export interface SnapshotStore<T> extends ObservableSnapshot<T> {
  /**
   * Mutate the state through an immer draft.
   * @param mutator - draft mutator.
   */
  update(mutator: (draft: T) => void): void
  /**
   * Replace the state wholesale.
   * @param next - next state.
   */
  set(next: T): void
}

/**
 * Notify an observer set without allowing one callback to starve the rest.
 * @param listeners - current observer callbacks; copied before dispatch.
 * @param label - diagnostic owner prefix.
 * @param args - callback arguments.
 */
export function notifySubscribers<Args extends readonly unknown[]>(
  listeners: Iterable<(...args: Args) => void>,
  label: string,
  ...args: Args
): void {
  for (const listener of [...listeners]) {
    try {
      listener(...args)
    } catch (error) {
      console.error(`${label} subscriber failed:`, error)
    }
  }
}

/** First-level equality for selector slices（官方走 zustand/shallow；这里自写同语义浅比较）。 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false
  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every(key => Object.is(left[key], right[key]))
}

/** One-level copy for object/array roots（标量原样返回——draft 对它们只读）。 */
function shallowCopy<T>(value: T): T {
  if (Array.isArray(value)) return [...value] as unknown as T
  if (typeof value === 'object' && value !== null) return { ...(value as object) } as unknown as T
  return value
}

/**
 * Create a snapshot store（官方默认 'sync'；raf 分支见文件头差异说明）。
 * @param init - initial state.
 * @param opts - flush mode and opt-in persistence (localStorage, keyed by name).
 * @returns the store.
 */
export function createSnapshotStore<T>(
  init: T, opts?: { flush?: 'raf' | 'sync'; persist?: { name: string } }): SnapshotStore<T> {
  let state = init
  const listeners = new Set<() => void>()
  if (opts?.persist !== undefined) {
    const name = opts.persist.name
    // Non-browser runs (node e2e booting the client tree) have no localStorage:
    // persistence silently disables — same contract as a storage failure, minus
    // the per-store console noise a ReferenceError would produce.
    if (typeof localStorage !== 'undefined') {
      try {
        // Rehydrate before the first read（与上游 attachPersistence 一致）。
        const raw = localStorage.getItem(name)
        if (raw !== null) state = JSON.parse(raw) as T
      } catch (error) {
        console.error(`snapshot store '${name}' rehydration failed:`, error)
      }
      const persistListener = (): void => {
        try {
          localStorage.setItem(name, JSON.stringify(state))
        } catch (error) {
          console.error(`snapshot store '${name}' persistence failed:`, error)
        }
      }
      listeners.add(persistListener)
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(fn) {
      listeners.add(fn)
      return () => { listeners.delete(fn) }
    },
    update(mutator) {
      // 官方经 immer produce：草稿可整值替换根字段；这里浅拷贝根后原地改，
      // 消费面（ui-sidebar-right stores）只做顶层赋值，语义等价。
      const draft = shallowCopy(state)
      mutator(draft)
      state = draft
      notifySubscribers(listeners, '[client-store]')
    },
    set(next) {
      state = next
      notifySubscribers(listeners, '[client-store]')
    },
  }
}

// ui-slots owns the contract; this module supplies the engine implementation.

/** A live engine instance: the contract instance plus the raw engine store. */
export interface EngineStoreInstance<T, A extends ActionsDecl<T>> extends StoreInstance<T, A> {
  /** The underlying engine store (framework/test API; components never see it). */
  readonly store: SnapshotStore<T>
}

/** The engine-backed handle: create() narrowed to the engine instance. */
export interface EngineStoreHandle<T, A extends ActionsDecl<T>> extends StoreHandle<T, A> {
  /**
   * Construct a live engine instance (see the contract JSDoc on
   * {@link StoreHandle.create} for scopeKey/persist semantics).
   *
   * Known boundary: the persist key is the storage identity, so multiple live
   * instances created under the same resolved key share (and cross-pollute)
   * one localStorage entry. Instance uniqueness per key is the caller's
   * responsibility — production is safe because the framework caches one
   * instance per handle x scope key.
   * @param scopeKey - session id for session-scope instances; omitted for root scope.
   * @returns the engine instance.
   */
  create(scopeKey?: string): EngineStoreInstance<T, A>
}

/**
 * Declare a store: initial state, optional persistence, and the full write
 * set as pure draft mutators. The returned handle is the registration
 * currency of the store seat — its identity keys instance sharing.
 * @param decl - init lambda (fresh state per instance), optional persist key, actions table.
 * @returns the store handle.
 */
export function defineStore<T, A extends ActionsDecl<T>>(
  decl: StoreSpec<T, A> & { actions: A & ActionsDecl<T> }): EngineStoreHandle<T, A> {
  return {
    spec: decl,
    create(scopeKey?: string): EngineStoreInstance<T, A> {
      const persistKey = decl.persist === undefined
        ? undefined
        : scopeKey === undefined ? decl.persist : `${decl.persist}.${scopeKey}`
      const store = createSnapshotStore<T>(
        decl.init(),
        persistKey !== undefined ? { persist: { name: persistKey } } : undefined)
      const actions = {} as Record<string, (...params: unknown[]) => void>
      for (const key of Object.keys(decl.actions)) {
        const mutate = decl.actions[key] as (draft: T, ...params: unknown[]) => void
        actions[key] = (...params: unknown[]) => { store.update((draft) => { mutate(draft, ...params) }) }
      }
      return {
        actions: actions as BakedActions<T, A>,
        getSnapshot: () => store.getSnapshot(),
        subscribe: fn => store.subscribe(fn),
        store,
        clearPersisted: () => {
          if (persistKey === undefined || typeof localStorage === 'undefined') return
          try {
            localStorage.removeItem(persistKey)
          } catch {
            // Storage failures (private mode, quota teardown races) only skip
            // cleanup — the same non-fatal contract as attachPersistence.
          }
        },
      }
    },
  }
}
