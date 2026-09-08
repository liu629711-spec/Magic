import { createElement as h, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  debriefSummaryOf,
  formatCeoDecisionMessage,
  presentCeoMember,
  presentCeoMemberReport,
  reportTextFromProcess,
  type CeoMemberReport,
  type CeoMemberViewStatus,
  type CeoTeamMember,
} from '../team.ts'
import { CeoProcessTimeline } from './CeoProcessTimeline.ts'
import { recordCeoUserDecision } from './selection.ts'

const wrap: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
}

const TASK_COLLAPSE_H = 144
const MUTED = 'var(--dsw-alias-label-tertiary, #9a9a9a)'
const PRIMARY = 'var(--dsw-alias-label-primary, #f5f5f5)'
const SECONDARY = 'var(--dsw-alias-label-secondary, #c8c8c8)'
const DANGER = 'var(--dsw-alias-state-danger, #dc2626)'
const WARN = 'var(--dsw-alias-state-warning, #d97706)'
const SUCCESS = 'var(--dsw-alias-state-success, #16a34a)'
const ACCENT = 'var(--dsw-alias-state-business-primary, #3b82f6)'

export interface CeoMemberInspectorProps {
  member: CeoTeamMember
  sendDecision?: (text: string) => Promise<{ ok: boolean; error?: string }>
  t: (key: string, params?: Record<string, unknown>) => string
}

const REPORT_FIELDS: Array<{ key: keyof CeoMemberReport; label: string }> = [
  { key: 'done', label: 'field.done' },
  { key: 'notDone', label: 'field.notDone' },
  { key: 'artifacts', label: 'field.artifacts' },
  { key: 'evidence', label: 'field.evidence' },
  { key: 'risksOrBlockers', label: 'field.risks' },
  { key: 'next', label: 'field.next' },
  { key: 'userDecisions', label: 'field.decisions' },
]

function badgeStyle(status: CeoMemberViewStatus): CSSProperties {
  const tone = status === 'running'
    ? ACCENT
    : status === 'completed' || status === 'delegated'
      ? SUCCESS
      : status === 'failed' || status === 'error' || status === 'blocked'
        ? DANGER
        : status === 'partial'
          ? WARN
          : MUTED
  const fill = status === 'running'
    ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 12%, transparent)'
    : status === 'completed' || status === 'delegated'
      ? 'color-mix(in srgb, var(--dsw-alias-state-success, #16a34a) 12%, transparent)'
      : status === 'failed' || status === 'error' || status === 'blocked'
        ? 'color-mix(in srgb, var(--dsw-alias-state-danger, #dc2626) 12%, transparent)'
        : status === 'partial'
          ? 'color-mix(in srgb, var(--dsw-alias-state-warning, #d97706) 12%, transparent)'
          : 'var(--dsw-alias-bg-module, #1f1f1f)'
  return {
    flex: '0 0 auto',
    padding: '2px 8px',
    borderRadius: 99,
    background: fill,
    color: tone,
    fontSize: 12,
    lineHeight: '16px',
  }
}

function sectionTitle(label: string, tone?: 'danger' | 'warn'): ReactNode {
  const color = tone === 'danger' ? DANGER : tone === 'warn' ? WARN : MUTED
  return h('h3', {
    style: { margin: 0, fontSize: 12, fontWeight: 510, color, lineHeight: '16px' },
  }, label)
}

function section(label: string, body: ReactNode, tone?: 'danger' | 'warn'): ReactNode {
  return h('section', {
    style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, marginBottom: 16 },
  },
    sectionTitle(label, tone),
    h('div', {
      style: {
        ...wrap,
        fontSize: 13,
        lineHeight: '20px',
        color: SECONDARY,
        whiteSpace: 'pre-wrap',
      },
    }, body),
  )
}

function CollapsibleTask({
  text,
  t,
}: {
  text: string
  t: (key: string, params?: Record<string, unknown>) => string
}): ReactNode {
  const [open, setOpen] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const measure = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const el = measure.current
    if (el === null) return
    const check = () => { setOverflow(el.scrollHeight > TASK_COLLAPSE_H + 4) }
    check()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => { observer.disconnect() }
  }, [text])
  return h('section', {
    'data-magic-ceo-task': true,
    style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, marginBottom: 16 },
  },
    sectionTitle(t('field.task')),
    h('div', { style: { position: 'relative', minWidth: 0 } },
      h('div', {
        style: open || overflow === false
          ? undefined
          : { maxHeight: TASK_COLLAPSE_H, overflow: 'hidden' },
      },
        h('div', {
          ref: measure,
          style: {
            ...wrap,
            fontSize: 13,
            lineHeight: '20px',
            color: PRIMARY,
            whiteSpace: 'pre-wrap',
          },
        }, text),
      ),
      overflow && open === false
        ? h('div', {
          'aria-hidden': true,
          style: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 32,
            background: 'linear-gradient(to top, var(--dsw-alias-bg-base, #111), transparent)',
            pointerEvents: 'none',
          },
        })
        : null,
    ),
    overflow
      ? h('button', {
        type: 'button',
        onClick: () => { setOpen(current => !current) },
        style: {
          alignSelf: 'flex-start',
          padding: 0,
          border: 0,
          background: 'transparent',
          color: MUTED,
          cursor: 'pointer',
          fontSize: 12,
        },
      }, t(open ? 'task.collapse' : 'task.expand'))
      : null,
  )
}

function DebriefCard({
  summary,
  details,
  t,
}: {
  summary: string
  details: Array<{ label: string; body: string; tone?: 'danger' | 'warn' }>
  t: CeoMemberInspectorProps['t']
}): ReactNode {
  const [open, setOpen] = useState(false)
  const hasDetails = details.length > 0
  return h('section', {
    'data-magic-ceo-debrief': true,
    style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, marginBottom: 16 },
  },
    sectionTitle(t('debrief.title')),
    h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        borderRadius: 10,
        background: 'var(--dsw-alias-bg-module, #1f1f1f)',
      },
    },
      hasDetails
        ? h('button', {
          type: 'button',
          onClick: () => { setOpen(current => !current) },
          style: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            width: '100%',
            padding: 0,
            border: 0,
            background: 'transparent',
            color: PRIMARY,
            cursor: 'pointer',
            textAlign: 'left',
          },
        },
          h('span', {
            'aria-hidden': true,
            style: { flex: '0 0 auto', marginTop: 2, color: MUTED, fontSize: 12 },
          }, open ? '∨' : '>'),
          h('span', {
            style: {
              ...wrap,
              flex: 1,
              minWidth: 0,
              fontSize: 13,
              lineHeight: '20px',
              display: open ? 'block' : '-webkit-box',
              overflow: open ? undefined : 'hidden',
              WebkitLineClamp: open ? undefined : 2,
              WebkitBoxOrient: open ? undefined : 'vertical',
            },
          }, summary || t('debrief.expand')),
        )
        : h('div', {
          style: { ...wrap, fontSize: 13, lineHeight: '20px', color: PRIMARY, whiteSpace: 'pre-wrap' },
        }, summary),
      open
        ? details.map(item => h('div', {
          key: item.label,
          style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
        },
          h('div', {
            style: {
              fontSize: 12,
              fontWeight: 510,
              color: item.tone === 'danger' ? DANGER : item.tone === 'warn' ? WARN : MUTED,
            },
          }, item.label),
          h('div', {
            style: { ...wrap, fontSize: 13, lineHeight: '20px', color: PRIMARY, whiteSpace: 'pre-wrap' },
          }, item.body),
        ))
        : null,
    ),
  )
}

export function CeoMemberInspector({ member, sendDecision, t }: CeoMemberInspectorProps) {
  const process = member.process ?? []
  const report = presentCeoMemberReport(member)
  const presentation = presentCeoMember({ ...member, report })
  const live = member.status === 'running'
  const reportSource = member.lastMessage ?? reportTextFromProcess(process)
  const filled = REPORT_FIELDS.filter(field => {
    const value = report?.[field.key]
    return typeof value === 'string' && value.trim() !== ''
  })
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | undefined>(undefined)
  const canSend = sendDecision !== undefined && draft.trim() !== '' && !sending
  const summary = debriefSummaryOf(report, reportSource)
  const debriefDetails = filled
    .filter(field => field.key !== 'done')
    .filter(field => field.key !== 'userDecisions' || !presentation.needsDecision)
    .filter(field => field.key !== 'risksOrBlockers' || !presentation.hasBlocker)
    .map(field => ({
      label: t(field.label),
      body: report?.[field.key] ?? '',
      tone: field.key === 'risksOrBlockers'
        ? 'danger' as const
        : field.key === 'userDecisions'
          ? 'warn' as const
          : undefined,
    }))
  const showDebrief = summary !== '' || debriefDetails.length > 0
  const showEmpty = filled.length === 0 && !member.lastMessage && process.length === 0 && !live

  const submitDecision = () => {
    if (sendDecision === undefined || sending) return
    const answer = draft.trim()
    if (answer === '') return
    setSending(true)
    setSendError(undefined)
    void sendDecision(formatCeoDecisionMessage(member, answer)).then((result) => {
      setSending(false)
      if (!result.ok) {
        setSendError(result.error ?? t('decision.error'))
        return
      }
      recordCeoUserDecision(member.callId, answer)
      setDraft('')
    }, (error: unknown) => {
      setSending(false)
      setSendError(error instanceof Error ? error.message : t('decision.error'))
    })
  }

  return h('aside', {
    'data-magic-ceo-inspector': member.callId,
    'data-status': presentation.viewStatus,
    style: {
      boxSizing: 'border-box',
      width: '100%',
      minWidth: 0,
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    },
  },
  h('header', {
    style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, marginBottom: 16 },
  },
    h('span', {
      style: {
        ...wrap,
        flex: 1,
        overflow: 'hidden',
        fontSize: 14,
        fontWeight: 500,
        lineHeight: '20px',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: PRIMARY,
      },
    }, member.role),
    h('span', {
      style: badgeStyle(presentation.viewStatus),
    }, t(`status.${presentation.viewStatus}`)),
  ),
  live
    ? h('div', {
      style: {
        marginBottom: 16,
        padding: '10px 12px',
        borderRadius: 12,
        border: '0.5px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 20%, transparent)',
        background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 5%, transparent)',
        fontSize: 13,
        lineHeight: '20px',
        color: PRIMARY,
      },
    }, t('inspector.live'))
    : null,
  h(CollapsibleTask, { text: member.task, t }),
  member.dependsOn.length > 0
    ? section(t('depends.on'), member.dependsOn.join(', '))
    : null,
  process.length > 0 || live
    ? h('div', { style: { marginBottom: 16 } },
      h(CeoProcessTimeline, {
        steps: process,
        live,
        hideReportContent: true,
        t,
      }),
    )
    : null,
  showEmpty
    ? h('div', {
      style: { marginBottom: 16, fontSize: 12, color: MUTED },
    }, t(
      member.status === 'queued' ? 'inspector.queued' : 'inspector.noReport',
    ))
    : null,
  presentation.needsDecision
    ? section(t('badge.decision'), report?.userDecisions ?? '', 'warn')
    : null,
  presentation.hasBlocker && report?.risksOrBlockers
    ? section(t('badge.blocker'), report.risksOrBlockers, 'danger')
    : null,
  showDebrief
    ? h(DebriefCard, {
      summary: summary || t('field.conclusion'),
      details: debriefDetails,
      t,
    })
    : null,
  presentation.needsDecision && sendDecision !== undefined
    ? h('form', {
      'data-magic-ceo-decision': member.callId,
      onSubmit: (event: { preventDefault: () => void }) => {
        event.preventDefault()
        submitDecision()
      },
      style: { display: 'flex', flexDirection: 'column', gap: 8 },
    },
      h('label', {
        style: { fontSize: 12, fontWeight: 510, color: WARN },
      }, t('decision.label')),
      h('textarea', {
        value: draft,
        rows: 3,
        placeholder: t('decision.placeholder'),
        onChange: (event: { target: { value: string } }) => { setDraft(event.target.value) },
        style: {
          width: '100%',
          resize: 'vertical',
          boxSizing: 'border-box',
          padding: '8px 10px',
          borderRadius: 8,
          border: '0.5px solid var(--dsw-alias-border-l2, #2a2a2a)',
          background: 'var(--dsw-alias-bg-module-platform, #161616)',
          color: PRIMARY,
          fontSize: 13,
          lineHeight: '20px',
        },
      }),
      sendError !== undefined
        ? h('div', {
          style: { fontSize: 12, color: DANGER },
        }, sendError)
        : null,
      h('button', {
        type: 'submit',
        disabled: !canSend,
        style: {
          alignSelf: 'flex-start',
          padding: '4px 10px',
          borderRadius: 6,
          border: 0,
          background: WARN,
          color: canSend ? '#111' : MUTED,
          cursor: canSend ? 'pointer' : 'default',
          fontSize: 12,
          opacity: canSend ? 1 : 0.6,
        },
      }, sending ? t('decision.sending') : t('decision.send')),
    )
    : member.answeredDecision
      ? section(t('decision.sent'), member.answeredDecision)
      : null,
  )
}
