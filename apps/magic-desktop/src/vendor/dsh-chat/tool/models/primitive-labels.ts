// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/models/primitive-labels.ts

import type {
  DiffBlockLabels,
  MarkdownLabels,
  ReadBlockLabels,
  SearchBlockLabels,
  WebBlockLabels,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { ConversationTranslate } from '../../locale/conversation.ts'

type T = ConversationTranslate

/** 构建本地化 Markdown chrome 标签。 */
export function markdownLabels(t: T): MarkdownLabels {
  return {
    code: { copyLabel: t('copy'), copiedLabel: t('copied') },
    footnotes: t('markdown.footnotes'),
  }
}

/** 构建本地化 diff 卡片 chrome 标签。 */
export function diffBlockLabels(t: T): DiffBlockLabels {
  return {
    copy: t('copy'),
    copied: t('copied'),
    collapseAria: t('diff.collapseAria'),
    expandAria: count => t('diff.expandAria', { count }),
    collapse: t('collapse'),
    expand: count => t('diff.expandRest', { count }),
    files: count => t(count === 1 ? 'diff.files.one' : 'diff.files.other', { count }),
  }
}

/** 构建本地化 read 卡片 chrome 标签。 */
export function readBlockLabels(t: T): ReadBlockLabels {
  return {
    window: (shown, total) => t('read.window', { shown, total }),
    copy: t('copy'),
    copied: t('copied'),
    collapseAria: t('read.collapseAria'),
    expandAria: count => t('read.expandAria', { count }),
    collapse: t('collapse'),
    expand: count => t('read.expandRest', { count }),
  }
}

/** 构建本地化 search 卡片 chrome 标签。 */
export function searchBlockLabels(t: T): SearchBlockLabels {
  return {
    pathsSummary: (shown, total, truncated) => t(
      truncated ? 'search.paths.truncated' : 'search.paths',
      { shown, total },
    ),
    matchesSummary: (shown, total, files, truncated) => t(
      truncated ? 'search.matches.truncated' : 'search.matches',
      { shown, total, files },
    ),
    copy: t('copy'),
    copied: t('copied'),
    noResults: t('search.noResults'),
    collapseAria: t('search.collapseAria'),
    expandAria: count => t('search.expandAria', { count }),
    collapse: t('collapse'),
    expand: count => t('search.expandRest', { count }),
  }
}

/** 构建本地化 web 卡片 chrome 标签。 */
export function webBlockLabels(t: T): WebBlockLabels {
  return {
    noResults: t('web.noResults'),
    sourcesTruncated: t('web.sourcesTruncated'),
    http: t('web.http'),
    contentTruncated: t('web.contentTruncated'),
    markdown: markdownLabels(t),
  }
}
