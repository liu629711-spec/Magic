import { RunPlan, type RunSpec, type RunState } from './plan.ts'

export type RunExecutor = (
  spec: RunSpec,
  upstream: ReadonlyMap<string, RunState>,
) => Promise<RunState>

export type RunProgress = (
  snapshot: ReadonlyMap<string, RunState>,
) => void | Promise<void>

const FAILED = new Set(['failed', 'skipped', 'cancelled'])

function snapshotOf(
  plan: RunPlan,
  completed: ReadonlyMap<string, RunState>,
  inFlight: ReadonlyMap<string, Promise<void>>,
): Map<string, RunState> {
  const snapshot = new Map<string, RunState>()
  for (const node of plan.nodes) {
    const done = completed.get(node.runId)
    if (done !== undefined) {
      snapshot.set(node.runId, done)
    } else if (inFlight.has(node.runId)) {
      snapshot.set(node.runId, { phase: 'running' })
    } else {
      snapshot.set(node.runId, { phase: 'queued' })
    }
  }
  return snapshot
}

async function emitProgress(
  onProgress: RunProgress | undefined,
  plan: RunPlan,
  completed: ReadonlyMap<string, RunState>,
  inFlight: ReadonlyMap<string, Promise<void>>,
): Promise<void> {
  if (onProgress === undefined) return
  try {
    await onProgress(snapshotOf(plan, completed, inFlight))
  } catch {
    // Progress is observational; a journal failure must not stop the graph.
  }
}

function depsReady(spec: RunSpec, completed: ReadonlyMap<string, RunState>): boolean {
  return spec.dependsOn.every(dep => completed.has(dep))
}

function shouldSkip(spec: RunSpec, completed: ReadonlyMap<string, RunState>): boolean {
  return spec.dependsOn.some(dep => {
    const state = completed.get(dep)
    return state !== undefined && FAILED.has(state.phase)
  })
}

export class WaveScheduler {
  async run(
    plan: RunPlan,
    executor: RunExecutor,
    signal?: AbortSignal,
    onProgress?: RunProgress,
  ): Promise<Map<string, RunState>> {
    plan.waves()
    const completed = new Map<string, RunState>()
    const inFlight = new Map<string, Promise<void>>()

    const dispatch = (): void => {
      if (signal?.aborted) return
      let progressed = true
      while (progressed) {
        progressed = false
        for (const node of plan.nodes) {
          if (completed.has(node.runId) || inFlight.has(node.runId)) continue
          if (!depsReady(node, completed)) continue
          if (shouldSkip(node, completed)) {
            completed.set(node.runId, { phase: 'skipped' })
            progressed = true
            continue
          }
          const upstream = new Map(
            node.dependsOn.flatMap(dep => {
              const state = completed.get(dep)
              return state === undefined ? [] : [[dep, state] as const]
            }),
          )
          inFlight.set(node.runId, executor(node, upstream).then((state) => {
            completed.set(node.runId, state)
          }, (error: unknown) => {
            completed.set(node.runId, {
              phase: 'failed',
              error: error instanceof Error ? error.message : String(error),
            })
          }).finally(() => {
            inFlight.delete(node.runId)
          }))
          progressed = true
        }
      }
    }

    dispatch()
    await emitProgress(onProgress, plan, completed, inFlight)
    while (inFlight.size > 0) {
      await Promise.race(inFlight.values())
      dispatch()
      await emitProgress(onProgress, plan, completed, inFlight)
    }
    // Completions can settle while `onProgress` is awaited, draining inFlight
    // and skipping the skip-tail / terminal snapshot.
    dispatch()
    await emitProgress(onProgress, plan, completed, inFlight)
    return completed
  }
}
