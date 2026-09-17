// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/capabilities.ts
import type { ConversationCapabilities, ConversationMode } from './types.ts';

const MODES: ConversationMode[] = ['live', 'history', 'subagent'];

export function normalizeConversationMode(
  mode: ConversationMode | string | undefined,
): ConversationMode {
  return MODES.includes(mode as ConversationMode)
    ? (mode as ConversationMode)
    : 'history';
}

export function conversationCapabilities(
  mode: ConversationMode | string = 'live',
  overrides: Partial<ConversationCapabilities> = {},
): ConversationCapabilities {
  const normalizedMode = normalizeConversationMode(mode);
  const live = normalizedMode === 'live';
  return {
    mode: normalizedMode,
    readOnly: !live,
    canSendMessage: live,
    canSteer: live,
    canApprove: live,
    canSwitchLocalSession: live,
    ...overrides,
  };
}

export function composerPlaceholder(
  capabilities: ConversationCapabilities = conversationCapabilities('live'),
) {
  if (capabilities.mode === 'subagent') {
    return '该会话为派生的只读 subagent 会话';
  }
  if (capabilities.mode === 'live' && capabilities.readOnly) {
    return '只读本机会话';
  }
  if (capabilities.mode === 'live' && !capabilities.canSendMessage) {
    return '选择历史会话或新建会话';
  }
  return capabilities.readOnly || !capabilities.canSendMessage
    ? '只读关联会话'
    : '输入消息';
}
