// Barrel for the vendored better-sidebar client modules. Import this single
// entry from Magic code; the token bridge rides along.
import './tokens.css'

// diff 渲染链
export { DiffRows, ReadRows } from './diff/DiffRows.tsx'
export type { DiffRowsProps, ReadRowsProps } from './diff/DiffRows.tsx'
export { DiffFiles } from './diff/DiffFiles.tsx'
export type { DiffFilesProps } from './diff/DiffFiles.tsx'
export type {
  DiffRow,
  DiffSegment,
  HunkSegment,
  FoldSegment,
  InlineDiff,
  InlineSegment,
  DiffLine,
  DiffHunk,
  DiffFile,
  ParsedDiff,
} from './diff/rows.ts'
export {
  buildDiffSegments,
  diffLines,
  diffInline,
  parseUnifiedDiff,
  unifiedSegments,
  untrackedFile,
  foldRowsFromContents,
  diffStats,
  displayPath,
  formatBytes,
} from './diff/rows.ts'
export type { CodeToken, TokenType, ScanResult } from './diff/highlight.ts'
export { langOfPath, scanLine, tokenizeLine } from './diff/highlight.ts'

// 终端
export { TerminalView, TerminalDepsBanner } from './TerminalView.tsx'
export { TerminalWaitBanner, truncateNeedle } from './TerminalWaitBanner.tsx'
export { openWhenSized } from './open-when-sized.ts'
export { resolveTerminalFont, DEFAULT_TERMINAL_FONT_FAMILY } from './terminal-font.ts'
export { buildTerminalLinks, shouldActivateTerminalLink, openTerminalUrl } from './terminal-links.ts'
export { ONE_DARK, ONE_LIGHT } from './one-dark-palette.ts'

// 文件树
export { FileTree } from './FileTree.tsx'
export { FenceErrorNotice } from './FenceErrorNotice.tsx'
export { builtinFileIcon, builtinFolderIcon, fallbackFileIcon } from './file-icons.tsx'
export { relativeTo, isWithinWorkspace, baseName as baseNameOf, extOf } from './paths.ts'
export { uploadItemsFromDrop, uploadItemsFromFiles, uploadToDir, summarizeResults } from './upload.ts'
export type { UploadItem, UploadResult } from './upload.ts'
export { isImeComposition } from './ime-guard.ts'
export { useSubmenuFlip, submenuFlipTokens } from './menu-flip.ts'

// 共享
export { t, isZh, relativeTime } from './locales.ts'
export type { CopyKey } from './locales.ts'
export { isDarkScheme, tokenValue, effectiveTokenValue, subscribeColorScheme, colorAlpha } from './theme.ts'
export { createSidebarStore } from './state.ts'
export type {
  SidebarStore,
  SidebarSnapshot,
  SidebarState,
  SidebarTab,
  SidebarDiffRef,
  SplitNode,
  SidebarLeaf,
  SidebarSplit,
  TabType,
} from './state.ts'
export { api, SidebarApiError, isOutsideWorkspaceError, isOutsideWorkspaceMessage } from './api.ts'
export type { SessionScope, FsEntry, TerminalDepsStatus, GitStatusResult, GitLogEntry } from './api.ts'
export { parsePrefs, loadPrefs, loadBootDecision } from './prefs.ts'
export type { SidebarPrefs, TitleBarScheme } from './prefs-shared.ts'
export { SIDEBAR_PREFS_DEFAULTS, clampTerminalFontSize, clampTitleBarStrip } from './prefs-shared.ts'

// 类型收敛面（service.ts / context-types.ts / subagent / sidechat / browser 的类型镜像）
export type {
  BetterSidebarService,
  TabDescriptor,
  TabComponentProps,
  FileViewerDescriptor,
  FileViewerProps,
  FileIconDescriptor,
  FileFetchStrategy,
  OpenTabSeed,
  OpenWithTarget,
  SidebarSessionEvent,
  LastActivity,
  SidechatLogEvent,
  SidechatLiveEvent,
  SidechatThreadInfo,
  BrowserProbeResult,
} from './vendor-types.ts'
