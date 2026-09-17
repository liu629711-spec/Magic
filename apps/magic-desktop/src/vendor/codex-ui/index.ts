// vendored from codex-ui@0.1.0（用户确认可用）src/index.ts
// 桶出口：ConversationView + 全部类型 + 静态假数据。
// 与源 barrel 的差异：CodexWindow 不搬（Magic 有自己的外壳）、demo App 不搬、
// 增加静态假数据源 mockMessages；token 桥（conversation/tokens.css）随桶加载。
import './conversation/tokens.css';

export { ConversationView } from './conversation/ConversationView.tsx';
export { conversationCapabilities, composerPlaceholder } from './conversation/capabilities.ts';
export type {
  ConversationCapabilities,
  ConversationMemoryReference,
  ConversationMemoryReferenceGroup,
  ConversationMessage,
  ConversationMode,
  ConversationOutput,
  ConversationRole,
  ConversationSession,
  ConversationSlashCommand,
  ConversationSource,
  ConversationSteerMessage,
  ConversationUserProfile,
  ConversationViewModel,
  ConversationViewProps,
  ToolCallInfo,
  ToolDetailItem,
  ToolSummaryInfo,
  TurnFoldInfo,
} from './conversation/types.ts';
export { mockMessages } from './mock-messages.ts';
