// 会话头（M4，2026-09-18；同日图四顶行改版）：对话区顶部一条会话头，形态对齐
// stitch_codex_ui_clone/codex_01_stream_autonomous_flow/screen.png 顶行：
// 左=面包屑（父会话可点 › 当前标题，重命名时行内变输入框）+ workspace chip
// （folder 图标+色点+cwd basename，点击复制路径并短提示「已复制」）+「⋯」会话菜单
// （重命名/导出 Markdown/复制会话 ID）；右=子代理 chip + Agent Team chip（功能保留，
// 设计稿无对应物，按功能放在图标组左侧）+ ghost 图标组（folder▾ 路径菜单 |
// image 附件置灰 | terminal 右坞终端 | 1px 分隔线 | right_panel_close/open 右坞收起/展开）。
// 行为语义按官方 header.actions/utilities/corner 映射；能力未接的置灰并 title 诚实标注。
// 数据由 App 从 web.sessions 计算后经 ChatFlow 传入（mock 模式无 web 数据 → 不渲染本头）。
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  leadSessionIdOf,
  viewAgentTeam,
  type AgentTeamView,
} from '../adapters/dsh-web/agent-teams'
import { AgentTeamPanel } from './AgentTeamPanel.tsx'

/** 会话头数据（App 侧从真实会话列表算出）。 */
export interface SessionHeaderData {
  /** 当前会话 id（Agent Team 面板查 agentTeams/view 用）。 */
  id: string
  title: string
  /** 父会话（层级导航），无父会话时为 undefined。 */
  parent?: { id: string; title: string }
  /** 子代理/子会话（其他会话的 parentSessionId === 当前会话 id）。 */
  children: { id: string; title: string }[]
  /** 会话工作目录（workspace chip 展示/复制；缺省不渲染 chip）。 */
  cwd?: string
}

/** workspace chip 色点小色板（项目现有强调色；按 cwd hash 取色，同路径稳定同色）。 */
const WORKSPACE_DOT_COLORS = ['#4edea3', '#adc6ff', '#e8a262', '#c0c1ff'] as const

/** cwd 末段（workspace chip 文案；反斜杠统一按 / 切）。 */
function cwdBasename(cwd: string): string {
  const normalized = cwd.replace(/\\/g, '/')
  return normalized.slice(Math.max(0, normalized.lastIndexOf('/') + 1)) || cwd
}

/** 简单字符串 hash（色点取色用；非安全场景）。 */
function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 9973
  }
  return hash
}

/** ghost 图标钮（16px 图标 + hover 反色；disabled 置灰且保留 title 诚实标注）。 */
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
      className={`flex h-6 min-w-6 items-center justify-center gap-0.5 rounded p-1 text-outline transition-colors ${
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

/** 头部小菜单项（⋯ / folder▾ 菜单共用；hint 用于「已复制」类瞬时反馈）。 */
function HeaderMenuItem({ label, hint, disabled, title, onClick }: {
  label: string
  hint?: string
  disabled?: boolean
  title?: string
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
      <span className="truncate">{label}</span>
      {hint !== undefined && <span className="shrink-0 text-[11px] text-ink-3">{hint}</span>}
    </button>
  )
}

/** workspace chip（图四）：folder 图标 + cwd basename + 色点；点击复制完整路径。 */
function WorkspaceChip({ cwd }: { cwd: string }) {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(cwd)
      .then(() => {
        setCopied(true)
        window.clearTimeout(copiedTimer.current)
        copiedTimer.current = window.setTimeout(() => setCopied(false), 1600)
      })
      .catch(() => undefined)
  }, [cwd])
  const dotColor = WORKSPACE_DOT_COLORS[hashString(cwd) % WORKSPACE_DOT_COLORS.length]
  return (
    <span className="relative min-w-0">
      <button
        type="button"
        data-workspace-chip
        title={copied ? '已复制' : cwd}
        onClick={copy}
        className="flex h-[22px] min-w-0 items-center gap-1 rounded-md bg-surface-container px-1.5 text-[12px] text-on-surface-variant transition-colors hover:bg-surface-container-high cursor-pointer"
      >
        <span className="material-symbols-outlined shrink-0 text-[14px] leading-none" aria-hidden>folder</span>
        <span className="max-w-[180px] truncate">{cwdBasename(cwd)}</span>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} aria-hidden />
      </button>
      {copied && (
        <span
          data-workspace-copied
          className="absolute left-0 top-full z-20 mt-1 rounded-md border border-line bg-surface px-2 py-0.5 text-[11px] text-ink-2 shadow-raised"
        >
          已复制
        </span>
      )}
    </span>
  )
}

export function SessionHeader({ data, onOpenSession, cwd, dockCollapsed, onExpandDock, onCollapseDock, onOpenDockTab, headerActions }: {
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
  /** 打开右坞指定 tab（terminal 等；未接线时对应钮置灰）。 */
  onOpenDockTab?: (tab: 'terminal' | 'files' | 'changes' | 'team') => void
  /** 会话操作（⋯菜单；整组未接线时置灰）。 */
  headerActions?: {
    rename?: (title: string) => void
    exportMarkdown?: () => void
    copyId?: () => void
  }
}) {
  const [childrenOpen, setChildrenOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  // ⋯ / folder▾ 两个小菜单（互斥）。
  const [menu, setMenu] = useState<'more' | 'folder' | null>(null)
  // 行内重命名（⋯菜单 → 标题位变输入框，回车提交 / Esc 取消 / 失焦提交）。
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  // folder▾ 菜单「复制路径」的瞬时反馈。
  const [pathCopied, setPathCopied] = useState(false)
  const pathCopiedTimer = useRef<number | undefined>(undefined)
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

  // 卸载时清掉复制反馈定时器。
  useEffect(() => () => window.clearTimeout(pathCopiedTimer.current), [])

  // 点击头外部收起所有浮层（子代理列表 / Agent Team 面板 / ⋯、folder 菜单）。
  useEffect(() => {
    if (!childrenOpen && !teamOpen && menu === null) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setChildrenOpen(false)
        setTeamOpen(false)
        setMenu(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [childrenOpen, teamOpen, menu])

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

  // folder▾ 菜单：复制工作目录路径（菜单项上短暂显示「已复制」）。
  const copyCwd = useCallback(() => {
    if (effectiveCwd === undefined) return
    void navigator.clipboard.writeText(effectiveCwd)
      .then(() => {
        setPathCopied(true)
        window.clearTimeout(pathCopiedTimer.current)
        pathCopiedTimer.current = window.setTimeout(() => setPathCopied(false), 1200)
      })
      .catch(() => undefined)
  }, [effectiveCwd])

  return (
    <div
      ref={rootRef}
      data-session-header
      className="h-[30px] shrink-0 select-none bg-surface px-4 flex items-center"
    >
      <div className="mx-auto flex w-full max-w-[var(--dsh-chat-content-width)] items-center gap-2 min-w-0">
        {/* 左：面包屑 + workspace chip + ⋯（图四顶行顺序） */}
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <div className="flex min-w-0 items-center gap-1.5">
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
                  className="max-w-[220px] truncate text-outline transition-colors hover:text-on-surface hover:underline cursor-pointer"
                >
                  {parent.title}
                </button>
                <span className="shrink-0 text-outline/60" aria-hidden>›</span>
                <span
                  data-session-title
                  title={data.title}
                  className="max-w-[320px] min-w-[72px] truncate font-medium text-on-surface"
                >
                  {data.title}
                </span>
              </>
            ) : (
              <span
                data-session-title
                title={data.title}
                className="max-w-[420px] min-w-[72px] truncate font-medium text-on-surface"
              >
                {data.title}
              </span>
            )}
          </div>
          {effectiveCwd !== undefined && effectiveCwd.length > 0 && (
            <WorkspaceChip cwd={effectiveCwd} />
          )}
          {/* ⋯：重命名 / 导出 Markdown / 复制会话 ID（headerActions 未接线整组置灰） */}
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
                className="absolute left-0 top-full z-20 mt-1 w-44 rounded-[10px] border border-line bg-surface p-1 shadow-raised"
              >
                <HeaderMenuItem
                  label="重命名"
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
                  label="复制会话 ID"
                  disabled={headerActions.copyId === undefined}
                  onClick={() => {
                    headerActions.copyId?.()
                    setMenu(null)
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 右：子代理 chip + Agent Team + ghost 图标组（margin-left:auto 靠右） */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {/* 子代理 chip（无子会话不渲染；功能保留，设计稿无对应物） */}
          {data.children.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                data-subagent-chip
                aria-expanded={childrenOpen}
                onClick={toggleChildren}
                className="flex h-6 items-center gap-1 rounded-full border border-line bg-field px-2.5 text-[11.5px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink cursor-pointer"
              >
                <span>{data.children.length} 个子代理</span>
                <span
                  className={`text-[9px] text-ink-3 transition-transform ${childrenOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                >
                  ▾
                </span>
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
          )}

          {/* Agent Team 名册/任务板（真实数据源：官方 agent-team Remote 通道）。
              拉取失败不置灰，仅把 title 标为「团队数据不可用」，错误在面板内展示并可重试。 */}
          <div className="relative shrink-0">
            <button
              type="button"
              data-agent-team
              aria-expanded={teamOpen}
              title={teamError !== null ? '团队数据不可用' : 'Agent Team'}
              onClick={toggleTeam}
              className="flex h-6 items-center gap-1 rounded-full border border-line px-2.5 text-[11.5px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink cursor-pointer"
            >
              <span>Agent Team</span>
              {team !== null && (
                <span
                  data-agent-team-count
                  className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-field px-1 text-[10px] text-ink-3"
                >
                  {team.members.length}
                </span>
              )}
              <span
                className={`text-[9px] text-ink-3 transition-transform ${teamOpen ? 'rotate-180' : ''}`}
                aria-hidden
              >
                ▾
              </span>
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

          {/* ghost 图标组：folder▾｜image｜terminal｜分隔线｜右坞收起/展开 */}
          <div className="flex shrink-0 items-center gap-0.5" data-header-icons>
            <div className="relative shrink-0">
              <GhostIconButton
                icon="folder"
                label="工作目录"
                caret
                ariaExpanded={menu === 'folder'}
                onClick={() => setMenu(current => (current === 'folder' ? null : 'folder'))}
              />
              {menu === 'folder' && (
                <div
                  data-session-folder-menu
                  className="absolute right-0 top-full z-20 mt-1 w-48 rounded-[10px] border border-line bg-surface p-1 shadow-raised"
                >
                  <HeaderMenuItem
                    label="复制路径"
                    hint={pathCopied ? '已复制' : undefined}
                    disabled={effectiveCwd === undefined || effectiveCwd.length === 0}
                    title={effectiveCwd === undefined || effectiveCwd.length === 0 ? '无工作目录' : effectiveCwd}
                    onClick={copyCwd}
                  />
                  {/* 本机 App 打开属桌面壳阶段（官方 header.utilities 语义）；web 阶段诚实置灰。 */}
                  <HeaderMenuItem label="在资源管理器中打开" disabled title="桌面壳阶段开放" />
                </div>
              )}
            </div>
            {/* 设计稿的附件钮：能力未接，置灰并诚实标注。 */}
            <GhostIconButton icon="image" label="附件面板待接入" disabled />
            <GhostIconButton
              icon="terminal"
              label="终端"
              disabled={onOpenDockTab === undefined}
              onClick={() => {
                setMenu(null)
                onOpenDockTab?.('terminal')
              }}
            />
            <span className="mx-1 h-4 w-px bg-line" aria-hidden />
            <GhostIconButton
              icon={dockCollapsed === true ? 'right_panel_open' : 'right_panel_close'}
              label={dockCollapsed === true ? '展开右坞' : '收起右坞'}
              disabled={dockCollapsed === true ? onExpandDock === undefined : onCollapseDock === undefined}
              onClick={() => {
                setMenu(null)
                ;(dockCollapsed === true ? onExpandDock : onCollapseDock)?.()
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
