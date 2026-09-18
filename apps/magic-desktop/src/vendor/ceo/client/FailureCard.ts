// 搬自 plugins/magic-ceo-ui/src/client/FailureCard.ts（2026-09-18 CEO 委派图卡右坞成员详情接入）。
// import 路径同源（../failure-card.ts）；原样保留。
// 失败/阻塞卡片组件（PRD-04 §12）：成员工作区顶部的结构化呈现。
// 失败卡：失败工具 + 错误摘要 + 未完成 + 「重试 / 交回 CEO 重规划」；
// 阻塞卡：等待的上游成员 + 阻塞说明。视觉沿用右坞设计语言（token 化配色 + 0.5px 边）。

import { createElement as h, type ReactNode } from 'react'
import type { CeoFailureCard } from '../failure-card.ts'

type Translate = (key: string, params?: Record<string, unknown>) => string

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

function fieldRow(label: string, value: ReactNode): ReactNode {
  return h('div', { style: { display: 'flex', gap: 8, minWidth: 0 } },
    h('span', {
      style: { flex: '0 0 auto', fontSize: 11, lineHeight: '18px', color: 'rgba(160,160,175,1)' },
    }, label),
    h('span', { style: { minWidth: 0, flex: 1, fontSize: 12, lineHeight: '18px' } }, value),
  )
}

/** 失败/阻塞卡；kind 决定色调（失败=红，阻塞=琥珀），动作只在失败卡出现。 */
export function MemberFailureCard({
  card,
  onRetry,
  onReplan,
  t,
}: {
  card: CeoFailureCard
  onRetry?: () => void
  onReplan?: () => void
  t: Translate
}): ReactNode {
  const failed = card.kind === 'failed'
  const tone = failed
    ? 'var(--dsw-alias-state-danger, #dc2626)'
    : 'var(--dsw-alias-state-warning, #d97706)'
  const actionButton = (label: string, onClick: (() => void) | undefined, primary: boolean): ReactNode =>
    h('button', {
      type: 'button',
      disabled: onClick === undefined,
      onClick,
      style: {
        flex: '0 0 auto',
        padding: '3px 10px',
        borderRadius: 99,
        border: primary ? 0 : `0.5px solid color-mix(in srgb, ${tone} 45%, transparent)`,
        background: primary
          ? `color-mix(in srgb, ${tone} 16%, transparent)`
          : 'transparent',
        color: tone,
        cursor: onClick === undefined ? 'default' : 'pointer',
        fontSize: 11,
        fontWeight: 510,
        opacity: onClick === undefined ? 0.45 : 1,
      },
    }, label)

  return h('div', {
    'data-magic-ceo-failure-card': card.kind,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      marginBottom: 16,
      padding: '10px 12px',
      borderRadius: 10,
      border: `0.5px solid color-mix(in srgb, ${tone} 32%, transparent)`,
      borderLeft: `3px solid ${tone}`,
      background: `color-mix(in srgb, ${tone} 7%, transparent)`,
    },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
      h('span', {
        'aria-hidden': true,
        style: {
          flex: '0 0 auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: 99,
          background: `color-mix(in srgb, ${tone} 18%, transparent)`,
          color: tone,
          fontSize: 11,
          fontWeight: 700,
        },
      }, '!'),
      h('span', { style: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: 510, color: tone } },
        failed ? t('failure.title') : t('blocked.title')),
      failed
        ? actionButton(t('failure.retry'), onRetry, false)
        : null,
      failed
        ? actionButton(t('failure.replan'), onReplan, true)
        : null,
    ),
    failed && card.toolName !== undefined
      ? fieldRow(t('failure.tool'), card.toolName)
      : null,
    failed && card.errorText !== undefined && card.errorText !== ''
      ? fieldRow(t('failure.error'), h('span', {
        style: {
          display: 'block',
          maxHeight: 88,
          overflowY: 'auto',
          fontFamily: MONO,
          fontSize: 11,
          lineHeight: '16px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          opacity: 0.9,
        },
      }, card.errorText))
      : null,
    failed && card.notDone !== undefined
      ? fieldRow(t('failure.notDone'), card.notDone)
      : null,
    !failed && card.waitingOn.length > 0
      ? fieldRow(t('blocked.waitingFor'),
        h('span', { style: { display: 'flex', flexWrap: 'wrap', gap: 4 } },
          card.waitingOn.map(name => h('span', {
            key: name,
            style: {
              padding: '1px 8px',
              borderRadius: 99,
              border: '0.5px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              fontSize: 11,
              lineHeight: '16px',
            },
          }, name)),
        ))
      : null,
    !failed && card.blockers !== undefined
      ? fieldRow(t('blocked.blockers'), card.blockers)
      : null,
  )
}
