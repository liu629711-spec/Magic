export interface SearchHit {
  title: string
  url?: string
  snippet?: string
  site?: string
}

const QUERY_LIMIT = 72

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false
}

export function parseToolArgs(raw: string | undefined): Record<string, unknown> {
  if (raw === undefined || raw.trim() === '') return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export type ToolIconKind =
  | 'search'
  | 'globe'
  | 'file'
  | 'edit'
  | 'folder'
  | 'terminal'
  | 'code'
  | 'wrench'

export function toolIconKind(name: string): ToolIconKind {
  if (name === 'web_search') return 'search'
  if (name === 'web_fetch' || name === 'browser') return 'globe'
  if (name === 'read' || name === 'file_read') return 'file'
  if (name === 'write' || name === 'file_write' || name === 'file_append') return 'file'
  if (name === 'edit' || name === 'str_replace') return 'edit'
  if (name === 'glob' || name === 'file_list' || name === 'ls') return 'folder'
  if (name === 'bash' || name === 'shell' || name === 'terminal') return 'terminal'
  if (name === 'grep' || name === 'code_search') return 'code'
  return 'wrench'
}

export function toolDisplayName(name: string): string {
  if (name === 'web_search') return 'Search web'
  if (name === 'web_fetch') return 'Read page'
  if (name === 'bash' || name === 'shell' || name === 'terminal') return 'Run terminal'
  if (name === 'read' || name === 'file_read') return 'Read file'
  if (name === 'write' || name === 'file_write') return 'Write file'
  if (name === 'edit' || name === 'str_replace') return 'Edit file'
  if (name === 'glob' || name === 'file_list') return 'List dir'
  if (name === 'grep') return 'Grep code'
  return name
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value.trim()
  if (Array.isArray(value)) {
    const item = value.find((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
    return item?.trim()
  }
  return undefined
}

function queryParts(parsed: Record<string, unknown>): string[] {
  if (Array.isArray(parsed.queries)) {
    return parsed.queries
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
      .map(entry => entry.trim())
  }
  const single = firstString(parsed.query) ?? firstString(parsed.q)
  return single === undefined ? [] : [single]
}

function queryText(parsed: Record<string, unknown>): string {
  return queryParts(parsed).join(', ')
}

function firstQuery(parsed: Record<string, unknown>): string {
  return queryParts(parsed)[0] ?? ''
}

export function clipTitle(text: string, limit = QUERY_LIMIT): string {
  const line = text.split(/\r?\n/).find(item => item.trim())?.trim() ?? ''
  if (line.length <= limit) return line
  return `${line.slice(0, limit)}…`
}

export function toolQueryDetail(name: string, args: string | undefined): string {
  const parsed = parseToolArgs(args)
  if (name === 'web_search') return clipTitle(firstQuery(parsed))
  if (name === 'web_fetch') return clipTitle(firstString(parsed.url) ?? '')
  return clipTitle(
    firstString(parsed.query)
    ?? firstString(parsed.path)
    ?? firstString(parsed.url)
    ?? firstString(parsed.pattern)
    ?? firstString(parsed.command)
    ?? '',
  )
}

export function toolQueryFull(name: string, args: string | undefined): string {
  const parsed = parseToolArgs(args)
  if (name === 'web_search') return queryText(parsed)
  if (name === 'web_fetch') return firstString(parsed.url) ?? ''
  return firstString(parsed.query) ?? firstString(parsed.url) ?? ''
}

export interface FetchPage {
  url: string
  statusCode?: number
  title?: string
  site?: string
  preview: string
}

const FETCHED_LINE = /^Fetched\s+(\S+)\s+\(HTTP\s+(\d+)\)/i
const FETCH_PREVIEW_LIMIT = 1600
const FETCH_CHROME = /跳至内容|辅助功能反馈|国内版|国际版|在新选项卡中打开链接|时间不限|约\s*[\d,]+\s*个结果|External web content follows|^[-*]\s*\[(?:网页|图片|视频|学术|词典|地图|航班|新闻)\]|^(网页|图片|视频|学术|词典|地图|航班|新闻|Images|Videos|Maps|News)$/

function isFetchChromeLine(line: string): boolean {
  const text = line.trim()
  if (text === '') return false
  if (FETCHED_LINE.test(text)) return true
  return FETCH_CHROME.test(text)
}

function titleFromUrl(url: string): string | undefined {
  if (url.trim() === '') return undefined
  try {
    const parsed = new URL(url)
    const query = parsed.searchParams.get('q') ?? parsed.searchParams.get('wd')
    if (query !== null && query.trim() !== '') return clipTitle(query.trim())
  } catch {
    return undefined
  }
  return undefined
}

export function parseFetchPage(result: string | undefined, args?: string): FetchPage {
  const fromArgs = firstString(parseToolArgs(args).url) ?? ''
  const lines = (result ?? '').split(/\r?\n/)
  const header = FETCHED_LINE.exec(lines[0]?.trim() ?? '')
  const url = header?.[1] ?? fromArgs
  const statusRaw = header?.[2]
  const statusCode = statusRaw === undefined ? undefined : Number(statusRaw)
  const kept: string[] = []
  let headingTitle: string | undefined
  for (const raw of lines.slice(header === null ? 0 : 1)) {
    if (isFetchChromeLine(raw)) continue
    const line = raw.trim()
    if (headingTitle === undefined) {
      const heading = /^#{1,3}\s+(.+)$/.exec(line)
      if (heading?.[1] !== undefined) {
        headingTitle = clipTitle(heading[1].replace(/[_\\]/g, '').trim())
      } else if (line.length >= 8 && /^https?:\/\//.test(line) === false) {
        headingTitle = clipTitle(line)
      }
    }
    kept.push(raw)
  }
  let preview = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  if (preview.length > FETCH_PREVIEW_LIMIT) {
    preview = `${preview.slice(0, FETCH_PREVIEW_LIMIT).trimEnd()}…`
  }
  const title = titleFromUrl(url) ?? headingTitle
  return {
    url,
    preview,
    ...statusCode === undefined || Number.isNaN(statusCode) ? {} : { statusCode },
    ...title === undefined || title === '' ? {} : { title },
    ...siteOf(url) === undefined ? {} : { site: siteOf(url) },
  }
}

export function siteOf(url: string | undefined): string | undefined {
  if (url === undefined || url.trim() === '') return undefined
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

export function faviconUrl(site: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site)}&sz=32`
}

function hitFromSource(item: unknown): SearchHit | undefined {
  if (!isRecord(item)) return undefined
  const url = typeof item.url === 'string' ? item.url : undefined
  const title = firstString(item.title) ?? firstString(item.url)
  if (title === undefined) return undefined
  return {
    title,
    ...url === undefined ? {} : { url },
    ...typeof item.snippet === 'string' && item.snippet.trim() !== '' ? { snippet: item.snippet } : {},
    ...siteOf(url) === undefined ? {} : { site: siteOf(url) },
  }
}

const SOURCE_LINE = /^- \[([^\]]+)\]\(([^)]+)\)(?:\s+[—-]\s+(.*))?$/

export function parseSearchHits(
  result: string | undefined,
  sources?: ReadonlyArray<{ url: string; title?: string; snippet?: string }>,
): SearchHit[] {
  if (sources !== undefined && sources.length > 0) {
    return sources.flatMap(item => {
      const hit = hitFromSource(item)
      return hit === undefined ? [] : [hit]
    })
  }
  if (result === undefined || result.trim() === '') return []
  const trimmed = result.trim()
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (isRecord(parsed)) {
      const fromSources = Array.isArray(parsed.sources) || Array.isArray(parsed.results)
        ? (parsed.sources ?? parsed.results)
        : undefined
      if (Array.isArray(fromSources)) {
        const hits = fromSources.flatMap(item => {
          const hit = hitFromSource(item)
          return hit === undefined ? [] : [hit]
        })
        if (hits.length > 0) return hits
      }
    }
    if (Array.isArray(parsed)) {
      const hits = parsed.flatMap(item => {
        const hit = hitFromSource(item)
        return hit === undefined ? [] : [hit]
      })
      if (hits.length > 0) return hits
    }
  } catch {
    // Markdown / prose result from DSH web_search.
  }
  const hits: SearchHit[] = []
  for (const line of trimmed.split('\n')) {
    const match = SOURCE_LINE.exec(line.trim())
    if (match === null) continue
    const title = match[1]?.trim() ?? ''
    const url = match[2]?.trim()
    const snippet = match[3]?.trim()
    if (title === '') continue
    hits.push({
      title,
      ...url === undefined || url === '' ? {} : { url },
      ...snippet === undefined || snippet === '' ? {} : { snippet },
      ...siteOf(url) === undefined ? {} : { site: siteOf(url) },
    })
  }
  return hits
}

export function searchFailurePeek(result: string | undefined): string {
  const line = result?.split(/\r?\n/).find(item => item.trim())?.trim() ?? ''
  if (line === '') return ''
  if (/no API key|API[_ ]?KEY|missing .*key/i.test(line)) return 'MISSING_KEY'
  if (line.length <= 140) return line
  return `${line.slice(0, 140)}…`
}

export function searchResultCount(
  result: string | undefined,
  sources?: ReadonlyArray<{ url: string; title?: string; snippet?: string }>,
): { count: number; empty: boolean } {
  if (result !== undefined && /No results found/i.test(result)) {
    return { count: 0, empty: true }
  }
  const hits = parseSearchHits(result, sources)
  if (hits.length > 0) return { count: hits.length, empty: false }
  if (result === undefined || result.trim() === '') return { count: 0, empty: false }
  return { count: 0, empty: false }
}
