// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/systemPromptMessages.ts
import type { ConversationMessage } from './types.ts';

const SYSTEM_PROMPT_PREFIXES = [
  '<goal_context>',
  '<permissions instructions>',
  '# AGENTS.md',
  '<environment_context>',
];

const SYSTEM_PROMPT_ROLES = new Set<ConversationMessage['role']>([
  'user',
  'system',
]);

export function shouldHideSystemPromptMessage(
  message: ConversationMessage,
): boolean {
  if (!SYSTEM_PROMPT_ROLES.has(message.role)) return false;

  const text = message.text.trimStart();
  return SYSTEM_PROMPT_PREFIXES.some((prefix) => text.startsWith(prefix));
}

export function filterSystemPromptMessages(
  messages: ConversationMessage[],
): ConversationMessage[] {
  return messages
    .filter((message) => !shouldHideSystemPromptMessage(message))
    .map((message) => {
      if (!message.turnFold) return message;

      return {
        ...message,
        turnFold: {
          ...message.turnFold,
          foldedMessages: filterSystemPromptMessages(
            message.turnFold.foldedMessages,
          ),
        },
      };
    });
}
