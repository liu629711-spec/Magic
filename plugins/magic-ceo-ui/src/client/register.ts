import { ceoMemberReportDefinition, ceoTeamDefinition } from './definition.ts'
import type { TaskBoardApi } from './TaskBoard.ts'
import { getTaskBoardSnapshot, reloadTaskBoard, subscribeTaskBoard, createTaskOnBoard, completeTaskOnBoard } from './task-board-store.ts'

export const inject = ['uiConversation', 'slots', 'sessions', 'locale', 'sidebarRightTabs', 'sidebarRight', 'remote', 'remote.agentTeams']

// 模块加载标记：用于确认浏览器拿到的是否为新构建（排查 lib 缓存）。
try { window.sessionStorage.setItem('magic-ceo-lib', 'v7-20260912') } catch { /* 忽略 */ }

export const zh = {
  'graph.title': 'CEO 编排图',
  'graph.empty': '还没有成员',
  'graph.goal': '你的任务',
  'graph.goalHint': '对话发起',
  'graph.ceo': 'CEO 汇总',
  'graph.ceoPending': '待汇总',
  'graph.ceoRunning': '正在生成汇总…',
  'graph.ceoDone': '已汇总',
  'graph.members': '{count} 个成员',
  'graph.openCanvas': '在画布打开',
  'graph.fold': '收起',
  'graph.expand': '展开',
  'graph.elapsed': '用时 {duration}',
  'plan.title': 'CEO 分析与派发计划',
  'plan.ready': '计划已记录，CEO 正在准备启动成员。',
  'graph.zoomIn': '放大',
  'graph.zoomOut': '缩小',
  'graph.fit': '适应画布',
  'status.queued': '排队中',
  'status.running': '执行中',
  'status.ok': '已委派',
  'status.delegated': '已委派',
  'status.completed': '已完成',
  'status.blocked': '阻塞',
  'status.failed': '失败',
  'status.partial': '部分完成',
  'status.unverified': '回传待核实',
  'status.unknown_after_restart': '重启后状态未知',
  'status.error': '失败',
  'depends.on': '依赖',
  'tool.title': '委派图',
  'workspace.title': '成员工作区',
  'workspace.close': '关闭',
  'workspace.empty': '点选编排图中的成员，在右侧看他正在想、正在搜',
  'attention.title': '需要你处理',
  'attention.decision': '待你拍板',
  'attention.blocker': '阻塞',
  'attention.failed': '失败',
  'attention.unverified': '回传待核实',
  'attention.unknown_after_restart': '重启后状态未知',
  'roster.title': '成员',
  'field.lastMessage': '成员回传',
  'inspector.hint': '点选节点查看任务、汇报、阻塞和待拍板',
  'inspector.close': '关闭',
  'inspector.live': '正在实时输出——下方内容会边写边更新。',
  'inspector.running': '成员已开始执行，过程还没有投射过来。',
  'inspector.queued': '还在等依赖完成，调度器还没有启动这个节点',
  'inspector.noReport': '还没有结构化汇报。',
  'inspector.unknown': '进程重启后，这个成员当时是否仍在运行已经无法确认。',
  'debrief.title': '交接简报',
  'debrief.expand': '展开简报',
  'debrief.collapse': '收起简报',
  'debrief.openPage': '打开原页',
  'field.conclusion': '结论',
  'process.thinking': '思考中…',
  'process.thought.show': '思考',
  'process.thought.hide': '收起思考',
  'workspace.toBottom': '回到底部',
  'tasks.title': '任务板',
  'tasks.loading': '任务板加载中…',
  'tasks.unavailable': '任务板不可用（官方团队服务未就绪）',
  'tasks.empty': '任务板上还没有任务',
  'tasks.create': '新建',
  'tasks.subject': '新任务标题',
  'tasks.complete': '完成',
  'tasks.retry': '重试',
  'tasks.status.pending': '待处理',
  'tasks.status.in_progress': '进行中',
  'tasks.status.completed': '已完成',
  'process.fetch.http': 'HTTP',
  'process.fetch.open': '打开原页',
  'process.fetch.empty': '（无正文）',
  'process.fetch.collection': 'Read page · {count} sources',
  'markdown.copy': '复制',
  'markdown.copied': '已复制',
  'markdown.footnotes': '脚注',
  'process.tool.running': '执行中',
  'process.tool.ok': '完成',
  'process.tool.error': '失败',
  'process.search.results': '{count} results',
  'process.search.none': 'No results',
  'process.search.query': '搜索：',
  'process.search.noKey': '搜索未配置 API 密钥',
  'process.search.searching': 'Searching',
  'task.expand': '展开全文',
  'task.collapse': '收起',
  'field.task': '任务',
  'field.done': '已完成',
  'field.notDone': '未完成',
  'field.artifacts': '产物',
  'field.evidence': '验证依据',
  'field.risks': '风险 / 阻塞',
  'field.next': '下一步',
  'field.decisions': '待用户决策',
  'badge.decision': '待你拍板',
  'badge.blocker': '阻塞',
  'inspector.decisionInChat': '这个问题在输入框上方回答，不用在这里找',
  'drawer.caption': '待你拍板',
  'drawer.context': '{seat} 需要你选下一步',
  'drawer.fallbackQuestion': '{seat} 需要你拍板才能继续',
  'drawer.placeholder': '用一句话写下你的选择',
  'drawer.prev': '上一项',
  'drawer.next': '下一项',
  'drawer.fold': '收起',
  'drawer.expand': '展开',
  'decision.label': '你的决定',
  'decision.placeholder': '写给这个成员的拍板。CEO 会用 ceo_replan continue 续跑同一张图，不会私下转发给成员。',
  'decision.send': '发给 CEO',
  'decision.sending': '发送中',
  'decision.sent': '已拍板',
  'decision.error': '拍板没有发出',
  'tokens.badge': '{tokens} tokens',
  'tokens.tooltip': '输入 {input} · 输出 {output}',
  'tokens.input': '输入 {tokens}',
  'tokens.output': '输出 {tokens}',
  'tokens.cache': '缓存 {tokens}',
  'context.title': '收到的上下文（通道：字符数）',
  'halted.badge': '已停止',
  'halted.hint': '这个成员被你停止了。用 replace 或 add 继续这项工作。',
  'intervene.title': '只干预这个人',
  'intervene.halt': '停止此成员',
  'intervene.redirect': '按新方向重派',
  'intervene.resume': '重新派发',
  'intervene.placeholder': '写下新方向，例如：聚焦中国市场，不要海外数据',
  'intervene.redirected': '已重派方向',
}

export const en = {
  'graph.title': 'CEO graph',
  'graph.empty': 'No members yet',
  'graph.goal': 'Your task',
  'graph.goalHint': 'Started this turn',
  'graph.ceo': 'CEO',
  'graph.ceoPending': 'Waiting to summarize',
  'graph.ceoRunning': 'Writing the summary…',
  'graph.ceoDone': 'Summarized',
  'graph.members': '{count} members',
  'graph.openCanvas': 'Open in canvas',
  'graph.fold': 'Collapse',
  'graph.expand': 'Expand',
  'graph.elapsed': 'took {duration}',
  'plan.title': 'CEO analysis and delegation plan',
  'plan.ready': 'The plan is recorded. CEO is preparing to start the team.',
  'graph.zoomIn': 'Zoom in',
  'graph.zoomOut': 'Zoom out',
  'graph.fit': 'Fit',
  'status.queued': 'queued',
  'status.running': 'running',
  'status.ok': 'delegated',
  'status.delegated': 'delegated',
  'status.completed': 'completed',
  'status.blocked': 'blocked',
  'status.failed': 'failed',
  'status.partial': 'partial',
  'status.unverified': 'unverified',
  'status.unknown_after_restart': 'unknown after restart',
  'status.error': 'failed',
  'depends.on': 'depends on',
  'tool.title': 'Delegate graph',
  'workspace.title': 'Member workspace',
  'workspace.close': 'Close',
  'workspace.empty': 'Select a member on the run graph to watch thinking, tools, and search',
  'attention.title': 'Needs your attention',
  'attention.decision': 'Needs your decision',
  'attention.blocker': 'Blocked',
  'attention.failed': 'Failed',
  'attention.unverified': 'unverified',
  'attention.unknown_after_restart': 'unknown after restart',
  'roster.title': 'Members',
  'field.lastMessage': 'Member report',
  'inspector.hint': 'Select a node to inspect the task, report, blockers, and decisions',
  'inspector.close': 'Close',
  'inspector.live': 'Live output — the content below updates as it is written.',
  'inspector.running': 'The member has started. Process has not arrived yet.',
  'inspector.queued': 'Waiting for upstream nodes. The scheduler has not started this node yet.',
  'inspector.noReport': 'No structured report yet.',
  'inspector.unknown': 'After restart, whether this member was still running cannot be confirmed.',
  'debrief.title': 'Handoff brief',
  'debrief.expand': 'Show brief',
  'debrief.collapse': 'Hide brief',
  'debrief.openPage': 'Open page',
  'field.conclusion': 'Conclusion',
  'process.thinking': 'Thinking…',
  'process.thought.show': 'Thought',
  'process.thought.hide': 'Hide Thought',
  'workspace.toBottom': 'Back to bottom',
  'tasks.title': 'Task board',
  'tasks.loading': 'Loading the task board…',
  'tasks.unavailable': 'Task board unavailable (Agent Teams service not ready)',
  'tasks.empty': 'No tasks on the board yet',
  'tasks.create': 'Create',
  'tasks.subject': 'New task title',
  'tasks.complete': 'Done',
  'tasks.retry': 'Retry',
  'tasks.status.pending': 'pending',
  'tasks.status.in_progress': 'in progress',
  'tasks.status.completed': 'completed',
  'process.fetch.http': 'HTTP',
  'process.fetch.open': 'Open page',
  'process.fetch.empty': '(no content)',
  'process.fetch.collection': 'Read page · {count} sources',
  'markdown.copy': 'Copy',
  'markdown.copied': 'Copied',
  'markdown.footnotes': 'Footnotes',
  'process.tool.running': 'running',
  'process.tool.ok': 'done',
  'process.tool.error': 'failed',
  'process.search.results': '{count} results',
  'process.search.none': 'No results',
  'process.search.query': '搜索：',
  'process.search.noKey': 'Search is missing an API key',
  'process.search.searching': 'Searching',
  'task.expand': 'Show full text',
  'task.collapse': 'Collapse',
  'field.task': 'Task',
  'field.done': 'Done',
  'field.notDone': 'Not done',
  'field.artifacts': 'Artifacts',
  'field.evidence': 'Evidence',
  'field.risks': 'Risks / blockers',
  'field.next': 'Next',
  'field.decisions': 'User decisions',
  'badge.decision': 'Needs your decision',
  'badge.blocker': 'Blocked',
  'inspector.decisionInChat': 'Answer this in the card above the input, not in this dock',
  'drawer.caption': 'Needs your decision',
  'drawer.context': '{seat} is waiting for you to choose the next step',
  'drawer.fallbackQuestion': '{seat} needs a decision before it can continue',
  'drawer.placeholder': 'Write your choice in one sentence',
  'drawer.prev': 'Previous',
  'drawer.next': 'Next',
  'drawer.fold': 'Collapse',
  'drawer.expand': 'Expand',
  'decision.label': 'Your decision',
  'decision.placeholder': 'CEO will call ceo_replan continue on this graph. Do not send_message the member.',
  'decision.send': 'Send to CEO',
  'decision.sending': 'Sending',
  'decision.sent': 'Decision sent',
  'decision.error': 'The decision was not sent',
  'tokens.badge': '{tokens} tok',
  'tokens.tooltip': 'input {input} · output {output}',
  'tokens.input': 'in {tokens}',
  'tokens.output': 'out {tokens}',
  'tokens.cache': 'cache {tokens}',
  'context.title': 'Received context (channel: chars)',
  'halted.badge': '已停止',
  'halted.hint': 'This member was stopped by the user. Replace or add a node to continue the work.',
  'intervene.title': '只干预这个人',
  'intervene.halt': '停止此成员',
  'intervene.redirect': '按新方向重派',
  'intervene.resume': '重新派发',
  'intervene.placeholder': '写下新的方向，例如：聚焦中国市场，不要海外数据',
  'intervene.redirected': '已重派方向',
}

export interface CeoUiContext {
  uiConversation: { events: { register: (definition: unknown) => unknown } }
  locale: {
    register: (ns: string, dicts: { zh: typeof zh; en: typeof en }) => () => void
    bind: (ns: string) => (key: string, params?: Record<string, unknown>) => string
  }
  sessions: {
    open: (id: string) => void
    list?: { getSnapshot: () => { current?: string } }
    binding?: (id: string) => {
      session?: {
        prompt?: (
          content: Array<{ type: 'text'; text: string }>,
          mode: 'queue' | 'steer',
        ) => Promise<{ ok: boolean; error?: { message?: string } }>
        /** 任务板按 lead 会话路由：成员子会话从这里读父会话 id（对齐官方面板）。 */
        getSnapshot?: () => {
          subagent?: {
            address?: {
              parentSessionId?: string
            }
          }
        }
      }
    } | undefined
  }
  /**
   * 运行时按需注入（core-cordis 原生能力）：remote.agentTeams 由 ui-agent-team 的
   * Remote contribution 挂载，点号命名空间不能走静态 inject 列表（loader 不支持），
   * 必须照官方 client-ui-agent-team/mount.ts 的方式用 ctx.inject 在回调里取。
   */
  inject?: (names: readonly string[], fn: (scoped: {
    remote?: { agentTeams?: TaskBoardApi }
  }) => unknown) => unknown
  sidebarRightTabs: {
    register: (definition: {
      id: string
      kind: string
      title: (address: string) => string
    }) => () => void
  }
  sidebarRight: {
    openTab: (kind: string, options?: { params?: unknown }) => void
  }
  slots: {
    inject: (name: string, factory: () => unknown) => unknown
    register: (spec: Record<string, unknown>, component: unknown) => unknown
  }
  effect: (factory: () => unknown, label: string) => unknown
}

export const CEO_MEMBER_TAB_KIND = 'magicCeoMember'
/** The tab body registers under the definition's id (the seat is keyed by id, not kind). */
export const CEO_MEMBER_TAB_ID = '@magic/dsh-ceo-ui/member-workspace'

export function registerCeoUi(
  ctx: CeoUiContext,
  components: { graph: unknown; row: unknown; workspace: unknown; drawer: unknown },
) {
  ctx.uiConversation.events.register(ceoTeamDefinition)
  ctx.uiConversation.events.register(ceoMemberReportDefinition)
  ctx.effect(() => ctx.locale.register('magicCeo', { zh, en }), 'magic-ceo-ui: dictionaries')
  const promptSession = async (sessionId: string, text: string) => {
    const session = ctx.sessions.binding?.(sessionId)?.session
    if (session?.prompt === undefined) {
      return { ok: false as const, error: 'session unavailable' }
    }
    const result = await session.prompt([{ type: 'text', text }], 'queue')
    if (!result.ok) return { ok: false as const, error: result.error?.message }
    return { ok: true as const }
  }
  // Stage one of the right-Sidebar tab: what the member-workspace page type IS
  // (no patterns ⇒ a page kind, opened by `openTab(kind)` at `sidebar://<kind>`).
  const t = ctx.locale.bind('magicCeo')
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: CEO_MEMBER_TAB_ID,
    kind: CEO_MEMBER_TAB_KIND,
    title: () => t('workspace.title'),
  }), 'magic-ceo-ui: member tab type')
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: 'ceo-team',
    locale: 'magicCeo',
    inject: () => ({
      openWorkspace: () => { ctx.sidebarRight.openTab(CEO_MEMBER_TAB_KIND) },
      sessionId: ctx.sessions.list?.getSnapshot().current,
      taskBoard: taskBoardHandle,
    }),
  }, components.graph))
  ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
    name: 'conversation.input.dock',
    id: 'ceo-decision',
    order: 15,
    locale: 'magicCeo',
    inject: (sessionId: string) => ({
      sendDecision: (text: string) => promptSession(sessionId, text),
    }),
  }, components.drawer))
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'ceo_delegate',
    locale: 'magicCeo',
  }, components.row))
  // Stage two of the tab: the body under the definition's id. The seat's
  // default inject supplies `useTabInfo` (tab.actions.close, tab.navigation);
  // the framework merges it with this spec's own inject.
  // 任务板通道：官方 ui-agent-team/mount.ts 的静态 inject 就包含 'remote'
  // （父服务），其 apply 内 await $mount(agentTeamsRemote) 后，
  // ctx.remote.agentTeams 命名空间即可用；本插件的 apply 晚于其挂载，
  // 调用发生在渲染期，时序安全。缺席时调用抛可读错误，前端降级。
  const leadSessionIdOf = (sessionId: string): string => {
    const parent = ctx.sessions.binding?.(sessionId)?.session?.getSnapshot?.().subagent?.address?.parentSessionId
    return parent ?? sessionId
  }
  const readAgentTeams = (): TaskBoardApi => {
    // 命名空间是独立注入服务名 'remote.agentTeams'（ui-agent-team $mount 注册）；
    // 属性访问 ctx.remote.agentTeams 会被 cordis 代理拦截并要求注入该名。
    const teams = (ctx as unknown as Record<string, TaskBoardApi | undefined>)['remote.agentTeams']
    if (teams === undefined) {
      throw new Error('任务板通道未就绪（remote.agentTeams 未注入）')
    }
    return teams
  }
  const taskBoardApi: TaskBoardApi = {
    view: async (sessionId) => await readAgentTeams().view(leadSessionIdOf(sessionId)),
    createTask: async (sessionId, input) => await readAgentTeams().createTask(leadSessionIdOf(sessionId), input),
    updateTask: async (sessionId, input) => await readAgentTeams().updateTask(leadSessionIdOf(sessionId), input),
  }
  // 任务板句柄：画布（chat.node）与工作区（右坞）共用的订阅/操作面。
  // 会话 id 从 sessions.list 取当前会话（画布只出现在 lead 会话视图）。
  // 写操作失败时 store 已把原因写入快照（UI 呈现），这里吞掉异常只为
  // 避免 unhandled rejection 变成控制台噪声。
  const swallow = (): undefined => undefined
  const taskBoardHandle = {
    subscribe: subscribeTaskBoard,
    getSnapshot: getTaskBoardSnapshot,
    reload: () => {
      const sessionId = ctx.sessions.list?.getSnapshot().current
      if (sessionId !== undefined) void reloadTaskBoard(taskBoardApi, sessionId)
    },
    create: (subject: string) => {
      const sessionId = ctx.sessions.list?.getSnapshot().current
      if (sessionId === undefined) return Promise.resolve()
      return createTaskOnBoard(taskBoardApi, sessionId, subject).catch(swallow)
    },
    complete: (taskId: string, revision: number) => {
      const sessionId = ctx.sessions.list?.getSnapshot().current
      if (sessionId === undefined) return Promise.resolve()
      return completeTaskOnBoard(taskBoardApi, sessionId, taskId, revision).catch(swallow)
    },
  }

  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: CEO_MEMBER_TAB_ID,
    locale: 'magicCeo',
    inject: (sessionId: string) => ({
      sessionId,
      // 两个面各司其职：句柄供订阅（画布点选任务 → 右坞详情），api 供卡片自加载列表。
      taskBoard: taskBoardHandle,
      taskBoardApi,
      sendIntervention: (message: string) => { void promptSession(sessionId, message) },
    }),
  }, components.workspace))
  try { window.sessionStorage.setItem('magic-ceo-apply', 'done-' + String(Date.now())) } catch { /* 忽略 */ }
}
