import { createElement as h, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import {
  displayCeoSeat,
  formatCeoDecisionMessage,
  presentCeoMember,
  type CeoTeamMember,
} from '../team.ts'
import { getCeoRoster, getCeoRosterSessionId, recordCeoUserDecision, subscribeCeoSelection } from './selection.ts'
import { ink, line, surface, wrap } from './theme.ts'

export interface CeoDecisionDrawerProps {
  members: readonly CeoTeamMember[]
  sendDecision?: (text: string) => Promise<{ ok: boolean; error?: string }>
  t: (key: string, params?: Record<string, unknown>) => string
}

function pendingDecisions(members: readonly CeoTeamMember[]): CeoTeamMember[] {
  return members.filter(member => presentCeoMember(member).needsDecision)
}

export function CeoDecisionDock({
  sessionId,
  sendDecision,
  t,
}: {
  sessionId?: string
  sendDecision?: (text: string) => Promise<{ ok: boolean; error?: string }>
  t: (key: string, params?: Record<string, unknown>) => string
}): ReactNode {
  const members = useSyncExternalStore(subscribeCeoSelection, getCeoRoster, getCeoRoster)
  const rosterSessionId = useSyncExternalStore(subscribeCeoSelection, getCeoRosterSessionId, getCeoRosterSessionId)
  if (sessionId !== undefined && rosterSessionId !== undefined && sessionId !== rosterSessionId) {
    return null
  }
  return h(CeoDecisionDrawer, { members, sendDecision, t })
}

export function CeoDecisionDrawer({ members, sendDecision, t }: CeoDecisionDrawerProps): ReactNode {
  const pending = pendingDecisions(members)
  const [index, setIndex] = useState(0)
  const [minimized, setMinimized] = useState(false)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | undefined>(undefined)
  if (pending.length === 0 || sendDecision === undefined) return null
  const current = pending[Math.min(index, pending.length - 1)]
  if (current === undefined) return null
  const question = (current.report?.userDecisions ?? '').trim()
  const seat = displayCeoSeat(current, members)
  const canSend = draft.trim() !== '' && !sending

  const submit = () => {
    if (!canSend) return
    const answer = draft.trim()
    setSending(true)
    setSendError(undefined)
    void sendDecision(formatCeoDecisionMessage(current, answer)).then((result) => {
      setSending(false)
      if (!result.ok) {
        setSendError(result.error ?? t('decision.error'))
        return
      }
      recordCeoUserDecision(current.callId, answer)
      setDraft('')
    }, (error: unknown) => {
      setSending(false)
      setSendError(error instanceof Error ? error.message : t('decision.error'))
    })
  }

  return h('aside', {
    'data-magic-ceo-decision-drawer': current.callId,
    style: {
      margin: '0 0 10px',
      border: `1px solid ${line.subtle}`,
      borderRadius: 12,
      background: surface.layer2,
      overflow: 'hidden',
    },
  },
    h('header', {
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 12px',
      },
    },
      h('div', { style: { minWidth: 0, flex: 1 } },
        h('div', {
          style: { fontSize: 11, fontWeight: 510, color: ink.warn, lineHeight: '16px' },
        }, t('drawer.caption')),
        h('h2', {
          style: {
            ...wrap,
            margin: '4px 0 0',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: '20px',
            color: ink.primary,
          },
        }, question === '' ? t('drawer.fallbackQuestion', { seat }) : question),
      ),
      h('div', { style: { display: 'flex', gap: 2, flex: '0 0 auto' } },
        pending.length > 1
          ? h('span', {
            style: { fontSize: 11, color: ink.tertiary, lineHeight: '28px', padding: '0 4px' },
          }, `${String(Math.min(index, pending.length - 1) + 1)}/${String(pending.length)}`)
          : null,
        pending.length > 1
          ? iconButton(t('drawer.prev'), index <= 0 || sending, () => {
            setIndex(value => Math.max(0, value - 1))
            setDraft('')
            setSendError(undefined)
          }, '‹')
          : null,
        pending.length > 1
          ? iconButton(t('drawer.next'), index >= pending.length - 1 || sending, () => {
            setIndex(value => Math.min(pending.length - 1, value + 1))
            setDraft('')
            setSendError(undefined)
          }, '›')
          : null,
        iconButton(
          t(minimized ? 'drawer.expand' : 'drawer.fold'),
          sending,
          () => { setMinimized(value => !value) },
          minimized ? '▴' : '▾',
        ),
      ),
    ),
    minimized
      ? null
      : h('div', { style: { padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 10 } },
        h('div', {
          style: { fontSize: 12, lineHeight: '18px', color: ink.tertiary },
        }, t('drawer.context', { seat })),
        current.task.trim() === ''
          ? null
          : h('div', {
            style: {
              ...wrap,
              fontSize: 12,
              lineHeight: '18px',
              color: ink.secondary,
              display: '-webkit-box',
              overflow: 'hidden',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            },
          }, current.task),
        h('textarea', {
          value: draft,
          rows: 3,
          placeholder: t('drawer.placeholder'),
          disabled: sending,
          onChange: (event: { target: { value: string } }) => { setDraft(event.target.value) },
          style: {
            width: '100%',
            resize: 'vertical',
            boxSizing: 'border-box',
            padding: '8px 10px',
            borderRadius: 8,
            border: `0.5px solid ${line.subtle}`,
            background: surface.layer3,
            color: ink.primary,
            fontSize: 13,
            lineHeight: '20px',
          },
        }),
        sendError !== undefined
          ? h('div', { style: { fontSize: 12, color: ink.danger } }, sendError)
          : null,
        h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
          h('button', {
            type: 'button',
            disabled: !canSend,
            onClick: submit,
            style: {
              padding: '6px 12px',
              borderRadius: 8,
              border: 0,
              background: canSend
                ? 'var(--dsw-alias-state-business-primary, #3b82f6)'
                : surface.overlay,
              color: canSend ? '#fff' : ink.tertiary,
              cursor: canSend ? 'pointer' : 'default',
              fontSize: 13,
              fontWeight: 510,
            },
          }, sending ? t('decision.sending') : t('decision.send')),
        ),
      ),
  )
}

function iconButton(label: string, disabled: boolean, onClick: () => void, glyph: string): ReactNode {
  const style: CSSProperties = {
    width: 28,
    height: 28,
    border: 0,
    borderRadius: 8,
    background: 'transparent',
    color: ink.secondary,
    cursor: disabled ? 'default' : 'pointer',
    fontSize: 14,
    opacity: disabled ? 0.45 : 1,
  }
  return h('button', {
    type: 'button',
    title: label,
    'aria-label': label,
    disabled,
    onClick,
    style,
  }, glyph)
}
