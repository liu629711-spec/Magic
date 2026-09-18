// 轨迹视图（M5，2026-09-18）：把会话持久事件（store.eventEntries()）渲染成时间线表格 + 搜索。
// 列：seq / 时间(HH:mm:ss) / 事件类型 / 摘要（从 data 提取可读文本，未知类型回落到类型名）。
// 来源对齐 Magic 组合 web 端的「轨迹」页（时间线表格 + 搜索）。
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

/** 一条事件的可读摘要。 */
function summarizeEvent(event: SessionEvent): string {
  const type = String(event.type)
  const data = event.data as unknown as Record<string, unknown>
  switch (type) {
    case 'turn/start':
      return `第 ${String(data.turn)} 轮开始`
    case 'turn/end': {
      const reason = data.reason as Record<string, unknown> | undefined
      const kind = typeof reason?.kind === 'string' ? reason.kind : ''
      return `第 ${String(data.turn)} 轮结束${kind.length > 0 ? `（${kind}）` : ''}`
    }
    case 'step/start':
      return `第 ${String(data.turn)} 轮 第 ${String(data.step)} 步开始`
    case 'step/end':
      return `第 ${String(data.turn)} 轮 第 ${String(data.step)} 步结束`
    case 'assistant/attempt':
      return `第 ${String(data.turn)} 轮 第 ${String(data.step)} 步模型尝试`
    case 'user/message': {
      const text = truncate(messageText(data))
      return text.length > 0 ? text : '用户消息'
    }
    case 'system/message': {
      const text = truncate(messageText(data))
      return text.length > 0 ? text : '系统消息'
    }
    case 'assistant/message': {
      const text = truncate(messageText(data))
      if (text.length > 0) return text
      const message = data.message as Record<string, unknown> | undefined
      const reasoning = truncate(partText(message?.content, 'reasoning'))
      return reasoning.length > 0 ? reasoning : '助手消息'
    }
    case 'tool/call': {
      const name = typeof data.name === 'string' ? data.name : '未知工具'
      const args = summarizeArgs(data.arguments)
      return args.length > 0 ? `${name}(${args})` : name
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
    case 'tool/ptc-dispatch-start':
      return 'PTC 派发开始'
    case 'tool/ptc-dispatch':
      return 'PTC 派发'
    case 'agent/inbox/spliced': {
      const inserted = Array.isArray(data.inserted) ? data.inserted.length : 0
      return `注入 ${String(inserted)} 条消息`
    }
    case 'todo/write': {
      const todos = Array.isArray(data.todos) ? data.todos.length : 0
      return `${String(todos)} 项待办`
    }
    case 'session/end-seed':
      return '会话种子结束'
    default:
      // 未知/插件类型：显示类型名（诚实兜底）。
      return type
  }
}

interface TrajectoryRow {
  key: string
  seq: number
  time: number
  type: string
  summary: string
}

export function TrajectoryView({ entries, onJump }: {
  entries: readonly SessionEvent[]
  /** 行点击跳转（M5）：把该事件的 seq 交给 ChatFlow，切回对话 tab 并定位到对应消息。 */
  onJump?: (seq: number) => void
}) {
  const [query, setQuery] = useState('')

  const rows = useMemo<TrajectoryRow[]>(
    () =>
      entries.map((event, index) => ({
        key: `${String(event.seq)}-${String(index)}`,
        seq: Number(event.seq),
        time: Number(event.time),
        type: String(event.type),
        summary: summarizeEvent(event),
      })),
    [entries],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length === 0) return rows
    return rows.filter(
      row => row.type.toLowerCase().includes(needle) || row.summary.toLowerCase().includes(needle),
    )
  }, [rows, query])

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-trajectory-view>
      <div className="shrink-0 border-b border-surface-container-highest px-4 py-2">
        <div className="mx-auto flex w-full max-w-[var(--dsh-chat-content-width)] items-center gap-3">
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜索事件类型或摘要"
            data-trajectory-search
            className="h-8 flex-1 rounded-lg border border-line bg-field px-3 text-[12.5px] text-ink outline-none placeholder:text-ink-3 focus:border-line-strong"
          />
          <span className="shrink-0 text-[11.5px] text-outline" data-trajectory-count>
            {query.trim().length === 0
              ? `${String(rows.length)} 条事件`
              : `过滤后 ${String(filtered.length)} / 共 ${String(rows.length)} 条`}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[12.5px] text-outline">
          该会话暂无可展示的事件
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[12.5px] text-outline">
          无匹配事件
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="mx-auto w-full max-w-[var(--dsh-chat-content-width)] border-collapse font-body-sm text-[12px]">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="text-left text-[11px] text-outline">
                <th className="h-7 w-16 px-3 font-normal">seq</th>
                <th className="h-7 w-20 px-2 font-normal">时间</th>
                <th className="h-7 w-44 px-2 font-normal">事件类型</th>
                <th className="h-7 px-2 font-normal">摘要</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr
                  key={row.key}
                  data-trajectory-row={row.type}
                  data-trajectory-seq={row.seq}
                  onClick={onJump === undefined ? undefined : () => onJump(row.seq)}
                  title={onJump === undefined ? undefined : '点击跳到对话中的对应消息'}
                  className={`border-t border-surface-container-high/60 hover:bg-surface-container-low${
                    onJump === undefined ? '' : ' cursor-pointer'
                  }`}
                >
                  <td className="h-7 px-3 align-middle text-outline">{row.seq}</td>
                  <td className="h-7 px-2 align-middle text-ink-3">{formatTime(row.time)}</td>
                  <td className="h-7 px-2 align-middle text-ink-2">
                    <span className="block truncate" title={row.type}>{row.type}</span>
                  </td>
                  <td className="h-7 px-2 align-middle text-ink">
                    <span className="block truncate" title={row.summary}>{row.summary}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}