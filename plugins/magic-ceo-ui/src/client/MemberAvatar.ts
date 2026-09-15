import { createElement as h, type ReactNode } from 'react'
import { ink } from './theme.ts'

export function MemberAvatar({
  size = 28,
  color,
}: {
  size?: number
  color?: string
}): ReactNode {
  return h('span', {
    'aria-hidden': true,
    'data-magic-ceo-member-avatar': true,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none',
      width: size,
      height: size,
      color: color ?? ink.secondary,
    },
  },
    h('svg', {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    },
      h('circle', { cx: 12, cy: 12, r: 10 }),
      h('circle', { cx: 12, cy: 8.4, r: 2.7 }),
      h('path', { d: 'M7.7 17.8c.6-2.6 2.3-4 4.3-4s3.7 1.4 4.3 4' }),
      h('path', { d: 'M7.7 17.8v1.6M16.3 17.8v1.6' }),
    ),
  )
}
