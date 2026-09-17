// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/models/terminal-card-model.ts
// （hasSpillNotice 由本地等价实现替代，见 spill-notice.ts。）

import type { TerminalBlockLabels, TerminalBlockProps } from '@deepseek-ai/dsh-client-ui-primitives'
import { resolveWorkspacePath } from '../../vendor-types.ts'
import type { ConversationTranslate } from '../../locale/conversation.ts'
import type { ToolCallBlock } from './tool-call-model.ts'
import { hasSpillNotice } from './spill-notice.ts'
import { parsedToolCall, singleResultText, validEscalationFields } from './raw-tool-call.ts'

/** 由 conversation locale 座位构建 TerminalBlock 展示文案。 */
export function terminalBlockLabels(t: ConversationTranslate): TerminalBlockLabels {
  return {
    signal: signal => t('terminal.signal', { signal }),
    exitCode: code => t('terminal.exitCode', { code }),
    running: t('terminal.running'),
    failed: t('terminal.failed'),
    done: t('terminal.done'),
    copy: t('copy'),
    copied: t('copied'),
    noOutput: t('terminal.noOutput'),
    collapseAria: t('terminal.collapseAria'),
    collapse: t('collapse'),
    expandAria: hidden => t('terminal.expandAria', { n: hidden }),
    expand: hidden => t('terminal.expandRest', { n: hidden }),
  }
}

/** 该推导拥有的 TerminalBlock props。 */
export interface TerminalCardModel {
  card: Pick<TerminalBlockProps, 'cwd' | 'output' | 'exitCode' | 'signal' | 'running'>
  copy:
    | { readonly kind: 'shell'; readonly command: string; readonly description: string | undefined }
    | { readonly kind: 'terminal-send'; readonly text: string; readonly sessionId: string }
}

interface LocalizedTerminalCardModel {
  readonly card: Pick<TerminalBlockProps, 'command' | 'cwd' | 'output' | 'exitCode' | 'signal' | 'running'>
  readonly description: string | undefined
}

/** 解析 locale 侧 terminal_send 文案，同时原样保留 shell 命令与描述。 */
export function localizeTerminalCardModel(
  model: TerminalCardModel,
  t: ConversationTranslate,
): LocalizedTerminalCardModel {
  if (model.copy.kind === 'shell') {
    return {
      card: { command: model.copy.command, ...model.card },
      description: model.copy.description,
    }
  }
  return {
    card: {
      command: model.copy.text === '' ? t('terminal.sendInput') : model.copy.text,
      ...model.card,
    },
    description: t('terminal.session', { sessionId: model.copy.sessionId }),
  }
}

/** 落定 terminal 卡报告失败退出时为真。 */
export function terminalFailed(model: TerminalCardModel): boolean {
  const { exitCode, signal, running } = model.card
  return running !== true && ((exitCode !== undefined && exitCode !== 0) || signal !== undefined)
}

/** 为展示解析 shell 调用的 workdir。 */
function resolveTerminalCwd(workdir: string | undefined, sessionCwd: string | undefined): string | undefined {
  if (workdir === undefined || workdir === '') return sessionCwd
  if (sessionCwd === undefined || sessionCwd === '') return normalizeSegments(workdir)
  return normalizeSegments(resolveWorkspacePath(sessionCwd, workdir))
}

/** 折叠 `.` 与 `..` 段，使提示标签指向命令实际运行目录。 */
function normalizeSegments(path: string): string {
  if (!/(?:^|[/\\])\.\.?(?:[/\\]|$)/.test(path)) return path
  const unc = /^[/\\]{2}([^/\\]+)[/\\]+([^/\\]+)/.exec(path)
  if (unc !== null) {
    const [matched, server, share] = unc
    const root = `\\\\${String(server)}\\${String(share)}`
    const rest = collapse(path.slice(matched.length), true)
    return rest === '' ? root : `${root}\\${rest}`
  }
  const backslashed = path.includes('\\') && !path.includes('/')
  const separator = backslashed ? '\\' : '/'
  const rooted = /^[/\\]/.test(path)
  const drive = /^[A-Za-z]:/.exec(path)?.[0] ?? ''
  const body = collapse(path.slice(drive.length), rooted || drive !== '', separator)
  const leading = rooted ? separator : ''
  return drive === '' ? `${leading}${body}` : `${drive}${rooted ? leading : separator}${body}`
}

/** 折叠路径主体中的 `.`/`..` 段。 */
function collapse(body: string, rooted: boolean, separator = '/'): string {
  const kept: string[] = []
  for (const segment of body.split(/[/\\]/)) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (kept.length > 0 && kept[kept.length - 1] !== '..') kept.pop()
      else if (!rooted) kept.push(segment)
      continue
    }
    kept.push(segment)
  }
  return kept.join(separator)
}

interface ShellCall {
  kind: 'shell'
  command: string
  description: string | undefined
  workdir: string | undefined
  persistent: boolean
  background: boolean
}

function shellCall(name: string, args: Record<string, unknown>): ShellCall | null {
  if (name !== 'bash' && name !== 'pwsh') return null
  const { command, description, timeoutMs, workdir, run_in_background: background } = args
  if (typeof command !== 'string' || command.trim() === '') return null
  if (timeoutMs !== undefined && (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs <= 0)) return null
  if (workdir !== undefined && typeof workdir !== 'string') return null
  if (background !== undefined && typeof background !== 'boolean') return null
  if (!validEscalationFields(args)) return null
  if (description === undefined) {
    return { kind: 'shell', command, description: undefined, workdir: undefined, persistent: true, background: false }
  }
  if (typeof description !== 'string' || description.trim() === '') return null
  return {
    kind: 'shell',
    command,
    description,
    workdir,
    persistent: false,
    background: background === true,
  }
}

/** 识别持久 Bash / PowerShell 工具的落定根调用。 */
export function isSettledPersistentShellCall(block: ToolCallBlock): boolean {
  if (!('kind' in block) || block.parentCallId !== undefined) return false
  const parsed = parsedToolCall(block)
  if (parsed === null) return false
  return shellCall(parsed.name, parsed.args)?.persistent === true
}

/** 识别可以让溢出页脚隐藏退出标记的落定前台 shell 预览。 */
export function isSpilledShellCall(block: ToolCallBlock): boolean {
  if (!('kind' in block)) return false
  const parsed = parsedToolCall(block)
  if (parsed === null) return false
  const call = shellCall(parsed.name, parsed.args)
  if (call === null || call.background) return false
  const output = singleResultText(block)
  return output !== undefined && hasSpillNotice(output)
}

interface TerminalSendCall {
  kind: 'terminal-send'
  text: string
  sessionId: string
  background: boolean
}

function terminalSendCall(name: string, args: Record<string, unknown>): TerminalSendCall | null {
  if (name !== 'terminal_send') return null
  const { sessionId, text, submit, run_in_background: background } = args
  if (typeof sessionId !== 'string' || sessionId === '' || typeof text !== 'string') return null
  if (submit !== undefined && typeof submit !== 'boolean') return null
  if (background !== undefined && typeof background !== 'boolean') return null
  return {
    kind: 'terminal-send',
    text,
    sessionId,
    background: background === true,
  }
}

/** 解析 `@deepseek-ai/dsh-shell/render` 持有的标记字面量。 */
function parseExitStatus(text: string): { output: string; exitCode?: number; signal?: string } {
  const signal = /\n\[killed by signal: ([^\]\n]+)\]$/.exec(text)
  if (signal?.[1] !== undefined) return { output: text.slice(0, signal.index), signal: signal[1] }
  const exit = /\n\[exit code: (\d+)\]$/.exec(text)
  if (exit?.[1] !== undefined) return { output: text.slice(0, exit.index), exitCode: Number(exit[1]) }
  return { output: text, exitCode: 0 }
}

/** 为支持的 shell 与 terminal-send 调用推导 terminal props。 */
export function terminalCardModel(
  block: ToolCallBlock,
  sessionCwd?: string,
): TerminalCardModel | null {
  const parsed = parsedToolCall(block)
  if (parsed === null) return null
  const call = shellCall(parsed.name, parsed.args) ?? terminalSendCall(parsed.name, parsed.args)
  if (call === null || call.background) return null

  const copy: TerminalCardModel['copy'] = call.kind === 'shell'
    ? { kind: 'shell', command: call.command, description: call.description }
    : { kind: 'terminal-send', text: call.text, sessionId: call.sessionId }
  const cwd = resolveTerminalCwd(call.kind === 'shell' ? call.workdir : undefined, sessionCwd)
  if (!('kind' in block)) {
    return {
      copy,
      card: {
        cwd,
        output: undefined,
        exitCode: undefined,
        signal: undefined,
        running: true,
      },
    }
  }
  if (block.isError || (call.kind === 'shell' && call.persistent) || isSpilledShellCall(block)) return null
  const output = singleResultText(block)
  if (output === undefined) return null
  const status = call.kind === 'terminal-send' ? { output } : parseExitStatus(output)
  return {
    copy,
    card: {
      cwd,
      output: status.output,
      exitCode: status.exitCode,
      signal: status.signal,
      running: false,
    },
  }
}
