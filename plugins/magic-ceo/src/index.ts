import { buildRunPlan, parseDelegateTasks } from './builder.ts'
import {
  appendCeoMemberResult,
  appendCeoPlan,
  appendCeoPlanRevision,
  appendCeoRunPhase,
  appendCeoRunProgress,
  appendRunJournal,
  currentTurn,
  journalRuns,
  type CeoPlanData,
  type JournalSession,
} from './journal.ts'
import { type RunSpec, type RunState } from './plan.ts'
import {
  attachRunProcessMirror,
  detachRunProcessMirror,
  ingestChildSessionEvent,
  resetProcessMirrorsForTests,
  type ChildJournalSession,
  type ChildSessionEvent,
} from './process.ts'
import { WaveScheduler } from './wave.ts'

export const name = 'magic-ceo'

export const inject = ['tools', 'subagents', 'systemPrompt', 'magicWorkMode']

export interface CeoMember {
  runId: string
  rawId: string
  memberId?: string
  parentSessionId: string
  role: string
  task: string
  dependsOn: string[]
  phase: RunState['phase']
  createdAt: string
}

interface MagicWorkModeService {
  getMode: (sessionId: string) => 'agent' | 'ceo'
}

type PromptAssembleContext = {
  agent?: { session?: { id?: string } }
}

function sessionIdOf(context: PromptAssembleContext | undefined): string | undefined {
  const id = context?.agent?.session?.id
  return typeof id === 'string' && id !== '' ? id : undefined
}

const CEO_GRAPH_RULES = [
  '- ceo_delegate takes a tasks[] run graph: each item is role + task. Independent tasks run in parallel; producer→consumer tasks use depends_on.',
  '- Do not start a dependent task yourself. The scheduler starts it only after its depends_on nodes have finished.',
  '- task is the work itself: goal, boundary, and acceptance. Do not paste JSON schemas, output templates, or “return exactly this JSON” instructions into task.',
  '- Members already return structured results (status, done, not_done, artifacts, evidence, risks_or_blockers, next, user_decisions). You assemble one delivery. Never rewrite a member failure as success.',
  '- When the user answers a member decision, forward it to that member with send_message. Do not rewrite their work as success.',
  '- Using CEO does not create an engineering organization.',
]

export function ceoModePrompt(mode: 'agent' | 'ceo'): string {
  if (mode === 'ceo') {
    return [
      'CEO rules:',
      '- This session is in CEO mode now. You are the manager of this turn, not a solo researcher.',
      '- Breadth research must be delegated on the first action:',
      '  - market / industry / competitive research',
      '  - surveys that cover multiple regions, products, or sources (including domestic vs overseas / 海内外)',
      '  - comparison of ≥2 named entities, markets, styles, or options',
      '- For those tasks: first stream a useful analysis of scope, evidence gaps, acceptance, and division of labor. Then call ceo_plan with the proposed tasks[], and only then call ceo_delegate with that identical graph. Do not perform breadth web research yourself before delegation.',
      '- If the user names N (≥2) entities or markets, create at least N tasks (one per entity). An optional synthesizer may depend_on them. Do not assign one member the whole comparison.',
      '- Answer yourself only for small talk, a single fact, a short follow-up about this conversation, or a brief explanation that needs no new research.',
      ...CEO_GRAPH_RULES,
    ].join('\n')
  }
  return [
    'CEO rules:',
    '- This session is in agent mode. Do not call ceo_delegate.',
    '- Use ceo_delegate only when this session is in CEO mode.',
    ...CEO_GRAPH_RULES,
  ].join('\n')
}

interface SubagentResult {
  output?: Array<{ type?: string; text?: string }>
  stopReason: string
}

interface SubagentRun {
  id: string
  localAgent?: { session?: ChildJournalSession }
  result: Promise<SubagentResult>
  dispose: () => Promise<void>
}

interface ParentAgent {
  session: JournalSession & { id: string }
}

const membersByParent = new Map<string, CeoMember[]>()
const plansByParent = new Map<string, CeoPlanData>()

function membersOf(parentSessionId: string): CeoMember[] {
  const existing = membersByParent.get(parentSessionId)
  if (existing !== undefined) return existing
  const created: CeoMember[] = []
  membersByParent.set(parentSessionId, created)
  return created
}

function textFromOutput(output: SubagentResult['output']): string {
  if (!Array.isArray(output)) return ''
  return output
    .filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text ?? '')
    .join('\n')
}

function phaseOf(stopReason: string): RunState['phase'] {
  if (stopReason === 'completed') return 'completed'
  if (stopReason === 'aborted') return 'cancelled'
  if (stopReason === 'max-tokens') return 'failed'
  if (stopReason === 'refusal') return 'failed'
  return 'failed'
}

function wrapMemberPrompt(
  role: string,
  task: string,
  upstream: ReadonlyMap<string, RunState>,
  specs: ReadonlyMap<string, RunSpec>,
): string {
  const lines = [
    'You are a worker on a CEO run graph.',
    `Role: ${role}`,
    `Task: ${task}`,
    'You are not a reduced tool. Complete this node with the same capabilities a session lead would use.',
    'When the work is finished, your final assistant output MUST be a compact structured result. send_message is optional and only for an injected, resolvable agent_id; never rely on it for delivery.',
    'Prefer a JSON object. If you must use labeled lines, write the keys in plain text with no markdown, no bold, and no extra commentary around the fields:',
    'status: completed | blocked | failed | partial',
    'done: one or two sentences on what you finished',
    'not_done: what remains',
    'artifacts: files or outputs',
    'evidence: how it was verified',
    'risks_or_blockers: risks, conflicts, or blockers',
    'next: recommended next step',
    'user_decisions: questions only the user can answer, or empty',
    'Do not paste the full report body into done. Do not dump the field list as a markdown document. Do not claim success if the work failed or is incomplete.',
  ]
  if (upstream.size > 0) {
    lines.push('', 'Upstream results:')
    for (const [runId, state] of upstream) {
      const spec = specs.get(runId)
      lines.push(`- ${spec?.role ?? runId} (${runId}) [${state.phase}]`)
      if ((state.output ?? '').trim() !== '') lines.push(state.output!.trim())
    }
  }
  return lines.join('\n')
}

export function listCeoMembers(parentSessionId: string): readonly CeoMember[] {
  return membersOf(parentSessionId)
}

export function resetCeoStateForTests(): void {
  membersByParent.clear()
  plansByParent.clear()
  resetProcessMirrorsForTests()
}

function declaredResultStatus(output: string): 'completed' | 'blocked' | 'failed' | 'partial' | undefined {
  const match = output.match(/(?:\"status\"\s*:\s*|^\s*status\s*:\s*)(completed|blocked|failed|partial)\b/im)
  return match?.[1]?.toLowerCase() as 'completed' | 'blocked' | 'failed' | 'partial' | undefined
}

function hasResearchEvidenceGap(spec: RunSpec, output: string): boolean {
  if (!/research|survey|market|compare|competitive|调研|研究|市场|比较|竞品|多来源|多视角/i.test(`${spec.role} ${spec.task}`)) return false
  return /无法联网|无法核验|联网失败|网络不可用|HTTP\s*405|出站网络|仅.*估计|未经核验|待联网|no internet|unable to verify|unverified/i.test(output)
}

function stateFromWorkerResult(spec: RunSpec, output: string, stopReason: string, memberId: string): RunState {
  const declared = declaredResultStatus(output)
  if (declared === 'blocked' || declared === 'failed' || hasResearchEvidenceGap(spec, output)) {
    return { phase: 'failed', memberId, output, error: 'worker result blocked by evidence gap' }
  }
  return { phase: phaseOf(stopReason), memberId, output }
}

function isComplexTask(task: { role: string; task: string; dependsOn: string[] }, count: number): boolean {
  if (count >= 3 || task.dependsOn.length > 0) return true
  return /research|survey|market|compare|competitive|调研|研究|市场|比较|竞品|多来源|多视角/i.test(
    `${task.role} ${task.task}`,
  )
}

function taskFingerprint(tasks: readonly { role: string; task: string; dependsOn: string[] }[]): string {
  return JSON.stringify(tasks.map(task => ({
    role: task.role.trim(),
    task: task.task.trim(),
    dependsOn: [...task.dependsOn].sort(),
  })))
}

export function apply(ctx: {
  tools: {
    register: (definition: {
      name: string
      description: string
      parameters: Record<string, unknown>
      output: {
        schema: Record<string, unknown>
        render: (args: unknown, value: {
          runs?: Array<{ runId: string; role: string; task: string; memberId?: string; phase: string }>
          planId?: string
          status?: string
        }) => Array<{ type: 'text'; text: string }>
      }
      isConcurrencySafe?: () => boolean
      execute: (args: unknown, exec: {
        agent?: ParentAgent
        callId?: string
        signal: AbortSignal
      }) => Promise<{
        runs?: Array<{ runId: string; role: string; task: string; memberId?: string; phase: string }>
        planId?: string
        status?: string
      }>
    }) => unknown
  }
  subagents: {
    start: (provider: string, request: {
      label: string
      prompt: Array<{ type: 'text'; text: string }>
      parent: ParentAgent
      signal: AbortSignal
    }) => Promise<SubagentRun>
  }
  systemPrompt: {
    section: (section: {
      name: string
      order: number
      text: string | ((context?: PromptAssembleContext) => string)
    }) => unknown
  }
  magicWorkMode: MagicWorkModeService
  on?: (event: string, listener: (...args: unknown[]) => unknown) => unknown
}) {
  console.log('[magic-ceo] plugin loaded')

  ctx.on?.('session/event', (session, event) => {
    const subject = session as { id?: string }
    if (typeof subject.id !== 'string') return
    ingestChildSessionEvent(subject.id, event as ChildSessionEvent)
  })

  ctx.systemPrompt.section({
    name: 'magic-ceo',
    order: 255,
    text: (context) => {
      const sessionId = sessionIdOf(context)
      const mode = sessionId === undefined ? 'agent' : ctx.magicWorkMode.getMode(sessionId)
      return ceoModePrompt(mode)
    },
  })

  ctx.tools.register({
    name: 'ceo_plan',
    description:
      'Record the CEO analysis and a proposed run graph before complex delegation. '
      + 'Call this after thinking through scope, evidence, acceptance, roles, and dependencies; '
      + 'then call ceo_delegate with the same tasks array.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        summary: { type: 'string', description: 'The user goal and the planned delivery boundary.' },
        analysis: { type: 'string', description: 'Visible reasoning: scope, unknowns, research angles, and why this split is appropriate.' },
        team_brief: { type: 'string', description: 'Shared context and evidence rules for every worker.' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              role: { type: 'string' },
              task: { type: 'string' },
              id: { type: 'string' },
              depends_on: { type: 'array', items: { type: 'string' } },
            },
            required: ['role', 'task'],
          },
        },
      },
      required: ['summary', 'analysis', 'tasks'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { planId: { type: 'string' }, status: { type: 'string' } },
        required: ['planId', 'status'],
      },
      render: (_args, value) => [{ type: 'text', text: `CEO plan ${value.planId ?? 'unknown'} ${value.status ?? 'ready'}` }],
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const parent = exec.agent
      if (parent === undefined) throw new Error('ceo_plan requires a calling agent')
      const parentSessionId = parent.session.id
      if (ctx.magicWorkMode.getMode(parentSessionId) !== 'ceo') {
        throw new Error('ceo_plan requires CEO work mode. Use /mode ceo first.')
      }
      const raw = args as Record<string, unknown>
      const tasks = parseDelegateTasks({ tasks: raw.tasks })
      const summary = typeof raw.summary === 'string' ? raw.summary.trim() : ''
      const analysis = typeof raw.analysis === 'string' ? raw.analysis.trim() : ''
      if (!summary || !analysis) throw new Error('ceo_plan requires non-empty summary and analysis')
      const turn = currentTurn(parent.session)
      if (turn === undefined) throw new Error('ceo_plan requires an open turn')
      const previous = plansByParent.get(parentSessionId)
      const plan: CeoPlanData = {
        turn,
        planId: `plan_${String(Date.now())}`,
        version: previous?.turn === turn ? previous.version + 1 : 1,
        summary,
        analysis,
        ...typeof raw.team_brief === 'string' && raw.team_brief.trim() !== ''
          ? { teamBrief: raw.team_brief.trim().slice(0, 1500) }
          : {},
        tasks: tasks.map(task => ({
          ...task.id === undefined ? {} : { id: task.id },
          role: task.role,
          task: task.task,
          dependsOn: task.dependsOn,
        })),
      }
      plansByParent.set(parentSessionId, plan)
      if (previous?.turn === turn) appendCeoPlanRevision(parent.session, plan)
      else appendCeoPlan(parent.session, plan)
      return { planId: plan.planId, status: 'ready' }
    },
  })

  ctx.tools.register({
    name: 'ceo_delegate',
    description:
      'Delegate a CEO run graph. Default path is tasks[]: role + task, optional id and depends_on. '
      + 'Independent tasks run together. A dependent task starts only after its depends_on nodes finish. '
      + 'Use only in CEO mode. Workers do not see this conversation, so each task must be self-contained.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        tasks: {
          type: 'array',
          description: 'Run graph. Each item is one worker node. Mutually independent nodes run in parallel.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              role: {
                type: 'string',
                description: 'Duty for this node only, such as research, implementation, or review.',
              },
              task: {
                type: 'string',
                description: 'Self-contained task: goal, boundary, and acceptance. The worker does not see this conversation.',
              },
              id: {
                type: 'string',
                description: 'Optional node id. depends_on may reference this literal or the role name.',
              },
              depends_on: {
                type: 'array',
                items: { type: 'string' },
                description: 'Producer → consumer. Use this batch\'s id or role. Independent tasks omit this.',
              },
            },
            required: ['role', 'task'],
          },
        },
      },
      required: ['tasks'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          runs: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                runId: { type: 'string' },
                role: { type: 'string' },
                task: { type: 'string' },
                memberId: { type: 'string' },
                phase: { type: 'string' },
              },
              required: ['runId', 'role', 'task', 'phase'],
            },
          },
        },
        required: ['runs'],
      },
      render: (_args, value) => [{
        type: 'text',
        text: (value.runs ?? []).map(run => {
          const member = run.memberId === undefined ? '' : ` as member ${run.memberId}`
          return `delegated ${run.role} (${run.runId})${member} ${run.phase}`
        }).join('\n'),
      }],
    },
    isConcurrencySafe: () => false,
    async execute(args, exec) {
      const parent = exec.agent
      if (parent === undefined) {
        throw new Error('ceo_delegate requires a calling agent')
      }

      const parentSessionId = parent.session.id
      if (ctx.magicWorkMode.getMode(parentSessionId) !== 'ceo') {
        throw new Error('ceo_delegate requires CEO work mode. Use /mode ceo first.')
      }

      const tasks = parseDelegateTasks(args)
      const existingPlan = plansByParent.get(parentSessionId)
      const needsPlan = tasks.some(task => isComplexTask(task, tasks.length))
      if (needsPlan) {
        if (existingPlan === undefined) {
          throw new Error('Complex CEO work requires ceo_plan first: think through scope, evidence, acceptance, and the worker graph before delegating.')
        }
        const plannedTasks = existingPlan.tasks.map(task => ({ role: task.role, task: task.task, dependsOn: task.dependsOn }))
        const currentTasks = tasks.map(task => ({ role: task.role, task: task.task, dependsOn: task.dependsOn }))
        if (taskFingerprint(plannedTasks) !== taskFingerprint(currentTasks)) {
          throw new Error('ceo_delegate tasks do not match the latest CEO plan. Re-run ceo_plan after revising the graph.')
        }
      }
      const plan = buildRunPlan(tasks, `del_${String(Date.now())}`)
      const specs = new Map(plan.nodes.map(node => [node.runId, node]))
      const existing = membersOf(parentSessionId)
      const createdAt = new Date().toISOString()
      for (const node of plan.nodes) {
        existing.push({
          runId: node.runId,
          rawId: node.rawId,
          parentSessionId,
          role: node.role,
          task: node.task,
          dependsOn: node.dependsOn,
          phase: 'queued',
          createdAt,
        })
      }

      const callId = typeof exec.callId === 'string' ? exec.callId : ''
      const turn = currentTurn(parent.session)
      const publish = (phases: ReadonlyMap<string, RunState>): void => {
        if (callId === '' || turn === undefined) return
        const runs = journalRuns(plan, phases).map((run) => {
          const member = existing.find(item => item.runId === run.runId)
          if (member !== undefined) member.phase = run.phase
          const memberId = run.memberId ?? member?.memberId
          return memberId === undefined ? run : { ...run, memberId }
        })
        appendRunJournal(parent.session, { turn, callId, runs })
        const completed = runs.filter(run =>
          run.phase === 'completed' || run.phase === 'failed' || run.phase === 'cancelled' || run.phase === 'skipped',
        ).length
        appendCeoRunProgress(parent.session, { turn, callId, completed, total: runs.length })
      }
      publish(new Map())

      const scheduler = new WaveScheduler()
      const results = await scheduler.run(plan, async (spec, upstream) => {
        const member = existing.find(item => item.runId === spec.runId)
        if (member !== undefined) member.phase = 'running'
        const run = await ctx.subagents.start('spawn', {
          label: spec.role,
          prompt: [{
            type: 'text',
            text: wrapMemberPrompt(spec.role, spec.task, upstream, specs),
          }],
          parent,
          signal: exec.signal,
        })
        if (member !== undefined) {
          member.memberId = run.id
          member.phase = 'running'
        }
        const live = new Map<string, RunState>()
        for (const node of plan.nodes) {
          const item = existing.find(entry => entry.runId === node.runId)
          live.set(node.runId, {
            phase: item?.phase ?? 'queued',
            ...item?.memberId === undefined ? {} : { memberId: item.memberId },
          })
        }
        publish(live)
        attachRunProcessMirror({
          parent: parent.session,
          turn,
          callId,
          runId: spec.runId,
          memberId: run.id,
          childSessionId: run.id,
          child: run.localAgent?.session,
        })
        try {
          const result = await run.result
          const output = textFromOutput(result.output)
          if (turn !== undefined && callId !== '') {
            appendCeoRunPhase(parent.session, {
              turn, callId, runId: spec.runId, memberId: run.id, phase: 'winding_down',
            })
          }
          const state = stateFromWorkerResult(spec, output, result.stopReason, run.id)
          if (turn !== undefined && callId !== '') {
            appendCeoMemberResult(parent.session, {
              turn,
              callId,
              runId: spec.runId,
              memberId: run.id,
              output,
              stopReason: result.stopReason,
              status: state.phase === 'failed' ? 'blocked' : undefined,
            })
          }
          if (member !== undefined) {
            member.memberId = run.id
            member.phase = state.phase
          }
          return state
        } finally {
          detachRunProcessMirror(run.id)
          await run.dispose()
        }
      }, exec.signal, publish)

      return {
        runs: plan.nodes.map(node => {
          const state = results.get(node.runId)
          const member = existing.find(item => item.runId === node.runId)
          const phase = state?.phase ?? member?.phase ?? 'failed'
          if (member !== undefined) member.phase = phase
          return {
            runId: node.runId,
            role: node.role,
            task: node.task,
            memberId: state?.memberId ?? member?.memberId,
            phase,
          }
        }),
      }
    },
  })
}

export { RunPlan, RunPlanError } from './plan.ts'
export { WaveScheduler } from './wave.ts'
export { buildRunPlan, parseDelegateTasks } from './builder.ts'
export {
  CEO_MEMBER_RESULT,
  CEO_PLAN,
  CEO_PLAN_REVISED,
  CEO_RUN_JOURNAL,
  CEO_RUN_PHASE,
  CEO_RUN_PROGRESS,
  CEO_RUN_PROCESS,
  appendCeoMemberResult,
  appendCeoPlan,
  appendCeoPlanRevision,
  appendCeoRunPhase,
  appendCeoRunProgress,
  appendRunJournal,
  appendRunProcess,
  currentTurn,
  journalRuns,
} from './journal.ts'
export {
  attachRunProcessMirror,
  detachRunProcessMirror,
  ingestChildSessionEvent,
} from './process.ts'
