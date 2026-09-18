// 会话头（M4，2026-09-18）：对话区顶部一条会话头。
// 形态对齐 Magic 组合 web 端的会话头：左侧标题（有父会话则「父标题 › 当前标题」层级导航），
// 有子代理/子会话时右侧接一个「N 个子代理」chip（点击展开小列表，点条目切换过去）。
// 右侧另有「Agent Team」chip：点击展开名册/任务板弹层（AgentTeamPanel），数据走官方
// agent-team 服务 Remote 通道（adapters/dsh-web/agent-teams）。
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
}

export function SessionHeader({ data, onOpenSession }: {
  data: SessionHeaderData
  /** 切换会话（App 的 openSession）。 */
  onOpenSession?: (id: string) => void
}) {
  const [childrenOpen, setChildrenOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  // Agent Team 面板数据（真实数据源：官方 agent-team 服务 Remote 通道 agentTeams/view）。
  const [team, setTeam] = useState<AgentTeamView | null>(null)
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  // 先取出父会话：闭包里用 `data.parent` 会丢失收窄（TS 对属性访问的收窄在回调中失效）。
  const parent = data.parent
  // 名册/任务板按 lead 会话路由：成员子会话映射到父会话。
  const leadSessionId = leadSessionIdOf(data.id, parent?.id)

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

  // 点击头外部收起所有浮层（子代理列表 / Agent Team 面板，避免浮层常驻）。
  useEffect(() => {
    if (!childrenOpen && !teamOpen) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setChildrenOpen(false)
        setTeamOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [childrenOpen, teamOpen])

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

  return (
    <div
      ref={rootRef}
      data-session-header
      className="h-9 shrink-0 select-none bg-surface px-4 flex items-center"
    >
      <div className="mx-auto flex w-full max-w-[var(--dsh-chat-content-width)] items-center gap-2 min-w-0">
        {/* 左：标题 / 层级导航 */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
          {parent !== undefined ? (
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
                className="max-w-[320px] truncate font-medium text-on-surface"
              >
                {data.title}
              </span>
            </>
          ) : (
            <span
              data-session-title
              title={data.title}
              className="max-w-[420px] truncate font-medium text-on-surface"
            >
              {data.title}
            </span>
          )}
        </div>

        {/* 中：子代理 chip（无子会话不渲染） */}
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

        {/* 右：Agent Team 名册/任务板（真实数据源：官方 agent-team Remote 通道）。
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
      </div>
    </div>
  )
}