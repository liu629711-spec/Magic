// M1 静态假数据：一段真实形状的会话事件窗口（事件形状见
// src/vendor/dsh-chat/vendor-types.ts 的 SessionEventMap；seq 单调递增）。
// 仅本地演示用，SDK 接线后由真实 session.event 流替代。
import type {
  CommandId, MessageId, SessionEvent, SessionSeq,
} from '../vendor/dsh-chat/index.ts'
// 注意：barrel 里 contract/store.ts 的 ToolCallId（=string 别名）压过 vendor-types
// 的品牌版；wire 事件要的是品牌版，这里直接从 vendor-types 导入。
import type { ToolCallId } from '../vendor/dsh-chat/vendor-types.ts'

const T0 = Date.now() - 5 * 60_000
const at = (offsetMs: number): number => T0 + offsetMs
const seq = (n: number): SessionSeq => n as SessionSeq
const mid = (value: string): MessageId => value as MessageId
const callId = (value: string): ToolCallId => value as ToolCallId
const cmdId = (value: string): CommandId => value as CommandId

const PROVIDER = 'magic-runtime'
const MODEL = 'magic-1'

const buildTodos = [
  { content: '定位底部空白的根因', status: 'completed' },
  { content: '修复布局容器并替换按钮配色', status: 'completed' },
  { content: '回归构建', status: 'in_progress' },
] as const

const grepTodos = [
  { content: '全局搜索硬编码颜色', status: 'completed' },
  { content: '汇总替换清单', status: 'completed' },
] as const

export const mockEvents: SessionEvent[] = [
  {
    type: 'request/header',
    seq: seq(1),
    time: at(0),
    data: { header: { config: { provider: PROVIDER, model: MODEL }, tools: [] }, reason: 'initial' },
  },
  {
    type: 'command/run',
    seq: seq(2),
    time: at(400),
    data: { commandId: cmdId('cmd-init'), name: 'init', args: '', source: { kind: 'user' } },
  },
  {
    type: 'command/done',
    seq: seq(3),
    time: at(900),
    data: { commandId: cmdId('cmd-init'), kind: 'success', text: '已生成 AGENTS.md 项目规则' },
  },
  {
    type: 'user/message',
    seq: seq(3.5),
    time: at(1200),
    data: {
      id: mid('m-inject-skill'),
      role: 'user',
      content: [{ type: 'text', text: 'skill-catalog 注入' }],
      source: { kind: 'plugin', plugin: 'skill-catalog' },
    },
    surfaceOp: 'append',
  },
  {
    type: 'user/message',
    seq: seq(4),
    time: at(1500),
    data: {
      id: mid('m-1'),
      role: 'user',
      content: [{ type: 'text', text: '对话区消息底部总是多出一截空白，帮我找到原因并修掉' }],
      source: { kind: 'user' },
    },
    surfaceOp: 'append',
  },
  { type: 'turn/start', seq: seq(5), time: at(1700), data: { turn: 1 } },
  { type: 'step/start', seq: seq(6), time: at(1750), data: { turn: 1, step: 1 } },
  {
    type: 'tool/call',
    seq: seq(7),
    time: at(2100),
    data: {
      turn: 1,
      step: 1,
      callId: callId('c-read'),
      name: 'read',
      arguments: JSON.stringify({ file_path: 'src/App.tsx', limit: 40 }),
    },
  },
  {
    type: 'tool/result',
    seq: seq(8),
    time: at(2600),
    data: {
      turn: 1,
      step: 1,
      message: {
        id: mid('m-tr-1'),
        role: 'user',
        content: [{
          type: 'tool-result',
          toolCallId: callId('c-read'),
          content: [{
            type: 'text',
            text: [
              '     1\texport function App() {',
              '     2\t  return (',
              '     3\t    <div className="h-screen overflow-hidden">',
              '     4\t      <div className="flex h-full flex-col overflow-y-auto">',
              '     5\t        <MessageFlow />',
              '     6\t        <Composer />',
              '     7\t      </div>',
              '     8\t    </div>',
              '     9\t  )',
              '    10\t}',
            ].join('\n'),
          }],
        }],
        source: { kind: 'tool', callId: callId('c-read') },
      },
    },
    surfaceOp: 'append',
    sourceEventSeqs: [seq(7)],
  },
  {
    type: 'tool/call',
    seq: seq(9),
    time: at(3200),
    data: {
      turn: 1,
      step: 1,
      callId: callId('c-edit'),
      name: 'edit',
      arguments: JSON.stringify({
        file_path: 'src/App.tsx',
        old_string: '<div className="flex h-full flex-col overflow-y-auto">',
        new_string: '<div className="grid h-full grid-rows-[1fr_auto] overflow-hidden">',
      }),
    },
  },
  {
    type: 'tool/result',
    seq: seq(10),
    time: at(3900),
    data: {
      turn: 1,
      step: 1,
      message: {
        id: mid('m-tr-2'),
        role: 'user',
        content: [{
          type: 'tool-result',
          toolCallId: callId('c-edit'),
          content: [{ type: 'text', text: 'The file has been updated successfully.' }],
        }],
        source: { kind: 'tool', callId: callId('c-edit') },
      },
    },
    surfaceOp: 'append',
    sourceEventSeqs: [seq(9)],
  },
  {
    type: 'user/message',
    seq: seq(11),
    time: at(4300),
    data: {
      id: mid('m-2'),
      role: 'user',
      content: [{ type: 'text', text: '顺便把发送按钮也换成中性配色，别用蓝色' }],
      source: { kind: 'user' },
    },
    surfaceOp: 'append',
  },
  {
    type: 'tool/call',
    seq: seq(12),
    time: at(4700),
    data: {
      turn: 1,
      step: 1,
      callId: callId('c-bash'),
      name: 'bash',
      arguments: JSON.stringify({ command: 'pnpm --filter @magic/desktop build' }),
    },
  },
  {
    type: 'tool/result',
    seq: seq(13),
    time: at(5600),
    data: {
      turn: 1,
      step: 1,
      message: {
        id: mid('m-tr-3'),
        role: 'user',
        content: [{
          type: 'tool-result',
          toolCallId: callId('c-bash'),
          content: [{
            type: 'text',
            text: 'vite v6.3.5 building for production...\n✓ 454 modules transformed.\ndist/index.html                 0.46 kB\nbuilt in 1.31s',
          }],
        }],
        source: { kind: 'tool', callId: callId('c-bash') },
      },
    },
    surfaceOp: 'append',
    sourceEventSeqs: [seq(12)],
  },
  {
    type: 'tool/call',
    seq: seq(14),
    time: at(6000),
    data: {
      turn: 1,
      step: 1,
      callId: callId('c-todo'),
      name: 'todo_write',
      arguments: JSON.stringify({ todos: buildTodos }),
    },
  },
  {
    type: 'tool/result',
    seq: seq(15),
    time: at(6200),
    data: {
      turn: 1,
      step: 1,
      message: {
        id: mid('m-tr-4'),
        role: 'user',
        content: [{
          type: 'tool-result',
          toolCallId: callId('c-todo'),
          content: [{ type: 'text', text: 'Todos have been updated.' }],
        }],
        source: { kind: 'tool', callId: callId('c-todo') },
      },
    },
    surfaceOp: 'append',
    sourceEventSeqs: [seq(14)],
  },
  { type: 'todo/write', seq: seq(16), time: at(6205), data: { todos: [...buildTodos] } },
  {
    type: 'assistant/message',
    seq: seq(17),
    time: at(9800),
    data: {
      turn: 1,
      step: 1,
      message: {
        id: mid('m-a1'),
        role: 'assistant',
        content: [
          {
            type: 'reasoning',
            text: '底部空白来自滚动容器把输入条也包了进去：内容不足一屏时，flow 的剩余空间被撑在输入条下方。应把外壳改成两行 grid，消息区独立滚动，输入条固定在底部。',
          },
          {
            type: 'text',
            text: '找到了：滚动容器把输入条一起包了进去，内容不满一屏时空白全堆在输入条下方。已修复：\n\n- 外壳改为 `grid-rows-[1fr_auto]`，消息区独立滚动\n- 发送按钮换成中性 inverse 配色，不再用蓝色\n\n构建已通过：`454 modules transformed`，`built in 1.31s`。',
          },
        ],
        source: { kind: 'model', provider: PROVIDER, model: MODEL },
      },
      stream: [{ type: 'chunk', time: at(9800), chunk: { type: 'finish', reason: { kind: 'stop' } } }],
      usage: { inputTokens: 18432, outputTokens: 986, cacheReadTokens: 12288 },
    },
    surfaceOp: 'append',
  },
  { type: 'step/end', seq: seq(18), time: at(9850), data: { turn: 1, step: 1 } },
  { type: 'turn/end', seq: seq(19), time: at(9900), data: { turn: 1, reason: { kind: 'completed' } } },
  {
    type: 'user/message',
    seq: seq(20),
    time: at(12000),
    data: {
      id: mid('m-3'),
      role: 'user',
      content: [{ type: 'text', text: '再全局搜一下还有没有硬编码的十六进制颜色' }],
      source: { kind: 'user' },
    },
    surfaceOp: 'append',
  },
  { type: 'turn/start', seq: seq(21), time: at(12200), data: { turn: 2 } },
  { type: 'step/start', seq: seq(22), time: at(12250), data: { turn: 2, step: 1 } },
  {
    type: 'tool/call',
    seq: seq(23),
    time: at(12600),
    data: {
      turn: 2,
      step: 1,
      callId: callId('c-grep'),
      name: 'grep',
      arguments: JSON.stringify({ pattern: '#[0-9a-fA-F]{6}', path: 'src' }),
    },
  },
  {
    type: 'tool/result',
    seq: seq(24),
    time: at(13100),
    data: {
      turn: 2,
      step: 1,
      message: {
        id: mid('m-tr-5'),
        role: 'user',
        content: [{
          type: 'tool-result',
          toolCallId: callId('c-grep'),
          content: [{
            type: 'text',
            text: [
              'src/sidebar/SessionSidebar.tsx',
              '  112:      border: "1px solid #4edea3",',
              'src/inspector/InspectorPanel.tsx',
              '   58:  const errorColor = "#ffb4ab";',
              '',
              '2 matches',
            ].join('\n'),
          }],
        }],
        source: { kind: 'tool', callId: callId('c-grep') },
      },
    },
    surfaceOp: 'append',
    sourceEventSeqs: [seq(23)],
  },
  {
    type: 'tool/call',
    seq: seq(25),
    time: at(13400),
    data: {
      turn: 2,
      step: 1,
      callId: callId('c-todo2'),
      name: 'todo_write',
      arguments: JSON.stringify({ todos: grepTodos }),
    },
  },
  {
    type: 'tool/result',
    seq: seq(26),
    time: at(13500),
    data: {
      turn: 2,
      step: 1,
      message: {
        id: mid('m-tr-6'),
        role: 'user',
        content: [{
          type: 'tool-result',
          toolCallId: callId('c-todo2'),
          content: [{ type: 'text', text: 'Todos have been updated.' }],
        }],
        source: { kind: 'tool', callId: callId('c-todo2') },
      },
    },
    surfaceOp: 'append',
    sourceEventSeqs: [seq(25)],
  },
  { type: 'todo/write', seq: seq(27), time: at(13505), data: { todos: [...grepTodos] } },
  {
    type: 'assistant/message',
    seq: seq(28),
    time: at(15200),
    data: {
      turn: 2,
      step: 1,
      message: {
        id: mid('m-a2'),
        role: 'assistant',
        content: [
          {
            type: 'reasoning',
            text: 'grep 命中两处硬编码色值，分别在 SessionSidebar 与 InspectorPanel。这两处不在本次改动范围，先汇总给用户决定是否替换。',
          },
          {
            type: 'text',
            text: '还有两处硬编码色值，都不在这次改动范围内：\n\n- `src/sidebar/SessionSidebar.tsx:112` — `#4edea3`\n- `src/inspector/InspectorPanel.tsx:58` — `#ffb4ab`\n\n建议下一步替换成对应 token（success / error），要处理的话说一声。',
          },
        ],
        source: { kind: 'model', provider: PROVIDER, model: MODEL },
      },
      stream: [{ type: 'chunk', time: at(15200), chunk: { type: 'finish', reason: { kind: 'stop' } } }],
      usage: { inputTokens: 21001, outputTokens: 640, cacheReadTokens: 18432 },
    },
    surfaceOp: 'append',
  },
  { type: 'step/end', seq: seq(29), time: at(15250), data: { turn: 2, step: 1 } },
  { type: 'turn/end', seq: seq(30), time: at(15300), data: { turn: 2, reason: { kind: 'completed' } } },
]
