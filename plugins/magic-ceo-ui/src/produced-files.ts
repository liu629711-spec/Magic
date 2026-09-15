/**
 * Member-process produced files. Same mutation vocabulary as DSH
 * ui-deliverables `mutationPath` (write / edit / mutating str_replace_editor),
 * plus the file_* aliases Magic already maps in processView. Source of truth
 * is a successful process step, not the member's prose "artifacts" field.
 *
 * Host mirrors clip write JSON at 1200 chars. When that breaks JSON.parse,
 * recover the path from a quoted file_path/path field, or from the DSH
 * write envelope `<path>…</path>` in the tool result.
 */
import { parseToolArgs, pathFromToolResult, pathHintFromArgs } from './processView.ts'
import type { CeoProcessStep } from './team.ts'

function pathValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function writePath(args: Record<string, unknown>): string | null {
  return pathValue(args.file_path) ?? pathValue(args.path)
}

function editorMutationPath(args: Record<string, unknown>): string | null {
  const path = pathValue(args.path)
  if (path === null) return null
  switch (args.command) {
    case 'create':
    case 'str_replace':
    case 'insert':
      return path
    default:
      return null
  }
}

function mutationPath(step: Extract<CeoProcessStep, { kind: 'tool' }>): string | null {
  const args = parseToolArgs(step.args)
  const hinted = pathHintFromArgs(step.args)
    ?? pathFromToolResult(step.result)
    ?? pathHintFromArgs(step.result)
    ?? null
  switch (step.name) {
    case 'write':
    case 'file_write':
    case 'file_append':
      return writePath(args) ?? hinted
    case 'edit':
    case 'str_replace':
      return writePath(args) ?? hinted
    case 'str_replace_editor':
      return editorMutationPath(args)
    default:
      return null
  }
}

/**
 * Successful mutation paths from one member's process, first-seen order.
 * Reads, failures, running calls, and unknown tools contribute nothing.
 */
export function producedFilesFromProcess(steps: readonly CeoProcessStep[]): readonly string[] {
  const paths: string[] = []
  const seen = new Set<string>()
  for (const step of steps) {
    if (step.kind !== 'tool' || step.status !== 'ok') continue
    const path = mutationPath(step)
    if (path === null || seen.has(path)) continue
    seen.add(path)
    paths.push(path)
  }
  return paths
}

export function producedFileName(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}

/** Mirror of better-sidebar `isAbsolutePath` so relative writes join onto cwd. */
export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path) || /^[\\/]{2}[^\\/]/.test(path)
}

export function resolveProducedPath(cwd: string | undefined, path: string): string {
  if (isAbsolutePath(path)) return path
  const base = cwd ?? ''
  if (base === '') return path
  const separator = base.includes('\\') ? '\\' : '/'
  return `${base.replace(/[\\/]+$/, '')}${separator}${path}`
}
