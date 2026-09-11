import { createElement as h } from 'react'
import { parseCeoDelegateMemberId, parseCeoDelegateTasks } from '../team.ts'
import { ink, surface } from './theme.ts'

export interface CeoDelegateRowProps {
  block: {
    callId: string
    argsRaw?: string
    call?: { argsRaw?: string | null } | null
    content?: Array<{ type?: string; text?: string }>
    isError?: boolean
    error?: { code?: string }
  }
  inspect?: () => void
  t: (key: string) => string
}

function argsRawOf(block: CeoDelegateRowProps['block']): string {
  return ('call' in block ? block.call?.argsRaw : block.argsRaw) ?? ''
}

function resultText(block: CeoDelegateRowProps['block']): string {
  if (!Array.isArray(block.content)) return ''
  return block.content
    .filter(item => item.type === 'text' && typeof item.text === 'string')
    .map(item => item.text ?? '')
    .join('\n')
}

export function CeoDelegateRow({ block, inspect, t }: CeoDelegateRowProps) {
  const tasks = parseCeoDelegateTasks(argsRawOf(block))
  const parsed = tasks[0]
  const done = 'kind' in block || Array.isArray(block.content)
  const failed = block.isError === true || block.error?.code !== undefined
  const memberId = parseCeoDelegateMemberId(resultText(block))
  const status = !done ? 'running' : failed ? 'error' : 'ok'
  const summary = tasks.length > 1
    ? `${String(tasks.length)} tasks`
    : `${parsed?.role ?? 'member'} · ${parsed?.task ?? 'task'}`
  return h('button', {
    type: 'button',
    'data-magic-ceo-delegate': block.callId,
    'data-status': status,
    onClick: inspect,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      minHeight: 32,
      padding: '0 8px',
      border: 0,
      borderRadius: 8,
      background: surface.layer2,
      color: ink.secondary,
      cursor: inspect === undefined ? 'default' : 'pointer',
      textAlign: 'left',
    },
  },
  h('span', { style: { fontWeight: 510 } }, t('tool.title')),
  h('span', {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  }, summary),
  h('span', {
    style: { marginLeft: 'auto', fontSize: 11, color: ink.tertiary },
  }, memberId ?? t(`status.${status}`)),
  )
}
