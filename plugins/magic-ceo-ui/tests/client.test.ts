import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inject, registerCeoUi } from '../src/client/register.ts'

test('registers the ceo-team node, ceo_delegate toolview, and details workspace', () => {
  const sections: string[] = []
  const slots: Array<{ name: string; key?: string; priority?: number }> = []
  const definitions: Array<{ kind?: string; target?: string }> = []

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
        assert.equal(dicts.zh['graph.goal'], '本轮目标')
        assert.equal(dicts.zh['graph.ceo'], 'CEO 汇总')
        assert.equal(dicts.zh['graph.fit'], '适应画布')
        assert.equal(dicts.zh['status.queued'], '排队中')
        assert.equal(dicts.en['inspector.queued'].includes('upstream'), true)
        assert.equal(dicts.zh['badge.decision'], '待你拍板')
        assert.equal(dicts.zh['workspace.title'], '成员工作区')
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
        assert.equal(dicts.zh['field.conclusion'], '结论')
        return () => {}
      },
    },
    sessions: {
      open: () => {},
    },
    layout: {
      openDetails: () => {},
      closeDetails: () => {},
    },
    slots: {
      inject: (_name, factory) => factory(),
      register: (spec) => {
        slots.push({
          name: String(spec.name),
          key: spec.key === undefined ? undefined : String(spec.key),
          priority: typeof spec.priority === 'number' ? spec.priority : undefined,
        })
      },
    },
    effect: (factory) => factory(),
  }, { graph: 'graph', row: 'row', workspace: 'workspace' })

  assert.deepEqual(inject, ['uiConversation', 'slots', 'sessions', 'locale', 'layout'])
  assert.equal(definitions[0]?.kind, 'ceo-team')
  assert.equal(definitions[0]?.target, 'chat')
  assert.equal(definitions[1]?.kind, 'ceo-member-report')
  assert.equal(sections[0], 'magicCeo')
  assert.deepEqual(slots, [
    { name: 'conversation.chat.node', key: 'ceo-team', priority: undefined },
    { name: 'tool.call.toolview', key: 'ceo_delegate', priority: undefined },
    { name: 'details', key: undefined, priority: -1 },
  ])
})
