// Magic 客户端补丁文件（2026-09-19，非上游源码）：右坞「调用轨迹」tab 的本体。
// 事件流经宿主 binding face（App 的 ChatSessionStore + web.follow）直读当前任务
// 的持久事件，渲染复用 conversation/TrajectoryView（时间线表格 + 搜索）。
// 入口：会话头 ⋯ 菜单「查看调用轨迹」（descriptor hidden=true，不进开始页 guide
// ——用户裁定：调用轨迹不在开始页展示）。
import { useEffect, useState } from 'react'
import type { SessionEvent } from '../../../dsh-chat/index.ts'
import { TrajectoryView } from '../../../../conversation/TrajectoryView.tsx'

/** 轨迹 tab 的事件面（dock-context 的 binding face，events/subscribe 与侧聊同源）。 */
export interface TrajectoryTabProps {
  /** 当前任务 id（dock 按 dockSessionId 整体 remount，scope.sessionId 即活动任务）。 */
  sessionId: string
  eventsOf: () => readonly { type: string; seq: number; time: number; data: unknown }[]
  subscribe: (fn: () => void) => () => void
}

export function TrajectoryTabView({ sessionId, eventsOf, subscribe }: TrajectoryTabProps) {
  // binding.events() 是宿主 store 的引用直读：订阅只负责触发重渲（与 SideNoteView
  // 同款单向数据流——重渲后渲染期直读最新窗口）。
  const [, bump] = useState(0)
  useEffect(() => subscribe(() => bump(value => value + 1)), [subscribe])
  const entries = eventsOf() as unknown as readonly SessionEvent[]
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface text-on-surface" data-magic-trajectory-tab={sessionId}>
      <TrajectoryView entries={entries} />
    </div>
  )
}
