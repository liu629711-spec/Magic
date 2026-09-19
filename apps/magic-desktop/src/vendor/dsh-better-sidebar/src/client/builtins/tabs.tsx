/**
 * The 7 built-in tab descriptors: the plugin registers its own pages
 * (editor / git — the unified changes tab / subagent / sidechat / terminal /
 * browser / diff) through
 * the same {@link BetterSidebarService} external plugins use — eating its
 * own dogfood. The terminal descriptor owns its quota (`TERMINAL_LIMIT`)
 * and mints `terminal:<uuid>` ids through `createTab`; the browser mints
 * `browser:<n>` the same way (no quota). The editor IS the files window
 * (the old standalone explorer merged into it).
 */
import { IconCodeOutline16, IconPanelLeftOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { Context } from '../../context-types.ts'
import {
  browserTabIcon, changesTabIcon, filesTabIcon, sidechatTabIcon, tasksTabIcon, terminalTabIcon, trajectoryTabIcon,
} from './tab-icons.tsx'
import { allLeaves, isAgentTabId, type SidebarState } from '../state.ts'
import { t } from '../locales.ts'
import { openSidebarFile } from '../intercept.tsx'
import { EditorHost } from '../EditorHost.tsx'
import { OpenWithSettings } from '../open-with-settings.tsx'
import { lazyChunkComponent } from '../lazy-chunk.tsx'
import { ChangesTab, opCountOf } from '../changes/ChangesTab.tsx'
import { DiffTab } from '../DiffTab.tsx'
import { SubagentView } from '../SubagentView.tsx'
import { consumeSidechatSeed, SideChatView, sidechatThreadIdOf } from '../SideChatView.tsx'
import { SideNoteView } from '../SideNoteView.tsx'
import { TrajectoryTabView } from '../TrajectoryTabView.tsx'
import { api } from '../api.ts'
import { BrowserView } from '../BrowserView.tsx'
import { TERMINAL_FONT_SIZE_MAX, TERMINAL_FONT_SIZE_MIN } from '../../prefs-shared.ts'
import type { ComponentType } from 'react'
import type { SessionScope } from '../api.ts'
import type { SidebarStore } from '../state.ts'
import type { TabDescriptor } from '../service.ts'

/**
 * Lazy wrapper over the terminal view: xterm (and its stylesheet) is fetched
 * only when a terminal tab is first opened (see chunk-loader.ts). The
 * wrapper keeps the descriptor contract `(props) => ReactNode` — Sidebar
 * calls it as a plain function.
 *
 * TerminalView's props are { scope, tabId, store } — `tabId` is NOT part of
 * TabComponentProps (it carries `tab: SidebarTab` instead), so the
 * descriptor maps it explicitly; a bare pass-through would leave tabId
 * undefined and TerminalView's isAgentTabId(tabId) would crash on
 * `undefined.startsWith` (regression-pinned in tests/lazy-chunk.spec.tsx).
 */
const LazyTerminal = lazyChunkComponent<TerminalViewProps>(
  'terminal',
  (mod) => mod.TerminalView as ComponentType<TerminalViewProps> | undefined,
)

/** The terminal view's props (mirror of TerminalView's own signature). */
interface TerminalViewProps {
  scope: SessionScope
  tabId: string
  store: SidebarStore
}

/** How many UI-owned terminals may be open at once (agent-owned ones are uncapped). */
export const TERMINAL_LIMIT = 3

/** Optional per-registration builtin behavior (currently terminal title). */
export interface BuiltinTabOptions {
  /** Returns the display title for newly opened terminal tabs. */
  terminalTitle?: () => string
  /**
   * Magic（2026-09-18，sidenote fork 语义）：fork 式侧边聊天 tab 的宿主面。
   * fork = sessions.fork（App web.fork）；binding = dock-context 的
   * sessions.binding 会话对话流读取面；parentRunning = 父会话运行态。
   */
  sideNote?: {
    onFork: (sessionId: string) => Promise<string>
    bindingOf: (id: string) => {
      events(): readonly { type: string; seq: number; time: number; data: unknown }[]
      subscribe(fn: () => void): () => void
      prompt(text: string): Promise<void>
      running(): boolean
    } | undefined
    parentRunning?: () => boolean
    /**
     * Magic（2026-09-19，用户裁定「侧边=会话内的分身」）：分身 composer 的数据面。
     * 模型目录/当前模型/切模型/命令执行/@候选 // 命令——与主会话同源（bridge），
     * 全部按子会话 id 参数化；缺项由 SideNoteView 诚实降级。
     */
    chat?: {
      modelCatalog?: { key: string; name: string; tag?: string; provider: string }[]
      sessionModelOf?: (sessionId: string) => { provider: string; model: string } | undefined
      selectModel?: (sessionId: string, provider: string, model: string) => void
      runCommand?: (sessionId: string, line: string) => void
      mentionOptions?: { key: string; name: string; desc: string; glyph?: string; attach?: boolean }[]
      commandOptions?: { key: string; name: string; desc: string }[]
    }
  }
}

/** A client-side uuid for terminal tab identity (not shown in the UI). */
function terminalUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

/** Count UI-owned terminals (agent:` tabs excluded — they are the model's). */
function uiTerminalCount(state: SidebarState): number {
  return allLeaves(state.bottomSplits)
    .flatMap(leaf => leaf.tabs)
    .filter(tab => tab.type === 'terminal' && !isAgentTabId(tab.id)).length
}

/** The 6 built-in tab descriptors. */
export function builtinTabs(_ctx: Context, options: BuiltinTabOptions = {}): readonly TabDescriptor[] {
  return [
    {
      id: 'editor',
      description: () => t('guideDescFiles'),
      // The single files window: an editor tab with no path IS the file
      // explorer (empty hint + docked tree); with a path it previews/edits
      // the file. Visible in the + menu in the explorer's old slot.
      title: () => t('files'),
      icon: filesTabIcon,
      order: 10,
      hidden: false,
      dedupeKey: (tab) => tab.path,
      // Declarative settings: the file-open behavior picker (in-place switch
      // vs per-path windows) renders as an iconed select row under the
      // editor card's gear in the Side card settings page, followed by the
      // workspace fence switch (the host's containment guard over every
      // sidebar filesystem route); the "open with" configuration (SSH host +
      // custom editors) is the custom panel BELOW those rows — the settings
      // seam renders rows first, custom panel after.
      settings: {
        toggles: [{
          key: 'editorExplorer',
          type: 'select',
          title: () => t('editorExplorer'),
          desc: () => t('editorExplorerDesc'),
          options: [
            {
              value: true,
              icon: (size: number) => <IconPanelLeftOutline16 size={size} />,
              title: () => t('editorExplorerMerged'),
              desc: () => t('editorExplorerMergedDesc'),
            },
            {
              value: false,
              icon: (size: number) => <IconCodeOutline16 size={size} />,
              title: () => t('editorExplorerSplit'),
              desc: () => t('editorExplorerSplitDesc'),
            },
          ],
        }, {
          key: 'workspaceFence',
          title: () => t('settingsFenceTitle'),
          desc: () => t('settingsFenceDesc'),
        }],
        render: ({ pluginSettings, updatePluginSetting }) => (
          <OpenWithSettings pluginSettings={pluginSettings} updatePluginSetting={updatePluginSetting} />
        ),
      },
      component: ({ ctx, store, scope, tab, expanded, revealed, onToggleDir, onReferenceFile }) => (
        <EditorHost
          ctx={ctx}
          store={store}
          scope={scope}
          tab={tab}
          expanded={expanded ?? []}
          revealed={revealed ?? []}
          onToggleDir={onToggleDir ?? (() => { /* no-op */ })}
          onReferenceFile={onReferenceFile ?? (() => { /* no-op */ })}
        />
      ),
    },
    {
      // The unified changes tab (id kept as 'git' so persisted layouts keep
      // resolving): the Git lens is the former source-control panel; the
      // session lens is the former file-trace tab (PR #471). Both preview
      // through one shared diff stack. The badge reads the op-count cache
      // the tab's event poll publishes (the client ctx exposes no event
      // log, and the git status needs a fetch — both stay out of the badge).
      id: 'git',
      title: () => t('changes'),
      description: () => t('guideDescGit'),
      icon: changesTabIcon,
      order: 20,
      single: true,
      badge: (_ctx, scope) => {
        const count = opCountOf(scope.sessionId)
        return count === undefined || count === 0 ? null : count
      },
      component: ({ ctx, store, scope, tab, visible, onOpenDiff }) => (
        <ChangesTab
          ctx={ctx}
          store={store}
          scope={scope}
          tab={tab}
          visible={visible}
          onOpenFile={(path) => { openSidebarFile(ctx, store, scope.sessionId, path) }}
          onOpenDiff={onOpenDiff}
        />
      ),
    },
    {
      id: 'subagent',
      title: () => t('subagent'),
      description: () => t('guideDescSubagent'),
      icon: tasksTabIcon,
      order: 30,
      single: true,
      // Declarative settings: the auto-open switches render under this row in
      // the Side card settings page (the Tasks page's related settings).
      settings: {
        toggles: [{
          key: 'autoOpenSubagent',
          title: () => t('settingsSubagentTitle'),
          desc: () => t('settingsSubagentDesc'),
        }, {
          key: 'autoOpenJobs',
          title: () => t('settingsJobsTitle'),
          desc: () => t('settingsJobsDesc'),
        }],
      },
      component: ({ ctx, scope, visible, onSubagentJump }) => (
        <SubagentView
          sessionId={scope.sessionId}
          ctx={ctx}
          active={visible}
          onOpenChild={(address) => { onSubagentJump?.(address.childSessionId) }}
        />
      ),
    },
    {
      id: 'sidechat',
      // Magic（2026-09-18）：beta 管理页用「侧边对话」区分 sidenote 的
      // 「侧边聊天」——3099 上两者并存、名字不同。
      title: () => t('sideChatBeta'),
      description: () => t('guideDescSidechat'),
      icon: sidechatTabIcon,
      order: 35,
      // Magic local patch (2026-09-13) hid this from the + menu / start page;
      // reverted 2026-09-18 (user ruling): the side chat entry lives in the
      // right dock's own guide (3099 parity — guide entry card + ⊕ header
      // pill removed from the conversation header), so the guide must list
      // it again.
      hidden: false,
      // Codex-style: EVERY side conversation is its own tab. A plain open
      // mints a fresh tab flagged `autoCreate` (the view creates the EMPTY
      // thread on mount); a thread switch from the header menu parks the
      // target id for a deterministic `sidechat:<threadId>` reattach tab.
      createTab: () => {
        const threadId = consumeSidechatSeed()
        if (threadId !== undefined) {
          return {
            tab: {
              id: `sidechat:${threadId}`,
              type: 'sidechat',
              title: t('sideChat'),
              meta: { threadId },
            },
          }
        }
        return {
          tab: {
            id: `sidechat:new-${crypto.randomUUID()}`,
            type: 'sidechat',
            title: t('sideChatUntitled'),
            meta: { autoCreate: true },
          },
        }
      },
      // One tab per thread: an already-open thread focuses instead of
      // duplicating; unbound fresh tabs never dedupe (each mints its own).
      dedupeKey: (tab) => sidechatThreadIdOf(tab),
      // Closing the tab releases the thread's live agent; the session and
      // its history stay persisted (reopen from any thread's header menu).
      onClose: (tab) => {
        const threadId = sidechatThreadIdOf(tab)
        if (threadId !== undefined) {
          void api.sidechatDispose(threadId).catch(() => {})
        }
      },
      component: ({ ctx, scope, tab, visible }) => (
        <SideChatView ctx={ctx} scope={scope} tab={tab} visible={visible} />
      ),
    },
    {
      // Magic（2026-09-18，3099-sidenote 对齐）：fork 式侧边聊天 tab——顶栏
      // 「⊕侧边」与 guide 入口的承接面。sidenote 的 fork 语义（fork 子会话
      // 继承主会话历史 → 独立对话 → 整段回流 / 保存为正式会话）；数据源走
      // BuiltinTabOptions.sideNote 注入的宿主面（App 的 fork + follow 流）。
      // 与上面的内建 sidechat（sidechat.* 插件路由的线程管理页）是两个面——
      // 3099 上两者并存（sidenote 的侧边聊天 + better-sidebar 的侧边对话）。
      id: 'dsh-sidenote:side',
      title: () => t('sideChat'),
      description: () => t('guideDescSidechat'),
      icon: sidechatTabIcon,
      order: 34,
      // Native dockkit 下同 kind 每 pane 单实例（held 规则）：单实例语义即
      // sidenote 的 openOrFocus（open 折叠为聚焦既有 tab）。
      single: true,
      createTab: () => ({
        tab: {
          id: `side:${crypto.randomUUID()}`,
          type: 'dsh-sidenote:side',
          title: t('sideChatUntitled'),
        },
      }),
      component: ({ ctx, scope, tab, visible }) => (
        <SideNoteView
          ctx={ctx}
          scope={scope}
          tab={tab}
          visible={visible}
          onFork={sessionId => options.sideNote?.onFork(sessionId) ?? Promise.reject(new Error('sideNote host face is not wired'))}
          bindingOf={id => options.sideNote?.bindingOf(id) ?? undefined}
          parentRunning={options.sideNote?.parentRunning?.() ?? false}
          chat={options.sideNote?.chat}
        />
      ),
    },
    {
      // Magic（2026-09-19）：调用轨迹 tab——会话头 ⋯ 菜单「查看调用轨迹」的承接
      // 面。渲染当前任务的持久事件时间线（conversation/TrajectoryView），事件经
      // sideNote.bindingOf 宿主面直读（dock 按会话整体 remount，scope.sessionId
      // 即当前任务）。hidden：不出现在开始页 guide（用户裁定：调用轨迹不在开始
      // 页展示，仅从菜单进入）；single：同 kind 单实例（重复打开=聚焦既有 tab）。
      id: 'magic:trajectory',
      title: () => t('trajectory'),
      icon: trajectoryTabIcon,
      order: 36,
      hidden: true,
      single: true,
      createTab: () => ({
        tab: {
          id: `trajectory:${crypto.randomUUID()}`,
          type: 'magic:trajectory',
          title: t('trajectory'),
        },
      }),
      component: ({ scope }) => {
        const binding = options.sideNote?.bindingOf(scope.sessionId)
        return (
          <TrajectoryTabView
            sessionId={scope.sessionId}
            eventsOf={() => binding?.events() ?? []}
            subscribe={fn => binding?.subscribe(fn) ?? (() => undefined)}
          />
        )
      },
    },
    {
      id: 'terminal',
      title: () => t('terminal'),
      description: () => t('guideDescTerminal'),
      icon: terminalTabIcon,
      order: 40,
      available: (_ctx, _scope, state) => uiTerminalCount(state) < TERMINAL_LIMIT,
      // Declarative settings: the model-facing terminal tools switch, the
      // bottom-panel first-expansion auto-terminal switch, and the custom
      // font family/size rows render under this card in the Side card
      // settings page (the host gates the toolset on the tools one
      // independently; the font rows apply live to every terminal).
      settings: {
        toggles: [{
          key: 'agentTerminalTools',
          title: () => t('settingsToolsTitle'),
          desc: () => t('settingsToolsDesc'),
        }, {
          key: 'bottomPanelAutoTerminal',
          title: () => t('settingsBottomTerminalTitle'),
          desc: () => t('settingsBottomTerminalDesc'),
        }, {
          key: 'terminalShell',
          type: 'text',
          title: () => t('settingsShellTitle'),
          desc: () => t('settingsShellDesc'),
          placeholder: t('settingsShellPlaceholder'),
        }, {
          key: 'terminalShellArgs',
          type: 'text',
          title: () => t('settingsShellArgsTitle'),
          desc: () => t('settingsShellArgsDesc'),
          placeholder: t('settingsShellArgsPlaceholder'),
        }, {
          key: 'terminalFontFamily',
          type: 'text',
          title: () => t('settingsFontFamilyTitle'),
          desc: () => t('settingsFontFamilyDesc'),
          placeholder: t('settingsFontFamilyPlaceholder'),
        }, {
          key: 'terminalFontSize',
          type: 'number',
          title: () => t('settingsFontSizeTitle'),
          desc: () => t('settingsFontSizeDesc'),
          min: TERMINAL_FONT_SIZE_MIN,
          max: TERMINAL_FONT_SIZE_MAX,
          unit: 'px',
        }],
      },
      createTab: (state) => {
        const count = uiTerminalCount(state)
        if (count >= TERMINAL_LIMIT) return null
        return {
          tab: {
            id: `terminal:${terminalUuid()}`,
            type: 'terminal',
            title: options.terminalTitle?.() ?? t('terminal'),
          },
          // Keep the legacy counter advancing for compatibility with older
          // persisted states; new ids no longer use it.
          patch: { nextTerminal: state.nextTerminal + 1 },
        }
      },
      component: ({ tab, scope, store }) => <LazyTerminal scope={scope} store={store} tabId={tab.id} />,
    },
    {
      id: 'browser',
      title: () => t('browser'),
      description: () => t('guideDescBrowser'),
      icon: browserTabIcon,
      order: 50,
      // Declarative settings: the sandbox escape hatch, the link-takeover
      // MASTER switch, and the per-protocol takeover switches (http on /
      // https off by default) render under this tab's row in the Side card
      // settings page (the sandbox one is warned on).
      settings: {
        toggles: [{
          key: 'browserNoSandbox',
          title: () => t('settingsBrowserSandboxTitle'),
          desc: () => t('settingsBrowserSandboxDesc'),
        }, {
          key: 'browserInterceptLinks',
          title: () => t('settingsBrowserLinksTitle'),
          desc: () => t('settingsBrowserLinksDesc'),
        }, {
          key: 'browserInterceptHttp',
          title: () => t('settingsBrowserHttpTitle'),
          desc: () => t('settingsBrowserHttpDesc'),
        }, {
          key: 'browserInterceptHttps',
          title: () => t('settingsBrowserHttpsTitle'),
          desc: () => t('settingsBrowserHttpsDesc'),
        }, {
          key: 'browserAllowedLoopback',
          type: 'text',
          title: () => t('settingsBrowserLoopbackTitle'),
          desc: () => t('settingsBrowserLoopbackDesc'),
          placeholder: t('settingsBrowserLoopbackPlaceholder'),
        }],
      },
      createTab: (state) => ({
        tab: {
          id: `browser:${state.nextBrowser}`,
          type: 'browser',
          title: t('browser'),
        },
        patch: { nextBrowser: state.nextBrowser + 1 },
      }),
      component: (props) => <BrowserView {...props} />,
    },
    {
      id: 'diff',
      title: () => t('changes'),
      icon: changesTabIcon,
      order: -1,
      hidden: true,
      dedupeKey: (tab) => tab.id,
      component: ({ scope, tab }) => (
        tab.diff === undefined ? null
          : <DiffTab sessionId={scope.sessionId} cwd={scope.cwd} diff={tab.diff} />
      ),
    },
  ]
}
