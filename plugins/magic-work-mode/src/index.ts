export const name = 'magic-work-mode'

export const inject = ['systemPrompt', 'commands']

export type { MagicWorkModeState, WorkMode } from './mode.ts'
export {
  applyModeCommand,
  describeMode,
  parseModeCommand,
  resolveMode,
} from './mode.ts'

import {
  applyModeCommand,
  clearInputMode,
  defaultWorkModeState,
  describeMode,
  MODE_COMMAND_ERROR,
  parseModeCommand,
  resolveMode,
  type MagicWorkModeState,
  type WorkMode,
} from './mode.ts'

const sessionModes = new Map<string, MagicWorkModeState>()

type PromptAssembleContext = {
  agent?: { session?: { id?: string } }
}

function stateOf(sessionId: string): MagicWorkModeState {
  return sessionModes.get(sessionId) ?? defaultWorkModeState()
}

function sessionIdOf(context: PromptAssembleContext | undefined): string | undefined {
  const id = context?.agent?.session?.id
  return typeof id === 'string' && id !== '' ? id : undefined
}

export function workModePrompt(mode: WorkMode): string {
  if (mode === 'ceo') {
    return [
      'Magic work-mode rules:',
      '- Current work mode: CEO. This session (or this input) is already CEO. Do not behave as a solo agent.',
      '- You are the session lead: divide work, track dependencies, report blockers, and deliver one result.',
      '- Members are working agents, not reduced tools.',
      '- Using CEO does not create an engineering organization.',
      '- Creating an engineering organization requires a separate explicit user confirmation.',
    ].join('\n')
  }
  return [
    'Magic work-mode rules:',
    '- Current work mode: agent.',
    '- Default to agent mode. Do not upgrade to CEO because a task is large, slow, or uses extra agents.',
    '- Enter CEO only when the user explicitly asks for CEO or the session default is CEO.',
    '- A once-CEO choice applies only to the current input. After that turn ends, return to the session default.',
    '- CEO organizes work packages and reports a single result. It is not a permanent organization.',
    '- Creating an engineering organization requires a separate explicit user confirmation.',
  ].join('\n')
}

export function getSessionWorkMode(sessionId: string): WorkMode {
  return resolveMode(sessionModes.get(sessionId))
}

export function getSessionWorkModeState(sessionId: string): MagicWorkModeState {
  return stateOf(sessionId)
}

export function apply(ctx: {
  provide?: (name: string, value: unknown) => unknown
  on?: (event: string, listener: (...args: unknown[]) => unknown) => unknown
  systemPrompt: {
    section: (section: {
      name: string
      order: number
      text: string | ((context?: PromptAssembleContext) => string)
    }) => unknown
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
  console.log('[magic-work-mode] plugin loaded')

  ctx.provide?.('magicWorkMode', {
    getMode: getSessionWorkMode,
    getState: getSessionWorkModeState,
  })

  ctx.on?.('session/event', (session, event) => {
    const subject = session as { id?: string }
    const payload = event as { type?: string }
    if (typeof subject.id !== 'string') return
    if (payload.type !== 'turn/end') return
    const current = sessionModes.get(subject.id)
    if (current === undefined || current.inputMode === null) return
    sessionModes.set(subject.id, clearInputMode(current))
  })

  ctx.systemPrompt.section({
    name: 'magic-work-mode',
    order: 250,
    text: (context) => {
      const sessionId = sessionIdOf(context)
      const mode = sessionId === undefined ? 'agent' : getSessionWorkMode(sessionId)
      return workModePrompt(mode)
    },
  })

  ctx.commands.register({
    name: 'mode',
    description: 'Show or set the Magic work mode for this session or this input',
    input: { hint: '[agent|ceo|once agent|once ceo]' },
    handler: ({ agent, rawInput }) => {
      const sessionId = agent.session.id
      const current = stateOf(sessionId)
      const command = parseModeCommand(rawInput)

      if (command.kind === 'show') {
        return {
          kind: 'success',
          text: describeMode(current),
        }
      }

      if (command.kind === 'invalid') {
        return {
          kind: 'error',
          text: MODE_COMMAND_ERROR,
        }
      }

      const next = applyModeCommand(current, command)
      sessionModes.set(sessionId, next)
      return {
        kind: 'success',
        text: describeMode(next),
      }
    },
  })
}

export function resetWorkModeStateForTests(): void {
  sessionModes.clear()
}
