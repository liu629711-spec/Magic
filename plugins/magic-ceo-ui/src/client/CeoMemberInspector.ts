import { createElement as h, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  debriefSummaryOf,
  displayCeoSeat,
  formatTokenCount,
  hasUserDecision,
  presentCeoMember,
  presentCeoMemberReport,
  reportTextFromProcess,
  type CeoMemberReport,
  type CeoMemberViewStatus,
  type CeoTeamMember,
} from '../team.ts'
import { CeoProcessTimeline } from './CeoProcessTimeline.ts'
import { ink, line, surface, wrap } from './theme.ts'

const TASK_COLLAPSE_H = 144
const FIELD_COLLAPSE_H = 168
const MUTED = ink.tertiary
const PRIMARY = ink.primary
const SECONDARY = ink.secondary
const DANGER = ink.danger
const WARN = ink.warn
const SUCCESS = ink.success
const ACCENT = ink.accent

export interface CeoMemberInspectorProps {
  member: CeoTeamMember
  roster?: readonly CeoTeamMember[]
  t: (key: string, params?: Record<string, unknown>) => string
  /** Per-member intervention: ask the CEO to halt / redirect / resume this node. */
  onIntervene?: (action: 'halt' | 'redirect' | 'resume', note: string) => void
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
        : status === 'partial' || status === 'unverified'
          ? WARN
          : MUTED
  const fill = status === 'running'
    ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #7aa2ff) 16%, transparent)'
    : status === 'completed' || status === 'delegated'
      ? 'color-mix(in srgb, var(--dsw-alias-state-success, #4ade80) 16%, transparent)'
      : status === 'failed' || status === 'error' || status === 'blocked'
        ? 'color-mix(in srgb, var(--dsw-alias-state-danger, #f87171) 16%, transparent)'
        : status === 'partial' || status === 'unverified'
          ? 'color-mix(in srgb, var(--dsw-alias-state-warning, #fbbf24) 16%, transparent)'
          : surface.layer2
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
            background: `linear-gradient(to top, ${surface.base}, transparent)`,
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

function CollapsibleField({
  label,
  body,
  tone,
  t,
}: {
  label: string
  body: string
  tone?: 'danger' | 'warn'
  t: CeoMemberInspectorProps['t']
}): ReactNode {
  const [open, setOpen] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const measure = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const el = measure.current
    if (el === null) return
    const check = () => { setOverflow(el.scrollHeight > FIELD_COLLAPSE_H + 4) }
    check()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => { observer.disconnect() }
  }, [body])
  return h('div', {
    style: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  },
    h('div', {
      style: {
        fontSize: 12,
        fontWeight: 510,
        color: tone === 'danger' ? DANGER : tone === 'warn' ? WARN : MUTED,
      },
    }, label),
    h('div', { style: { position: 'relative', minWidth: 0 } },
      h('div', {
        style: open || overflow === false
          ? undefined
          : { maxHeight: FIELD_COLLAPSE_H, overflow: 'hidden' },
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
        }, body),
      ),
      overflow && open === false
        ? h('div', {
          'aria-hidden': true,
          style: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 28,
            background: `linear-gradient(to top, ${surface.layer2}, transparent)`,
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
    style: { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, marginBottom: 16 },
  },
    sectionTitle(t('debrief.title')),
    h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 12,
        border: `0.5px solid ${line.subtle}`,
        background: surface.layer2,
      },
    },
      h('div', {
        style: {
          ...wrap,
          fontSize: 14,
          lineHeight: '22px',
          fontWeight: 510,
          color: PRIMARY,
          whiteSpace: 'pre-wrap',
        },
      }, summary),
      hasDetails && open
        ? details.map(item => h(CollapsibleField, {
          key: item.label,
          label: item.label,
          body: item.body,
          tone: item.tone,
          t,
        }))
        : null,
      hasDetails
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
        }, t(open ? 'debrief.collapse' : 'debrief.expand'))
        : null,
    ),
  )
}

/** AgentCore RunInterveneControls: 只停这个人 / 只改这个人的方向. Both actions
 *  compose a ceo_replan instruction that the parent session sends to the CEO. */
function InterveneControls({
  member,
  send,
  t,
}: {
  member: CeoTeamMember
  send: (message: string) => void
  t: CeoMemberInspectorProps['t']
}): ReactNode {
  const running = member.status === 'running'
  const [note, setNote] = useState('')
  const draft = note.trim()
  const runId = member.runId ?? member.rawId ?? member.callId
  const button = (label: string, message: string, tone: 'danger' | 'accent', disabled: boolean): ReactNode =>
    h('button', {
      type: 'button',
      disabled,
      onClick: () => { send(message) },
      style: {
        flex: '1 1 0',
        padding: '5px 8px',
        borderRadius: 8,
        border: 0,
        background: tone === 'danger'
          ? 'color-mix(in srgb, var(--dsw-alias-state-danger, #dc2626) 10%, transparent)'
          : 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 12%, transparent)',
        color: tone === 'danger'
          ? 'var(--dsw-alias-state-danger, #dc2626)'
          : 'var(--dsw-alias-state-business-primary, #3b82f6)',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 12,
        fontWeight: 510,
      },
    }, label)
  return h('div', {
    'data-magic-ceo-intervene': member.callId,
    style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  },
    h('div', { style: { fontSize: 12, fontWeight: 510, color: MUTED } }, t('intervene.title')),
    h('div', { style: { display: 'flex', gap: 6 } },
      running
        ? button(t('intervene.halt'), haltMessageFor(runId), 'danger', false)
        : null,
      !running && member.report?.status === 'unknown_after_restart'
        ? button(t('intervene.resume'), resumeMessageFor(runId), 'accent', false)
        : null,
    ),
    running
      ? h('textarea', {
        value: note,
        rows: 2,
        placeholder: t('intervene.placeholder'),
        onChange: (event: { target: { value: string } }) => { setNote(event.target.value) },
        style: {
          width: '100%',
          resize: 'vertical',
          boxSizing: 'border-box',
          padding: '6px 10px',
          borderRadius: 8,
          border: `0.5px solid ${line.subtle}`,
          background: surface.layer3,
          color: PRIMARY,
          fontSize: 12,
          lineHeight: '18px',
        },
      })
      : null,
    running && draft !== ''
      ? h('button', {
        type: 'button',
        onClick: () => {
          send(`Call ceo_replan with redirect run_id ${runId} and note: ${draft}`)
          setNote('')
        },
        style: {
          alignSelf: 'flex-start',
          padding: '5px 10px',
          borderRadius: 8,
          border: 0,
          background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #3b82f6) 14%, transparent)',
          color: 'var(--dsw-alias-state-business-primary, #3b82f6)',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 510,
        },
      }, t('intervene.redirect'))
      : null,
  )
}

function haltMessageFor(runId: string): string {
  return `Call ceo_replan with halt run_id ${runId}. The member was stopped by the user; do not rewrite its work as success.`
}

function resumeMessageFor(runId: string): string {
  return `Call ceo_replan with resume run_id ${runId}. Redispatch this unknown_after_restart node from scratch.`
}

export function CeoMemberInspector({ member, roster = [], onIntervene, t }: CeoMemberInspectorProps) {
  const process = member.process ?? []
  const report = presentCeoMemberReport(member)
  const presentation = presentCeoMember({ ...member, report })
  const live = member.status === 'running' && presentation.viewStatus === 'running'
  const reportSource = member.lastMessage ?? reportTextFromProcess(process)
  const filled = REPORT_FIELDS.filter(field => {
    const value = report?.[field.key]
    if (typeof value !== 'string' || value.trim() === '') return false
    if (field.key === 'userDecisions') return hasUserDecision(value)
    return true
  })
  const summary = debriefSummaryOf(report, reportSource)
  const debriefDetails = filled
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
    }, displayCeoSeat(member, roster)),
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
  member.usage !== undefined
    ? h('div', {
      'data-magic-ceo-usage': true,
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16,
        fontVariantNumeric: 'tabular-nums',
        fontSize: 12,
        color: MUTED,
      },
    },
      h('span', {
        style: {
          padding: '2px 8px',
          borderRadius: 99,
          background: surface.layer2,
        },
      }, t('tokens.badge', {
        tokens: formatTokenCount(
          member.usage.totalTokens ?? member.usage.inputTokens + member.usage.outputTokens,
        ),
      })),
      h('span', null, t('tokens.input', { tokens: formatTokenCount(member.usage.inputTokens) })),
      h('span', null, t('tokens.output', { tokens: formatTokenCount(member.usage.outputTokens) })),
      member.usage.cacheReadTokens !== undefined
        ? h('span', null, t('tokens.cache', { tokens: formatTokenCount(member.usage.cacheReadTokens) }))
        : null,
    )
    : null,
  member.contextChannels !== undefined && member.contextChannels.length > 0
    ? section(
      t('context.title'),
      member.contextChannels.map(channel =>
        `${channel.channel}: ${String(channel.chars)}${channel.truncated ? '（已截断）' : ''}`,
      ).join('\n'),
    )
    : null,
  member.redirectedNote !== undefined
    ? section(t('intervene.redirected'), member.redirectedNote, 'warn')
    : null,
  onIntervene !== undefined && (member.status === 'running' || presentation.viewStatus === 'unknown_after_restart')
    ? h(InterveneControls, {
      member,
      send: (message: string) => { onIntervene('halt', message) },
      t,
    })
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
  presentation.viewStatus === 'unknown_after_restart'
    ? h('div', {
      style: { marginBottom: 16, fontSize: 12, color: MUTED },
    }, t('inspector.unknown'))
    : showEmpty
    ? h('div', {
      style: { marginBottom: 16, fontSize: 12, color: MUTED },
    }, t(
      member.status === 'queued' ? 'inspector.queued' : 'inspector.noReport',
    ))
    : null,
  presentation.needsDecision
    ? h('div', {
      style: {
        marginBottom: 16,
        padding: '10px 12px',
        borderRadius: 12,
        border: `0.5px solid ${WARN}`,
        background: 'color-mix(in srgb, var(--dsw-alias-state-warning, #d97706) 8%, transparent)',
        fontSize: 13,
        lineHeight: '20px',
        color: WARN,
      },
    }, t('inspector.decisionInChat'))
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
  member.answeredDecision
    ? section(t('decision.sent'), member.answeredDecision)
    : null,
  )
}

export type { CeoMemberInspectorProps }
