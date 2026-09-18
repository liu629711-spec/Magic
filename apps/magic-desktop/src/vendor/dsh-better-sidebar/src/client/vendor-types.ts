// Type-only shim for the dsh-better-sidebar@0.19.1 types the vendored client
// files consume. Definitions are copied verbatim from the source file noted on
// each block; cordis/host-facing members（TabDescriptor.available / badge、
// TabComponentProps.ctx、FileViewerProps.ctx —— 原类型引用 cordis Context）
// 被裁剪，其余字段与上游 0.19.1 保持形状兼容。后续 M3 接线时如需完整服务面，
// 以 plugins/dsh-better-sidebar@0.19.1 src/client/service.ts 为准。
import type { ReactNode } from 'react'
import type { CopyKey } from './locales.ts'
import type { SidebarPrefs } from './prefs-shared.ts'
import type { SessionScope } from './api.ts'
import type { SidebarState, SidebarSnapshot, SidebarStore, SidebarTab } from './state.ts'

// ── from src/context-types.ts（SidebarSessionEvent）─────────────────────────

/** Minimal structural mirror of one session event (the subagent history tail). */
export interface SidebarSessionEvent {
  type: string
  seq: number
  time: number
  data: Record<string, unknown>
}

// ── from src/subagent-activity.ts（LastActivity）────────────────────────────

/** The live status of one subagent card (both fields optional). */
export interface LastActivity {
  /** The latest assembled assistant text output in the tail. */
  text?: string
  /** The latest tool call in the tail. */
  tool?: { name: string; args: string }
}

// ── from src/sidechat-core.ts（SidechatLogEvent / SidechatLiveEvent / SidechatThreadInfo）──

/** The minimal structural face of a session-log event. */
export interface SidechatLogEvent {
  type: string
  seq: number
  time: number
  data: unknown
}

/** One live assistant delta on the plugin's wire (non-durable; the client
 *  replaces its live set each poll). */
export interface SidechatLiveEvent {
  type: 'assistant/live-chunk'
  /** Ordering key among live rows only; durable seqs stay authoritative. */
  seq: number
  time: number
  data: {
    attemptId: string
    turn: number
    step: number
    /** Dense zero-based position within the attempt. */
    index: number
    /** The raw model stream chunk. */
    chunk: Record<string, unknown>
  }
}

/** The info the thread header shows (live runtime state + agent identity). */
export interface SidechatThreadInfo {
  /** A live agent drives the thread right now (false = cold/persisted). */
  live: boolean
  /** Live lifecycle state; absent on cold threads. */
  status?: 'idle' | 'running'
  /** Provider route of the live agent. */
  provider?: string
  /** Model id of the live agent. */
  model?: string
  /** The recorded agent preset (live header, or persisted on cold reads). */
  preset?: string
}

// ── from src/client/browser.ts（BrowserProbeResult）─────────────────────────

/** One browser.probe wire result (host fetch of the target's headers). */
export interface BrowserProbeResult {
  reachable: boolean
  /** The final (post-redirect) URL; present when reachable. */
  url?: string
  status?: number
  xFrameOptions?: string
  /** The CSP frame-ancestors source list; present when the directive exists. */
  frameAncestors?: string[]
}

// ── from src/client/open-with.ts（OpenWithTarget）───────────────────────────

/** One menu-visible open target (built-in or custom, SSH-filtered). */
export interface OpenWithTarget {
  /** Stable id (`explorer` / `vscode` / `cursor` / `zed` / `custom:<id>`). */
  id: string
  /** Locale key of a built-in label (custom editors carry `name` instead). */
  nameKey?: CopyKey
  /** User-defined label (custom editors only; '' for built-ins). */
  name: string
  /** 'reveal' = show in the OS file manager; 'url' = open a URL. */
  kind: 'reveal' | 'url'
  /** URL template with `{path}`; undefined for reveal targets. */
  urlTemplate?: string
  /** Whether the editor talks the VSCode URL dialect. */
  isVscodeFamily: boolean
  /** Hidden in SSH mode (a host-local opener cannot reach a remote path). */
  localOnly: boolean
}

// ── from src/client/service.ts（BetterSidebarService 及其嵌套依赖类型）──────

/** The row control a declarative setting renders as in the settings popup. */
export type SidebarSettingToggleType = 'switch' | 'text' | 'number' | 'select'

/** One option of a `type: 'select'` setting row. */
export interface SidebarSettingSelectOption {
  /** The value written to the setting key when this option is picked
   *  (JSON-serializable: string / number / boolean). */
  value: string | number | boolean
  /** Option title (i18n friendly: string or () => string). */
  title: string | (() => string)
  /** Option description (i18n friendly); rendered under the title. */
  desc?: string | (() => string)
  /** Option icon: when ANY option declares one, the dropdown renders
   *  big-icon option cards and the closed control shows the selected
   *  option's icon too. */
  icon?: ReactNode | ((size: number) => ReactNode)
}

/** One declarative setting of a tab/viewer. */
export interface SidebarSettingToggle {
  /** The SidebarPrefs field this toggle reads and writes ('autoOpenSubagent'). */
  key: string
  /** Row title (i18n friendly: string or () => string). */
  title: string | (() => string)
  /** Row description (i18n friendly). */
  desc?: string | (() => string)
  /** Row control type; defaults to 'switch'. */
  type?: SidebarSettingToggleType
  /** Lower bound for `type: 'number'` rows (clamped on commit). */
  min?: number
  /** Upper bound for `type: 'number'` rows (clamped on commit). */
  max?: number
  /** Input placeholder for `type: 'text'` rows. */
  placeholder?: string
  /** Unit suffix rendered after the input (e.g. 'px'). */
  unit?: string
  /** Options of a `type: 'select'` row. */
  options?: readonly SidebarSettingSelectOption[]
  /** Whether a `type: 'select'` row allows picking several options. */
  multi?: boolean
}

/** Props of a descriptor's custom settings panel (`settings.render`). */
export interface SidebarSettingsRenderProps {
  store: SidebarStore
  service: BetterSidebarService
  prefs: SidebarPrefs
  /** This descriptor's own persisted settings blob (from `pluginSettings[id]`). */
  pluginSettings: Record<string, unknown>
  /** Persist one plugin-owned setting of this descriptor. */
  updatePluginSetting(key: string, value: unknown): void
  /** Close the settings popup. */
  close(): void
}

/** Declarative settings of one registered tab or file viewer. */
export interface SidebarSettingsDeclaration {
  /** Extra settings rows rendered under the feature's own row in the
   *  settings page (only while the feature is enabled). */
  toggles?: readonly SidebarSettingToggle[]
  /** Plugin-owned settings rows (v0.12.0+): keys are plugin-local and
   *  persisted under `pluginSettings[<descriptor id>]`. */
  pluginToggles?: readonly SidebarSettingToggle[]
  /** Custom settings panel (v0.12.0+): rendered instead of the row lists. */
  render?: (props: SidebarSettingsRenderProps) => ReactNode
}

/** How the host loads a file's bytes for one viewer. */
export type FileFetchStrategy =
  | 'none'               // no bytes needed (image/pdf/office fetch through mediaUrl themselves)
  | 'fsRead'             // text read through /sidebar/api fs.read
  | 'mediaUrl'           // the viewer gets a media URL string
  | 'custom'             // the viewer's load() fetches its own bytes
  | 'binary-download'    // show a download button (no client-side renderer)

/** The toolbar state a text editor reports to the host's merged-mode header. */
export interface EditorToolbarState {
  /** Whether the preview/edit mode toggle applies (markdown/html). */
  modes: boolean
  mode: 'preview' | 'edit'
  dirty: boolean
  /** Whether saving applies (text content loaded). */
  editable: boolean
  saveState: 'idle' | 'saving' | 'saved' | 'failed'
}

/** The commands the host's merged-mode header sends back to the viewer. */
export interface EditorToolbarControls {
  setMode(mode: 'preview' | 'edit'): void
  save(): void
}

/** Props every file viewer component receives.
 *  （裁剪：上游的 `ctx: Context` 字段引用 cordis Context，未收录。） */
export interface FileViewerProps {
  store: SidebarStore
  scope: SessionScope
  path: string
  title: string
  /** The matching descriptor's id (`'code'`, `'my-plugin:csv'`). */
  viewerId: string
  /** fsRead text content (fetchStrategy='fsRead'). */
  content?: string
  truncated?: boolean
  /** mediaUrl for the path (fetchStrategy='mediaUrl'). */
  mediaUrl?: string
  /** custom load() return value (fetchStrategy='custom'). */
  customData?: unknown
  /** Internal (built-in text editor): 'host' asks the viewer to skip its own
   *  toolbar row. */
  toolbar?: 'self' | 'host'
  /** Internal: the viewer reports its toolbar state (mode/dirty/save). */
  onToolbarState?: (state: EditorToolbarState) => void
  /** Internal: the viewer registers its toolbar commands on mount (null on
   *  unmount). */
  onToolbarControls?: (controls: EditorToolbarControls | null) => void
}

/** Describes one file previewer (builtins register themselves too). */
export interface FileViewerDescriptor {
  /** Unique id (`'image'`, `'pdf'`, `'my-plugin:csv'`). */
  id: string
  /** Display name for the settings inventory (falls back to `id` when absent). */
  title?: string | (() => string)
  /** Icon shown in the settings inventory. */
  icon?: ReactNode | ((size: number) => ReactNode)
  /** Lowercase extensions without leading dot (`['png','jpg']`). `[]` = match any (catch-all). */
  exts: readonly string[]
  /** Higher wins; default 0. */
  priority?: number
  fetchStrategy: FileFetchStrategy
  /** Content sniff: when `head` bytes are available the descriptor's `detect`
   *  is consulted before its `exts` (per-descriptor, in priority order). */
  detect?: (path: string, head: Uint8Array) => boolean
  /** fetchStrategy='custom' loader. `signal` aborts on viewer teardown. */
  load?: (path: string, scope: SessionScope, signal?: AbortSignal) => Promise<unknown>
  /** Declarative settings shown in the Side card settings page. */
  settings?: SidebarSettingsDeclaration
  component: (props: FileViewerProps) => ReactNode
}

/** Describes one external file-icon registration (feature `fileIcons`). */
export interface FileIconDescriptor {
  /** Unique id (`'my-plugin:icons'`). */
  id: string
  /** Lowercase extensions without leading dot. `[]` = the global default
   *  (catch-all); OMITTED = no extension rule at all. Two values are
   *  RESERVED for directory rows: `'folder'` (closed) and `'folder-open'`
   *  (expanded). */
  exts?: readonly string[]
  /** Exact FILE names (basename, case-insensitive). Omitted/`[]` = no name rule. */
  names?: readonly string[]
  /** Exact DIRECTORY names (basename, case-insensitive). Omitted/`[]` = no name rule. */
  folderNames?: readonly string[]
  /** Higher wins; default 0. Registered icons always outrank the built-in map. */
  priority?: number
  /** Size-aware icon factory. `open` is the directory's expanded state for a
   *  DIRECTORY row and `undefined` for a file row. */
  icon: (path: string, size: number, open?: boolean) => ReactNode
}

/** One `openTab` request. */
export interface OpenTabSeed {
  type: string
  /** Overrides the descriptor's title when given. */
  title?: string
  /** A file path (meaning follows the type). */
  path?: string
  /** A diff reference (the diff tab's content seed). */
  diff?: SidebarTab['diff']
  /** Explicit tab id (defaults to the type). */
  id?: string
  /** A URL the tab navigates to on mount. */
  url?: string
  /** JSON-serializable custom state carried on the minted tab. */
  meta?: unknown
  /** Where the open lands: 'right' (DSH native sidebar) or 'bottom' (the
   *  plugin's own workbench). */
  target?: 'right' | 'bottom'
}

/** The plugin-side seed a native right-Sidebar tab carries in its navigation params. */
export interface NativeTabParams {
  /** Overrides the descriptor's title for this instance. */
  title?: string
  /** A file path (the editor window's content seed). */
  path?: string
  /** A URL the tab navigates to on mount. */
  url?: string
  /** A diff reference. */
  diff?: SidebarTab['diff']
  /** JSON-serializable custom state carried on the synthetic record. */
  meta?: unknown
}

/** The plugin's write face over DSH's native right Sidebar. */
export interface SidebarSurface {
  /** Open a page type in one session's native surface. */
  openTab(input: { sessionId: string; kind: string; params: NativeTabParams; revealIfOpened: boolean }): void
  /** Open a resource address in one session's native surface. */
  openResource(input: { sessionId: string; address: string; line?: number; revealIfOpened: boolean }): void
  /** The file address of one path (the native surface owns the grammar). */
  fileAddress(sessionId: string, cwd: string | undefined, path: string): string
  /** Close one native tab; the closed record's type/title, or undefined when the id is not native. */
  close(sessionId: string, tabId: string): { type: string; title: string } | undefined
  /** Patch a native tab's plugin-side record; false when it is not native. */
  update(tabId: string, patch: { title?: string; path?: string; meta?: unknown }): boolean
  /** Focus a native tab; false when it is not native. */
  activate(tabId: string): boolean
  /** Whether a tab id belongs to the native surface. */
  has(tabId: string): boolean
}

/** Props every tab component receives (builtins and external alike).
 *  （裁剪：上游的 `ctx: Context` 字段引用 cordis Context，未收录。） */
export interface TabComponentProps {
  store: SidebarStore
  scope: SessionScope
  tab: SidebarTab
  /** Whether this tab is the active one AND the panel is open (live views pause otherwise). */
  visible: boolean
  /** The explorer's expanded directory set (ExplorerView). */
  expanded?: string[]
  /** The explorer's reveal-highlight set (ExplorerView; "Show in folder" targets). */
  revealed?: string[]
  onToggleDir?: (path: string) => void
  onReferenceFile?: (path: string, isDir: boolean) => void
  onOpenFile?: (path: string) => void
  onOpenDiff?: (tab: SidebarTab) => void
  onSubagentJump?: (childSessionId: string) => void
}

/** Describes one kind of sidebar tab (builtins register themselves too).
 *  （裁剪：上游的 `available?` / `badge?` 两个成员首参引用 cordis Context，未收录。） */
export interface TabDescriptor {
  /** Unique id; also the `SidebarTab.type` value (`'explorer'`, `'my-plugin:db'`). */
  id: string
  title: string | (() => string)
  /** One-line description of what this tab shows. */
  description?: string | (() => string)
  icon?: ReactNode | ((size: number) => ReactNode)
  /** + menu sort order (ascending); default 100. */
  order?: number
  /** Hide from the + menu (the editor tab is opened by file-open, not by the menu). */
  hidden?: boolean
  /** Single-instance sugar: `true` is shorthand for `dedupeKey: () => id`. */
  single?: boolean
  /** If provided, opening a tab whose `dedupeKey(tab)` matches an existing
   *  tab's key focuses the existing one instead of creating a new one. */
  dedupeKey?: (tab: SidebarTab) => string | undefined
  /** Custom tab creation (minting the `SidebarTab` and any state patches). */
  createTab?: (state: SidebarState) => { tab: SidebarTab; patch?: Partial<SidebarState> } | null
  /** External-link target claim (v0.13.0+). */
  urlTarget?: (url: URL) => boolean
  /** Declarative settings shown in the Side card settings page. */
  settings?: SidebarSettingsDeclaration
  /** Lifecycle callbacks (v0.12.0+). Fired by the SERVICE paths only. */
  onOpen?: (tab: SidebarTab, scope: SessionScope) => void
  onActivate?: (tab: SidebarTab, scope: SessionScope) => void
  onClose?: (tab: SidebarTab, scope: SessionScope) => void
  component: (props: TabComponentProps) => ReactNode
}

/**
 * The registry service published as `ctx.betterSidebar`（类型面，字段与上游
 * dsh-better-sidebar@0.19.1 src/client/service.ts 的同名接口保持兼容）.
 */
export interface BetterSidebarService {
  registerTab(descriptor: TabDescriptor): () => void
  registerFileViewer(descriptor: FileViewerDescriptor): () => void
  registerFileIcon(descriptor: FileIconDescriptor): () => void
  getTabs(): readonly TabDescriptor[]
  getFileViewers(): readonly FileViewerDescriptor[]
  getFileIcons(): readonly FileIconDescriptor[]
  /** Find a SPECIFIC registered file icon for a path (priority desc, then
   *  registration order): a `names` match first, then an `exts` match. */
  matchFileIcon(path: string): FileIconDescriptor | undefined
  /** Find the registered icon for DIRECTORY rows (priority desc): a
   *  `folderNames` match on `name` first, then the `'folder'`/`'folder-open'`
   *  reserved exts by `open`. */
  matchFolderIcon(open: boolean, name?: string): FileIconDescriptor | undefined
  /** The authoritative FILE icon for a path (feature `fileIcons`), running
   *  the whole chain with per-factory crash isolation. */
  fileIcon(path: string, size: number): ReactNode
  /** The authoritative DIRECTORY icon for a tree row (same crash isolation). */
  folderIcon(path: string, open: boolean, size: number): ReactNode
  /** Find a tab descriptor by id (undefined if not registered). */
  getTab(id: string): TabDescriptor | undefined
  /** Whether a tab type is enabled in the side card prefs. */
  isTabEnabled(id: string): boolean
  /** Whether a file viewer is enabled (absent `viewersEnabled[id]` = enabled). */
  isViewerEnabled(id: string): boolean
  /** Find a file viewer for a path (priority desc; detect first, then exts). */
  matchFileViewer(path: string, head?: Uint8Array): FileViewerDescriptor | undefined
  /** Open a tab (used by external tabs and the + menu). */
  openTab(seed: OpenTabSeed, scope?: SessionScope): void
  /** Close a tab by id (fires descriptor.onClose). */
  closeTab(tabId: string, scope?: SessionScope): void
  /** Subscribe to registry changes (register/dispose). */
  subscribe(listener: () => void): () => void
  /** The plugin version this service instance was built from ('0.12.0'). */
  readonly version: string
  /** Monotonic capability list (v0.12.0+). */
  readonly features: readonly string[]
  /** The current sidebar snapshot: the active session id, its state, and the
   *  side card prefs. */
  getSnapshot(): SidebarSnapshot
  /** Subscribe to snapshot changes. Returns the disposer. */
  subscribeState(listener: () => void): () => void
  /** Update an open tab's display fields (title / path / meta). */
  updateTab(tabId: string, patch: { title?: string; path?: string; meta?: unknown }): void
  /** Activate an open tab (the tab-bar activation path). */
  activateTab(tabId: string, scope?: SessionScope): void
  /** Open a file in the sidebar editor of `scope`'s session. */
  openFile(scope: SessionScope, path: string, title?: string): void
  /** Install (or clear) the native right-Sidebar write face. */
  setSurface(surface: SidebarSurface | undefined): void
}
