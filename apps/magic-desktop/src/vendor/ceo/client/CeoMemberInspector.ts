// 搬自 plugins/magic-ceo-ui/src/client/CeoMemberInspector.ts（2026-09-18 CEO 委派图卡右坞成员详情接入）。
// 原样保留：单个成员详情（状态徽标 / 失败卡 / 干预控件 / 任务 / 上下文 / 过程 / 产出文件 / 关系 / 资源）。
// import 路径同源本地化：../team.ts、../failure-card.ts、../produced-files.ts、./CeoProcessTimeline.ts、
// ./FailureCard.ts、./elapsed.ts、./theme.ts。文案 t 由调用方注入（右坞用 ./dict.ts 的 ceoT）。

import { createElement as h, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  debriefSummaryOf,
  displayCeoSeat,
  formatTokenCount,
  hasUserDecision,
  presentCeoMember,
  presentCeoMemberReport,
  reportTextFromProcess,
  type CeoActivityPhase,
  type CeoContextChannelView,
  type CeoMemberReport,
  type CeoMemberViewStatus,
  type CeoTeamMember,
  type CeoTokenUsageView,
} from '../team.ts'
import { CeoProcessTimeline } from './CeoProcessTimeline.ts'
import { MemberFailureCard } from './FailureCard.ts'
import { failureCardOf, type CeoFailureCard } from '../failure-card.ts'
import { formatElapsed, useElapsedSeconds } from './elapsed.ts'
import { producedFileName, producedFilesFromProcess } from '../produced-files.ts'
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
  /** Per-member intervention: ask the CEO to halt / redirect / resume / retry / replan this node. */
  onIntervene?: (action: 'halt' | 'redirect' | 'resume' | 'retry' | 'replan', note: string) => void
  /** 退回团队总览。tab 条已经有成员名，正文不再重复画头像和名字。 */
  onBack?: () => void
  /** 点关系里的上游/后续成员，切到那个人的详情。 */
  onSelectMember?: (member: CeoTeamMember) => void
  /** 打开这个人成功改过的文件（侧栏编辑器）。 */
  onOpenFile?: (path: string) => void
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

const CONTEXT_CHANNEL_LABEL: Record<string, string> = {
  task: '你的任务',
  team_brief: '团队共识',
  steer: '中途指示',
  request: '原始请求',
  workspace: '工作区',
  deliverable: '交付物规格',
}

function contextChannelLabel(channel: string): string {
  if (CONTEXT_CHANNEL_LABEL[channel] !== undefined) return CONTEXT_CHANNEL_LABEL[channel]
  if (channel.startsWith('dependency:')) {
    const role = channel.slice('dependency:'.length).trim()
    return role === '' ? '前置结果' : `前置结果 · ${role}`
  }
  return channel
}

function formatChars(chars: number): string {
  if (chars >= 10000) return `${(chars / 1000).toFixed(1)}k 字`
  return `${String(chars)} 字`
}

function activityLabel(
  activity: { phase: CeoActivityPhase; toolName?: string } | undefined,
  t: CeoMemberInspectorProps['t'],
): string | undefined {
  if (activity === undefined) return undefined
  if (activity.phase === 'thinking') return t('activity.thinking')
  if (activity.phase === 'waiting') return t('activity.waiting')
  if (activity.phase === 'winding_down') return t('activity.winding')
  if (activity.toolName !== undefined && activity.toolName.trim() !== '') return activity.toolName
  return t('activity.tool')
}

function metricRow(label: string, value: string): ReactNode {
  return h('div', {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
  },
    h('span', { style: { flex: 'none', fontSize: 12, color: MUTED } }, label),
    h('span', {
      style: {
        ...wrap,
        textAlign: 'right',
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        color: PRIMARY,
      },
    }, value),
  )
}

function RelationRow({
  member,
  roster,
  onSelect,
}: {
  member: CeoTeamMember
  roster: readonly CeoTeamMember[]
  onSelect?: (member: CeoTeamMember) => void
}): ReactNode {
  const title = displayCeoSeat(member, roster)
  const preview = member.task.trim()
  const clickable = onSelect !== undefined
  return h(clickable ? 'button' : 'div', {
    type: clickable ? 'button' : undefined,
    onClick: clickable ? () => { onSelect(member) } : undefined,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      padding: 0,
      border: 0,
      background: 'transparent',
      color: PRIMARY,
      textAlign: 'left',
      cursor: clickable ? 'pointer' : 'default',
    },
  },
    h('span', {
      style: {
        ...wrap,
        flex: '1 1 0',
        minWidth: 0,
        overflow: 'hidden',
        fontSize: 13,
        lineHeight: '18px',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
    }, title),
    preview === ''
      ? null
      : h('span', {
        style: {
          ...wrap,
          flex: '1 1 0',
          minWidth: 0,
          overflow: 'hidden',
          fontSize: 12,
          lineHeight: '18px',
          color: MUTED,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, preview),
  )
}

function RelationSection({
  title,
  members,
  roster,
  onSelect,
}: {
  title: string
  members: readonly CeoTeamMember[]
  roster: readonly CeoTeamMember[]
  onSelect?: (member: CeoTeamMember) => void
}): ReactNode {
  if (members.length === 0) return null
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
    h('div', { style: { fontSize: 12, color: MUTED } }, title),
    ...members.map(item => h(RelationRow, {
      key: item.callId,
      member: item,
      roster,
      onSelect,
    })),
  )
}

function ResourceSection({
  usage,
  t,
}: {
  usage: CeoTokenUsageView
  t: CeoMemberInspectorProps['t']
}): ReactNode {
  const [open, setOpen] = useState(true)
  const total = usage.totalTokens ?? usage.inputTokens + usage.outputTokens
  return h('section', {
    'data-magic-ceo-usage': true,
    style: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, marginBottom: 16 },
  },
    h('button', {
      type: 'button',
      onClick: () => { setOpen(current => !current) },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        padding: 0,
        border: 0,
        background: 'transparent',
        color: MUTED,
        cursor: 'pointer',
        textAlign: 'left',
      },
    },
      h('span', { style: { fontSize: 12, fontWeight: 510 } }, t('tokens.title')),
      h('span', {
        style: {
          marginLeft: 'auto',
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
        },
      }, t('tokens.badge', { tokens: formatTokenCount(total) })),
    ),
    open
      ? h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 12,
          borderRadius: 10,
          background: surface.layer2,
        },
      },
        metricRow(t('tokens.inputLabel'), formatTokenCount(usage.inputTokens)),
        metricRow(t('tokens.outputLabel'), formatTokenCount(usage.outputTokens)),
        usage.reasoningTokens === undefined
          ? null
          : metricRow(t('tokens.reasoning'), formatTokenCount(usage.reasoningTokens)),
        usage.cacheReadTokens === undefined
          ? null
          : metricRow(t('tokens.cacheLabel'), formatTokenCount(usage.cacheReadTokens)),
      )
      : null,
  )
}

function ContextSection({
  channels,
  t,
}: {
  channels: readonly CeoContextChannelView[]
  t: CeoMemberInspectorProps['t']
}): ReactNode {
  const [open, setOpen] = useState(false)
  return h('section', {
    'data-magic-ceo-context': true,
    style: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, marginBottom: 16 },
  },
    h('button', {
      type: 'button',
      onClick: () => { setOpen(current => !current) },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        width: '100%',
        padding: 0,
        border: 0,
        background: 'transparent',
        color: MUTED,
        cursor: 'pointer',
        textAlign: 'left',
      },
    },
      h('span', { style: { fontSize: 12, fontWeight: 510 } }, t('context.title')),
      h('span', {
        style: {
          marginLeft: 'auto',
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
        },
      }, t('context.segments', { count: channels.length })),
    ),
    open
      ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
        ...channels.map((channel, index) => h('div', {
          key: `${channel.channel}-${String(index)}`,
          style: {
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 10px',
            borderRadius: 10,
            background: surface.layer2,
          },
        },
          h('span', {
            style: { ...wrap, fontSize: 13, lineHeight: '18px', color: PRIMARY },
          }, contextChannelLabel(channel.channel)),
          h('span', {
            style: {
              flex: 'none',
              fontSize: 12,
              fontVariantNumeric: 'tabular-nums',
              color: MUTED,
            },
          }, `${formatChars(channel.chars)}${channel.truncated ? t('context.truncated') : ''}`),
        )),
      )
      : null,
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

/** 重规划动作带给 CEO 的失败上下文（节选，全文在过程流里）。 */
function replanNoteFor(card: CeoFailureCard): string {
  const tool = card.toolName !== undefined ? ` at tool ${card.toolName}` : ''
  const error = card.errorText !== undefined && card.errorText !== ''
    ? `: ${card.errorText.slice(0, 200)}`
    : ''
  return `The member failed${tool}${error}. Evaluate replanning instead of retrying.`
}

function resumeMessageFor(runId: string): string {
  return `Call ceo_replan with resume run_id ${runId}. Redispatch this unknown_after_restart node from scratch.`
}

/** 「Ns」叶子组件：每秒自转，不牵动整个成员详情重渲染。 */
function LiveElapsedBadge({ t: _t }: { t: (key: string, params?: Record<string, unknown>) => string }): ReactNode {
  const elapsed = useElapsedSeconds(true)
  return h('span', {
    'data-magic-ceo-elapsed': true,
    style: { flex: 'none', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: MUTED },
  }, formatElapsed(elapsed))
}

const PRODUCED_SHOWN_LIMIT = 6

function ProducedFilesSection({
  paths,
  onOpenFile,
  t,
}: {
  paths: readonly string[]
  onOpenFile?: (path: string) => void
  t: CeoMemberInspectorProps['t']
}): ReactNode {
  if (paths.length === 0) return null
  const shown = paths.slice(0, PRODUCED_SHOWN_LIMIT)
  const hidden = paths.length - shown.length
  return h('section', {
    'data-magic-ceo-produced': true,
    style: { display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, marginBottom: 16 },
  },
    h('div', {
      style: { display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 },
    },
      sectionTitle(t('produced.label')),
      h('span', {
        style: { fontSize: 12, color: MUTED, fontVariantNumeric: 'tabular-nums' },
      }, t('produced.count', { count: String(paths.length) })),
    ),
    h('div', {
      'data-produced-files-row': true,
      style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, minWidth: 0 },
    },
      ...shown.map(path => h('button', {
        key: path,
        type: 'button',
        title: path,
        'aria-label': t('produced.open', { name: path }),
        disabled: onOpenFile === undefined,
        onClick: onOpenFile === undefined ? undefined : () => { onOpenFile(path) },
        style: {
          boxSizing: 'border-box',
          display: 'inline-flex',
          alignItems: 'center',
          maxWidth: '100%',
          margin: 0,
          padding: 0,
          border: 0,
          borderRadius: 4,
          background: 'transparent',
          color: 'var(--dsw-alias-link, #7aa2ff)',
          cursor: onOpenFile === undefined ? 'default' : 'pointer',
          fontSize: 13,
          fontWeight: 500,
          lineHeight: '22px',
          textAlign: 'left',
        },
      },
        h('span', {
          style: {
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }, producedFileName(path)),
      )),
      hidden > 0
        ? h('span', {
          style: { flex: 'none', fontSize: 12, color: MUTED, whiteSpace: 'nowrap' },
        }, t(hidden === 1 ? 'produced.moreOne' : 'produced.more', { count: String(hidden) }))
        : null,
    ),
  )
}

export function CeoMemberInspector({ member, roster = [], onIntervene, onBack, onSelectMember, onOpenFile, t }: CeoMemberInspectorProps) {
  const process = member.process ?? []
  const report = presentCeoMemberReport(member)
  const presentation = presentCeoMember({ ...member, report })
  const live = member.status === 'running' && presentation.viewStatus === 'running'
  const reportSource = member.lastMessage ?? reportTextFromProcess(process)
  const failureCard = failureCardOf(member, roster)
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
  const livePhase = live ? activityLabel(member.activity, t) : undefined
  const upstream = roster.filter(item =>
    member.dependsOn.includes(item.callId)
    || (item.runId !== undefined && member.dependsOn.includes(item.runId))
    || (item.rawId !== undefined && member.dependsOn.includes(item.rawId))
    || (item.memberId !== undefined && member.dependsOn.includes(item.memberId))
    || member.dependsOn.includes(item.role),
  )
  const downstream = roster.filter(item =>
    item.callId !== member.callId
    && (
      item.dependsOn.includes(member.callId)
      || (member.runId !== undefined && item.dependsOn.includes(member.runId))
      || (member.rawId !== undefined && item.dependsOn.includes(member.rawId))
      || (member.memberId !== undefined && item.dependsOn.includes(member.memberId))
    ),
  )
  const unresolvedDepends = member.dependsOn.filter(dep =>
    upstream.some(item =>
      item.callId === dep
      || item.runId === dep
      || item.rawId === dep
      || item.memberId === dep
      || item.role === dep,
    ) === false,
  )
  const showRelations = upstream.length > 0 || downstream.length > 0 || unresolvedDepends.length > 0

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
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      marginBottom: 12,
    },
  },
    h('span', {
      style: badgeStyle(presentation.viewStatus),
    }, livePhase ?? t(`status.${presentation.viewStatus}`)),
    live ? h(LiveElapsedBadge, { t }) : null,
    member.halted === true
      ? h('span', { style: badgeStyle('unverified') }, t('halted.badge'))
      : null,
    onBack === undefined
      ? null
      : h('button', {
        type: 'button',
        'aria-label': t('inspector.close'),
        onClick: onBack,
        style: {
          marginLeft: 'auto',
          width: 28,
          height: 28,
          border: 0,
          borderRadius: 99,
          background: 'transparent',
          color: MUTED,
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: '28px',
        },
      }, '×'),
  ),
  failureCard !== undefined
    ? h(MemberFailureCard, {
      card: failureCard,
      onRetry: onIntervene === undefined || failureCard.runId === undefined
        ? undefined
        : () => { onIntervene('retry', '') },
      onReplan: onIntervene === undefined || failureCard.runId === undefined
        ? undefined
        : () => { onIntervene('replan', replanNoteFor(failureCard)) },
      t,
    })
    : null,
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
  member.halted === true
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
    }, t('halted.hint'))
    : null,
  onIntervene !== undefined && (member.status === 'running' || presentation.viewStatus === 'unknown_after_restart')
    ? h(InterveneControls, {
      member,
      send: (message: string) => { onIntervene('halt', message) },
      t,
    })
    : null,
  h(CollapsibleTask, { text: member.task, t }),
  member.contextChannels !== undefined && member.contextChannels.length > 0
    ? h(ContextSection, { channels: member.contextChannels, t })
    : null,
  member.redirectedNote !== undefined
    ? section(t('intervene.redirected'), member.redirectedNote, 'warn')
    : null,
  process.length > 0 || live
    ? h('div', { style: { marginBottom: 16 } },
      h(CeoProcessTimeline, {
        steps: process,
        live,
        hideReportContent: true,
        collapseProcessSteps: false,
        t,
      }),
    )
    : null,
  h(ProducedFilesSection, {
    paths: producedFilesFromProcess(process),
    onOpenFile,
    t,
  }),
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
  showRelations
    ? section(
      t('relations.title'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        h(RelationSection, {
          title: t('relations.depends'),
          members: upstream,
          roster,
          onSelect: onSelectMember,
        }),
        unresolvedDepends.length > 0
          ? h('div', {
            style: { ...wrap, fontSize: 12, lineHeight: '18px', color: MUTED },
          }, unresolvedDepends.join(', '))
          : null,
        h(RelationSection, {
          title: t('relations.downstream'),
          members: downstream,
          roster,
          onSelect: onSelectMember,
        }),
      ),
    )
    : null,
  member.usage !== undefined
    ? h(ResourceSection, { usage: member.usage, t })
    : null,
  )
}
