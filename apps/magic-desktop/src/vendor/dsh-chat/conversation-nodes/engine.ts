// 替代 @deepseek-ai/dsh-client-ui-conversation 的运行引擎（最小本地等价物）。
//
// 源实现：ui-conversation client/conversation/location-index.ts（Location 索引与
// Location data 存储）与 assembler.ts（Context 装配引擎）。按任务要求，折叠入口
// 收敛为纯函数：输入事件数组 → 输出 ChatNodes 快照。实现只保留 replace（整窗
// 重建）语义：排序 → 位置解析 → 定义匹配 → Context 回放（含 reader.previous）→
// Location data 两阶段发布（step → turn）→ buildViewNode → ChatSnapshotBuilder。
// publication 节奏、依赖重放、增量 prepend/settle 等响应式路径被剥离（壳以
// 整窗重算方式使用）。逐段逻辑与源实现一致。

import type {
  ConversationLocation, ConversationLocationData, ConversationLocationDataSource,
  ConversationLocationDataStore, ConversationLocationDataScope, ConversationMatch,
  ConversationMatchResult, ConversationNodeContext, ConversationNodeDefinition,
  ConversationPreviousContext, ConversationStartMatch,
  ConversationTimelineSnapshot, ConversationViewNode, SessionEvent, SessionEventLike,
  SessionEventLikeEntry, StepLocation, TurnLocation,
} from '../vendor-types.ts'
import { conversationContextKey } from '../vendor-types.ts'

interface Coordinates {
  readonly turn?: number
  readonly step?: number
  readonly session?: true
}

interface StepDraft {
  readonly turn: number
  readonly step: number
  firstSeq: number
  start?: SessionEvent<'step/start'>
  end?: SessionEvent<'step/end'>
}

interface TurnDraft {
  readonly turn: number
  firstSeq: number
  start?: SessionEvent<'turn/start'>
  end?: SessionEvent<'turn/end'>
  readonly steps: Map<number, StepDraft>
}

const SESSION_LOCATION = { kind: 'session' } as const
const UNRESOLVED_LOCATION = { kind: 'unresolved' } as const

function payloadCoordinates(event: SessionEventLike): Coordinates {
  const data = event.data as unknown as { turn?: unknown; step?: unknown }
  if (data.turn === null) return { session: true }
  const turn = Number.isSafeInteger(data.turn) && (data.turn as number) >= 0
    ? data.turn as number
    : undefined
  const step = Number.isSafeInteger(data.step) && (data.step as number) >= 0
    ? data.step as number
    : undefined
  return { ...turn === undefined ? {} : { turn }, ...step === undefined ? {} : { step } }
}

function sameReferences<T>(left: readonly T[], right: readonly T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function sameStep(left: StepLocation | undefined, right: StepLocation): boolean {
  return left !== undefined
    && left.start === right.start && left.end === right.end && left.status === right.status
    && left.data === right.data
}

function sameTurn(left: TurnLocation | undefined, right: TurnLocation): boolean {
  return left !== undefined
    && left.start === right.start && left.end === right.end && left.status === right.status
    && left.data === right.data && sameReferences(left.steps, right.steps)
}

interface OwnedLocationData {
  readonly owner: string
  readonly value: unknown
}

/** 最小 Location data 存储（替代 MutableLocationDataStore；无响应式发布）。 */
class MutableLocationDataStore {
  private entries = new Map<string, OwnedLocationData>()
  private readonly sources = new Map<string, ConversationLocationDataSource<unknown>>()

  get(key: string): unknown {
    return this.entries.get(key)?.value
  }

  source(key: string): ConversationLocationDataSource<unknown> {
    let source = this.sources.get(key)
    if (source === undefined) {
      source = {
        getSnapshot: () => this.get(key),
        subscribe: () => () => {},
      }
      this.sources.set(key, source)
    }
    return source
  }

  set(owner: string, key: string, value: unknown): boolean {
    const current = this.entries.get(key)
    if (current !== undefined && current.owner !== owner) {
      throw new Error(`conversation Location data "${key}" is already owned by ${current.owner}`)
    }
    if (current?.value === value) return false
    this.entries.set(key, { owner, value })
    return true
  }

  /** 以整表替换并保留读取者身份。 */
  replaceStore(entries: ReadonlyMap<string, OwnedLocationData>): boolean {
    let changed = false
    for (const key of new Set([...this.entries.keys(), ...entries.keys()])) {
      const current = this.entries.get(key)
      const next = entries.get(key)
      if (current?.owner !== next?.owner || current?.value !== next?.value) {
        if (next !== undefined) this.entries.set(key, next)
        else this.entries.delete(key)
        changed = true
      }
    }
    return changed
  }
}

/** Session 拥有的轮/步时间线与事件到 Location 索引（replace-only 语义）。 */
export class ConversationLocationIndex {
  private coordinates = new Map<number, Coordinates>()
  private locations = new Map<number, ConversationLocation>()
  private timeline: ConversationTimelineSnapshot = { turnOrder: [], turns: new Map() }
  private readonly turnDataStores = new Map<number, MutableLocationDataStore>()
  private readonly stepDataStores = new Map<string, MutableLocationDataStore>()

  snapshot(): ConversationTimelineSnapshot {
    return this.timeline
  }

  /** 替换全部 Definition 拥有的 Location 值，保留读取者身份。 */
  replaceData(entries: readonly { readonly owner: string; readonly data: ConversationLocationData }[]): boolean {
    const turns = new Map<number, Map<string, OwnedLocationData>>()
    const steps = new Map<string, Map<string, OwnedLocationData>>()
    for (const { owner, data } of entries) {
      const values = data.kind === 'turn'
        ? turns.get(data.turn) ?? new Map<string, OwnedLocationData>()
        : steps.get(stepDataKey(data.turn, requireStep(data))) ?? new Map<string, OwnedLocationData>()
      const current = values.get(data.key)
      if (current !== undefined && current.owner !== owner) {
        throw new Error(`conversation Location data "${data.key}" is already owned by ${current.owner}`)
      }
      values.set(data.key, { owner, value: data.value })
      if (data.kind === 'turn') turns.set(data.turn, values)
      else steps.set(stepDataKey(data.turn, requireStep(data)), values)
    }
    let changed = false
    for (const turn of new Set([...this.turnDataStores.keys(), ...turns.keys()])) {
      changed = this.mutableTurnData(turn).replaceStore(turns.get(turn) ?? new Map()) || changed
    }
    for (const step of new Set([...this.stepDataStores.keys(), ...steps.keys()])) {
      changed = this.mutableStepData(step).replaceStore(steps.get(step) ?? new Map()) || changed
    }
    return changed
  }

  locationOf(event: SessionEventLike): ConversationLocation {
    return this.locations.get(event.seq) ?? SESSION_LOCATION
  }

  /** 在升序 seq 的完整窗口上重建时间线事实。 */
  rebuild(entries: readonly SessionEventLikeEntry[]): void {
    const turns = new Map<number, TurnDraft>()
    const coordinates = new Map<number, Coordinates>()
    let currentTurn: number | undefined
    let currentStep: number | undefined

    const turnDraft = (turn: number, seq: number): TurnDraft => {
      let draft = turns.get(turn)
      if (draft === undefined) {
        draft = { turn, firstSeq: seq, steps: new Map() }
        turns.set(turn, draft)
      } else {
        draft.firstSeq = Math.min(draft.firstSeq, seq)
      }
      return draft
    }
    const stepDraft = (turn: number, step: number, seq: number): StepDraft => {
      const owner = turnDraft(turn, seq)
      let draft = owner.steps.get(step)
      if (draft === undefined) {
        draft = { turn, step, firstSeq: seq }
        owner.steps.set(step, draft)
      } else {
        draft.firstSeq = Math.min(draft.firstSeq, seq)
      }
      return draft
    }

    for (const { event } of entries) {
      const explicit = payloadCoordinates(event)
      if (event.type === 'turn/start') {
        currentTurn = event.data.turn
        currentStep = undefined
      }
      if (event.type === 'step/start') {
        currentTurn = event.data.turn
        currentStep = event.data.step
      }
      if (explicit.session !== true && explicit.turn !== undefined) {
        if (currentTurn !== explicit.turn) currentStep = undefined
        currentTurn = explicit.turn
        if (explicit.step !== undefined) currentStep = explicit.step
      }
      const turn = explicit.session === true ? undefined : explicit.turn ?? currentTurn
      const step = explicit.session === true || event.type === 'turn/start' || event.type === 'turn/end'
        ? undefined
        : explicit.step ?? (turn === currentTurn ? currentStep : undefined)
      coordinates.set(event.seq, {
        ...turn === undefined ? {} : { turn },
        ...turn === undefined || step === undefined ? {} : { step },
      })
      if (turn !== undefined) turnDraft(turn, event.seq)
      if (turn !== undefined && step !== undefined) stepDraft(turn, step, event.seq)

      if (event.type === 'turn/start') {
        turnDraft(event.data.turn, event.seq).start = event
      } else if (event.type === 'turn/end') {
        turnDraft(event.data.turn, event.seq).end = event
      } else if (event.type === 'step/start') {
        stepDraft(event.data.turn, event.data.step, event.seq).start = event
      } else if (event.type === 'step/end') {
        stepDraft(event.data.turn, event.data.step, event.seq).end = event
      }

      if (event.type === 'step/end' && currentTurn === event.data.turn && currentStep === event.data.step) {
        currentStep = undefined
      }
      if (event.type === 'turn/end' && currentTurn === event.data.turn) {
        currentTurn = undefined
        currentStep = undefined
      }
    }

    const previousTurns = this.timeline.turns
    const nextTurns = new Map<number, TurnLocation>()
    const orderedDrafts = [...turns.values()].sort((left, right) => left.firstSeq - right.firstSeq)
    for (const draft of orderedDrafts) {
      const previousTurn = previousTurns.get(draft.turn)
      const previousSteps = new Map(previousTurn?.steps.map(step => [step.step, step]) ?? [])
      const steps = [...draft.steps.values()]
        .sort((left, right) => left.firstSeq - right.firstSeq)
        .map((candidate): StepLocation => {
          const value: StepLocation = {
            turn: candidate.turn,
            step: candidate.step,
            start: candidate.start,
            end: candidate.end,
            status: candidate.end !== undefined
              ? 'closed'
              : candidate.start === undefined ? 'unknown' : 'open',
            data: this.stepData(candidate.turn, candidate.step),
          }
          const previous = previousSteps.get(candidate.step)
          return sameStep(previous, value) ? previous as StepLocation : value
        })
      const value: TurnLocation = {
        turn: draft.turn,
        start: draft.start,
        end: draft.end,
        status: draft.end !== undefined ? 'closed' : draft.start === undefined ? 'unknown' : 'open',
        steps,
        data: this.turnData(draft.turn),
      }
      nextTurns.set(draft.turn, sameTurn(previousTurn, value) ? previousTurn as TurnLocation : value)
    }

    const nextOrder = orderedDrafts.map(draft => draft.turn)
    const turnOrder = this.timeline.turnOrder.length === nextOrder.length
      && this.timeline.turnOrder.every((turn, index) => turn === nextOrder[index])
      ? this.timeline.turnOrder
      : nextOrder
    this.timeline = { turnOrder, turns: nextTurns }
    this.coordinates = coordinates
    this.locations = new Map()
    for (const { event } of entries) {
      this.locations.set(event.seq, this.resolve(event.seq))
    }
  }

  private turnData(turn: number): ConversationLocationDataStore<Record<string, unknown>> {
    return this.mutableTurnData(turn) as unknown as ConversationLocationDataStore<Record<string, unknown>>
  }

  private stepData(turn: number, step: number): ConversationLocationDataStore<Record<string, unknown>> {
    return this.mutableStepData(stepDataKey(turn, step)) as unknown as ConversationLocationDataStore<Record<string, unknown>>
  }

  private mutableTurnData(turn: number): MutableLocationDataStore {
    const current = this.turnDataStores.get(turn) ?? new MutableLocationDataStore()
    this.turnDataStores.set(turn, current)
    return current
  }

  private mutableStepData(key: string): MutableLocationDataStore {
    const current = this.stepDataStores.get(key) ?? new MutableLocationDataStore()
    this.stepDataStores.set(key, current)
    return current
  }

  private resolve(seq: number): ConversationLocation {
    const coordinates = this.coordinates.get(seq)
    if (coordinates?.turn === undefined) return SESSION_LOCATION
    const turn = this.timeline.turns.get(coordinates.turn)
    if (turn === undefined) return UNRESOLVED_LOCATION
    if (coordinates.step === undefined) return { kind: 'turn', turn }
    const step = turn.steps.find(candidate => candidate.step === coordinates.step)
    return step === undefined ? { kind: 'turn', turn } : { kind: 'step', turn, step }
  }
}

function stepDataKey(turn: number, step: number): string {
  return `${turn}:${step}`
}

function requireStep(data: ConversationLocationData): number {
  if (data.kind === 'step' && data.step !== undefined) return data.step
  throw new Error(`conversation Step data "${data.key}" requires a step`)
}

/** 定义集：普通定义（注册序）+ 可选兜底。 */
export interface ConversationEventDefinitions {
  entries(): readonly ConversationNodeDefinition[]
  fallbackEntry(): ConversationNodeDefinition | undefined
}

interface InternalContext {
  readonly key: string
  readonly kind: string
  readonly id: string
  readonly definition: ConversationNodeDefinition
  startSeq: number | undefined
  start: ConversationStartMatch | undefined
  matches: ConversationMatch[]
  state: unknown
  readonly current: Map<string, ConversationViewNode | null>
  readonly locationData: Record<ConversationLocationDataScope, ConversationLocationData | null>
}

interface PendingMatch {
  readonly definition: ConversationNodeDefinition
  readonly id: string
  readonly match: ConversationMatch
}

const LOCATION_DATA_SCOPES: readonly ConversationLocationDataScope[] = ['step', 'turn']

function emptyLocationData(): Record<ConversationLocationDataScope, ConversationLocationData | null> {
  return { step: null, turn: null }
}

function contextSnapshot<State>(context: InternalContext): ConversationNodeContext<State> {
  return {
    key: context.key,
    kind: context.kind,
    id: context.id,
    matches: context.matches,
    start: context.start,
    state: context.state as State | undefined,
    current: context.current,
  }
}

function conversationMatch(
  key: string,
  input: SessionEventLikeEntry,
  role: ConversationMatchResult['role'],
  location: ConversationMatch['location'],
): ConversationMatch {
  if (role === 'start') {
    if (input.type !== 'event') {
      throw new Error(`conversation Context ${key} received a transient start Match`)
    }
    return { event: input.event, role, location }
  }
  return { event: input.event, role, location }
}

function requireState(
  definition: ConversationNodeDefinition,
  phase: 'start' | 'update',
  state: unknown,
): unknown {
  if (state === undefined) {
    throw new Error(`conversation Definition "${definition.kind}" returned undefined from ${phase}()`)
  }
  return state
}

/**
 * 最小 replace 语义装配引擎（替代 ConversationNodeAssembler 的 replace 路径）。
 * 事件窗变更后调用 {@link replaceWindow}，随后 {@link flush} 产出视图节点集。
 */
export class ConversationNodeAssembler {
  private readonly contexts = new Map<string, InternalContext>()
  private readonly contextsByKind = new Map<string, InternalContext[]>()
  private readonly locations = new ConversationLocationIndex()
  private replacePending = true

  constructor(
    private readonly eventDefinitions: ConversationEventDefinitions,
  ) {}

  /** 当前 Location 索引（读取 timeline 快照用）。 */
  getLocationIndex(): ConversationLocationIndex {
    return this.locations
  }

  /** 整窗替换后重放全部 Context。 */
  replaceWindow(entries: readonly SessionEventLikeEntry[]): void {
    this.contexts.clear()
    this.contextsByKind.clear()
    const sorted = [...entries].sort((left, right) => left.event.seq - right.event.seq)
    this.locations.rebuild(sorted)
    for (const entry of sorted) {
      this.matchInput(entry)
    }
    // 按起始 seq 重放（保证 reader.previous 的前驱已就绪）。
    const ordered = [...this.contexts.values()]
      .filter(context => context.start !== undefined)
      .sort((left, right) => (left.startSeq ?? Number.POSITIVE_INFINITY) - (right.startSeq ?? Number.POSITIVE_INFINITY))
    for (const context of ordered) {
      this.replayContext(context)
    }
    this.replacePending = true
  }

  /** 物化 Location data 并产出目标节点（replace 语义）。 */
  flush(target: string): ConversationViewNode[] {
    if (this.replacePending) {
      const entries: { owner: string; data: ConversationLocationData }[] = []
      for (const scope of LOCATION_DATA_SCOPES) {
        for (const context of this.contexts.values()) {
          const data = this.buildLocationData(context, scope, context.locationData[scope])
          context.locationData[scope] = data
          if (data !== null) entries.push({ owner: context.key, data })
        }
        // Turn 发布者可能读取同一次 flush 的 Step data：每个阶段安装后进入下一阶段。
        this.locations.replaceData(entries)
      }
      this.replacePending = false
    }
    const nodes: ConversationViewNode[] = []
    for (const context of this.contexts.values()) {
      if (context.definition.target !== target || context.definition.buildViewNode === undefined) continue
      const node = context.definition.buildViewNode(contextSnapshot(context))
      context.current.set(target, node)
      if (node !== null) nodes.push(node)
    }
    return nodes
  }

  private matchInput(input: SessionEventLikeEntry): void {
    const event = input.event
    const matchedTargets = new Set<string>()
    for (const definition of this.eventDefinitions.entries()) {
      const result = definition.match(event)
      if (result === null) continue
      if (definition.target !== undefined) matchedTargets.add(definition.target)
      this.acceptMatch(definition, result.id, result.role, input)
    }
    const fallback = this.eventDefinitions.fallbackEntry()
    const target = fallback?.target
    if (fallback !== undefined && target !== undefined && !matchedTargets.has(target)) {
      const result = fallback.match(event)
      if (result !== null) {
        this.acceptMatch(fallback, result.id, result.role, input)
      }
    }
  }

  private acceptMatch(
    definition: ConversationNodeDefinition,
    id: string,
    role: ConversationMatchResult['role'],
    input: SessionEventLikeEntry,
  ): void {
    const key = conversationContextKey(definition.kind, id)
    let context = this.contexts.get(key)
    if (role === 'start' && context?.start !== undefined) {
      throw new Error(`conversation Context ${key} received more than one start Match`)
    }
    context ??= this.createContext(definition, id, key)
    const match = conversationMatch(
      key,
      input,
      role,
      this.locations.locationOf(input.event),
    )
    const previous = context.matches.at(-1)
    if (previous !== undefined && previous.event.seq >= input.event.seq) {
      throw new Error(`conversation Context ${key} received non-appended Match ${input.event.seq}`)
    }
    context.matches.push(match)
    if (match.role === 'start') {
      context.startSeq = input.event.seq
      context.start = match
      this.indexStartedContext(context)
    }
  }

  private createContext(
    definition: ConversationNodeDefinition,
    id: string,
    key: string,
  ): InternalContext {
    const context: InternalContext = {
      key,
      kind: definition.kind,
      id,
      definition,
      startSeq: undefined,
      start: undefined,
      matches: [],
      state: undefined,
      current: new Map(),
      locationData: emptyLocationData(),
    }
    this.contexts.set(key, context)
    return context
  }

  private replayContext(context: InternalContext): void {
    const start = context.start
    if (start === undefined) {
      context.state = undefined
      return
    }
    if (context.matches[0] !== start) {
      throw new Error(`conversation Context ${context.key} received an update before its start Match`)
    }
    const reader = this.readerFor(start.event.seq)
    context.state = requireState(
      context.definition,
      'start',
      context.definition.start(contextSnapshot(context), start, reader),
    )
    for (let index = 1; index < context.matches.length; index++) {
      const match = context.matches[index]
      if (match === undefined || match.role !== 'update') continue
      const typed = contextSnapshot(context) as ConversationNodeContext & { readonly state: unknown }
      context.state = requireState(
        context.definition,
        'update',
        context.definition.update(typed, match),
      )
    }
  }

  private readerFor(beforeSeq: number): { previous<State>(kind: string): ConversationPreviousContext<State> | undefined } {
    return {
      previous: <State>(kind: string): ConversationPreviousContext<State> | undefined => {
        const predecessor = this.previousContext(kind, beforeSeq)
        if (predecessor?.state === undefined) return undefined
        const seq = predecessor.startSeq
        if (seq === undefined) return undefined
        return {
          key: predecessor.key,
          kind: predecessor.kind,
          id: predecessor.id,
          startSeq: seq,
          state: predecessor.state as Readonly<State>,
          matches: predecessor.matches,
        }
      },
    }
  }

  private previousContext(kind: string, beforeSeq: number): InternalContext | undefined {
    const candidates = this.contextsByKind.get(kind) ?? []
    const indexBefore = insertionIndex(candidates, beforeSeq)
    for (let index = indexBefore - 1; index >= 0; index--) {
      const candidate = candidates[index]
      if (candidate?.state !== undefined) return candidate
    }
    return undefined
  }

  private indexStartedContext(context: InternalContext): void {
    const seq = context.startSeq
    if (seq === undefined) return
    const candidates = this.contextsByKind.get(context.kind) ?? []
    const previous = candidates.at(-1)
    if (previous === undefined || (previous.startSeq as number) < seq) candidates.push(context)
    else candidates.splice(insertionIndex(candidates, seq), 0, context)
    this.contextsByKind.set(context.kind, candidates)
  }

  private buildLocationData(
    context: InternalContext,
    scope: ConversationLocationDataScope,
    previous: ConversationLocationData | null,
  ): ConversationLocationData | null {
    if (context.definition.buildLocationData === undefined) return null
    const data = context.definition.buildLocationData(contextSnapshot(context), scope, previous)
    if (data === null) return null
    if (data.kind !== scope) {
      throw new Error(
        `conversation Definition "${context.kind}" published ${data.kind} data through its ${scope} scope`,
      )
    }
    if (data.key !== context.kind) {
      throw new Error(
        `conversation Definition "${context.kind}" published Location data key "${data.key}"; expected its owned kind`,
      )
    }
    if (!Number.isSafeInteger(data.turn) || data.turn < 0) {
      throw new Error(`conversation Definition "${context.kind}" published invalid turn ${data.turn}`)
    }
    if (data.kind === 'step' && (!Number.isSafeInteger(data.step) || (data.step as number) < 0)) {
      throw new Error(`conversation Definition "${context.kind}" published invalid step ${String(data.step)}`)
    }
    return data
  }
}

function insertionIndex(contexts: readonly InternalContext[], seq: number): number {
  let low = 0
  let high = contexts.length
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2)
    const candidate = contexts[middle]
    if (candidate !== undefined && (candidate.startSeq as number) < seq) low = middle + 1
    else high = middle
  }
  return low
}

export type { PendingMatch }
