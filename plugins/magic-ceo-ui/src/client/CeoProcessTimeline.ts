import { createElement as h, useEffect, useRef, useState, type ReactNode } from 'react'
import { looksLikeMemberReport, looksLikeStructuredDump, type CeoProcessStep } from '../team.ts'
import {
  cleanSourceTitle,
  faviconUrl,
  parseFetchPage,
  parseSearchHits,
  searchFailurePeek,
  searchResultCount,
  toolDisplayName,
  toolIconKind,
  toolQueryDetail,
  toolQueryFull,
  type FetchPage,
  type SearchHit,
  type ToolIconKind,
} from '../processView.ts'
import { ink, line, surface, wrap } from './theme.ts'

export interface CeoProcessTimelineProps {
  steps: readonly CeoProcessStep[]
  live: boolean
  hideReportContent?: boolean
  t: (key: string, params?: Record<string, unknown>) => string
}

const MUTED = ink.tertiary
const PRIMARY = ink.primary
const DANGER = ink.danger
const ACCENT = ink.accent

let pulseCssInjected = false

function ensurePulseCss(): void {
  if (pulseCssInjected || typeof document === 'undefined') return
  pulseCssInjected = true
  const style = document.createElement('style')
  style.setAttribute('data-magic-ceo-process', 'true')
  style.textContent = `
@keyframes magic-ceo-pulse { 0%, 100% { opacity: .35 } 50% { opacity: 1 } }
@keyframes magic-ceo-shimmer { 0% { opacity: .4 } 50% { opacity: .85 } 100% { opacity: .4 } }
`
  document.head.appendChild(style)
}

function svgIcon(paths: ReactNode): ReactNode {
  return h('svg', {
    'aria-hidden': true,
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: {
      flex: '0 0 auto',
      marginTop: 3,
      color: MUTED,
    },
  }, paths)
}

function ToolGlyph({ kind }: { kind: ToolIconKind }): ReactNode {
  if (kind === 'search') {
    return svgIcon([
      h('circle', { key: 'c', cx: 11, cy: 11, r: 7 }),
      h('path', { key: 'p', d: 'M21 21l-4.35-4.35' }),
    ])
  }
  if (kind === 'globe') {
    return svgIcon([
      h('circle', { key: 'c', cx: 12, cy: 12, r: 10 }),
      h('path', { key: 'm', d: 'M2 12h20' }),
      h('path', { key: 'e', d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z' }),
    ])
  }
  if (kind === 'file') {
    return svgIcon([
      h('path', { key: 'p', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
      h('path', { key: 'f', d: 'M14 2v6h6' }),
    ])
  }
  if (kind === 'edit') {
    return svgIcon([
      h('path', { key: 'p', d: 'M12 20h9' }),
      h('path', { key: 'e', d: 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z' }),
    ])
  }
  if (kind === 'folder') {
    return svgIcon([
      h('path', { key: 'p', d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
    ])
  }
  if (kind === 'terminal') {
    return svgIcon([
      h('path', { key: 'b', d: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z' }),
      h('path', { key: 'c', d: 'm7 10 3 2-3 2' }),
      h('path', { key: 'l', d: 'M13 14h4' }),
    ])
  }
  if (kind === 'code') {
    return svgIcon([
      h('path', { key: 'l', d: 'm16 18 6-6-6-6' }),
      h('path', { key: 'r', d: 'm8 6-6 6 6 6' }),
    ])
  }
  return svgIcon([
    h('path', { key: 'p', d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' }),
  ])
}

function Chevron({ open }: { open: boolean }): ReactNode {
  return h('svg', {
    'aria-hidden': true,
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { flex: '0 0 auto', color: MUTED },
  }, open
    ? h('path', { d: 'm6 9 6 6 6-6' })
    : h('path', { d: 'm9 6 6 6-6 6' }))
}

function ErrorMark(): ReactNode {
  return h('svg', {
    'aria-hidden': true,
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { flex: '0 0 auto', marginLeft: 4, color: DANGER },
  },
    h('path', { d: 'M18 6L6 18' }),
    h('path', { d: 'M6 6l12 12' }),
  )
}

function ThinkingDots(): ReactNode {
  return h('span', {
    'aria-hidden': true,
    style: { display: 'inline-flex', gap: 4, alignItems: 'center' },
  }, [0, 150, 300].map(delay => h('span', {
    key: String(delay),
    style: {
      width: 6,
      height: 6,
      borderRadius: 99,
      background: 'color-mix(in srgb, var(--dsw-alias-label-tertiary, #9a9a9a) 70%, transparent)',
      animation: 'magic-ceo-pulse 1.2s ease-in-out infinite',
      animationDelay: `${String(delay)}ms`,
    },
  })))
}

function RunningDot(): ReactNode {
  return h('span', {
    'aria-hidden': true,
    style: {
      display: 'inline-block',
      width: 6,
      height: 6,
      marginLeft: 6,
      borderRadius: 99,
      background: ACCENT,
      animation: 'magic-ceo-pulse 1.2s ease-in-out infinite',
      flex: '0 0 auto',
    },
  })
}

function useRunningElapsed(running: boolean): number {
  const started = useRef<number | null>(null)
  const [, force] = useState(0)
  if (running && started.current === null) started.current = Date.now()
  if (!running) started.current = null
  useEffect(() => {
    if (!running) return undefined
    const id = setInterval(() => { force(n => n + 1) }, 1000)
    return () => { clearInterval(id) }
  }, [running])
  if (!running || started.current === null) return 0
  return Math.max(0, Math.floor((Date.now() - started.current) / 1000))
}

function WebSearchSkeleton(): ReactNode {
  return h('div', {
    'aria-hidden': true,
    style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, paddingLeft: 22 },
  }, [0, 1, 2].map(index => h('div', {
    key: String(index),
    style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 8px' },
  },
    h('div', {
      style: {
        width: 16,
        height: 16,
        marginTop: 2,
        borderRadius: 4,
        background: surface.layer2,
        animation: 'magic-ceo-shimmer 1.4s ease-in-out infinite',
        flex: '0 0 auto',
      },
    }),
    h('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 } },
      h('div', {
        style: {
          height: 12,
          width: '50%',
          borderRadius: 4,
          background: surface.layer2,
          animation: 'magic-ceo-shimmer 1.4s ease-in-out infinite',
        },
      }),
      h('div', {
        style: {
          height: 12,
          width: '80%',
          borderRadius: 4,
          background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-2, #24242e) 70%, transparent)',
          animation: 'magic-ceo-shimmer 1.4s ease-in-out infinite',
        },
      }),
    ),
  )))
}

function SearchHitCard({
  hit,
  index,
}: {
  hit: SearchHit
  index: number
}): ReactNode {
  const [hover, setHover] = useState(false)
  const href = hit.url === undefined ? undefined : safeHref(hit.url)
  const title = cleanSourceTitle(hit.title) || hit.site || hit.url || hit.title
  const body = [
    h('span', {
      key: 'n',
      style: {
        flex: '0 0 auto',
        width: 16,
        marginTop: 2,
        fontSize: 12,
        lineHeight: '16px',
        textAlign: 'right',
        color: MUTED,
        fontVariantNumeric: 'tabular-nums',
      },
    }, String(index + 1)),
    h(SiteMark, { key: 'm', site: hit.site, title }),
    h('span', { key: 't', style: { ...wrap, minWidth: 0, flex: 1 } },
      h('span', {
        style: {
          display: 'block',
          overflow: 'hidden',
          fontSize: 12,
          lineHeight: '18px',
          fontWeight: 510,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: PRIMARY,
        },
      }, title),
      hit.snippet !== undefined
        ? h('span', {
          style: {
            ...wrap,
            display: '-webkit-box',
            overflow: 'hidden',
            marginTop: 2,
            fontSize: 12,
            lineHeight: '16px',
            color: MUTED,
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          },
        }, hit.snippet)
        : null,
    ),
  ]
  const style = {
    ...wrap,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 8,
    background: hover ? surface.layer2 : 'transparent',
    color: 'inherit',
    textDecoration: 'none',
  } as const
  if (href === undefined) {
    return h('div', { style }, ...body)
  }
  return h('a', {
    href,
    target: '_blank',
    rel: 'noreferrer',
    onMouseEnter: () => { setHover(true) },
    onMouseLeave: () => { setHover(false) },
    style,
  }, ...body)
}

function safeHref(url: string): string | undefined {
  try {
    const protocol = new URL(url).protocol
    return protocol === 'http:' || protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

function sourceHeader(
  title: string,
  site: string | undefined,
  href: string | undefined,
): ReactNode {
  const inner = [
    h(SiteMark, { key: 'm', site, title }),
    h('span', { key: 't', style: { ...wrap, minWidth: 0, flex: 1 } },
      h('span', {
        style: {
          display: 'block',
          overflow: 'hidden',
          fontSize: 12,
          lineHeight: '18px',
          fontWeight: 510,
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: PRIMARY,
        },
      }, title),
      site !== undefined
        ? h('span', {
          style: {
            display: 'block',
            overflow: 'hidden',
            marginTop: 2,
            fontSize: 12,
            lineHeight: '16px',
            color: MUTED,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }, site)
        : null,
    ),
  ]
  const style = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-2, #24242e) 55%, transparent)',
    color: 'inherit',
    textDecoration: 'none',
    borderBottom: `0.5px solid ${line.subtle}`,
  } as const
  if (href === undefined) return h('div', { style }, ...inner)
  return h('a', { href, target: '_blank', rel: 'noreferrer', style }, ...inner)
}

function FetchPageCard({
  page,
  t,
}: {
  page: FetchPage
  t: CeoProcessTimelineProps['t']
}): ReactNode {
  const title = cleanSourceTitle(page.title) || page.site || page.url
  const href = page.url === '' ? undefined : safeHref(page.url)
  const hits = page.hits ?? []
  const body = page.preview.replace(/\n+$/, '')
  return h('div', {
    'data-magic-ceo-fetch-page': true,
    style: {
      ...wrap,
      overflow: 'hidden',
      marginTop: 4,
      marginLeft: 22,
      border: `0.5px solid ${line.subtle}`,
      borderRadius: 10,
      background: surface.layer2,
    },
  },
    sourceHeader(title, page.site, href),
    hits.length > 0
      ? h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxHeight: 288,
          overflowY: 'auto',
          padding: '4px 4px 8px',
        },
      }, hits.map((hit, index) => h(SearchHitCard, {
        key: `${hit.url ?? hit.title}-${String(index)}`,
        hit,
        index,
      })))
      : h('div', {
        style: {
          ...wrap,
          maxHeight: 288,
          overflow: 'auto',
          padding: '8px 12px 10px',
          fontSize: 12,
          lineHeight: '18px',
          color: ink.secondary,
          background: 'color-mix(in srgb, var(--dsw-alias-bg-layer-1, #1c1c24) 70%, transparent)',
        },
      }, body === ''
        ? h('span', { style: { color: MUTED } }, t('process.fetch.empty'))
        : h('pre', {
          style: {
            margin: 0,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            color: 'inherit',
          },
        }, body)),
  )
}

function FetchSourceCollection({
  steps,
  t,
}: {
  steps: Array<Extract<CeoProcessStep, { kind: 'tool' }>>
  t: CeoProcessTimelineProps['t']
}): ReactNode {
  const running = steps.some(step => step.status === 'running')
  const [open, setOpen] = useState(running)
  const errors = steps.filter(step => step.status === 'error').length
  const elapsed = useRunningElapsed(running)
  const pages = steps.map(step => parseFetchPage(step.result, step.args))
  const title = t('process.fetch.collection', { count: steps.length })
  const runningHint = running
    ? [t('process.tool.running'), elapsed >= 1 ? `${String(elapsed)}s` : null]
      .filter((item): item is string => item !== null && item !== '')
      .join(' · ')
    : ''
  return h('div', {
    'data-magic-ceo-fetch-collection': true,
    style: { ...wrap, display: 'flex', flexDirection: 'column', gap: 2 },
  },
    h('button', {
      type: 'button',
      onClick: () => { setOpen(current => !current) },
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        width: '100%',
        minWidth: 0,
        padding: 0,
        border: 0,
        background: 'transparent',
        color: MUTED,
        cursor: 'pointer',
        fontSize: 13,
        lineHeight: '20px',
        fontWeight: 400,
        textAlign: 'left',
      },
    },
      h(ToolGlyph, { kind: 'globe' }),
      h('span', { style: { minWidth: 0, flex: 1, overflow: 'hidden' } },
        h('span', {
          style: {
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            overflow: 'hidden',
          },
        },
          h('span', {
            style: {
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }, title),
          errors > 0
            ? h('span', { style: { marginLeft: 6, color: DANGER } }, `${String(errors)} failed`)
            : null,
          running ? h(RunningDot) : null,
          h(Chevron, { open }),
        ),
        runningHint !== ''
          ? h('span', {
            style: {
              display: 'block',
              overflow: 'hidden',
              fontSize: 12,
              lineHeight: '16px',
              color: MUTED,
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }, runningHint)
          : null,
      ),
    ),
    open
      ? h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxHeight: 384,
          overflowY: 'auto',
          padding: '0 4px 4px 8px',
        },
      }, pages.map((page, index) => h(SearchHitCard, {
        key: `${page.url}-${String(index)}`,
        hit: {
          title: cleanSourceTitle(page.title) || page.site || page.url,
          url: page.url === '' ? undefined : page.url,
          snippet: page.snippet ?? (page.hits === undefined ? page.preview : undefined),
          site: page.site,
        },
        index,
      })))
      : null,
  )
}

function SiteMark({ site, title }: { site?: string; title: string }): ReactNode {
  const domain = site?.trim()
  const letter = (domain || title || '?').charAt(0).toUpperCase() || '?'
  const [failedDomain, setFailedDomain] = useState<string | null>(null)
  const showImg = domain !== undefined && domain !== '' && failedDomain !== domain
  return h('span', {
    'aria-hidden': true,
    style: {
      display: 'inline-flex',
      flex: '0 0 auto',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      width: 16,
      height: 16,
      marginTop: 2,
      borderRadius: 99,
      background: surface.layer3,
      color: MUTED,
      fontSize: 10,
      fontWeight: 510,
    },
  }, showImg && domain !== undefined
    ? h('img', {
      src: faviconUrl(domain),
      alt: '',
      width: 16,
      height: 16,
      style: { width: 16, height: 16, objectFit: 'contain' },
      onError: () => { setFailedDomain(domain) },
    })
    : letter)
}

function ToolStep({
  step,
  t,
}: {
  step: Extract<CeoProcessStep, { kind: 'tool' }>
  t: CeoProcessTimelineProps['t']
}): ReactNode {
  const isSearch = step.name === 'web_search'
  const isFetch = step.name === 'web_fetch'
  const [open, setOpen] = useState(isSearch || isFetch)
  const running = step.status === 'running'
  const elapsed = useRunningElapsed(running)
  const label = toolDisplayName(step.name)
  const page = isFetch ? parseFetchPage(step.result, step.args) : undefined
  const detail = page?.title || toolQueryDetail(step.name, step.args)
  const query = toolQueryFull(step.name, step.args)
  const hits = isSearch ? parseSearchHits(step.result, step.sources) : []
  const search = isSearch ? searchResultCount(step.result, step.sources) : undefined
  const failed = step.status === 'error'
  const failurePeek = failed
    ? (isSearch && searchFailurePeek(step.result) === 'MISSING_KEY'
      ? t('process.search.noKey')
      : (isSearch ? searchFailurePeek(step.result) : '') || t('process.tool.error'))
    : undefined
  const hasBody = isSearch
    ? step.status !== 'running' && (query !== '' || hits.length > 0 || (step.result !== undefined && step.result.trim() !== ''))
    : isFetch
      ? page !== undefined && (page.url !== '' || page.preview !== '')
      : step.result !== undefined && step.result.trim() !== '' && looksLikeStructuredDump(step.result) === false
  const meta = running || failed
    ? undefined
    : search?.empty === true
      ? t('process.search.none')
      : search !== undefined && search.count > 0
        ? t('process.search.results', { count: search.count })
        : page?.statusCode !== undefined
          ? `${t('process.fetch.http')} ${String(page.statusCode)}`
          : undefined
  const runningHint = running
    ? [isSearch ? t('process.search.searching') : t('process.tool.running'), elapsed >= 1 ? `${String(elapsed)}s` : null]
      .filter((item): item is string => item !== null && item !== '')
      .join(' · ')
    : ''

  return h('div', {
    'data-magic-ceo-process-tool': step.toolCallId,
    'data-status': step.status,
    style: { ...wrap, display: 'flex', flexDirection: 'column', gap: 2 },
  },
    h('button', {
      type: 'button',
      disabled: !hasBody,
      onClick: () => { if (hasBody) setOpen(current => !current) },
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        width: '100%',
        minWidth: 0,
        padding: 0,
        border: 0,
        background: 'transparent',
        color: MUTED,
        cursor: hasBody ? 'pointer' : 'default',
        fontSize: 13,
        lineHeight: '20px',
        fontWeight: 400,
        textAlign: 'left',
      },
    },
      h(ToolGlyph, { kind: toolIconKind(step.name) }),
      h('span', { style: { minWidth: 0, flex: 1, overflow: 'hidden' } },
        h('span', {
          style: {
            display: 'flex',
            alignItems: 'center',
            minWidth: 0,
            overflow: 'hidden',
          },
        },
          h('span', {
            style: {
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
            h('span', null, label),
            detail !== ''
              ? h('span', { style: { marginLeft: 6, color: MUTED } }, detail)
              : null,
          ),
          meta !== undefined
            ? h('span', {
              style: {
                flex: '0 0 auto',
                maxWidth: '40%',
                marginLeft: 6,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: MUTED,
                opacity: 0.85,
              },
            }, `· ${meta}`)
            : null,
          running ? h(RunningDot) : null,
          failed ? h(ErrorMark) : null,
          hasBody ? h(Chevron, { open }) : null,
        ),
        runningHint !== ''
          ? h('span', {
            style: {
              display: 'block',
              overflow: 'hidden',
              fontSize: 12,
              lineHeight: '16px',
              color: MUTED,
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          }, runningHint)
          : null,
      ),
    ),
    !open && failurePeek !== undefined
      ? h('span', {
        style: {
          ...wrap,
          display: 'block',
          paddingLeft: 22,
          fontSize: 12,
          lineHeight: '16px',
          color: DANGER,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      }, failurePeek)
      : null,
    running && isSearch ? h(WebSearchSkeleton) : null,
    open && isSearch && query !== ''
      ? h('div', {
        style: {
          ...wrap,
          padding: '4px 4px 6px 22px',
          fontSize: 12,
          lineHeight: '18px',
          color: MUTED,
        },
      }, `${t('process.search.query')}${query}`)
      : null,
    open && isSearch && hits.length > 0
      ? h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxHeight: 288,
          minWidth: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
          padding: '0 4px 4px 8px',
        },
      }, hits.map((hit, index) => h(SearchHitCard, {
        key: `${hit.url ?? hit.title}-${String(index)}`,
        hit,
        index,
      })))
      : open && isFetch && page !== undefined
        ? h(FetchPageCard, { page, t })
        : open && step.result && isSearch === false && isFetch === false
          && looksLikeStructuredDump(step.result) === false
          ? h('div', {
            style: {
              ...wrap,
              maxHeight: 288,
              overflow: 'auto',
              paddingLeft: 22,
              fontSize: 12,
              lineHeight: '18px',
              color: failed ? DANGER : ink.secondary,
              whiteSpace: 'pre-wrap',
            },
          }, step.result)
          : null,
  )
}

function ReasoningBlock({
  texts,
  streaming,
  t,
}: {
  texts: string[]
  streaming: boolean
  t: CeoProcessTimelineProps['t']
}): ReactNode {
  const [userOpen, setUserOpen] = useState<boolean | undefined>(undefined)
  const open = userOpen ?? streaming
  const body = texts.join('\n\n')
  return h('div', {
    'data-magic-ceo-process-thought': true,
    'data-open': open ? 'true' : undefined,
    style: { ...wrap, display: 'flex', flexDirection: 'column', gap: 6 },
  },
    h('button', {
      type: 'button',
      onClick: () => { setUserOpen(!(userOpen ?? streaming)) },
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 8,
        padding: 0,
        border: 0,
        background: 'transparent',
        color: MUTED,
        cursor: 'pointer',
        fontSize: 13,
        lineHeight: '20px',
        fontWeight: 400,
      },
    },
      streaming ? h(ThinkingDots) : null,
      t(streaming ? 'process.thinking' : 'process.thought.show'),
      streaming ? null : h(Chevron, { open }),
    ),
    open
      ? h('div', {
        style: {
          ...wrap,
          fontSize: 13,
          lineHeight: '20px',
          color: MUTED,
          whiteSpace: 'pre-wrap',
        },
      }, body)
      : null,
  )
}

function ThinkingTail({ t }: { t: CeoProcessTimelineProps['t'] }): ReactNode {
  return h('div', {
    'data-magic-ceo-process-thinking-tail': true,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 13,
      lineHeight: '20px',
      color: MUTED,
    },
  }, h(ThinkingDots), t('process.thinking'))
}

function shouldShowThinkingTail(steps: readonly CeoProcessStep[], live: boolean): boolean {
  if (!live) return false
  const last = steps.at(-1)
  if (last === undefined) return true
  if (last.kind === 'reasoning' || last.kind === 'content') return false
  if (last.kind === 'tool') return last.status !== 'running'
  return true
}

export function CeoProcessTimeline({
  steps,
  live,
  hideReportContent = false,
  t,
}: CeoProcessTimelineProps) {
  useEffect(() => { ensurePulseCss() }, [])
  if (steps.length === 0 && !live) return null
  const nodes: ReactNode[] = []
  let reasoning: string[] = []
  const flushReasoning = (streaming: boolean) => {
    if (reasoning.length === 0) return
    nodes.push(h(ReasoningBlock, {
      key: `thought-${String(nodes.length)}`,
      texts: reasoning,
      streaming,
      t,
    }))
    reasoning = []
  }
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index]!
    if (step.kind === 'reasoning') {
      reasoning.push(step.text)
      continue
    }
    flushReasoning(false)
    if (step.kind === 'tool') {
      if (step.name === 'web_fetch') {
        const grouped: Array<Extract<CeoProcessStep, { kind: 'tool' }>> = [step]
        while (index + 1 < steps.length) {
          const next = steps[index + 1]
          if (next === undefined || next.kind !== 'tool' || next.name !== 'web_fetch') break
          index += 1
          grouped.push(next)
        }
        nodes.push(grouped.length >= 2
          ? h(FetchSourceCollection, {
            key: `fetch-group-${grouped[0]!.toolCallId}`,
            steps: grouped,
            t,
          })
          : h(ToolStep, { key: `tool-${step.toolCallId}-${String(index)}`, step, t }))
        continue
      }
      nodes.push(h(ToolStep, { key: `tool-${step.toolCallId}-${String(index)}`, step, t }))
      continue
    }
    if (hideReportContent && looksLikeMemberReport(step.text)) continue
    if (hideReportContent && looksLikeStructuredDump(step.text)) continue
    nodes.push(h('div', {
      key: `content-${String(index)}`,
      'data-magic-ceo-process-content': true,
      style: {
        ...wrap,
        fontSize: 13,
        lineHeight: '20px',
        color: PRIMARY,
        whiteSpace: 'pre-wrap',
      },
    }, step.text))
  }
  flushReasoning(live && steps.at(-1)?.kind === 'reasoning')
  if (shouldShowThinkingTail(steps, live)) {
    nodes.push(h(ThinkingTail, { key: 'thinking-tail', t }))
  }
  if (nodes.length === 0) return null
  return h('div', {
    'data-magic-ceo-process': true,
    style: { ...wrap, display: 'flex', flexDirection: 'column', gap: 10 },
  }, ...nodes)
}
