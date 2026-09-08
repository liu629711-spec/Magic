import {
  applyModeCommand,
  defaultWorkModeState,
  parseDescribedMode,
  parseModeCommand,
  resolveMode,
  type MagicWorkModeState,
  type WorkMode,
} from '../mode.ts'

export type { MagicWorkModeState, WorkMode }

const EMPTY = defaultWorkModeState()
const states = new Map<string, MagicWorkModeState>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

export function getClientWorkMode(sessionId: string): MagicWorkModeState {
  return states.get(sessionId) ?? EMPTY
}

export function resolveClientWorkMode(sessionId: string): WorkMode {
  return resolveMode(getClientWorkMode(sessionId))
}

export function applyClientWorkModeLine(sessionId: string, line: string): MagicWorkModeState {
  const command = parseModeCommand(line.replace(/^\s*\/mode\b/i, ''))
  const current = getClientWorkMode(sessionId)
  if (command.kind === 'show' || command.kind === 'invalid') return current
  const next = applyModeCommand(current, command)
  states.set(sessionId, next)
  notify()
  return next
}

export function applyClientWorkModeDescription(sessionId: string, text: string): MagicWorkModeState {
  const parsed = parseDescribedMode(text)
  if (parsed === null) return getClientWorkMode(sessionId)
  states.set(sessionId, parsed)
  notify()
  return parsed
}

export function subscribeClientWorkMode(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetClientWorkModeForTests(): void {
  states.clear()
}
