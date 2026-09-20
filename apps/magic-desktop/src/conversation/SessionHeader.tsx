// 会话头（M4，2026-09-18；同日图二顶行改版 → 2026-09-18 图二/3099 实测重排）：
// Magic 组合网页版顶栏对齐（图五/3099 实测 + ui-conversation ConversationSessionHeader、
// ui-subagent SubagentHeaderLineage、ui-agent-preset AgentPresetLabel、experimental
// client-ui-agent-team TeamAction 官方源码逐段映射）：
// 左=面包屑（父会话可点 / 当前标题，crumbSep 官方 `/` 分隔）+「N 个子代理」count trigger
// （官方 lineage 无边框形态：tertiary 12px + IconChevronDownOutline14）+ 会话预设标签
// （官方 AgentPresetLabel：IconAgentPresetOutline16 + tsp fill 底 pill）+ Agent Team trigger
// （官方 TeamAction：IconUserOutline16 + count 徽标，无边框 hover 底）；右=folder 图标胶囊 +
// 独立 chevron 钮两元素组合（3099 实测 28×26+22×26，二者同开「复制路径」菜单）+
// 「⋯」会话菜单（重命名/导出 Markdown/复制会话 ID）+ 终端（弹对话区底部终端面板）+
// 「⊕侧边」（打开右坞 sidenote fork 式侧聊 tab）+ 右坞收起时的打开入口（与右坞 tab 行
// 收起钮同款右面板图标）。能力未接的置灰并 title 诚实标注。数据由 App 从 web.sessions
// 计算后经 ChatFlow 传入。
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  IconAgentPresetOutline16,
  IconChevronDownOutline14,
  IconNewChatOutline16,
  IconPanelLeftOutline16,
  IconUserOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import {
  leadSessionIdOf,
  viewAgentTeam,
  type AgentTeamView,
} from '../adapters/dsh-web/agent-teams'
import { AgentTeamPanel } from './AgentTeamPanel.tsx'
import { api } from '../vendor/dsh-better-sidebar/src/client/api'

/** 会话头数据（App 侧从真实会话列表算出）。 */
export interface SessionHeaderData {
  /** 当前会话 id（Agent Team 面板查 agentTeams/view 用）。 */
  id: string
  title: string
  /** 父会话（层级导航），无父会话时为 undefined。 */
  parent?: { id: string; title: string }
  /** 子代理/子会话（其他会话的 parentSessionId === 当前会话 id）。 */
  children: { id: string; title: string }[]
  /** 会话最近活动时间（图七悬浮卡「最近活动」；来自会话列表 updatedAt）。 */
  lastActivity?: number
  /** 会话工作目录（workspace chip 展示/复制；缺省不渲染 chip）。 */
  cwd?: string
  /** 会话预设显示名（官方 AgentPresetLabel 语义：投影 agentPreset → agentPresets/list 名称；缺省不渲染）。 */
  preset?: string
}

/** ghost 图标钮（28×28 钮 + 16px 图标，3099 顶栏实测尺寸；disabled 置灰且保留 title 诚实标注）。 */
function GhostIconButton({ icon, label, caret, disabled, ariaExpanded, onClick }: {
  icon: string
  /** 即 title/aria-label（含置灰原因，如「附件面板待接入」）。 */
  label: string
  /** folder▾ 的下拉小箭头。 */
  caret?: boolean
  disabled?: boolean
  ariaExpanded?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      data-header-icon={icon}
      title={label}
      aria-label={label}
      aria-expanded={ariaExpanded}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded text-outline transition-colors ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer hover:bg-hover hover:text-on-surface'
      }`}
    >
      <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden>{icon}</span>
      {caret === true && <span className="text-[9px] leading-none" aria-hidden>▾</span>}
    </button>
  )
}

/** 头部小菜单项（⋯ / workspace chip 菜单共用；hint 用于「已复制」类瞬时反馈；
    icon 用于打开方式菜单的宿主应用图标——3099 实测每项带真实应用图标）。 */
function HeaderMenuItem({ label, hint, disabled, title, icon, onClick }: {
  label: string
  hint?: string
  disabled?: boolean
  title?: string
  icon?: ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-full items-center justify-between gap-3 rounded-[6px] px-2 text-left text-[12.5px] transition-colors ${
        disabled
          ? 'cursor-not-allowed text-ink-3 opacity-50'
          : 'cursor-pointer text-ink-2 hover:bg-hover hover:text-ink'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        {icon !== undefined && <span className="flex size-[18px] shrink-0 items-center justify-center">{icon}</span>}
        <span className="truncate">{label}</span>
      </span>
      {hint !== undefined && <span className="shrink-0 text-[11px] text-ink-3">{hint}</span>}
    </button>
  )
}

/** workspace chip（3099 实测 open-in-app split button，2026-09-19 重做）：主钮 =
    在记忆应用中打开工作目录（图标为宿主 PNG，/open-in-app/icon/<id>；3099 实测
    explorer 图标即黄色文件夹），chevron 钮 = 「选择打开方式」菜单（官方
    ui-open-in-app OpenInAppAction：应用列表 + 复制路径；apps 来自
    GET /open-in-app/apps，启动 POST /open-in-app/open {app, path}，选择持久化
    localStorage dsh.open-in-app.choice——controller.ts:22-87）。宿主未探测到可
    命名应用时回落纯复制路径菜单（folder 字形）。 */
const OPEN_IN_APP_LABELS: Record<string, string> = {
  explorer: '文件资源管理器',
  cursor: 'Cursor',
  vscode: 'VS Code',
  finder: '访达',
  windowsterminal: 'Windows Terminal',
  gitbash: 'Git Bash',
}
const OPEN_IN_APP_CHOICE_KEY = 'dsh.open-in-app.choice'
/** 应用图标加载失败过的 id：404 只请求一次，回落通用方形 SVG（官方 failedIcons 语义）。 */
const failedAppIcons = new Set<string>()

function AppIconImage({ id, size }: { id: string; size: number }) {
  const [failed, setFailed] = useState(() => failedAppIcons.has(id))
  if (failed) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <rect x={3} y={3} width={18} height={18} rx={5} />
      </svg>
    )
  }
  return (
    <img
      src={`/open-in-app/icon/${id}`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      draggable={false}
      onError={() => {
        failedAppIcons.add(id)
        setFailed(true)
      }}
    />
  )
}

function WorkspaceChip({ cwd }: { cwd: string }) {
  const [apps, setApps] = useState<string[] | null>(null)
  const [choice, setChoice] = useState(() => window.localStorage.getItem(OPEN_IN_APP_CHOICE_KEY) ?? '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [errorFlash, setErrorFlash] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  // 宿主探测一次（controller.ts run()：网络失败 = 空列表 = 无应用形态）。
  useEffect(() => {
    let cancelled = false
    void fetch('/open-in-app/apps', { headers: { accept: 'application/json' } })
      .then(response => (response.ok ? response.json() as Promise<{ apps?: unknown }> : Promise.reject(new Error(String(response.status)))))
      .then(payload => {
        if (cancelled) return
        const list = Array.isArray(payload.apps) ? payload.apps.filter((id): id is string => typeof id === 'string') : []
        setApps(list)
      })
      .catch(() => { if (!cancelled) setApps([]) })
    return () => { cancelled = true }
  }, [])
  // 点击 chip 外部收起菜单。
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])
  const namedApps = (apps ?? []).filter(id => OPEN_IN_APP_LABELS[id] !== undefined)
  const current = namedApps.find(id => id === choice) ?? namedApps[0]
  const launch = useCallback((appId: string) => {
    void fetch('/open-in-app/open', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app: appId, path: cwd }),
    }).then(response => {
      if (response.ok) return
      setErrorFlash(true)
      window.setTimeout(() => setErrorFlash(false), 2000)
    }).catch(() => {
      setErrorFlash(true)
      window.setTimeout(() => setErrorFlash(false), 2000)
    })
  }, [cwd])
  const copyCwd = useCallback(() => {
    void navigator.clipboard.writeText(cwd).catch(() => undefined)
  }, [cwd])
  // 应用形态（官方同款：主钮 = 记忆应用图标直开；chevron = 应用菜单）。
  const hasApps = namedApps.length > 0
  const sharedCls =
    'flex h-[26px] items-center justify-center bg-surface-container text-on-surface-variant transition-colors first:rounded-l-[6px] last:rounded-r-[6px] hover:bg-surface-container-high cursor-pointer'
  const currentLabel = current !== undefined ? OPEN_IN_APP_LABELS[current] : undefined
  return (
    <span className="relative flex h-[26px] shrink-0" data-workspace-chip title={errorFlash ? '打开失败' : cwd} ref={rootRef}>
      <button
        type="button"
        aria-label={hasApps && current !== undefined && currentLabel !== undefined ? `在 ${currentLabel} 中打开工作目录` : '工作目录'}
        aria-expanded={menuOpen}
        title={errorFlash ? '打开失败' : hasApps ? '在本地打开' : cwd}
        disabled={errorFlash}
        onClick={() => {
          if (current !== undefined) launch(current)
        }}
        className={`${sharedCls} w-7`}
      >
        {hasApps && current !== undefined
          ? <AppIconImage id={current} size={15} />
          : <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden>folder</span>}
      </button>
      <button
        type="button"
        aria-label={hasApps ? '选择打开方式' : '工作目录菜单'}
        aria-expanded={menuOpen}
        title={hasApps ? '选择打开方式' : '工作目录菜单'}
        onClick={() => setMenuOpen(open => !open)}
        className={`${sharedCls} w-[22px]`}
      >
        <span className="material-symbols-outlined text-[14px] leading-none" aria-hidden>expand_more</span>
      </button>
      {menuOpen && (
        <div
          data-session-folder-menu
          className="absolute right-0 top-full z-20 mt-1 w-48 rounded-[10px] border border-line bg-surface p-1 shadow-raised"
        >
          {namedApps.map(id => (
            <HeaderMenuItem
              key={id}
              label={OPEN_IN_APP_LABELS[id]}
              title={cwd}
              icon={<AppIconImage id={id} size={16} />}
              onClick={() => {
                setMenuOpen(false)
                setChoice(id)
                window.localStorage.setItem(OPEN_IN_APP_CHOICE_KEY, id)
                launch(id)
              }}
            />
          ))}
          {hasApps && <div className="my-1 h-px bg-line" aria-hidden />}
          <HeaderMenuItem label="复制路径" title={cwd} onClick={() => { copyCwd(); setMenuOpen(false) }} />
        </div>
      )}
    </span>
  )
}

/** 元素内容是否横向溢出（标题收缩自适应：溢出才渐隐，未溢出不出现空隙）。 */
function useOverflowing(): [RefObject<HTMLSpanElement>, boolean] {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [overflowing, setOverflowing] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (el === null) return
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, overflowing]
}

/** 相对时间（图七「最近活动 4 分钟前」）。 */
function relativeTime(time: number | undefined): string | undefined {
  if (time === undefined || !Number.isFinite(time) || time <= 0) return undefined
  const delta = Math.max(0, Date.now() - time)
  const minute = 60_000
  if (delta < minute) return '刚刚'
  if (delta < 60 * minute) return `${String(Math.floor(delta / minute))} 分钟前`
  if (delta < 24 * 60 * minute) return `${String(Math.floor(delta / (60 * minute)))} 小时前`
  return `${String(Math.floor(delta / (24 * 60 * minute)))} 天前`
}

/** 文件夹悬浮卡（图七）：工作区名/路径/最近活动/分支。分支在展开时实时查询。 */
function WorkspaceCard({ sessionId, cwd, lastActivity }: { sessionId: string; cwd: string; lastActivity?: number }) {
  const [branch, setBranch] = useState<string | null>(null)
  useEffect(() => {
    let stale = false
    api
      .gitBranch({ sessionId, cwd })
      .then(result => { if (!stale) setBranch(result.current.length > 0 ? result.current : null) })
      .catch(() => { if (!stale) setBranch(null) })
    return () => { stale = true }
  }, [sessionId, cwd])
  const name = cwd.split(/[\\/]/u).filter(part => part.length > 0).pop() ?? cwd
  const activity = relativeTime(lastActivity)
  return (
    <div
      data-workspace-card
      className="absolute left-0 top-[30px] z-[60] w-[280px] rounded-xl border-[0.5px] border-surface-container-highest bg-surface-container-lowest p-3.5 shadow-overlay"
    >
      <div className="flex items-center gap-2.5">
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant" aria-hidden>folder</span>
        <span className="text-[14px] leading-5 font-medium text-on-surface">{name}</span>
      </div>
      <div className="mt-1.5 pl-[28px] text-[12px] leading-[18px] text-outline break-all">{cwd}</div>
      {activity !== undefined ? (
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[16px] text-outline" aria-hidden>schedule</span>
          <span className="text-[12.5px] leading-5 text-on-surface-variant">最近活动 {activity}</span>
        </div>
      ) : null}
      {branch === null ? null : (
        <div className="mt-2 flex items-center gap-2.5 border-t-[0.5px] border-surface-container-highest pt-2.5">
          <span className="material-symbols-outlined text-[16px] text-outline" aria-hidden>account_tree</span>
          <span className="font-mono text-[12.5px] leading-5 text-on-surface-variant">{branch}</span>
        </div>
      )}
    </div>
  )
}

export function SessionHeader({ data, onOpenSession, cwd, dockCollapsed, onExpandDock, onOpenDockTab, onToggleTerminal, terminalOpen, headerActions }: {
  data: SessionHeaderData
  /** 切换会话（App 的 openSession）。 */
  onOpenSession?: (id: string) => void
  /** 工作目录（ChatFlow 透传；缺省回落 data.cwd）。 */
  cwd?: string
  /** 右坞收起态（right_panel_open/close 图标切换）。 */
  dockCollapsed?: boolean
  /** 右坞展开/收起（corner 语义）。 */
  onExpandDock?: () => void
  onCollapseDock?: () => void
  /** 打开右坞指定 tab（dockkit 通道；终端钮弹底部面板；trajectory=调用轨迹）。 */
  onOpenDockTab?: (tab: 'terminal' | 'files' | 'changes' | 'team' | 'sidechat' | 'side' | 'trajectory' | 'browser' | 'jobs' | 'start') => void
  /** 终端钮（3099 实测形态：对话内容区底部弹出终端面板；未接线时置灰）。 */
  onToggleTerminal?: () => void
  /** 底部终端面板开合态（终端钮 aria-expanded）。 */
  terminalOpen?: boolean
  /** 会话操作（⋯菜单；整组未接线时置灰）。 */
  headerActions?: {
    rename?: (title: string) => void
    exportMarkdown?: () => void
    copyId?: () => void
  }
}) {
  const [childrenOpen, setChildrenOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  // ⋯ 小菜单（workspace chip 菜单已内聚进 WorkspaceChip）。
  const [menu, setMenu] = useState<'more' | null>(null)
  // 行内重命名（⋯菜单 → 标题位变输入框，回车提交 / Esc 取消 / 失焦提交）。
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  // Agent Team 面板数据（真实数据源：官方 agent-team 服务 Remote 通道 agentTeams/view）。
  const [team, setTeam] = useState<AgentTeamView | null>(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // 先取出父会话：闭包里用 `data.parent` 会丢失收窄（TS 对属性访问的收窄在回调中失效）。
  const parent = data.parent
  // 名册/任务板按 lead 会话路由：成员子会话映射到父会话。
  const leadSessionId = leadSessionIdOf(data.id, parent?.id)
  // chip 用的 cwd：ChatFlow 透传优先，回落 data.cwd。
  const effectiveCwd = cwd ?? data.cwd
  // 文件夹悬浮卡（图六/图七，2026-09-19）：悬浮/点击工作区图标查看工作区信息。
  const [wsCardOpen, setWsCardOpen] = useState(false)
  const wsCardTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const openWsCard = () => {
    clearTimeout(wsCardTimer.current)
    wsCardTimer.current = setTimeout(() => setWsCardOpen(true), 180)
  }
  const closeWsCard = () => {
    clearTimeout(wsCardTimer.current)
    wsCardTimer.current = setTimeout(() => setWsCardOpen(false), 120)
  }
  // 标题收缩自适应（用户裁定：会话名与「N 个子代理」之间不应有大空白）——
  // 标题收缩到内容宽度，溢出时才渐隐裁切。
  const [titleRef, titleOverflow] = useOverflowing()

  // 请求代际号：会话切换或连续刷新时丢弃过期响应。
  const loadSeqRef = useRef(0)
  // 已加载的 lead 会话 id：切换会话时清掉上一会话的旧视图/错误，避免徽标串数据。
  const loadedIdRef = useRef<string | null>(null)
  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current
    if (loadedIdRef.current !== leadSessionId) {
      loadedIdRef.current = leadSessionId
      setTeam(null)
      setTeamError(null)
    }
    setTeamLoading(true)
    try {
      const next = await viewAgentTeam(leadSessionId)
      if (loadSeqRef.current !== seq) return
      setTeam(next)
      setTeamError(null)
    } catch (reason) {
      if (loadSeqRef.current !== seq) return
      setTeamError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      if (loadSeqRef.current === seq) setTeamLoading(false)
    }
  }, [leadSessionId])

  // 会话变化（含首次挂载）时拉一次，用于按钮上的成员数徽标。
  useEffect(() => {
    void load()
  }, [load])

  // 点击头外部收起所有浮层（子代理列表 / Agent Team 面板 / ⋯、folder 菜单）。
  useEffect(() => {
    if (!childrenOpen && !teamOpen && menu === null && !wsCardOpen) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setChildrenOpen(false)
        setTeamOpen(false)
        setMenu(null)
        setWsCardOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [childrenOpen, teamOpen, menu, wsCardOpen])

  // 两个浮层互斥：打开一个即收起另一个。
  const toggleChildren = () => {
    setChildrenOpen(open => !open)
    setTeamOpen(false)
  }
  const toggleTeam = () => {
    setChildrenOpen(false)
    const next = !teamOpen
    setTeamOpen(next)
    // 打开面板时刷新一次最新名册/任务。
    if (next) void load()
  }

  // ⋯菜单：重命名 → 标题位行内输入框。
  const openRename = () => {
    setRenameValue(data.title)
    setRenaming(true)
    setMenu(null)
  }
  const commitRename = useCallback(() => {
    if (!renaming) return
    const next = renameValue.trim()
    setRenaming(false)
    if (next.length > 0 && next !== data.title) headerActions?.rename?.(next)
  }, [renaming, renameValue, data.title, headerActions])

  return (
    <div
      ref={rootRef}
      data-session-header
      className={
        // 右坞收起时顶栏直抵窗口右缘，给固定窗口控制条（3×44px）留出避让，
        // 防止终端/侧边按钮被盖住（2026-09-19 用户裁定修复）。
        `min-h-[40px] shrink-0 select-none bg-surface pl-5 pt-2.5 ${
          dockCollapsed === true ? "pr-[140px]" : "pr-7"
        }`
      }
    >
      <div className="flex w-full min-w-0 items-center gap-2.5">
        {/* 左：面包屑 / 标题 + 子代理 count trigger + 预设标签 + Agent Team（官方 titleCluster） */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="relative flex min-w-0 flex-1 items-center gap-1">
            <div
              className="relative shrink-0"
              onMouseEnter={openWsCard}
              onMouseLeave={closeWsCard}
            >
              <button
                type="button"
                data-workspace-folder
                title="工作区信息"
                aria-expanded={wsCardOpen}
                onClick={() => setWsCardOpen(value => !value)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-hover hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden>folder</span>
              </button>
              {wsCardOpen && effectiveCwd !== undefined && effectiveCwd.length > 0 ? (
                <WorkspaceCard sessionId={data.id} cwd={effectiveCwd} lastActivity={data.lastActivity} />
              ) : null}
            </div>
            {renaming ? (
              <input
                data-session-rename-input
                autoFocus
                value={renameValue}
                onChange={event => setRenameValue(event.target.value)}
                onBlur={commitRename}
                onKeyDown={event => {
                  if (event.key === 'Enter') commitRename()
                  if (event.key === 'Escape') setRenaming(false)
                }}
                className="h-6 w-56 rounded-md border border-primary bg-field px-1.5 text-[12.5px] text-on-surface outline-none"
              />
            ) : parent !== undefined ? (
              <>
                <button
                  type="button"
                  data-session-parent={parent.id}
                  title={parent.title}
                  onClick={() => onOpenSession?.(parent.id)}
                  className="min-w-0 shrink overflow-hidden whitespace-nowrap rounded-[12px] px-2 py-1 text-[14px] leading-5 text-outline transition-colors [mask-image:linear-gradient(to_right,black_calc(100%-18px),transparent)] hover:bg-hover hover:text-on-surface cursor-pointer"
                >
                  {parent.title}
                </button>
                {/* 官方 crumbSep：14px caption 灰的 `/` 分隔 */}
                <span className="shrink-0 text-[14px] leading-5 text-ink-3" aria-hidden>/</span>
                <span
                  data-session-title
                  title={data.title}
                  className={`min-w-[96px] shrink cursor-default overflow-hidden whitespace-nowrap text-[14px] leading-5 font-medium text-on-surface ${titleOverflow ? '[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]' : ''}`}
                  ref={titleRef}
                >
                  {data.title}
                </span>
              </>
            ) : (
              <span
                data-session-title
                title={data.title}
                className={`min-w-[96px] shrink cursor-default overflow-hidden whitespace-nowrap text-[14px] leading-5 font-medium text-on-surface ${titleOverflow ? '[mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)]' : ''}`}
                  ref={titleRef}
              >
                {data.title}
              </span>
            )}
          </div>

          {/* 子代理 count trigger（官方 SubagentHeaderLineage lineage 形态：
              `/` 分隔 + 无边框 tertiary 钮 + chevron；下拉换会话） */}
          {data.children.length > 0 && (
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-[14px] leading-5 text-ink-3" aria-hidden>/</span>
              <div className="relative">
                <button
                  type="button"
                  data-subagent-chip
                  aria-expanded={childrenOpen}
                  aria-haspopup="tree"
                  onClick={toggleChildren}
                  className="flex min-h-[28px] items-center gap-1 rounded-md px-0.5 py-[3px] text-[12px] leading-[18px] text-ink-3 transition-colors hover:text-ink-2 cursor-pointer"
                >
                  <span>{data.children.length} 个子代理</span>
                  <IconChevronDownOutline14
                    size={14}
                    className={`shrink-0 transition-transform duration-100 ${childrenOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {childrenOpen && (
                  <div
                    data-subagent-list
                    className="absolute left-0 top-full z-20 mt-1 max-h-64 w-64 overflow-y-auto rounded-[10px] border border-line bg-surface p-1 shadow-raised"
                  >
                    {data.children.map(child => (
                      <button
                        key={child.id}
                        type="button"
                        data-subagent-item={child.id}
                        title={child.title}
                        onClick={() => {
                          onOpenSession?.(child.id)
                          setChildrenOpen(false)
                        }}
                        className="flex h-8 w-full items-center rounded-[6px] px-2 text-left text-[12.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink cursor-pointer"
                      >
                        <span className="min-w-0 flex-1 truncate">{child.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 会话预设（官方 AgentPresetLabel：图标 + 名字的只读 tsp fill 标签） */}
          {data.preset !== undefined && data.preset.length > 0 && (
            <span
              data-session-preset
              title="会话预设"
              className="flex h-[22px] min-w-0 max-w-[180px] shrink items-center gap-1 overflow-hidden whitespace-nowrap rounded-md bg-surface-container pr-0.5 text-[12px] leading-[22px] text-on-surface-variant"
            >
              <IconAgentPresetOutline16 size={14} className="shrink-0 opacity-70" />
              <span className="truncate">{data.preset}</span>
            </span>
          )}

          {/* Agent Team（官方 TeamAction trigger：人形图标 + 文案 + count 徽标，
              无边框透明钮 hover 底；面板=名册/任务板，真实数据源 agent-team Remote 通道）。
              拉取失败不置灰，仅把 title 标为「团队数据不可用」，错误在面板内展示并可重试。 */}
          <div className="relative min-w-0 shrink">
            <button
              type="button"
              data-agent-team
              aria-expanded={teamOpen}
              title={teamError !== null ? '团队数据不可用' : 'Agent Team'}
              onClick={toggleTeam}
              className="flex min-h-[28px] min-w-0 items-center gap-[5px] overflow-hidden rounded-md px-[7px] py-[3px] text-[12px] leading-[18px] text-on-surface-variant transition-colors hover:bg-hover cursor-pointer"
            >
              <IconUserOutline16 size={14} className="shrink-0" />
              <span className="truncate">Agent Team</span>
              {team !== null && (
                <span
                  data-agent-team-count
                  className="flex h-4 min-w-4 items-center justify-center rounded-lg bg-surface-container-high px-1 text-[10px] leading-4 text-ink-3 tabular-nums"
                >
                  {team.members.length}
                </span>
              )}
            </button>
            {teamOpen && (
              <AgentTeamPanel
                view={team}
                loading={teamLoading}
                error={teamError}
                onRefresh={() => { void load() }}
              />
            )}
          </div>
        </div>

        {/* 右：workspace open-in-app split chip + ⋯ + 终端 + ⊕侧边 + 右坞开关（官方 utilities/corner 顺序） */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5" data-header-icons>
          {effectiveCwd !== undefined && effectiveCwd.length > 0 && (
            <WorkspaceChip cwd={effectiveCwd} />
          )}
          <div className="relative shrink-0">
            <GhostIconButton
              icon="more_horiz"
              label={headerActions === undefined ? '会话操作未接线' : '更多操作'}
              disabled={headerActions === undefined}
              ariaExpanded={menu === 'more'}
              onClick={() => setMenu(current => (current === 'more' ? null : 'more'))}
            />
            {menu === 'more' && headerActions !== undefined && (
              <div
                data-session-more-menu
                className="absolute right-0 top-full z-20 mt-1 w-44 rounded-[10px] border border-line bg-surface p-1 shadow-raised"
              >
                <HeaderMenuItem
                  label="重命名任务"
                  disabled={headerActions.rename === undefined}
                  onClick={openRename}
                />
                <HeaderMenuItem
                  label="导出 Markdown"
                  disabled={headerActions.exportMarkdown === undefined}
                  onClick={() => {
                    headerActions.exportMarkdown?.()
                    setMenu(null)
                  }}
                />
                <HeaderMenuItem
                  label="复制任务 ID"
                  disabled={headerActions.copyId === undefined}
                  onClick={() => {
                    headerActions.copyId?.()
                    setMenu(null)
                  }}
                />
                {/* 调用轨迹（2026-09-19，用户裁定）：从右坞新开 tab 查看当前任务的
                    事件时间线； descriptor hidden，不进开始页。 */}
                <HeaderMenuItem
                  label="查看调用轨迹"
                  disabled={onOpenDockTab === undefined}
                  onClick={() => {
                    setMenu(null)
                    onExpandDock?.()
                    onOpenDockTab?.('trajectory')
                  }}
                />
              </div>
            )}
          </div>
          {/* 终端（3099 实测：点按钮 = 对话内容区底部弹出终端面板，非右坞 tab；
              再点收起，面板内 × 同样收起） */}
          <GhostIconButton
            icon="terminal"
            label="终端"
            disabled={onToggleTerminal === undefined}
            ariaExpanded={terminalOpen}
            onClick={() => {
              setMenu(null)
              onToggleTerminal?.()
            }}
          />
          {/* 「⊕侧边」（3099 实测 64×26 胶囊）：打开右坞 sidenote fork 式侧聊 tab
              ——从当前任务 fork 独立演进（与 better-sidebar 内建「侧边对话」
              beta 管理页是两个东西，3099 上并存）。 */}
          <button
            type="button"
            data-header-side-chat
            title="打开侧边聊天（从当前任务 fork）"
            aria-label="打开侧边聊天（从当前任务 fork）"
            disabled={onOpenDockTab === undefined}
            onClick={() => {
              setMenu(null)
              onExpandDock?.()
              onOpenDockTab?.('side')
            }}
            className={`flex h-[26px] shrink-0 items-center gap-[5px] rounded-full border px-2.5 text-[12px] leading-[18px] transition-colors ${
              onOpenDockTab === undefined
                ? 'cursor-not-allowed border-line/50 text-ink-3 opacity-40'
                : 'cursor-pointer border-line text-on-surface-variant hover:bg-hover hover:text-on-surface'
            }`}
          >
            <IconNewChatOutline16 size={13} />
            <span>侧边</span>
          </button>
          {/* 右坞开关（收起态出现在顶栏；图标与右坞 tab 行收起钮同款
              IconPanelLeftOutline16——3099 实测两侧同一右面板形图标） */}
          {dockCollapsed === true && (
            <button
              type="button"
              data-header-dock-expand
              title="打开右坞"
              aria-label="打开右坞"
              disabled={onExpandDock === undefined}
              onClick={() => {
                setMenu(null)
                onExpandDock?.()
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-outline transition-colors hover:bg-hover hover:text-on-surface cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconPanelLeftOutline16 size={16} />
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
