import { RunPlan, RunPlanError, type RunSpec } from './plan.ts'

export const MAX_DELEGATION_TASKS = 20

export interface DelegateTask {
  id?: string
  role: string
  task: string
  dependsOn: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new RunPlanError(`ceo_delegate requires a non-empty ${field}`)
  }
  return value.trim()
}

function optionalIdList(value: unknown): string[] {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.trim() === '')) {
    throw new RunPlanError('depends_on must be an array of task ids or roles')
  }
  return value.map(item => item.trim())
}

export function parseDelegateTasks(args: unknown): DelegateTask[] {
  if (!isRecord(args)) {
    throw new RunPlanError("ceo_delegate requires a 'tasks' array")
  }
  if (!Array.isArray(args.tasks)) {
    throw new RunPlanError("'tasks' array is required and cannot be empty")
  }
  if (args.tasks.length === 0) {
    throw new RunPlanError("'tasks' array is required and cannot be empty")
  }
  if (args.tasks.length > MAX_DELEGATION_TASKS) {
    throw new RunPlanError(`tasks exceeds ${String(MAX_DELEGATION_TASKS)}`)
  }

  return args.tasks.map((item, index) => {
    if (!isRecord(item)) {
      throw new RunPlanError(`tasks[${String(index)}] must be an object`)
    }
    return {
      id: typeof item.id === 'string' && item.id.trim() !== '' ? item.id.trim() : undefined,
      role: requiredString(item.role, `tasks[${String(index)}].role`),
      task: requiredString(item.task, `tasks[${String(index)}].task`),
      dependsOn: optionalIdList(item.depends_on),
    }
  })
}

function resolveDep(
  token: string,
  byRawId: Map<string, string>,
  byRole: Map<string, string[]>,
): string {
  const fromId = byRawId.get(token)
  if (fromId !== undefined) return fromId
  const roleHits = byRole.get(token) ?? []
  if (roleHits.length === 1) return roleHits[0]!
  if (roleHits.length > 1) {
    throw new RunPlanError(`depends_on \`${token}\` is an ambiguous role`)
  }
  throw new RunPlanError(`depends_on \`${token}\` does not match a task id or role`)
}

export function buildRunPlan(tasks: readonly DelegateTask[], prefix: string): RunPlan {
  const rawIds = tasks.map((item, index) => item.id ?? `n${String(index)}`)
  const seen = new Set<string>()
  for (const [index, rawId] of rawIds.entries()) {
    if (seen.has(rawId)) {
      throw new RunPlanError(`tasks[${String(index)}]: duplicate id '${rawId}'`)
    }
    seen.add(rawId)
  }

  const minted = (raw: string) => `${prefix}_${raw}`
  const byRawId = new Map(rawIds.map(raw => [raw, minted(raw)]))
  const byRole = new Map<string, string[]>()
  for (const [index, task] of tasks.entries()) {
    const list = byRole.get(task.role) ?? []
    list.push(minted(rawIds[index]!))
    byRole.set(task.role, list)
  }
  for (const raw of rawIds) byRawId.set(minted(raw), minted(raw))

  const plan = new RunPlan()
  for (const [index, task] of tasks.entries()) {
    const rawId = rawIds[index]!
    const spec: RunSpec = {
      runId: minted(rawId),
      rawId,
      role: task.role,
      task: task.task,
      dependsOn: task.dependsOn.map(token => resolveDep(token, byRawId, byRole)),
    }
    plan.add(spec)
  }
  plan.waves()
  return plan
}
