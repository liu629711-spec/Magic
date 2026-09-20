// 调用轨迹（2026-09-19，图三 TRAE「调用轨迹」重设计）：顶栏 时长/轮次/调用 三模式
// 切换 + 搜索；时长模式 = 输入/模型/工具 三泳道甘特条（按事件时间定位、轮边界画格）
// + 轮分组明细行；轮次模式 = 纯明细行；调用模式 = 仅工具调用行。
// 行结构：左侧「第 N 轮」轮次列 + 角色徽章（系统/用户/上下文/助手/工具）+ 单行摘要。
// 数据仍是会话持久事件（store.eventEntries() / dock binding.events()），零适配。
import { useMemo, useState } from 'react'
import type { SessionEvent } from '../vendor/dsh-chat/index.ts'

/** HH:mm:ss。 */
function formatTime(time: number): string {
  const date = new Date(time)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** 单行化 + 截断（表格摘要用）。 */
function truncate(text: string, max = 160): string {
  const one = text.replace(/\s+/g, ' ').trim()
  return one.length > max ? `${one.slice(0, max)}…` : one
}

/** 从消息 content 段落里取指定类型的文本（text / reasoning 等）。 */
function partText(parts: unknown, want: string): string {
  if (!Array.isArray(parts)) return ''
  const out: string[] = []
  for (const part of parts) {
    if (part === null || typeof part !== 'object') continue
    const record = part as Record<string, unknown>
    if (record.type === want && typeof record.text === 'string' && record.text.length > 0) {
      out.push(record.text)
    }
  }
  return out.join('\n')
}

/** 消息文本：user/steering 的 content 与 system/assistant 的 message.content 两种形状都兜底。 */
function messageText(data: Record<string, unknown>): string {
  const direct = partText(data.content, 'text')
  if (direct.length > 0) return direct
  const message = data.message as Record<string, unknown> | undefined
  return partText(message?.content, 'text')
}

/** 工具入参摘要：优先取可读字段，失败则原文单行截断。 */
function summarizeArgs(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) return ''
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed !== null && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>
      const candidate = record.path ?? record.command ?? record.query ?? record.file_path ?? record.url
      if (typeof candidate === 'string' && candidate.length > 0) return truncate(candidate, 80)
    }
  } catch {
    // 入参不是 JSON 就直接截断原文
  }
  return truncate(raw, 80)
}

/** 行角色（图三徽章五色）。 */
type TraceRole = 'system' | 'user' | 'context' | 'assistant' | 'tool'

const ROLE_LABEL: Record<TraceRole, string> = {
  system: '系统',
  user: '用户',
  context: '上下文',
  assistant: '助手',
  tool: '工具',
}

/** 角色徽章 + 甘特条配色（行内 token，与泳道一致）。 */
const ROLE_COLOR: Record<TraceRole, { chip: string; bar: string }> = {
  system: { chip: 'bg-surface-container-high text-on-surface-variant', bar: '#6b7280' },
  user: { chip: 'bg-sky-500/20 text-sky-300', bar: '#3b82f6' },
  context: { chip: 'bg-emerald-500/15 text-emerald-300', bar: '#10b981' },
  assistant: { chip: 'bg-violet-500/15 text-violet-300', bar: '#8b5cf6' },
  tool: { chip: 'bg-orange-500/15 text-orange-300', bar: '#f59e0b' },
}

/** 事件 → 行角色（图三口径：结构事件折进轮次列，不占行）。 */
function roleOf(type: string): TraceRole | null {
  if (type === 'user/message') return 'user'
  if (type === 'assistant/message') return 'assistant'
  if (type.startsWith('tool/') || type.startsWith('command/') || type.startsWith('ceo/')) return 'tool'
  if (
    type === 'system/message' || type.startsWith('permission/') || type.startsWith('sandbox/') ||
    type.startsWith('approval/') || type.startsWith('session/')
  ) return 'system'
  if (type.startsWith('step/') || type === 'turn/end' || type.startsWith('assistant/attempt')) return null
  // 其余（request/*、agent/*、llm/*、compaction/*、插件类型）→ 上下文注入。
  return 'context'
}

/** 一条事件的可读摘要。 */
function summarizeEvent(event: SessionEvent): string {
  const type = String(event.type)
  const data = event.data as unknown as Record<string, unknown>
  switch (type) {
    case 'assistant/message': {
      const text = truncate(messageText(data))
      if (text.length > 0) return text
      const message = data.message as Record<string, unknown> | undefined
      const reasoning = truncate(partText(message?.content, 'reasoning'))
      return reasoning.length > 0 ? reasoning : '助手消息'
    }
    case 'user/message': {
      const text = truncate(messageText(data))
      return text.length > 0 ? text : '用户消息'
    }
    case 'system/message': {
      const text = truncate(messageText(data))
      return text.length > 0 ? text : '系统消息'
    }
    case 'tool/call': {
      const name = typeof data.name === 'string' ? data.name : '未知工具'
      const args = summarizeArgs(data.arguments)
      return args.length > 0 ? `${name} ${args}` : name
    }
    case 'tool/result': {
      const message = data.message as Record<string, unknown> | undefined
      const text = truncate(partText(message?.content, 'text'))
      const error = data.error as Record<string, unknown> | undefined
      const errorName = typeof error?.name === 'string' ? error.name : ''
      if (errorName.length > 0) return `工具结果（错误 ${errorName}）${text.length > 0 ? `：${text}` : ''}`
      return text.length > 0 ? text : '工具结果'
    }
    case 'command/run': {
      const name = typeof data.name === 'string' ? data.name : ''
      const args = typeof data.args === 'string' ? data.args : ''
      return `/${name}${args.length > 0 ? ` ${args}` : ''}`
    }
    case 'command/done': {
      const kind = data.kind === 'success' ? '命令完成' : '命令失败'
      const text = typeof data.text === 'string' ? truncate(data.text) : ''
      return text.length > 0 ? `${kind}：${text}` : kind
    }
    case 'request/header': {
      const reason = typeof data.reason === 'string' ? data.reason : ''
      return `模型请求头${reason.length > 0 ? `（${reason}）` : ''}`
    }
    case 'request/context': {
      const provider = typeof data.provider === 'string' ? data.provider : ''
      const model = typeof data.model === 'string' ? data.model : ''
      return provider.length > 0 || model.length > 0 ? `${provider}/${model}` : '请求上下文'
    }
    case 'llm/retry':
    case 'llm/retry-started':
      return '模型重试'
    case 'compaction/start':
      return '上下文压缩开始'
    case 'compaction/summary':
      return '上下文压缩摘要'
    case 'compaction/end':
      return '上下文压缩结束'
    case 'agent/inbox/spliced': {
      const inserted = Array.isArray(data.inserted) ? data.inserted.length : 0
      return `注入 ${String(inserted)} 条消息`
    }
    case 'todo/write': {
      const todos = Array.isArray(data.todos) ? data.todos.length : 0
      return `${String(todos)} 项待办`
    }
    default:
      // 未知/插件类型：显示类型名（诚实兜底）。
      return type
  }
}

interface TraceRow {
  key: string
  seq: number
  time: number
  type: string
  role: TraceRole
  turn: number
  summary: string
  event: SessionEvent
}

/** 泳道甘特的条形宽度（按摘要长度近似；参考图条宽不一）。 */
function barWidth(row: TraceRow): number {
  const base = 1.5 + Math.min(row.summary.length, 160) * 0.07
  return Math.min(16, Math.max(2, base))
}

type TraceMode = 'duration' | 'turns' | 'calls'

export function TrajectoryView({ entries }: {
  entries: readonly SessionEvent[]
  /** 行点击跳转（dock 形态不用；保留签名兼容旧调用方）。 */
  onJump?: (seq: number) => void
}) {
  const [mode, setMode] = useState<TraceMode>('duration')
  const [query, setQuery] = useState('')
  // 详情抽屉（2026-09-19 用户裁定：3099 上 Magic 插件每条轨迹可点开弹窗；
  // Magic 形态 = 顶栏（时长/轮次/调用）下方抽屉弹出，覆盖明细区）
  const [detail, setDetail] = useState<TraceRow | null>(null)

  const rows = useMemo<TraceRow[]>(() => {
    const out: TraceRow[] = []
    let turn = 0
    for (const event of entries) {
      const type = String(event.type)
      if (type === 'turn/start') {
        const data = event.data as unknown as Record<string, unknown>
        const parsed = Number(data.turn)
        turn = Number.isFinite(parsed) && parsed > 0 ? parsed : turn + 1
        continue
      }
      if (type.startsWith('step/') || type === 'turn/end' || type.startsWith('assistant/attempt')) continue
      const role = roleOf(type)
      if (role === null) continue
      out.push({
        key: `${String(event.seq)}-${String(out.length)}`,
        seq: Number(event.seq),
        time: Number(event.time),
        type,
        role,
        turn,
        summary: summarizeEvent(event),
        event,
      })
    }
    return out
  }, [entries])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length === 0) return rows
    return rows.filter(
      row => row.type.toLowerCase().includes(needle) || row.summary.toLowerCase().includes(needle),
    )
  }, [rows, query])

  // 轮分组（保持事件顺序；同轮相邻行合并为一组，轮号显示在左列首行）。
  const groups = useMemo(() => {
    const out: { turn: number; rows: TraceRow[] }[] = []
    for (const row of filtered) {
      const last = out[out.length - 1]
      if (last !== undefined && last.turn === row.turn) last.rows.push(row)
      else out.push({ turn: row.turn, rows: [row] })
    }
    return out
  }, [filtered])

  // 甘特（时长模式）：时间轴 = 过滤后首末事件时间；轮边界画竖格线。
  const gantt = useMemo(() => {
    if (filtered.length === 0) return null
    const t0 = filtered[0].time
    const t1 = Math.max(filtered[filtered.length - 1].time, t0 + 1)
    const x = (time: number) => Math.min(100, Math.max(0, ((time - t0) / (t1 - t0)) * 100))
    const bars = filtered.map(row => ({ row, left: x(row.time), width: barWidth(row) }))
    const turnLines = [...new Set(filtered.map(row => row.turn))]
      .map(turn => {
        const first = filtered.find(row => row.turn === turn)
        return { turn, left: first === undefined ? 0 : x(first.time) }
      })
    const lane = (role: TraceRole): TraceRole =>
      role === 'user' || role === 'system' || role === 'context' ? 'system' : role
    return {
      lanes: [
        { label: '输入', roles: ['system', 'user', 'context'] as const },
        { label: '模型', roles: ['assistant'] as const },
        { label: '工具', roles: ['tool'] as const },
      ].map(l => ({
        ...l,
        bars: bars.filter(b => (l.roles as readonly TraceRole[]).includes(lane(b.row.role))),
      })),
      turnLines,
    }
  }, [filtered])

  const visibleGroups = mode === 'calls'
    ? groups
        .map(g => ({ turn: g.turn, rows: g.rows.filter(r => r.role === 'tool') }))
        .filter(g => g.rows.length > 0)
    : groups

  return (
    <div className="flex h-full min-h-0 flex-col" data-trajectory-view>
      {/* 顶栏（图三）：左三模式切换 + 右搜索 */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-surface-container-highest px-4 py-2">
        <div className="flex items-center gap-1">
          {([
            { id: 'duration' as const, icon: 'schedule', label: '时长' },
            { id: 'turns' as const, icon: 'view_agenda', label: '轮次' },
            { id: 'calls' as const, icon: 'handyman', label: '调用' },
          ]).map(item => (
            <button
              key={item.id}
              type="button"
              data-trajectory-mode={item.id}
              onClick={() => setMode(item.id)}
              className={`flex h-7 cursor-pointer items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12px] font-medium transition-colors ${
                mode === item.id
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-outline hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <IconGlyph name={item.icon ?? 'handyman'} />
              {item.label}
            </button>
          ))}
          <span className="ml-2 text-[11px] text-outline/70 tabular-nums">{filtered.length} 条事件</span>
        </div>
        <div className="flex h-7 w-56 items-center gap-2 rounded-lg border border-line bg-surface-container-lowest px-2.5 focus-within:border-line-strong">
          <IconGlyph name="search" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索"
            className="min-w-0 flex-1 bg-transparent text-[12px] text-on-surface outline-none placeholder:text-outline"
          />
        </div>
      </div>

      {/* 顶栏下方内容区（甘特 + 明细；详情抽屉绝对定位覆盖其上） */}
      <div className="relative min-h-0 flex-1 flex flex-col">
        {/* 泳道甘特（时长模式；图三：输入/模型/工具三行 + 轮边界竖线） */}
        {mode === 'duration' && gantt !== null && (
        <div className="relative shrink-0 border-b border-surface-container-highest px-4 pb-2 pt-3" data-trajectory-gantt>
          {gantt.turnLines.map(line => (
            <span
              key={line.turn}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-px bg-surface-container-highest/70"
              style={{ left: `calc(60px + ${line.left}% * 0.97)` }}
            />
          ))}
          {gantt.lanes.map(lane => (
            <div key={lane.label} className="relative mb-1 flex items-center" style={{ height: 18 }}>
              <span className="absolute left-0 top-1/2 z-10 -translate-y-1/2 bg-surface pr-1 text-[10.5px] leading-[14px] text-outline">
                {lane.label}
              </span>
              <div className="relative ml-[60px] h-[14px] flex-1">
                {lane.bars.map(({ row, left, width }) => (
                  <span
                    key={row.key}
                    title={`${ROLE_LABEL[row.role]} · ${row.summary}`}
                    className="absolute top-0 h-full rounded-[3px] opacity-90"
                    style={{ left: `${left}%`, width: `${width}%`, background: ROLE_COLOR[row.role].bar }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 轮分组明细（图三：左列第 N 轮 + 角色徽章 + 单行摘要；行点击开详情抽屉） */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visibleGroups.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[12.5px] text-outline">
            {query.length > 0 ? '没有匹配的事件' : '暂无事件'}
          </div>
        ) : (
          visibleGroups.map(group => (
            <div key={group.turn}>
              {group.rows.map((row, index) => (
                <button
                  key={row.key}
                  type="button"
                  data-trajectory-row={row.seq}
                  onClick={() => setDetail(row)}
                  title={`${formatTime(row.time)} · ${row.type} · 点击查看详情`}
                  className={`flex w-full cursor-pointer text-left min-h-[34px] items-center gap-3 border-b border-surface-container-high/30 px-4 py-1 transition-colors hover:bg-surface-container-low/40 ${
                    detail?.key === row.key ? 'bg-surface-container-low/60' : ''
                  }`}
                >
                  <span className="w-12 shrink-0 text-[10.5px] leading-none text-outline/80 tabular-nums">
                    {index === 0 ? `第 ${group.turn} 轮` : ''}
                  </span>
                  <span className={`flex h-[18px] w-[40px] shrink-0 items-center justify-center rounded text-[10.5px] font-medium ${ROLE_COLOR[row.role].chip}`}>
                    {ROLE_LABEL[row.role]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] leading-[18px] text-on-surface-variant">
                    {row.summary}
                  </span>
                  <span className="shrink-0 text-[10.5px] text-outline/60 tabular-nums">
                    {formatTime(row.time)}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

        {/* 详情抽屉（用户裁定：tab 下方抽出，覆盖甘特+明细区；× 收起） */}
        {detail !== null && (
          <div
            data-trajectory-drawer
            className="absolute inset-0 z-20 flex min-h-0 flex-col border-b border-surface-container-highest bg-surface shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
            style={{ animation: 'fade-up .16s ease-out' }}
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-surface-container-highest px-4 py-2">
              <span className={`flex h-[18px] w-[40px] shrink-0 items-center justify-center rounded text-[10.5px] font-medium ${ROLE_COLOR[detail.role].chip}`}>
                {ROLE_LABEL[detail.role]}
              </span>
              <span className="min-w-0 truncate font-mono text-[11.5px] text-on-surface">{detail.type}</span>
              <span className="shrink-0 text-[10.5px] text-outline/70 tabular-nums">
                第 {detail.turn} 轮 · {formatTime(detail.time)} · #{detail.seq}
              </span>
              <span className="flex-1" />
              <button
                type="button"
                data-trajectory-drawer-close
                onClick={() => setDetail(null)}
                title="关闭详情"
                className="flex size-6 cursor-pointer items-center justify-center rounded-md text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <IconGlyph name="close" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {detailSections(detail.event).length === 0 ? (
                <div className="text-[12px] text-outline">该事件没有可展示的详情数据。</div>
              ) : (
                detailSections(detail.event).map(section => (
                  <section key={section.label} className="mb-3">
                    <div className="mb-1 text-[10.5px] font-medium uppercase tracking-wide text-outline/70">
                      {section.label}
                    </div>
                    <pre
                      className={`whitespace-pre-wrap break-words rounded-lg border border-surface-container-high/50 bg-surface-container-lowest px-3 py-2 text-on-surface-variant ${
                        section.mono ? 'font-mono text-[11px] leading-relaxed' : 'text-[12.5px] leading-relaxed'
                      }`}
                    >
                      {section.text}
                    </pre>
                  </section>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** 抽屉详情分节：消息/思考全文、工具名/入参/结果/错误、原始事件数据。 */
function detailSections(event: SessionEvent): { label: string; text: string; mono: boolean }[] {
  const type = String(event.type)
  const data = event.data as unknown as Record<string, unknown>
  const out: { label: string; text: string; mono: boolean }[] = []
  const pretty = (raw: unknown): string => {
    if (raw === undefined || raw === null) return ''
    try {
      const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
      const json = JSON.stringify(parsed, null, 2)
      return json === '{}' || json === '[]' ? '' : json
    } catch {
      return typeof raw === 'string' ? raw : String(raw)
    }
  }
  const message = data.message as Record<string, unknown> | undefined
  if (type === 'assistant/message' || type === 'user/message' || type === 'system/message') {
    const text = partText(data.content, 'text') || partText(message?.content, 'text')
    if (text.length > 0) out.push({ label: '消息', text, mono: false })
    const reasoning = partText(message?.content ?? data.content, 'reasoning')
    if (reasoning.length > 0) out.push({ label: '思考', text: reasoning, mono: false })
  }
  if (type === 'tool/call') {
    if (typeof data.name === 'string' && data.name.length > 0) {
      out.push({ label: '工具', text: data.name, mono: false })
    }
    const args = pretty(data.arguments)
    if (args.length > 0) out.push({ label: '入参', text: args, mono: true })
  }
  if (type === 'tool/result') {
    const text = partText(message?.content, 'text')
    if (text.length > 0) out.push({ label: '结果', text, mono: false })
    const error = pretty(data.error)
    if (error.length > 0) out.push({ label: '错误', text: error, mono: true })
  }
  const payload = pretty(data)
  if (payload.length > 0) out.push({ label: '事件数据', text: payload, mono: true })
  return out
}

/** 内联图标（material 字形；避免为每个模式引 Icon 组件的路径依赖）。 */
function IconGlyph({ name }: { name: string }) {
  return <span className="material-symbols-outlined text-[15px] leading-none" aria-hidden>{name}</span>
}
