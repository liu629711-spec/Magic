// vendored from codex-ui@0.1.0（用户确认可用）src/demo/data.ts
// 改造为 Magic 静态假数据源：demo 的 sessions/slashCommands 不搬（App 挂载用 sessions={[]}），
// 导出扁平 mockMessages 数组，覆盖 ConversationView 各消息形状：
// user 气泡 / assistant 回复（含 markdown 代码块与记忆引用）/ tool 摘要（toolSummary 折叠行）/
// 原始 toolCall / approval 审批卡。m4 保留 streaming:true（与 demo 一致），
// 使 autoFoldLiveTurns 对该轮不折叠，工具摘要与审批卡均直接可见。
import type { ConversationMessage } from './conversation/types.ts';

export const mockMessages: ConversationMessage[] = [
  {
    id: 'm1',
    role: 'user',
    text: '把现成的 Codex 风格对话区组件库搬进 Magic 桌面客户端，暗色自适应。',
  },
  {
    id: 'm2',
    role: 'assistant',
    timestamp: '2026-09-17T09:20:06.000Z',
    text: '我会把源项目里的 ConversationView 拆成可导出的 React 组件，同时保留静态假数据用于本地预览。\n\n核心库会避免业务依赖，也不要求消费者安装 antd。\n\n<oai-mem-citation>\n<citation_entries>\nsrc/components/ConversationView/MessageList.tsx:1-40|note=[组件库保留轻量内部实现，不引入源项目业务依赖]\n</citation_entries>\n</oai-mem-citation>',
  },
  {
    id: 'm3',
    role: 'tool',
    text: 'apps/magic-desktop/src/vendor/codex-ui/conversation/ConversationView.tsx\napps/magic-desktop/src/vendor/codex-ui/conversation/MessageList.tsx\napps/magic-desktop/src/vendor/codex-ui/conversation/ConversationView.module.css',
    toolSummary: {
      icon: 'folders',
      label: '已探索 3 个文件',
      category: 'explore',
      count: 3,
      details: [
        {
          label: 'Read ConversationView.tsx',
          category: 'explore',
        },
        {
          label: 'Read MessageList.tsx',
          category: 'explore',
        },
        {
          label: 'Read ConversationView.module.css',
          category: 'explore',
        },
      ],
    },
  },
  {
    id: 'm5',
    role: 'tool',
    text: 'build 通过，0 错误。',
    toolCall: {
      toolName: 'shell',
      toolArgs: '{"cmd":"pnpm --filter @magic/desktop build"}',
      status: 'done',
      exitCode: 0,
    },
  },
  {
    id: 'm4',
    role: 'assistant',
    timestamp: '2026-09-17T09:20:28.000Z',
    streaming: true,
    text: '组件库入口导出 `ConversationView`、全部类型定义与静态假数据。\n\n```tsx\nimport { ConversationView, mockMessages } from "./vendor/codex-ui";\n```\n\n- 颜色已提取为 `--cv-*` 令牌，默认暗色跟随 Magic 界面\n- 支持 live / history / subagent 三种模式',
  },
  {
    id: 'm6',
    role: 'user',
    text: '演示一条审批卡，看看按钮交互。',
  },
  {
    id: 'm7',
    role: 'approval',
    text: '允许执行 pnpm --filter @magic/desktop build 以验证桌面端构建？',
    requestId: 'approval-mock-build',
  },
];
