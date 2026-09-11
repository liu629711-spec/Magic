import {
  createElement as h,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { ceoAttentionItems, displayCeoSeat, presentCeoMember, type CeoAttentionKind, type CeoTeamMember } from '../team.ts'
import { CeoMemberInspector } from './CeoMemberInspector.ts'
import { ink, line, surface } from './theme.ts'
import {
  getCeoRoster,
  getSelectedCeoMember,
  selectCeoMember,
  subscribeCeoSelection,
} from './selection.ts'

export interface CeoWorkspaceProps {
  sessionId?: string
  closeDetails: () => void
  /** Send a per-member intervention (halt/redirect/resume) into the parent chat. */
  sendIntervention?: (message: string) => void
  t: (key: string, params?: Record<string, unknown>) => string
}

const STICK_DETACH_PX = 80
const STICK_ATTACH_PX = 24

function distanceFromBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight
}

function nextStickState(stuck: boolean, gap: number): boolean {
  if (stuck) return gap < STICK_DETACH_PX
  return gap < STICK_ATTACH_PX
}

function useStickToBottom(resetKey: string, followOnReset: boolean) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const stickRef = useRef(true)
  const followRef = useRef(followOnReset)
  followRef.current = followOnReset
  const [atBottom, setAtBottom] = useState(true)

  const applyStick = (stuck: boolean) => {
    stickRef.current = stuck
    setAtBottom(stuck)
  }

  const scrollToBottom = () => {
    const el = scrollRef.current
    if (el === null) return
    el.scrollTop = el.scrollHeight
  }

  const jumpToBottom = () => {
    applyStick(true)
    scrollToBottom()
  }

  useEffect(() => {
    const el = scrollRef.current
    if (el === null) return
    const onScroll = () => {
      applyStick(nextStickState(stickRef.current, distanceFromBottom(el)))
    }
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0 && stickRef.current) applyStick(false)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
    }
  }, [resetKey])

  useEffect(() => {
    const content = contentRef.current
    const viewport = scrollRef.current
    if (content === null || typeof ResizeObserver === 'undefined') return
    let raf = 0
    const follow = () => {
      raf = 0
      if (stickRef.current) scrollToBottom()
      else setAtBottom(false)
    }
    const observer = new ResizeObserver(() => {
      if (raf !== 0) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(follow)
    })
    observer.observe(content)
    if (viewport !== null) observer.observe(viewport)
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [resetKey])

  useLayoutEffect(() => {
    if (followRef.current) {
      applyStick(true)
      scrollToBottom()
      return
    }
    applyStick(false)
    const el = scrollRef.current
    if (el !== null) el.scrollTop = 0
  }, [resetKey])

  return { scrollRef, contentRef, atBottom, jumpToBottom }
}

function ToBottomButton({
  onClick,
  label,
}: {
  onClick: () => void
  label: string
}): ReactNode {
  return h('button', {
    type: 'button',
    'aria-label': label,
    onClick,
    style: {
      position: 'absolute',
      left: '50%',
      bottom: 12,
      zIndex: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 34,
      height: 34,
      padding: 0,
      border: '0.5px solid var(--dsw-alias-border-l3, #3a3a3a)',
      borderRadius: 99,
      transform: 'translateX(-50%)',
      background: 'var(--dsw-alias-button-floating-fill, #1f1f1f)',
      color: 'var(--dsw-alias-label-primary, #f5f5f5)',
      boxShadow: 'var(--dsw-elevation-panel, 0 8px 24px rgba(0,0,0,.28))',
      cursor: 'pointer',
    } satisfies CSSProperties,
  },
    h('svg', {
      'aria-hidden': true,
      width: 16,
      height: 16,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }, h('path', { d: 'm6 9 6 6 6-6' })),
  )
}

function attentionTone(kind: CeoAttentionKind): string {
  if (kind === 'decision' || kind === 'unverified' || kind === 'unknown_after_restart') {
    return 'var(--dsw-alias-state-warning, #d97706)'
  }
  return 'var(--dsw-alias-state-danger, #dc2626)'
}

function attentionPreview(member: CeoTeamMember, kind: CeoAttentionKind): string {
  if (kind === 'decision') return member.report?.userDecisions ?? member.task
  if (kind === 'blocker') return member.report?.risksOrBlockers ?? member.task
  if (kind === 'unverified' || kind === 'unknown_after_restart') {
    return member.lastMessage ?? member.report?.done ?? member.task
  }
  return member.report?.notDone ?? member.lastMessage ?? member.task
}

function rowButton(
  key: string,
  title: string,
  preview: string,
  meta: string,
  tone: string | undefined,
  onSelect: () => void,
): ReactNode {
  return h('button', {
    key,
    type: 'button',
    onClick: onSelect,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      width: '100%',
      padding: '10px 10px',
      border: tone === undefined
        ? `0.5px solid ${line.subtle}`
        : `0.5px solid ${tone}`,
      borderRadius: 10,
      background: surface.layer2,
      color: ink.primary,
      textAlign: 'left',
      cursor: 'pointer',
    },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      h('strong', { style: { fontSize: 13, fontWeight: 510 } }, title),
      h('span', {
        style: {
          marginLeft: 'auto',
          fontSize: 11,
          color: tone ?? ink.tertiary,
        },
      }, meta),
    ),
    h('div', {
      style: {
        fontSize: 12,
        lineHeight: '18px',
        color: ink.secondary,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      },
    }, preview),
  )
}

function overview(
  roster: readonly CeoTeamMember[],
  t: CeoWorkspaceProps['t'],
): ReactNode {
  const attention = ceoAttentionItems(roster)
  if (roster.length === 0) {
    return h('div', {
      style: { fontSize: 13, lineHeight: '20px', color: ink.tertiary },
    }, t('workspace.empty'))
  }
  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
    attention.length > 0
      ? h('section', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        h('div', {
          style: { fontSize: 12, fontWeight: 510, color: ink.tertiary },
        }, t('attention.title')),
        ...attention.map(item => rowButton(
          `${item.kind}-${item.member.callId}`,
          displayCeoSeat(item.member, roster),
          attentionPreview(item.member, item.kind),
          t(`attention.${item.kind}`),
          attentionTone(item.kind),
          () => { selectCeoMember(item.member) },
        )),
      )
      : null,
    h('section', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      h('div', {
          style: { fontSize: 12, fontWeight: 510, color: ink.tertiary },
      }, t('roster.title')),
      ...roster.map((member) => {
        const presentation = presentCeoMember(member)
        return rowButton(
          member.callId,
          displayCeoSeat(member, roster),
          member.task,
          t(`status.${presentation.viewStatus}`),
          presentation.needsDecision
            ? attentionTone('decision')
            : presentation.hasBlocker || presentation.viewStatus === 'failed' || presentation.viewStatus === 'error'
              ? attentionTone('failed')
              : presentation.viewStatus === 'unverified'
                ? attentionTone('unverified')
                : presentation.viewStatus === 'unknown_after_restart'
                  ? attentionTone('unknown_after_restart')
                  : undefined,
          () => { selectCeoMember(member) },
        )
      }),
    ),
  )
}

export function CeoWorkspace({ sessionId, closeDetails, sendIntervention, t }: CeoWorkspaceProps) {
  const selected = useSyncExternalStore(subscribeCeoSelection, getSelectedCeoMember, getSelectedCeoMember)
  const roster = useSyncExternalStore(subscribeCeoSelection, getCeoRoster, getCeoRoster)
  const close = () => {
    if (selected !== null) {
      selectCeoMember(null)
      return
    }
    closeDetails()
  }
  const inspector = selected === null
    ? null
    : h(CeoMemberInspector, {
      key: selected.callId,
      member: selected,
      roster,
      onIntervene: sendIntervention === undefined
        ? undefined
        : (action: 'halt' | 'redirect' | 'resume', note: string) => {
          const runId = selected.runId ?? selected.rawId ?? selected.callId
          const message = action === 'halt'
            ? `Call ceo_replan with halt run_id ${runId}. The member was stopped by the user; do not rewrite its work as success.`
            : action === 'resume'
              ? `Call ceo_replan with resume run_id ${runId}. Redispatch this unknown_after_restart node from scratch.`
              : note
          sendIntervention(message)
        },
      t,
    })
  const { scrollRef, contentRef, atBottom, jumpToBottom } = useStickToBottom(
    selected?.callId ?? sessionId ?? '',
    selected?.status === 'running',
  )

  return h('div', {
    'data-magic-ceo-workspace': true,
    'data-member': selected?.callId,
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minWidth: 0,
      overflow: 'hidden',
      borderLeft: `0.5px solid ${line.subtle}`,
      background: surface.base,
      color: ink.primary,
    },
  },
  selected === null
    ? h('header', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 16px 12px',
        borderBottom: `0.5px solid ${line.subtle}`,
      },
    },
      h('div', {
        style: {
          overflow: 'hidden',
          fontSize: 14,
          lineHeight: '20px',
          fontWeight: 500,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, t('workspace.title')),
      h('button', {
        type: 'button',
        'aria-label': t('workspace.close'),
        onClick: close,
        style: {
          marginLeft: 'auto',
          width: 28,
          height: 28,
          border: 0,
          borderRadius: 99,
          background: 'transparent',
          color: ink.secondary,
          cursor: 'pointer',
          fontSize: 11,
        },
      }, t('workspace.close')),
    )
    : h('div', {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '8px 12px 0',
      },
    },
      h('button', {
        type: 'button',
        'aria-label': t('workspace.close'),
        onClick: close,
        style: {
          width: 28,
          height: 28,
          border: 0,
          borderRadius: 99,
          background: 'transparent',
          color: ink.tertiary,
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: '28px',
        },
      }, '×'),
    ),
  h('div', {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0,
      minHeight: 0,
    },
  },
    h('div', {
      ref: scrollRef,
      style: {
        height: '100%',
        minWidth: 0,
        padding: selected === null ? 16 : '8px 16px 16px',
        overflowX: 'hidden',
        overflowY: 'auto',
      },
    },
      h('div', { ref: contentRef }, selected === null ? overview(roster, t) : inspector),
    ),
    selected !== null && atBottom === false
      ? h(ToBottomButton, { onClick: jumpToBottom, label: t('workspace.toBottom') })
      : null,
  ),
  )
}
