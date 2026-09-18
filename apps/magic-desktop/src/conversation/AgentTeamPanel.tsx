// Agent Team 面板（2026-09-18）：会话头右侧「Agent Team」按钮的弹层。
// 数据源：适配器 ../adapters/dsh-web/agent-teams（官方 agent-team 服务 Remote 通道 agentTeams/view）。
// 语义对齐官方 client-ui-agent-team（reference-project/deepseek-harness/.../TeamAction.tsx:276-395）：
// 名册展示 name/role/status/model/diagnostics，任务板展示 subject/status/blockedBy/ownerName/ready。
// 面板只读（PRD-04 §12：任务板只读）。皮肤对齐 SessionHeader 既有 token，不引入新视觉。
import type {
  AgentTeamMemberView,
  AgentTeamTaskView,
  AgentTeamView,
} from '../adapters/dsh-web/agent-teams'

/** 名册成员状态中文（对齐 AgentTeamMemberView.status 联合类型）。 */
const MEMBER_STATUS: Record<AgentTeamMemberView['status'], string> = {
  running: '进行中',
  idle: '空闲',
  inactive: '已停止',
  provisioning: '创建中',
  failed: '失败',
}

/** 任务状态中文（对齐 AgentTeamTaskView.status 联合类型，含 deleted 兜底）。 */
const TASK_STATUS: Record<AgentTeamTaskView['status'], string> = {
  pending: '待处理',
  in_progress: '进行中',
  completed: '已完成',
  deleted: '已删除',
}

export interface AgentTeamPanelProps {
  /** 团队视图；首次加载完成前为 null。 */
  view: AgentTeamView | null
  /** 是否正在请求（用于刷新按钮置灰）。 */
  loading: boolean
  /** 请求错误消息；成功时为 null。 */
  error: string | null
  /** 刷新（工具条与错误态「重试」共用）。 */
  onRefresh: () => void
}

export function AgentTeamPanel({ view, loading, error, onRefresh }: AgentTeamPanelProps) {
  // 「仅 lead 成员且无任务」= 尚未组建团队（未组队的会话官方也会返回 lead 单行）。
  const noTeam =
    view !== null &&
    view.members.every(member => member.role === 'lead') &&
    view.tasks.length === 0

  return (
    <div
      data-agent-team-panel
      role="dialog"
      aria-label="Agent Team"
      className="absolute right-0 top-full z-20 mt-1 w-80 overflow-hidden rounded-[10px] border border-line bg-surface shadow-raised"
    >
      {/* 工具条：标题 + 刷新 */}
      <div className="flex h-8 items-center gap-1 border-b border-line px-2.5">
        <span className="text-[12.5px] font-medium text-ink">Agent Team</span>
        <span className="flex-1" />
        <button
          type="button"
          data-agent-team-refresh
          title="刷新"
          aria-label="刷新"
          disabled={loading}
          onClick={onRefresh}
          className="flex h-6 w-6 items-center justify-center rounded-[6px] text-[13px] text-ink-3 transition-colors hover:bg-hover hover:text-ink disabled:opacity-50 cursor-pointer"
        >
          ↻
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto p-2">
        {/* 错误态：消息 + 重试 */}
        {error !== null && (
          <div
            data-agent-team-error
            role="alert"
            className="mb-2 rounded-[6px] border border-red/30 bg-red-tint px-2 py-1.5 text-[11.5px] text-red"
          >
            <div className="[overflow-wrap:anywhere]">{error}</div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="mt-1.5 h-6 rounded-[6px] border border-line px-2 text-[11.5px] text-ink-2 transition-colors hover:bg-hover hover:text-ink disabled:opacity-50 cursor-pointer"
            >
              重试
            </button>
          </div>
        )}

        {/* 加载态：尚无任何视图且无错误 */}
        {view === null && error === null && (
          <div data-agent-team-loading className="px-1.5 py-2 text-[11.5px] text-ink-3">
            加载中…
          </div>
        )}

        {view !== null && (
          <>
            {noTeam && (
              <div
                data-agent-team-empty
                className="mb-2 rounded-[6px] bg-field px-2 py-1.5 text-[11.5px] text-ink-3"
              >
                当前会话暂未组建团队
              </div>
            )}

            {/* 名册 */}
            <section>
              <h3 className="mb-1 px-1.5 text-[11px] text-ink-3">名册</h3>
              <div>
                {view.members.map(member => (
                  <div
                    key={member.id}
                    data-agent-team-member={member.id}
                    className="rounded-[6px] px-1.5 py-1.5"
                  >
                    <div className="flex items-center gap-1.5 text-[12.5px]">
                      <span className="min-w-0 truncate text-ink">{member.name}</span>
                      {member.role === 'lead' && (
                        <span className="shrink-0 rounded-[4px] border border-line bg-field px-1 text-[10px] leading-4 text-ink-2">
                          主控
                        </span>
                      )}
                      <span className="shrink-0 text-[11.5px] text-ink-3">{member.role}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                      <span className={member.status === 'failed' ? 'text-red' : undefined}>
                        {MEMBER_STATUS[member.status]}
                      </span>
                      {member.model !== undefined && (
                        <span className="min-w-0 truncate">model: {member.model}</span>
                      )}
                    </div>
                    {member.diagnostics.map(diagnostic => (
                      <div
                        key={diagnostic}
                        className="mt-0.5 text-[11.5px] text-red [overflow-wrap:anywhere]"
                      >
                        {diagnostic}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>

            {/* 任务板（只读） */}
            <section className="mt-2">
              <h3 className="mb-1 px-1.5 text-[11px] text-ink-3">任务</h3>
              {view.tasks.length === 0 ? (
                <div data-agent-team-tasks-empty className="px-1.5 py-1.5 text-[11.5px] text-ink-3">
                  暂无任务
                </div>
              ) : (
                <div>
                  {view.tasks.map(task => (
                    <div
                      key={task.id}
                      data-agent-team-task={task.id}
                      className="rounded-[6px] px-1.5 py-1.5 transition-colors hover:bg-hover"
                    >
                      <div className="flex items-center gap-1.5 text-[12.5px]">
                        <span className="min-w-0 flex-1 truncate text-ink">{task.subject}</span>
                        <span className="shrink-0 text-[11.5px] text-ink-3">
                          {TASK_STATUS[task.status]}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11.5px] text-ink-3">
                        {task.ownerName !== undefined && <span>负责：{task.ownerName}</span>}
                        {(task.blockedBy ?? []).length > 0 && (
                          <span>阻塞 {(task.blockedBy ?? []).length}</span>
                        )}
                        {task.status === 'pending' && (
                          <span className={task.ready === true ? 'text-green' : undefined}>
                            {task.ready === true ? '就绪' : '被阻塞'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}