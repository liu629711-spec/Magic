import type { CSSProperties } from 'react'

/** DSH dark surfaces. `--dsw-alias-bg-module` is not a real token. */
export const ink = {
  primary: 'var(--dsw-alias-label-primary, #f3f3f5)',
  secondary: 'var(--dsw-alias-label-secondary, #c8c8d0)',
  tertiary: 'var(--dsw-alias-label-tertiary, #9a9aa8)',
  danger: 'var(--dsw-alias-state-danger, #f87171)',
  warn: 'var(--dsw-alias-state-warning, #fbbf24)',
  success: 'var(--dsw-alias-state-success, #4ade80)',
  accent: 'var(--dsw-alias-state-business-primary, #7aa2ff)',
} as const

export const surface = {
  base: 'var(--dsw-alias-bg-base, #121218)',
  layer1: 'var(--dsw-alias-bg-layer-1, #1c1c24)',
  layer2: 'var(--dsw-alias-bg-layer-2, #24242e)',
  layer3: 'var(--dsw-alias-bg-layer-3, #2c2c38)',
  raised: 'var(--dsw-alias-bg-module-platform, #2c2c38)',
  overlay: 'var(--dsw-alias-bg-overlay, #3a3a48)',
} as const

export const line = {
  subtle: 'var(--dsw-alias-border-l2, #3a3a48)',
  strong: 'var(--dsw-alias-border-l3, #4a4a58)',
} as const

export const wrap: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
}
