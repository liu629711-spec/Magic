export const name = 'magic-engineering'

export const inject = ['systemPrompt', 'commands']

export interface EngineeringRecord {
  name: string
  confirmed: true
  createdAt: string
}

const engineeringBySession = new Map<string, EngineeringRecord>()

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
    name: 'magic-engineering',
    order: 260,
    text: () => [
      'Magic engineering rules:',
      '- An engineering organization is not a folder, a long chat, or a large number of agents.',
      '- Create engineering only after explicit user confirmation.',
      '- CEO mode never creates engineering by itself.',
      '- An engineering organization has one PM, durable members, a task ledger, and project facts.',
    ].join('\n'),
  })

  ctx.commands.register({
    name: 'engineering',
    description: 'Show or confirm a Magic engineering organization for this session',
    input: { hint: '[status|confirm <name>]' },
    handler: ({ agent, rawInput }) => {
      const sessionId = agent.session.id
      const existing = engineeringBySession.get(sessionId)
      const trimmed = rawInput.trim()

      if (trimmed === '' || trimmed.toLowerCase() === 'status') {
        if (existing === undefined) {
          return {
            kind: 'success',
            text: 'No engineering organization exists. Confirm one with `/engineering confirm <name>`.',
          }
        }
        return {
          kind: 'success',
          text: `Engineering confirmed: ${existing.name}.`,
        }
      }

      const match = /^confirm\s+(.+)$/i.exec(trimmed)
      if (match === null || match[1] === undefined) {
        return {
          kind: 'error',
          text: 'Use `/engineering status` or `/engineering confirm <name>`.',
        }
      }

      const record: EngineeringRecord = {
        name: match[1].trim(),
        confirmed: true,
        createdAt: new Date().toISOString(),
      }
      engineeringBySession.set(sessionId, record)
      return {
        kind: 'success',
        text: `Engineering confirmed: ${record.name}. This does not change the current agent/CEO work mode.`,
      }
    },
  })
}

export function resetEngineeringStateForTests(): void {
  engineeringBySession.clear()
}
