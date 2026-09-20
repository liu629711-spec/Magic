// 会话区悬浮胶囊（图一/图二/图三/图四 + 图五/图六反馈，2026-09-19 用户裁定；ZCode 同款体验）：
// 收起态 = 「更改 +N -N」pill；点击后【原地】转化为 Git 工具面板（同锚点，非弹新窗；
// 宽度收窄至 400px）。面板内容：
// - 更改（±统计，点击跳右坞文件变动 tab）
// - 分支：向左侧弹出选择卡（右缘=面板左缘，绝不盖面板内容；搜索 + 分支列表 + 检出）
// - 提交或推送：向左侧弹出提交卡（提交信息 / 包含未暂存 / 提交 Ctrl+↵；
//   runtime 无 push 通道，提交并推送/推送诚实置灰）
// - 进程：会话 todo/write 的待办，TaskRows 式徽章（环形步进器 / 绿勾圆徽）
// - 终端：可展开；本环境无 session/jobs 推送源（dock-context.ts:135），诚实空态
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'
import { api, type SessionScope } from '../vendor/dsh-better-sidebar/src/client/api'

export interface CapsuleTodo {
  text: string
  done: boolean
  active: boolean
}

/** 元素内容是否横向溢出（标题收缩自适应：溢出才渐隐，未溢出不出现空隙）。 */
export function useOverflowing(): [RefObject<HTMLSpanElement>, boolean] {
  const ref = useRef<HTMLSpanElement>(null)
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
export function relativeTime(time: number | undefined): string | undefined {
  if (time === undefined || !Number.isFinite(time) || time <= 0) return undefined
  const delta = Math.max(0, Date.now() - time)
  const minute = 60_000
  if (delta < minute) return '刚刚'
  if (delta < 60 * minute) return `${String(Math.floor(delta / minute))} 分钟前`
  if (delta < 24 * 60 * minute) return `${String(Math.floor(delta / (60 * minute)))} 小时前`
  return `${String(Math.floor(delta / (24 * 60 * minute)))} 天前`
}

/** 时长（终端行「4小时25分10秒」）：会话首事件至今。 */
export function formatDuration(startAt: number | undefined): string | undefined {
  if (startAt === undefined || !Number.isFinite(startAt) || startAt <= 0) return undefined
  const seconds = Math.max(0, Math.floor((Date.now() - startAt) / 1000))
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${String(h)}小时${String(m)}分${String(s)}秒`
  if (m > 0) return `${String(m)}分${String(s)}秒`
  return `${String(s)}秒`
}

/** 环形步进器（txt TaskRows 的 SpinnerRing）：活动态画弧自旋 + 步进数字。 */
function SpinnerRing({ active, step }: { active: boolean; step: number }) {
  const size = 22
  const stroke = 2
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={active ? { animation: 'spin 1.1s linear infinite' } : undefined}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-outline)" strokeWidth={stroke} />
        {active ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-on-surface-variant)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${String(c * 0.28)} ${String(c * 0.72)}`}
          />
        ) : null}
      </svg>
      <span className="relative text-[10.5px] font-semibold leading-none tabular-nums text-on-surface">{String(step)}</span>
    </span>
  )
}

/** 胶囊「计划」段条目（PRD-02 §15.4）：计划模式计划 + CEO 派工计划。 */
export interface CapsulePlanEntry {
  key: string
  title: string
  kind: 'plan' | 'ceo'
}

export function GitCapsule({ sessionId, cwd, todos, sessionStartAt, planEntries, onOpenChanges, onOpenPlan }: {
  sessionId: string
  cwd?: string
  todos: CapsuleTodo[]
  /** 会话首事件时间（终端行的运行时长）。 */
  sessionStartAt?: number
  /** 当前会话的计划条目（计划模式 exit_plan_mode + CEO 派工计划）；空 = 不渲染计划段。 */
  planEntries?: readonly CapsulePlanEntry[]
  onOpenChanges: () => void
  onOpenPlan?: () => void
}) {
  const scope = useMemo<SessionScope | undefined>(
    () => (cwd === undefined || cwd.length === 0 ? undefined : { sessionId, cwd }),
    [sessionId, cwd],
  )
  const [open, setOpen] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [files, setFiles] = useState(0)
  const [stats, setStats] = useState<{ add: number; del: number } | null>(null)
  const [branch, setBranch] = useState('')
  const [branchNames, setBranchNames] = useState<string[]>([])
  const [branchMenu, setBranchMenu] = useState(false)
  const [branchQuery, setBranchQuery] = useState('')
  const [commitOpen, setCommitOpen] = useState(false)
  const [commitMsg, setCommitMsg] = useState('')
  const [includeUnstaged, setIncludeUnstaged] = useState(true)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    if (scope === undefined) return
    try {
      const [status, branchInfo] = await Promise.all([
        api.gitStatus(scope),
        api.gitBranch(scope).catch(() => ({ current: '', names: [] as string[] })),
      ])
      setFiles(status.isRepo ? status.entries.length : 0)
      setBranch(branchInfo.current)
      setBranchNames(branchInfo.names)
      if (status.isRepo && status.entries.length > 0) {
        const diff = await api.gitDiff(scope, undefined, false).catch(() => ({ diff: '' }))
        const lines = diff.diff.split('\n')
        setStats({
          add: lines.filter(line => line.startsWith('+') && !line.startsWith('+++')).length,
          del: lines.filter(line => line.startsWith('-') && !line.startsWith('---')).length,
        })
      } else {
        setStats(null)
      }
    } catch {
      setFiles(0)
      setStats(null)
    }
  }, [scope])

  useEffect(() => {
    if (scope === undefined) return
    void refresh()
    const timer = setInterval(() => { void refresh() }, 30_000)
    return () => clearInterval(timer)
  }, [scope, refresh])

  // Esc 收起整个胶囊（含侧弹卡）——补「无法收起」的体验洞。
  useEffect(() => {
    if (!open) return
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setBranchMenu(false)
        setCommitOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const submitCommit = async (): Promise<void> => {
    if (scope === undefined || busy) return
    const message = commitMsg.trim()
    if (message.length === 0) {
      setFailure('请输入提交信息。')
      return
    }
    setBusy(true)
    setFailure(null)
    try {
      if (includeUnstaged) await api.gitStage(scope)
      await api.gitCommit(scope, message)
      setCommitMsg('')
      setCommitOpen(false)
      setNotice('已提交。')
      void refresh()
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const checkout = async (name: string): Promise<void> => {
    if (scope === undefined || busy || name === branch) { setBranchMenu(false); return }
    setBusy(true)
    setFailure(null)
    try {
      await api.gitCheckout(scope, name)
      setBranch(name)
      setBranchMenu(false)
      setBranchQuery('')
      void refresh()
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setBusy(false)
    }
  }

  const duration = formatDuration(sessionStartAt)
  const doneCount = todos.filter(item => item.done).length
  const needle = branchQuery.trim().toLowerCase()
  const visibleBranches = branchNames.filter(name => needle.length === 0 || name.toLowerCase().includes(needle))

  // 无未提交更改且无计划时不显示（开始页/干净工作区都是噪音）；有计划即使工作区
  // 干净也显示（PRD-02 §15.4：胶囊是计划的快速查看入口）。
  const hasPlans = planEntries !== undefined && planEntries.length > 0
  if (scope === undefined || (files === 0 && !hasPlans)) return null

  // 收起态 pill（图一）：点击【原地】转化为面板（同锚点，非弹新窗）。
  if (!open) {
    return (
      <button
        type="button"
        data-changes-capsule
        title="Git 工具"
        onClick={() => setOpen(true)}
        className="group pointer-events-auto flex h-9 cursor-pointer items-center gap-2 rounded-full border-[0.5px] border-surface-container-highest bg-surface-container-lowest/90 px-3.5 shadow-overlay backdrop-blur-md transition-colors hover:bg-surface-container-low"
      >
        {/* 悬浮时前置图标变为放大钮（图三；点击整颗胶囊即展开面板） */}
        <span className="hidden group-hover:flex items-center justify-center text-on-surface-variant" aria-hidden>
          <span className="material-symbols-outlined text-[16px]">open_in_full</span>
        </span>
        <span className="flex group-hover:hidden items-center justify-center text-on-surface-variant" aria-hidden>
          <span className="material-symbols-outlined text-[16px]">difference</span>
        </span>
        <span className="text-[12.5px] leading-[18px] font-medium text-on-surface">更改</span>
        {stats === null ? (
          <span className="text-[12.5px] leading-[18px] tabular-nums text-tertiary">{String(files)}</span>
        ) : (
          <>
            <span className="text-[12.5px] leading-[18px] tabular-nums text-tertiary">+{String(stats.add)}</span>
            <span className="text-[12.5px] leading-[18px] tabular-nums text-error">-{String(stats.del)}</span>
          </>
        )}
      </button>
    )
  }

  const rowCls =
    'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-surface-container-low'
  const rowIcon = 'material-symbols-outlined text-[17px] text-on-surface-variant'
  const rowLabel = 'text-[13.5px] leading-5 font-medium text-on-surface'

  return (
    <>
      {/* 点面板外收起回 pill（z 抬高到 dockkit portal 之上，修「无法收起」） */}
      <div className="pointer-events-auto fixed inset-0 z-[55]" onClick={() => { setOpen(false); setBranchMenu(false); setCommitOpen(false); setBranchQuery('') }} />
      {/* 原地面板（图二）：与 pill 同锚点，宽度收窄至 400px */}
      <div
        data-git-capsule-panel
        className="pointer-events-auto absolute right-0 top-0 z-[56] w-[400px] rounded-2xl border-[0.5px] border-surface-container-highest bg-surface-container-lowest shadow-overlay"
      >
        <div className="flex items-center justify-between px-4 pt-3.5">
          <span className="text-[15px] leading-5 font-semibold text-on-surface">Git 工具</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="在右坞打开文件变动"
              onClick={() => { setOpen(false); onOpenChanges() }}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>open_in_new</span>
            </button>
            {/* 缩小：收起回 pill（图四箭头所指的收起入口） */}
            <button
              type="button"
              title="缩小"
              aria-label="缩小"
              onClick={() => { setOpen(false); setBranchMenu(false); setCommitOpen(false) }}
              className="flex size-7 cursor-pointer items-center justify-center rounded-md text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>close_fullscreen</span>
            </button>
          </div>
        </div>
        <div className="px-2.5 pb-2 pt-2">
          {failure === null ? null : <p className="m-0 px-1.5 pb-2 text-[12px] leading-[18px] text-error">{failure}</p>}
          {notice === null ? null : <p className="m-0 px-1.5 pb-2 text-[12px] leading-[18px] text-tertiary">{notice}</p>}

          {/* 更改（点击跳右坞文件变动 tab，图二） */}
          <button type="button" onClick={() => { setOpen(false); onOpenChanges() }} className={rowCls}>
            <span className={rowIcon} aria-hidden>difference</span>
            <span className={rowLabel}>更改</span>
            {stats === null ? null : (
              <span className="ml-auto text-[13px] leading-5 tabular-nums">
                <span className="text-tertiary">+{String(stats.add)}</span>{' '}
                <span className="text-error">-{String(stats.del)}</span>
              </span>
            )}
          </button>

          {/* 分支（图三）：点击向左侧弹出选择卡（不盖面板内容） */}
          <button type="button" onClick={() => { setBranchMenu(value => !value); setCommitOpen(false) }} className={rowCls}>
            <span className={rowIcon} aria-hidden>account_tree</span>
            <span className={`${rowLabel} min-w-0 flex-1 truncate`}>
              {branch.length > 0 ? branch : '选择分支'}
            </span>
            <span className="material-symbols-outlined text-[15px] text-outline" aria-hidden>expand_more</span>
          </button>

          {/* 提交或推送（图四）：点击向左侧弹出提交卡 */}
          <button type="button" onClick={() => { setCommitOpen(value => !value); setBranchMenu(false) }} className={rowCls}>
            <span className={rowIcon} aria-hidden>commit</span>
            <span className={rowLabel}>提交或推送</span>
          </button>

          {/* 计划（PRD-02 §15.4）：计划模式计划 + CEO 派工计划，点击打开右坞计划 tab */}
          {hasPlans ? (
            <div className="mt-2 border-t-[0.5px] border-surface-container-highest/60 px-1.5 pt-3">
              <span className="text-[14px] leading-5 font-medium text-on-surface">计划</span>
              <ul className="m-0 mt-1.5 flex list-none flex-col gap-0.5 p-0">
                {(planEntries ?? []).map(entry => (
                  <li key={entry.key}>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); onOpenPlan?.() }}
                      className={rowCls}
                      title={entry.title}
                    >
                      <span className={rowIcon} aria-hidden>checklist</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] leading-5 text-on-surface-variant">
                        {entry.kind === 'ceo' ? 'CEO · ' : ''}{entry.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* 进程（txt TaskRows 设计）：环形步进器 / 绿勾圆徽 + 行文本 */}
          {todos.length > 0 ? (
            <div className="mt-2 border-t-[0.5px] border-surface-container-highest/60 px-1.5 pt-3">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[14px] leading-5 font-medium text-on-surface">进程</span>
                <span className="text-[13px] text-tertiary tabular-nums">
                  {String(doneCount)}/{String(todos.length)}
                </span>
              </div>
              <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0">
                {todos.map((item, index) => {
                  const step = item.done ? doneCount : index + 1
                  return (
                    <li key={index} className="flex items-start gap-2.5">
                      <span className="mt-[1px] shrink-0">
                        {item.done ? (
                          <span
                            className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-tertiary text-on-tertiary"
                            style={{ animation: 'pop-in 300ms cubic-bezier(0.23,1,0.32,1) both' }}
                          >
                            <span className="material-symbols-outlined text-[14px]" aria-hidden>check</span>
                          </span>
                        ) : (
                          <SpinnerRing active={item.active} step={step} />
                        )}
                      </span>
                      <span className={`min-w-0 pt-[2px] text-[13px] leading-[20px] ${item.done ? 'text-outline line-through' : 'text-on-surface-variant'}`}>
                        {item.text}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {/* 终端（图二）：可展开——本环境无 session/jobs 推送源（dock-context.ts:135），
              展开后诚实空态；通道接入后在此列出后台进程 + 停止钮 */}
          <div className="mt-2 border-t-[0.5px] border-surface-container-highest/60 px-1.5 pt-1">
            <button
              type="button"
              aria-expanded={terminalOpen}
              onClick={() => setTerminalOpen(value => !value)}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-surface-container-low"
            >
              <span className="text-[13.5px] leading-5 font-medium text-on-surface">终端</span>
              {duration === undefined ? null : (
                <span className="ml-auto text-[12.5px] leading-5 text-outline" title="会话运行时长（自首条事件起）">
                  {duration}
                </span>
              )}
              <span
                className="material-symbols-outlined text-[15px] text-outline transition-transform duration-300"
                style={{ transform: terminalOpen ? 'rotate(180deg)' : undefined }}
                aria-hidden
              >
                expand_more
              </span>
            </button>
            {terminalOpen ? (
              <div
                className="flex items-start gap-2.5 px-1.5 pb-2.5 pt-1"
                style={{ animation: 'fade-in 200ms ease-out both' }}
              >
                <span className="material-symbols-outlined mt-[1px] text-[15px] text-outline" aria-hidden>terminal</span>
                <span className="min-w-0 text-[12.5px] leading-[20px] text-outline">
                  当前没有正在运行的后台任务——本环境未接入后台任务推送（session/jobs），通道接入后这里会列出 agent 的后台终端进程与停止钮。
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 分支选择卡（图三）：贴面板左缘向左弹出，绝不盖面板内容 */}
      {branchMenu ? (
        <div
          data-git-branch-flyout
          className="pointer-events-auto absolute top-0 z-[57] w-[320px] rounded-2xl border-[0.5px] border-surface-container-highest bg-surface-container-lowest shadow-overlay"
          style={{ right: 408 } as CSSProperties}
        >
          <div className="p-2.5">
            <div className="flex h-9 items-center gap-2 rounded-lg border-[0.5px] border-surface-container-highest bg-surface-container px-2.5 focus-within:border-primary">
              <span className="material-symbols-outlined text-[15px] text-outline" aria-hidden>search</span>
              <input
                value={branchQuery}
                onChange={event => setBranchQuery(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && visibleBranches.length > 0) {
                    void checkout(visibleBranches[0])
                  }
                }}
                placeholder="搜索分支"
                aria-label="搜索分支"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-on-surface outline-none placeholder:text-outline"
              />
              {branchQuery.length === 0 ? null : (
                <button
                  type="button"
                  aria-label="清除搜索"
                  onClick={() => setBranchQuery('')}
                  className="flex size-6 cursor-pointer items-center justify-center rounded-full text-outline transition-colors hover:bg-surface-container-high hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-[13px]" aria-hidden>close</span>
                </button>
              )}
            </div>
          </div>
          <div className="px-3 pb-2 text-[12px] leading-4 text-outline">分支</div>
          <div className="max-h-64 overflow-y-auto px-1.5 pb-1.5">
            {visibleBranches.length === 0 ? (
              <div className="px-2.5 py-3 text-[12px] text-outline">没有匹配的分支。</div>
            ) : visibleBranches.map(name => (
              <button
                key={name}
                type="button"
                disabled={busy}
                onClick={() => { void checkout(name) }}
                className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-surface-container-low disabled:opacity-40 ${
                  name === branch ? 'bg-surface-container-low' : ''
                }`}
              >
                <span className="material-symbols-outlined mt-[2px] text-[15px] text-outline" aria-hidden>account_tree</span>
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[13.5px] leading-5 ${name === branch ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {name}
                  </span>
                  {name === branch && files > 0 ? (
                    <span className="block text-[11.5px] leading-4 text-outline">未提交的更改：{String(files)} 个文件</span>
                  ) : null}
                </span>
                {name === branch ? (
                  <span className="material-symbols-outlined mt-[2px] text-[15px] text-on-surface-variant" aria-hidden>check</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="border-t-[0.5px] border-surface-container-highest/60 py-1.5" />
        </div>
      ) : null}

      {/* 提交卡（图四）：贴面板左缘向左弹出 */}
      {commitOpen ? (
        <div
          data-git-commit-flyout
          className="pointer-events-auto absolute top-0 z-[57] w-[360px] rounded-2xl border-[0.5px] border-surface-container-highest bg-surface-container-lowest shadow-overlay"
          style={{ right: 408 } as CSSProperties}
        >
          <div className="flex items-center justify-between px-4 pt-3.5">
            <span className="flex min-w-0 items-center gap-1.5 font-mono text-[13px] text-on-surface-variant">
              <span className="material-symbols-outlined text-[15px]" aria-hidden>account_tree</span>
              <span className="truncate">{branch.length > 0 ? branch : '—'}</span>
            </span>
            {stats === null ? null : (
              <span className="text-[13px] leading-5 tabular-nums">
                <span className="text-tertiary">+{String(stats.add)}</span>{' '}
                <span className="text-error">-{String(stats.del)}</span>
              </span>
            )}
          </div>
          <div className="px-4 pb-2 pt-2">
            <textarea
              value={commitMsg}
              onChange={event => setCommitMsg(event.target.value)}
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault()
                  void submitCommit()
                }
              }}
              placeholder="提交信息（留空将自动生成）"
              aria-label="提交信息"
              rows={4}
              className="w-full resize-none rounded-lg bg-surface-container px-2.5 py-2 text-[13px] leading-5 text-on-surface placeholder:text-outline outline-none focus:border-primary border-[0.5px] border-transparent"
            />
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] leading-5 text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={includeUnstaged}
                  onChange={event => setIncludeUnstaged(event.target.checked)}
                />
                包含未暂存的更改
              </label>
              <span className="ml-auto text-[12px] text-outline">{String(files)} 个文件</span>
            </div>
          </div>
          {failure === null ? null : <p className="m-0 px-4 pb-1 text-[12px] leading-[18px] text-error">{failure}</p>}
          <div className="flex flex-col gap-0.5 border-t-[0.5px] border-surface-container-highest/60 p-2">
            <button
              type="button"
              disabled={busy || files === 0}
              onClick={() => { void submitCommit() }}
              className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg bg-surface-container px-3 text-[13.5px] text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>commit</span>
              提交
              <span className="ml-auto text-[11px] text-outline">Ctrl + ↵</span>
            </button>
            <button
              type="button"
              disabled
              title="runtime 暂无推送通道（后续版本接入）"
              className="flex h-10 cursor-not-allowed items-center gap-2.5 rounded-lg px-3 text-[13.5px] text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>cloud_upload</span>
              提交并推送
            </button>
            <button
              type="button"
              disabled
              title="runtime 暂无推送通道（后续版本接入）"
              className="flex h-10 cursor-not-allowed items-center gap-2.5 rounded-lg px-3 text-[13.5px] text-outline"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>cloud_upload</span>
              推送
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}
