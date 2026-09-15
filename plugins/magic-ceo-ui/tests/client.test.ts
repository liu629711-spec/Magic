import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CEO_MEMBER_TAB_ID, CEO_MEMBER_TAB_KIND, inject, registerCeoUi, zh } from '../src/client/register.ts'
import { sessionCanvasHeight } from '../src/client/session-canvas.ts'
import { resetCeoRoster } from '../src/client/selection.ts'

const fakeTaskBoard = {
  // 线上载波信封的载荷字段是 value（官方 RemoteResult<T>），不是 data
  view: async (_sessionId: string) => ({ ok: true as const, value: { tasks: [] } }),
  createTask: async () => ({ ok: true as const, value: { ok: true as const } }),
  updateTask: async () => ({ ok: true as const, value: { ok: true as const } }),
}

test('registers the ceo-team node, ceo_delegate toolview, and the right-sidebar member workspace', async () => {
  const sections: string[] = []
  const slots: Array<{ name: string; key?: string; priority?: number; spec: Record<string, unknown> }> = []
  const definitions: Array<{ kind?: string; target?: string }> = []
  const tabKinds: string[] = []
  const openedTabs: string[] = []

  registerCeoUi({
    uiConversation: {
      events: {
        register: (value) => {
          definitions.push(value as { kind?: string; target?: string })
        },
      },
    },
    locale: {
      register: (ns, dicts) => {
        sections.push(ns)
        assert.equal(typeof dicts.zh['graph.title'], 'string')
        assert.equal(typeof dicts.en['graph.title'], 'string')
        assert.equal(dicts.zh['graph.goal'], '你的任务')
        assert.equal(dicts.zh['graph.goalHint'], '对话发起')
        assert.equal(dicts.zh['graph.ceo'], 'CEO 汇总')
        assert.equal(dicts.zh['graph.fold'], '收起')
        assert.equal(dicts.zh['process.fetch.empty'], '（无正文）')
        assert.equal(dicts.zh['process.fetch.collection'], 'Read page · {count} sources')
        assert.equal(dicts.zh['graph.fit'], '适应画布')
        assert.equal(dicts.zh['status.queued'], '排队中')
        assert.equal(dicts.zh['status.unverified'], '回传待核实')
        assert.equal(dicts.zh['status.unknown_after_restart'], '重启后状态未知')
        assert.equal(dicts.zh['attention.unverified'], '回传待核实')
        assert.equal(dicts.zh['attention.unknown_after_restart'], '重启后状态未知')
        assert.equal(dicts.en['inspector.queued'].includes('upstream'), true)
        assert.equal(dicts.zh['badge.decision'], '待你拍板')
        assert.equal(dicts.zh['drawer.caption'], '待你拍板')
        assert.equal(dicts.zh['drawer.placeholder'], '用一句话写下你的选择')
        assert.equal(dicts.zh['inspector.decisionInChat'].includes('输入框上方'), true)
        assert.equal(dicts.zh['workspace.overview'], '团队总览')
        assert.equal(dicts.zh['context.title'], '收到的上下文')
        assert.equal(dicts.zh['context.segments'], '{count} 段')
        assert.equal(dicts.zh['tokens.title'], '资源消耗')
        assert.equal(dicts.zh['produced.label'], '本轮文件改动')
        assert.equal(dicts.en['produced.label'], 'Files changed')
        assert.equal(dicts.zh['relations.title'], '关系')
        assert.equal(dicts.zh['activity.thinking'], '思考中')
        assert.equal(dicts.zh['attention.title'], '需要你处理')
        assert.equal(dicts.zh['decision.send'], '发给 CEO')
        assert.equal(dicts.en['workspace.empty'].includes('run graph'), true)
        assert.equal(dicts.zh['inspector.live'].includes('实时输出'), true)
        assert.equal(dicts.zh['process.thinking'], '思考中…')
        assert.equal(dicts.zh['process.thought.show'], '思考')
        assert.equal(dicts.zh['process.thought.hide'], '收起思考')
        assert.equal(dicts.zh['workspace.toBottom'], '回到底部')
        assert.equal(dicts.zh['task.expand'], '展开全文')
        assert.equal(dicts.zh['process.search.none'], 'No results')
        assert.equal(dicts.zh['process.search.query'], '搜索：')
        assert.equal(dicts.zh['process.search.noKey'], '搜索未配置 API 密钥')
        assert.equal(dicts.zh['process.search.searching'], 'Searching')
        assert.equal(dicts.zh['debrief.title'], '交接简报')
        assert.equal(dicts.zh['debrief.collapse'], '收起简报')
        assert.equal(dicts.zh['process.fetch.open'], '打开原页')
        assert.equal(dicts.zh['markdown.copy'], '复制')
        assert.equal(dicts.zh['field.conclusion'], '结论')
        return () => {}
      },
      bind: () => (key: string) => zh[key as keyof typeof zh] ?? key,
    },
    sessions: {
      open: () => {},
    },
    sidebarRightTabs: {
      register: (definition) => {
        tabKinds.push(definition.kind)
        assert.equal(definition.id, CEO_MEMBER_TAB_ID)
        return () => {}
      },
    },
    sidebarRight: {
      openTab: (kind) => {
        openedTabs.push(kind)
      },
    },
    remote: { agentTeams: fakeTaskBoard },
    'remote.agentTeams': fakeTaskBoard,
    slots: {
      inject: (_name, factory) => factory(),
      register: (spec) => {
        slots.push({
          name: String(spec.name),
          key: spec.key === undefined ? undefined : String(spec.key),
          priority: typeof spec.priority === 'number' ? spec.priority : undefined,
          spec,
        })
      },
    },
    effect: (factory) => factory(),
  }, { graph: 'graph', row: 'row', workspace: 'workspace', drawer: 'drawer', turnProcess: 'turn-process', tabTitle: 'tab-title' })

  assert.deepEqual(inject, ['uiConversation', 'slots', 'sessions', 'locale', 'sidebarRightTabs', 'sidebarRight', 'remote', 'remote.agentTeams'])
  assert.equal(definitions[0]?.kind, 'ceo-team')
  assert.equal(definitions[0]?.target, 'chat')
  assert.equal(definitions[1]?.kind, 'ceo-member-report')
  assert.equal(sections[0], 'magicCeo')
  assert.deepEqual(tabKinds, [CEO_MEMBER_TAB_KIND])
  assert.deepEqual(slots.map(({ name, key, priority }) => ({ name, key, priority })), [
    { name: 'conversation.chat.node', key: 'ceo-team', priority: undefined },
    { name: 'conversation.input.dock', key: undefined, priority: undefined },
    { name: 'tool.call.toolview', key: 'ceo_delegate', priority: undefined },
    { name: 'conversation.chat.node', key: 'turn-process', priority: -10 },
    { name: 'sidebar.right.pane.tab', key: CEO_MEMBER_TAB_ID, priority: undefined },
    { name: 'sidebar.right.pane.tab.title', key: CEO_MEMBER_TAB_ID, priority: undefined },
  ])

  // The canvas node's inject opens the member workspace page tab by kind.
  const graphSpec = slots[0]!.spec as {
    inject: () => {
      openWorkspace: () => void
      taskBoard: { subscribe: unknown; getSnapshot: () => unknown }
    }
  }
  const graphInject = graphSpec.inject()
  assert.equal('openLargeCanvas' in graphInject, false)
  graphInject.openWorkspace()
  assert.deepEqual(openedTabs, [CEO_MEMBER_TAB_KIND])
  resetCeoRoster()
  // 画布卡必须是「句柄」：有 subscribe/getSnapshot 才能被 useSyncExternalStore 订阅。
  // 若这里误注入 RPC 本体，getSnapshot 为 undefined → 回落到空快照 → React #185 拆卡。
  const graphBoard = graphSpec.inject().taskBoard
  assert.equal(typeof graphBoard.subscribe, 'function')
  assert.equal(typeof graphBoard.getSnapshot, 'function')
  assert.equal(graphBoard.getSnapshot(), graphBoard.getSnapshot(), 'getSnapshot 必须引用稳定（否则 React #185）')

  // The workspace body gets its session id and intervention sender from the seat.
  // slots[3] 现在是 turn-process 替换渲染器（阶段二），右坞 tab 顺延到 slots[4]。
  const workspaceSpec = slots[4]!.spec as { inject: (sessionId: string) => Record<string, unknown> }
  const workspaceInject = workspaceSpec.inject('session-1') as Record<string, unknown>
  assert.equal(workspaceInject.sessionId, 'session-1')
  assert.equal(typeof workspaceInject.sendIntervention, 'function')
  // PRD-04 §12（2026-09-13 裁定）：任务板只在画布呈现，右坞不再注入任务板面。
  assert.equal(workspaceInject.taskBoard, undefined)
  assert.equal(workspaceInject.taskBoardApi, undefined)
})

test('session canvas grows with layout and caps at about 70% of the viewport', () => {
  const previous = globalThis.window
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { innerHeight: 1000 },
  })
  try {
    assert.equal(sessionCanvasHeight(100), 300)
    assert.equal(sessionCanvasHeight(400), 472)
    assert.equal(sessionCanvasHeight(2000), 700)
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(globalThis, 'window')
    } else {
      Object.defineProperty(globalThis, 'window', { configurable: true, value: previous })
    }
  }
})
