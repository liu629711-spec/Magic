export const name = 'magic-work-mode'

export const inject = ['systemPrompt', 'commands']

export type WorkMode = 'agent' | 'ceo'

export interface MagicWorkModeState {
  sessionMode: WorkMode
  inputMode: WorkMode | null
}

const sessionModes = new Map<string, MagicWorkModeState>()

function parseMode(rawInput: string): WorkMode | null {
  const value = rawInput.trim().toLowerCase()
  if (value === 'agent' || value === 'ceo') return value
  return null
}

function resolveMode(state: MagicWorkModeState | undefined): WorkMode {
  return state?.inputMode ?? state?.sessionMode ?? 'agent'
}

function describeMode(mode: WorkMode): string {
  if (mode === 'ceo') {
    return [
      'Current work mode: CEO.',
      'The session lead owns division of labor, dependencies, reporting, blockers, and a single delivery.',
      'Members are working agents, not reduced tools.',
      'Using CEO does not create an engineering organization.',
    ].join('\n')
  }

  return [
    'Current work mode: agent.',
    'The session lead understands, plans, executes, verifies, and delivers the user goal.',
    'Internal collaborators stay inside this session and do not become long-lived members.',
  ].join('\n')
}

export function apply(ctx: {
  systemPrompt: {
    section: (section: { name: string; order: number; text: string | (() => string) }) => unknown
  }
  commands: {
    register: (definition: {
      name: string
      description: string
      input?: { hint: string }
      handler: (invocation: { agent: { session: { id: string } }; rawInput: string }) => { kind: 'success' | 'error'; text: string }
    }) => unknown
  }
}) {
  ctx.systemPrompt.section({
    name: 'magic-work-mode',
    order: 250,
    text: () => [
      'Magic work-mode rules:',
      '- Default to agent mode. Do not upgrade to CEO because a task is large, slow, or uses extra agents.',
      '- Enter CEO only when the user explicitly asks for CEO or the session default is CEO.',
      '- CEO organizes work packages and reports a single result. It is not a permanent organization.',
      '- Creating an engineering organization requires a separate explicit user confirmation.',
    ].join('\n'),
  })

  ctx.commands.register({
    name: 'mode',
    description: 'Show or set the Magic work mode for this session',
    input: { hint: '[agent|ceo]' },
    handler: ({ agent, rawInput }) => {
      const sessionId = agent.session.id
      const current = sessionModes.get(sessionId) ?? { sessionMode: 'agent', inputMode: null }
      const requested = parseMode(rawInput)

      if (rawInput.trim() === '') {
        return {
          kind: 'success',
          text: describeMode(resolveMode(current)),
        }
      }

      if (requested === null) {
        return {
          kind: 'error',
          text: 'Use `/mode`, `/mode agent`, or `/mode ceo`.',
        }
      }

      sessionModes.set(sessionId, { sessionMode: requested, inputMode: null })
      return {
        kind: 'success',
        text: describeMode(requested),
      }
    },
  })
}

export function resetWorkModeStateForTests(): void {
  sessionModes.clear()
}
