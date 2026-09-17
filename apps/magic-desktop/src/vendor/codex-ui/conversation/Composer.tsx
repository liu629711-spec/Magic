// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/Composer.tsx
import { useEffect, useRef, useState } from 'react';
import { composerPlaceholder } from './capabilities.ts';
import { ArrowUpIcon, LoadingIcon } from './icons.tsx';
import type {
  ConversationCapabilities,
  ConversationSlashCommand,
  ConversationSteerMessage,
} from './types.ts';
import styles from './ConversationView.module.css';

interface ComposerProps {
  ready: boolean;
  responding?: boolean;
  capabilities: ConversationCapabilities;
  steerMessage?: ConversationSteerMessage;
  slashCommands?: ConversationSlashCommand[];
  onSend?: (text: string) => void;
  onSlashCommandSelect?: (command: ConversationSlashCommand) => void;
}

function getVisibleCommands(
  value: string,
  commands: ConversationSlashCommand[],
) {
  const text = value.trimStart();
  if (!text.startsWith('/') || text.includes('\n')) return [];
  const query = text.slice(1).toLowerCase();
  return commands
    .filter((command) =>
      `${command.name} ${command.usage || ''} ${command.description || ''}`
        .toLowerCase()
        .includes(query),
    )
    .slice(0, 9);
}

function needsArgument(usage = '') {
  return usage.includes('<') || usage.includes('[');
}

function resizeComposerTextarea(textarea: HTMLTextAreaElement) {
  const style = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(style.lineHeight) || 28;
  const minHeight = lineHeight;
  const maxHeight = lineHeight * 3;
  textarea.style.height = 'auto';
  const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = `${Math.max(minHeight, nextHeight)}px`;
  textarea.style.overflowY =
    textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

export function Composer({
  ready,
  responding = false,
  capabilities,
  steerMessage,
  slashCommands = [],
  onSend,
  onSlashCommandSelect,
}: ComposerProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const readOnly = capabilities.readOnly;
  const steerCapacityFull = responding && Boolean(steerMessage);
  const canSubmitMessage = responding
    ? Boolean(
        capabilities.canSendMessage &&
          capabilities.canSteer &&
          !steerCapacityFull,
      )
    : capabilities.canSendMessage;
  const disabled = !ready || readOnly || !canSubmitMessage;
  const sendButtonTitle = responding ? '发送引导' : '发送';
  const placeholder = responding
    ? '要求后续变更'
    : composerPlaceholder(capabilities);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    resizeComposerTextarea(textarea);
  }, [value]);

  const filteredCommands = getVisibleCommands(value, slashCommands);
  const showSlashMenu =
    focused &&
    !disabled &&
    value.trimStart().startsWith('/') &&
    filteredCommands.length > 0;

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend?.(text);
    setValue('');
  };

  if (readOnly) {
    return (
      <section className={styles.composer}>
        <div className={styles.readOnlyComposer}>
          {composerPlaceholder(capabilities)}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.composer}>
      <div className={styles.promptWrap}>
        {steerMessage ? (
          <div
            className={styles.steerCard}
            data-status={steerMessage.status || 'sending'}
          >
            <span className={styles.steerCardText}>
              <span className={styles.steerCardArrow}>↪</span>
              <span>{steerMessage.text}</span>
            </span>
            <span className={styles.steerCardBadge}>
              <span className={styles.steerCardArrow}>↪</span>
              引导
            </span>
          </div>
        ) : null}
        {showSlashMenu && (
          <div className={styles.slashMenu}>
            {filteredCommands.map((command) => (
              <button
                key={command.name}
                type="button"
                className={styles.slashOption}
                onMouseDown={(event) => {
                  event.preventDefault();
                  setValue(
                    `/${command.name}${
                      needsArgument(command.usage) ? ' ' : ''
                    }`,
                  );
                  textareaRef.current?.focus();
                  onSlashCommandSelect?.(command);
                }}
              >
                <span>{command.usage || `/${command.name}`}</span>
                <small>{command.description || ''}</small>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setValue(event.target.value)}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey) return;
            if (composingRef.current) return;
            event.preventDefault();
            submit();
          }}
        />
        <button
          className={styles.sendButton}
          type="button"
          title={sendButtonTitle}
          disabled={disabled || !value.trim()}
          onClick={submit}
        >
          {responding ? <LoadingIcon className={styles.loadingIcon} /> : <ArrowUpIcon />}
        </button>
      </div>
    </section>
  );
}
