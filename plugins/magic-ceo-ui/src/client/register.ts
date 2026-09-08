import { ceoMemberReportDefinition, ceoTeamDefinition } from './definition.ts'

export const inject = ['uiConversation', 'slots', 'sessions', 'locale', 'layout']

export const zh = {
  'graph.title': 'CEO 编排图',
  'graph.empty': '还没有成员',
  'graph.goal': '本轮目标',
  'graph.goalHint': '用户交给 CEO 的这一轮',
  'graph.ceo': 'CEO 汇总',
  'graph.members': '{count} 个成员',
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
  'roster.title': '成员',
  'field.lastMessage': '成员回传',
  'inspector.hint': '点选节点查看任务、汇报、阻塞和待拍板',
  'inspector.close': '关闭',
  'inspector.live': '正在实时输出——下方内容会边写边更新。',
  'inspector.running': '成员已开始执行，过程还没有投射过来。',
  'inspector.queued': '还在等依赖完成，调度器还没有启动这个节点',
  'inspector.noReport': '还没有结构化汇报。',
  'debrief.title': '交接简报',
  'debrief.expand': '展开简报',
  'field.conclusion': '结论',
  'process.thinking': '思考中…',
  'process.thought.show': '思考',
  'process.thought.hide': '收起思考',
  'workspace.toBottom': '回到底部',
  'process.fetch.http': 'HTTP',
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
  'decision.label': '你的决定',
  'decision.placeholder': '写给这个成员的拍板，会作为当前会话的新回合发出',
  'decision.send': '发给 CEO',
  'decision.sending': '发送中',
  'decision.sent': '已拍板',
  'decision.error': '拍板没有发出',
}

export const en = {
  'graph.title': 'CEO graph',
  'graph.empty': 'No members yet',
  'graph.goal': 'This turn',
  'graph.goalHint': 'The work the user gave the CEO',
  'graph.ceo': 'CEO',
  'graph.members': '{count} members',
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
  'roster.title': 'Members',
  'field.lastMessage': 'Member report',
  'inspector.hint': 'Select a node to inspect the task, report, blockers, and decisions',
  'inspector.close': 'Close',
  'inspector.live': 'Live output — the content below updates as it is written.',
  'inspector.running': 'The member has started. Process has not arrived yet.',
  'inspector.queued': 'Waiting for upstream nodes. The scheduler has not started this node yet.',
  'inspector.noReport': 'No structured report yet.',
  'debrief.title': 'Handoff brief',
  'debrief.expand': 'Show brief',
  'field.conclusion': 'Conclusion',
  'process.thinking': 'Thinking…',
  'process.thought.show': 'Thought',
  'process.thought.hide': 'Hide Thought',
  'workspace.toBottom': 'Back to bottom',
  'process.fetch.http': 'HTTP',
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
  'decision.label': 'Your decision',
  'decision.placeholder': 'Send this decision as a new turn in the current CEO session',
  'decision.send': 'Send to CEO',
  'decision.sending': 'Sending',
  'decision.sent': 'Decision sent',
  'decision.error': 'The decision was not sent',
}

export interface CeoUiContext {
  uiConversation: { events: { register: (definition: unknown) => unknown } }
  locale: { register: (ns: string, dicts: { zh: typeof zh; en: typeof en }) => () => void }
  sessions: {
    open: (id: string) => void
    binding?: (id: string) => {
      session?: {
        prompt?: (
          content: Array<{ type: 'text'; text: string }>,
          mode: 'queue' | 'steer',
        ) => Promise<{ ok: boolean; error?: { message?: string } }>
      }
    } | undefined
  }
  layout: { openDetails: () => void; closeDetails: () => void }
  slots: {
    inject: (name: string, factory: () => unknown) => unknown
    register: (spec: Record<string, unknown>, component: unknown) => unknown
  }
  effect: (factory: () => unknown, label: string) => unknown
}

export function registerCeoUi(
  ctx: CeoUiContext,
  components: { graph: unknown; row: unknown; workspace: unknown },
) {
  ctx.uiConversation.events.register(ceoTeamDefinition)
  ctx.uiConversation.events.register(ceoMemberReportDefinition)
  ctx.effect(() => ctx.locale.register('magicCeo', { zh, en }), 'magic-ceo-ui: dictionaries')
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: 'ceo-team',
    locale: 'magicCeo',
    inject: () => ({
      openDetails: () => { ctx.layout.openDetails() },
    }),
  }, components.graph))
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({
    name: 'tool.call.toolview',
    key: 'ceo_delegate',
    locale: 'magicCeo',
  }, components.row))
  ctx.slots.inject('details', () => ctx.slots.register({
    name: 'details',
    priority: -1,
    locale: 'magicCeo',
    inject: () => ({
      closeDetails: () => { ctx.layout.closeDetails() },
      promptSession: async (sessionId: string, text: string) => {
        const session = ctx.sessions.binding?.(sessionId)?.session
        if (session?.prompt === undefined) {
          return { ok: false as const, error: 'session unavailable' }
        }
        const result = await session.prompt([{ type: 'text', text }], 'queue')
        if (!result.ok) return { ok: false as const, error: result.error?.message }
        return { ok: true as const }
      },
    }),
  }, components.workspace))
}
