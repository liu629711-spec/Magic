import { buildRunPlan, parseDelegateTasks } from './builder.ts'
import {
  appendRunJournal,
  currentTurn,
  journalRuns,
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
      '- For those tasks: call ceo_delegate immediately. Do not call web_search yourself. Do not say you will search first. Do not summarize after your own search.',
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
    'When the work is finished, send_message a compact structured result.',
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
  resetProcessMirrorsForTests()
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
          runs: Array<{ runId: string; role: string; task: string; memberId?: string; phase: string }>
        }) => Array<{ type: 'text'; text: string }>
      }
      isConcurrencySafe?: () => boolean
      execute: (args: unknown, exec: {
        agent?: ParentAgent
        callId?: string
        signal: AbortSignal
      }) => Promise<{
        runs: Array<{ runId: string; role: string; task: string; memberId?: string; phase: string }>
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
        text: value.runs.map(run => {
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
          const state: RunState = {
            phase: phaseOf(result.stopReason),
            memberId: run.id,
            output: textFromOutput(result.output),
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
  CEO_RUN_JOURNAL,
  CEO_RUN_PROCESS,
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
