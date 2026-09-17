// 会话头（M4，2026-09-18）：对话区顶部一条会话头。
// 形态对齐 Magic 组合 web 端的会话头：左侧标题（有父会话则「父标题 › 当前标题」层级导航），
// 有子代理/子会话时右侧接一个「N 个子代理」chip（点击展开小列表，点条目切换过去）。
// 数据由 App 从 web.sessions 计算后经 ChatFlow 传入（mock 模式无 web 数据 → 不渲染本头）。
import { useEffect, useRef, useState } from 'react'

/** 会话头数据（App 侧从真实会话列表算出）。 */
export interface SessionHeaderData {
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
  const rootRef = useRef<HTMLDivElement>(null)
  // 先取出父会话：闭包里用 `data.parent` 会丢失收窄（TS 对属性访问的收窄在回调中失效）。
  const parent = data.parent

  // 点击头外部收起子代理列表（避免浮层常驻）。
  useEffect(() => {
    if (!childrenOpen) return
    const onDown = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setChildrenOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [childrenOpen])

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
              onClick={() => setChildrenOpen(open => !open)}
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

        {/* 右：Agent Team 占位（诚实处理）：暂无真实团队数据源，置灰不可点。 */}
        <button
          type="button"
          disabled
          data-agent-team
          title="Agent Team（暂无真实团队数据源）"
          className="h-6 shrink-0 rounded-full border border-line px-2.5 text-[11.5px] text-outline/50 cursor-not-allowed"
        >
          Agent Team
        </button>
      </div>
    </div>
  )
}