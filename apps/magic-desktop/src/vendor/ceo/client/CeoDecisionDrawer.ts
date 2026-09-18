// 搬自 plugins/magic-ceo-ui/src/client/CeoDecisionDrawer.ts（2026-09-18 CEO 委派图卡决策抽屉接入）。
// 原样保留：输入坞上方的「待你拍板」抽屉（CeoDecisionDock = 订阅 selection store 的包装）。
// import 路径同源本地化：../team.ts、./selection.ts、./theme.ts。文案 t 由调用方注入（用 ./dict.ts 的 ceoT）。

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
  const [expandedQuestion, setExpandedQuestion] = useState(false)
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

  // 宽度对齐 composer 卡片（照抄官方 QueueDock.module.css 的 dock 公式：
  // side-clearance / dock-inset / composer-card-max-width 同一套变量）。
  return h('aside', {
    'data-magic-ceo-decision-drawer': current.callId,
    style: {
      boxSizing: 'border-box',
      width: 'calc(100% - var(--dsh-composer-side-clearance) * 2 - var(--dsh-composer-dock-inset) * 2)',
      maxWidth: 'calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) * 2)',
      margin: '0 auto 10px',
      border: `0.5px solid ${line.subtle}`,
      borderRadius: 12,
      background: surface.layer2,
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
      overflow: 'hidden',
    },
  },
    h('header', {
      onClick: () => { setExpandedQuestion(value => !value) },
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 12px',
        cursor: 'pointer',
        userSelect: 'none',
      },
    },
      h('div', { style: { minWidth: 0, flex: 1 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
          h('span', {
            style: {
              fontSize: 11, fontWeight: 510, color: ink.warn, lineHeight: '16px',
              padding: '0 6px', borderRadius: 5,
              background: 'color-mix(in srgb, var(--dsw-alias-state-warning, #d97706) 12%, transparent)',
            },
          }, t('drawer.caption')),
          h('span', { style: { fontSize: 11, color: ink.secondary, lineHeight: '16px' } }, seat),
        ),
        question === ''
          ? null
          : h('div', {
            style: {
              ...wrap, margin: '4px 0 0', fontSize: 13, fontWeight: 510, lineHeight: '19px',
              color: ink.primary,
              cursor: 'pointer',
              display: expandedQuestion ? undefined : '-webkit-box',
              overflow: 'hidden',
              ...expandedQuestion ? {} : { WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
            },
          }, question),
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
      : h('div', { style: { padding: '0 12px 10px', display: 'flex', flexDirection: 'column', gap: 8 } },
        expandedQuestion && current.task.trim() === ''
          ? null
          : h('div', {
            style: {
              ...wrap,
              fontSize: 12,
              lineHeight: '18px',
              color: ink.tertiary,
              display: expandedQuestion ? undefined : '-webkit-box',
              overflow: 'hidden',
              ...expandedQuestion ? {} : { WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' },
            },
          }, current.task.trim() === '' ? t('drawer.context', { seat }) : current.task),
        h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
          h('input', {
            value: draft,
            placeholder: t('drawer.placeholder'),
            disabled: sending,
            onChange: (event: { target: { value: string } }) => { setDraft(event.target.value) },
            onKeyDown: (event: { key: string }) => { if (event.key === 'Enter') submit() },
            style: {
              flex: 1,
              minWidth: 0,
              boxSizing: 'border-box',
              padding: '6px 10px',
              borderRadius: 8,
              border: `0.5px solid ${line.subtle}`,
              background: surface.layer3,
              color: ink.primary,
              fontSize: 13,
              lineHeight: '20px',
            },
          }),
          h('button', {
            type: 'button',
            disabled: !canSend,
            onClick: submit,
            style: {
              flex: '0 0 auto',
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
        sendError !== undefined
          ? h('div', { style: { fontSize: 12, color: ink.danger } }, sendError)
          : null,
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
    onClick: (event: { stopPropagation: () => void }) => {
      // 头部整行可点（切换问题展开）；图标按钮不冒泡，避免二次触发。
      event.stopPropagation()
      onClick()
    },
    style,
  }, glyph)
}
