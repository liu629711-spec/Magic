// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/MessageList.tsx
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EditIcon,
  FoldersIcon,
  SearchIcon,
  TerminalIcon,
  ZapIcon,
} from './icons.tsx';
import { renderMarkdown } from './markdown.ts';
import { normalizeMessageMemoryReferences } from './memoryReferences.ts';
import { filterSystemPromptMessages } from './systemPromptMessages.ts';
import type {
  ConversationMemoryReferenceGroup,
  ConversationMessage,
  ConversationUserProfile,
  ToolDetailItem,
} from './types.ts';
import styles from './ConversationView.module.css';

const DEFAULT_MESSAGE_WINDOW_SIZE = 60;
const MESSAGE_WINDOW_STEP = 40;
const TOP_LOAD_THRESHOLD = 80;

interface ScrollAnchor {
  scrollHeight: number;
  scrollTop: number;
}

interface MessageListProps {
  messages: ConversationMessage[];
  userProfile?: ConversationUserProfile;
  canApprove?: boolean;
  listKey?: string;
  responding?: boolean;
  onApprove?: (requestId: string, decision: string) => void;
}

type ToolCategory = 'explore' | 'edit' | 'search' | 'run';
type ToolSubType = 'file' | 'search' | 'list' | 'command';

function classifyToolCall(
  toolName: string,
  toolArgs = '',
): { category: ToolCategory; sub: ToolSubType } {
  const lowerName = toolName.toLowerCase();
  const cmd = (() => {
    try {
      const parsed = JSON.parse(toolArgs);
      return String(parsed.cmd || parsed.command || toolArgs).toLowerCase();
    } catch {
      return toolArgs.toLowerCase();
    }
  })();

  if (
    lowerName.includes('apply_patch') ||
    lowerName.includes('write') ||
    lowerName.includes('edit')
  ) {
    return { category: 'edit', sub: 'file' };
  }

  if (
    lowerName.includes('search') ||
    lowerName.includes('grep') ||
    cmd.includes(' rg ') ||
    cmd.startsWith('rg ') ||
    cmd.includes('grep') ||
    cmd.includes('-name')
  ) {
    return { category: 'search', sub: 'search' };
  }

  if (
    lowerName.includes('exec') ||
    lowerName.includes('shell') ||
    lowerName.includes('command') ||
    lowerName.includes('terminal')
  ) {
    if (
      cmd.startsWith('cat ') ||
      cmd.startsWith('sed ') ||
      cmd.includes(' sed ') ||
      cmd.startsWith('nl ') ||
      cmd.startsWith('head ') ||
      cmd.startsWith('tail ')
    ) {
      return { category: 'explore', sub: 'file' };
    }
    if (cmd.startsWith('ls') || cmd.startsWith('find') || cmd.includes('--files')) {
      return { category: 'explore', sub: 'list' };
    }
    return { category: 'run', sub: 'command' };
  }

  if (lowerName.includes('list')) return { category: 'explore', sub: 'list' };
  if (lowerName.includes('read') || lowerName.includes('view')) {
    return { category: 'explore', sub: 'file' };
  }
  return { category: 'explore', sub: 'file' };
}

function extractToolDetail(toolName: string, toolArgs = '') {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(toolArgs);
  } catch {
    parsed = {};
  }

  const path = String(
    parsed.path ||
      parsed.file ||
      parsed.file_path ||
      parsed.cwd ||
      parsed.cmd ||
      parsed.command ||
      toolArgs ||
      '',
  );
  const file = path.replace(/\\/g, '/').split('/').filter(Boolean).pop();

  if (toolName.toLowerCase().includes('apply_patch')) return 'Applied patch';
  if (toolName.toLowerCase().includes('exec')) {
    const cmd = String(parsed.cmd || parsed.command || toolArgs || '').trim();
    return cmd ? `$ ${cmd.slice(0, 96)}${cmd.length > 96 ? '...' : ''}` : 'Ran command';
  }
  return file ? `Read ${file}` : toolName || 'Tool call';
}

function buildToolSummaryFromGroup(
  toolGroup: ConversationMessage[],
): ConversationMessage {
  const hasRunning = toolGroup.some((msg) => msg.toolCall?.status === 'running');
  const subCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const details: ToolDetailItem[] = [];

  for (const msg of toolGroup) {
    const toolCall = msg.toolCall;
    const toolName = toolCall?.toolName || 'tool';
    const toolArgs = toolCall?.toolArgs || '';
    const { category, sub } = classifyToolCall(toolName, toolArgs);
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    subCounts[`${category}/${sub}`] = (subCounts[`${category}/${sub}`] || 0) + 1;
    details.push({
      label: extractToolDetail(toolName, toolArgs),
      category,
      command: toolArgs || undefined,
      output: msg.text || undefined,
      exitCode: toolCall?.exitCode ?? 0,
    });
  }

  const prefix = hasRunning ? '正在' : '已';
  const fileCount = subCounts['explore/file'] || 0;
  const searchCount = subCounts['search/search'] || 0;
  const listCount = subCounts['explore/list'] || 0;
  const parts: string[] = [];
  const explore: string[] = [];
  if (fileCount) explore.push(`${fileCount} 个文件`);
  if (searchCount) explore.push(`${searchCount} 次搜索`);
  if (listCount) explore.push(`${listCount} 个列表`);
  if (explore.length) parts.push(`${prefix}探索 ${explore.join(' ')}`);
  if (categoryCounts.edit) parts.push(`${prefix}编辑 ${categoryCounts.edit} 个文件`);
  if (categoryCounts.run) parts.push(`${prefix}运行 ${categoryCounts.run} 条命令`);

  const label = parts.join('') || `${prefix}执行 ${toolGroup.length} 个操作`;
  const icon = searchCount
    ? 'search'
    : categoryCounts.edit
      ? 'edit'
      : fileCount || listCount
        ? 'folders'
        : 'terminal';
  const category: ToolCategory =
    fileCount || searchCount || listCount
      ? 'explore'
      : categoryCounts.edit
        ? 'edit'
        : 'run';

  return {
    id: `tool-summary-${toolGroup[0]?.id || Date.now()}`,
    role: 'tool',
    text: label,
    toolSummary: {
      icon,
      label,
      category,
      count: toolGroup.length,
      details,
    },
  };
}

function buildFoldedMessages(messages: ConversationMessage[]) {
  const result: ConversationMessage[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (!(msg.role === 'tool' && msg.toolCall)) {
      result.push(msg);
      i += 1;
      continue;
    }
    const group: ConversationMessage[] = [];
    while (i < messages.length && messages[i].role === 'tool' && messages[i].toolCall) {
      group.push(messages[i]);
      i += 1;
    }
    result.push(buildToolSummaryFromGroup(group));
  }
  return result;
}

function autoFoldLiveTurns(messages: ConversationMessage[]) {
  if (messages.some((msg) => msg.turnFold)) return messages;
  const result: ConversationMessage[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];
    if (msg.role !== 'user') {
      result.push(msg);
      i += 1;
      continue;
    }

    result.push(msg);
    i += 1;
    const groupStart = i;
    while (i < messages.length && messages[i].role !== 'user') i += 1;
    const group = messages.slice(groupStart, i);

    if (group.some((item) => item.streaming)) {
      result.push(...buildFoldedMessages(group));
      continue;
    }

    const assistantMessages = group.filter((item) => item.role === 'assistant');
    if (!assistantMessages.length) {
      result.push(...buildFoldedMessages(group));
      continue;
    }

    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    const middleMessages = buildFoldedMessages(
      group.filter((item) => item !== lastAssistant),
    );
    const hasFoldedAssistant = middleMessages.some((item) => item.role === 'assistant');

    if (middleMessages.length && hasFoldedAssistant) {
      const startTime = msg.timestamp ? new Date(msg.timestamp).getTime() : 0;
      const endTime = lastAssistant.timestamp
        ? new Date(lastAssistant.timestamp).getTime()
        : 0;
      result.push({
        ...lastAssistant,
        turnFold: {
          durationSeconds:
            startTime > 0 && endTime > startTime
              ? Math.round((endTime - startTime) / 1000)
              : 0,
          foldedMessages: middleMessages,
        },
      });
    } else {
      result.push(lastAssistant);
    }
  }

  return result;
}

function ToolIcon({ icon }: { icon: string }) {
  const props = { width: 14, height: 14 };
  if (icon === 'search') return <SearchIcon {...props} />;
  if (icon === 'edit') return <EditIcon {...props} />;
  if (icon === 'folders') return <FoldersIcon {...props} />;
  if (icon === 'run') return <ZapIcon {...props} />;
  return <TerminalIcon {...props} />;
}

function ToolDetailItemView({ detail }: { detail: ToolDetailItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = detail.category === 'run' && Boolean(detail.command || detail.output);

  return (
    <li className={styles.toolSummaryDetailItem}>
      <div
        className={[
          styles.detailItemHeader,
          hasOutput ? styles.detailItemClickable : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role={hasOutput ? 'button' : undefined}
        tabIndex={hasOutput ? 0 : undefined}
        onClick={() => hasOutput && setExpanded((value) => !value)}
        onKeyDown={(event) => {
          if (!hasOutput) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((value) => !value);
          }
        }}
      >
        <span className={styles.detailItemLabel}>{detail.label}</span>
        {hasOutput && (
          <span
            className={[
              styles.detailItemChevron,
              expanded ? styles.detailItemChevronOpen : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <ChevronRightIcon />
          </span>
        )}
      </div>
      {expanded && hasOutput && (
        <div className={styles.shellOutputBlock}>
          <div className={styles.shellOutputHeader}>Shell</div>
          <pre className={styles.shellOutputContent}>
            <code>
              {detail.command && (
                <>
                  <span className={styles.shellPrompt}>$ </span>
                  {detail.command.length > 500
                    ? `${detail.command.slice(0, 500)}...`
                    : detail.command}
                </>
              )}
              {detail.output
                ? `\n${
                    detail.output.length > 2000
                      ? `${detail.output.slice(0, 2000)}\n... (truncated)`
                      : detail.output
                  }`
                : ''}
            </code>
          </pre>
          <div className={styles.shellOutputFooter}>
            {detail.exitCode === 0 ? (
              <span className={styles.shellSuccess}>✓ 成功</span>
            ) : (
              <span className={styles.shellError}>退出码 {detail.exitCode}</span>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function ToolSummaryLine({ message }: { message: ConversationMessage }) {
  const [expanded, setExpanded] = useState(false);
  const summary = message.toolSummary;
  const hasDetails = Boolean(summary?.details?.length);

  if (!summary) {
    return (
      <div className={styles.toolSummaryLine}>
        <span className={styles.toolSummaryText}>{message.text}</span>
      </div>
    );
  }

  return (
    <div
      className={[
        styles.toolSummaryBlock,
        expanded ? styles.toolSummaryExpanded : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={[
          styles.toolSummaryLine,
          hasDetails ? styles.toolSummaryClickable : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role={hasDetails ? 'button' : undefined}
        tabIndex={hasDetails ? 0 : undefined}
        onClick={() => hasDetails && setExpanded((value) => !value)}
        onKeyDown={(event) => {
          if (!hasDetails) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((value) => !value);
          }
        }}
      >
        <span className={styles.toolSummaryIcon}>
          <ToolIcon icon={summary.icon} />
        </span>
        <span
          className={[
            styles.toolSummaryText,
            summary.label.startsWith('正在') ? styles.shimmerText : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {summary.label}
        </span>
        {hasDetails && (
          <span
            className={[
              styles.toolSummaryChevron,
              expanded ? styles.toolSummaryChevronOpen : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <ChevronRightIcon />
          </span>
        )}
      </div>
      {expanded && hasDetails && (
        <ul className={styles.toolSummaryDetails}>
          {summary.details!.map((detail, index) => (
            <ToolDetailItemView key={index} detail={detail} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProcessingHeader({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = () => setElapsed(Math.round((Date.now() - startTime) / 1000));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startTime]);

  return (
    <div className={styles.turnFoldHeader}>
      <span className={`${styles.turnFoldLabel} ${styles.shimmerText}`}>
        正在处理 {elapsed}s
      </span>
    </div>
  );
}

function StreamingIndicator() {
  return (
    <div className={styles.streamingIndicator}>
      <span className={styles.streamingIndicatorText}>正在思考</span>
    </div>
  );
}

function StreamingAssistantContent({
  text,
  onProgress,
}: {
  text: string;
  onProgress?: () => void;
}) {
  const [charIndex, setCharIndex] = useState(0);
  const textRef = useRef(text);
  const doneRef = useRef(false);

  if (text !== textRef.current) {
    textRef.current = text;
    doneRef.current = false;
  }

  useEffect(() => {
    if (charIndex >= text.length) {
      doneRef.current = true;
      return;
    }

    const totalFrames = Math.max(80, text.length / 2);
    const charsPerTick = Math.max(1, Math.ceil(text.length / totalFrames));
    const timer = window.setTimeout(() => {
      setCharIndex((value) => Math.min(value + charsPerTick, text.length));
      onProgress?.();
    }, 30);
    return () => window.clearTimeout(timer);
  }, [charIndex, text, onProgress]);

  const displayText = doneRef.current ? text : text.slice(0, charIndex);
  const typing = !doneRef.current && charIndex < text.length;

  return (
    <div
      className={[
        styles.assistantContent,
        typing ? styles.assistantTyping : '',
      ]
        .filter(Boolean)
        .join(' ')}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(displayText) }}
    />
  );
}

function MemoryReferenceFold({
  references,
}: {
  references?: ConversationMemoryReferenceGroup;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = references?.items || [];
  if (!items.length) return null;

  return (
    <div className={styles.memoryReferenceBlock}>
      <button
        type="button"
        className={styles.memoryReferenceHeader}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={styles.memoryReferenceChevron}>
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <span>{items.length} 条记忆引用</span>
      </button>
      {expanded && (
        <div className={styles.memoryReferenceList}>
          {items.map((item, index) => {
            const lineText =
              item.lineStart && item.lineEnd
                ? item.lineStart === item.lineEnd
                  ? `${item.lineStart} 行`
                  : `${item.lineStart}-${item.lineEnd} 行`
                : '';
            return (
              <div
                key={`${item.filePath}-${item.lineStart || index}`}
                className={styles.memoryReferenceItem}
              >
                <div className={styles.memoryReferenceTitle}>
                  <span className={styles.memoryReferenceFile}>
                    {item.filePath}
                  </span>
                  {lineText && (
                    <span className={styles.memoryReferenceLines}>
                      {lineText}
                    </span>
                  )}
                </div>
                {item.note && (
                  <div className={styles.memoryReferenceNote}>{item.note}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessageItem({
  message,
  canApprove,
  onScrollBottom,
  onApprove,
}: {
  message: ConversationMessage;
  userProfile?: ConversationUserProfile;
  canApprove?: boolean;
  onScrollBottom?: () => void;
  onApprove?: (requestId: string, decision: string) => void;
}) {
  const displayMessage = useMemo(
    () => normalizeMessageMemoryReferences(message),
    [message],
  );
  const [foldExpanded, setFoldExpanded] = useState(false);

  if (displayMessage.role === 'user') {
    return (
      <div className={`${styles.messageItem} ${styles.messageItemUser}`}>
        <div className={styles.userBubble}>{displayMessage.text}</div>
      </div>
    );
  }

  if (displayMessage.role === 'assistant' && displayMessage.turnFold) {
    const seconds = displayMessage.turnFold.durationSeconds;
    const durationText =
      seconds <= 0
        ? ''
        : seconds < 60
          ? `${seconds}s`
          : `${Math.floor(seconds / 60)}m${seconds % 60 ? `${seconds % 60}s` : ''}`;

    return (
      <div className={`${styles.messageItem} ${styles.messageItemAssistant}`}>
        <div className={styles.turnFoldWrapper}>
          <div className={styles.turnFoldBlock}>
            <div
              className={styles.turnFoldHeader}
              role="button"
              tabIndex={0}
              onClick={() => setFoldExpanded((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFoldExpanded((value) => !value);
                }
              }}
            >
              <span className={styles.turnFoldLabel}>
                已处理{durationText ? ` ${durationText}` : ''}
              </span>
              <span
                className={[
                  styles.turnFoldChevron,
                  foldExpanded ? styles.turnFoldChevronOpen : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <ChevronDownIcon />
              </span>
            </div>
            <div
              className={[
                styles.turnFoldContent,
                foldExpanded
                  ? styles.turnFoldContentOpen
                  : styles.turnFoldContentClosed,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {displayMessage.turnFold.foldedMessages.map((item, index) => (
                <MessageItem key={item.id || `fold-${index}`} message={item} />
              ))}
            </div>
          </div>
          <div
            className={styles.assistantContent}
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(displayMessage.text),
            }}
          />
          <MemoryReferenceFold
            references={displayMessage.memoryReferences}
          />
        </div>
      </div>
    );
  }

  if (displayMessage.role === 'assistant') {
    if (displayMessage.streaming) {
      return (
        <div className={`${styles.messageItem} ${styles.messageItemAssistant}`}>
          <StreamingAssistantContent
            text={displayMessage.text}
            onProgress={onScrollBottom}
          />
          <MemoryReferenceFold
            references={displayMessage.memoryReferences}
          />
        </div>
      );
    }
    return (
      <div className={`${styles.messageItem} ${styles.messageItemAssistant}`}>
        <div
          className={styles.assistantContent}
          dangerouslySetInnerHTML={{
            __html: renderMarkdown(displayMessage.text),
          }}
        />
        <MemoryReferenceFold
          references={displayMessage.memoryReferences}
        />
      </div>
    );
  }

  if (displayMessage.role === 'tool' && displayMessage.toolSummary) {
    return (
      <div className={`${styles.messageItem} ${styles.messageItemTool}`}>
        <ToolSummaryLine message={displayMessage} />
      </div>
    );
  }

  if (displayMessage.role === 'tool' && displayMessage.toolCall) {
    const category = classifyToolCall(
      displayMessage.toolCall.toolName,
      displayMessage.toolCall.toolArgs,
    ).category;
    const summaryMessage: ConversationMessage = {
      ...displayMessage,
      toolSummary: {
        icon:
          category === 'run'
            ? 'terminal'
            : category === 'explore'
              ? 'folders'
              : category,
        label:
          displayMessage.toolCall.status === 'running'
            ? `正在运行 ${displayMessage.toolCall.toolName}`
            : category === 'run'
              ? '已运行 1 条命令'
              : category === 'edit'
                ? '已编辑 1 个文件'
                : category === 'search'
                  ? '已搜索 1 次'
                  : '已探索 1 个文件',
        category,
        count: 1,
        details: [
          {
            label: extractToolDetail(
              displayMessage.toolCall.toolName,
              displayMessage.toolCall.toolArgs,
            ),
            category,
            command: displayMessage.toolCall.toolArgs,
            output: displayMessage.text,
            exitCode: displayMessage.toolCall.exitCode ?? 0,
          },
        ],
      },
    };
    return (
      <div className={`${styles.messageItem} ${styles.messageItemTool}`}>
        <ToolSummaryLine message={summaryMessage} />
      </div>
    );
  }

  if (displayMessage.role === 'approval') {
    return (
      <div className={`${styles.messageItem} ${styles.messageItemApproval}`}>
        <div className={styles.approvalBlock}>
          <pre className={styles.approvalPre}>{displayMessage.text}</pre>
          {displayMessage.requestId && canApprove && !displayMessage.decision && (
            <div className={styles.approvalActions}>
              {(
                [
                  ['允许', 'accept'],
                  ['本会话允许', 'acceptForSession'],
                  ['拒绝', 'decline'],
                  ['取消', 'cancel'],
                ] as const
              ).map(([label, decision]) => (
                <button
                  key={decision}
                  type="button"
                  className={
                    decision === 'accept'
                      ? styles.approvalBtnPrimary
                      : styles.approvalBtn
                  }
                  onClick={() =>
                    onApprove?.(displayMessage.requestId!, decision)
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {displayMessage.decision && (
            <p className={styles.approvalNote}>
              已回复：{displayMessage.decision}
            </p>
          )}
        </div>
      </div>
    );
  }

  return displayMessage.role !== 'tool' ? (
    <div className={`${styles.messageItem} ${styles.messageItemSystem}`}>
      <span className={styles.systemText}>{displayMessage.text}</span>
    </div>
  ) : null;
}

export function MessageList({
  messages,
  userProfile,
  canApprove,
  listKey,
  responding,
  onApprove,
}: MessageListProps) {
  const listRef = useRef<HTMLElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const loadingEarlierRef = useRef(false);
  const restoreScrollAnchorRef = useRef<ScrollAnchor | null>(null);
  const [messageWindowSize, setMessageWindowSize] = useState(
    DEFAULT_MESSAGE_WINDOW_SIZE,
  );

  const visibleMessages = useMemo(() => {
    if (messages.length) {
      return autoFoldLiveTurns(filterSystemPromptMessages(messages));
    }
    return [
      {
        id: 'empty',
        role: 'system' as const,
        text: '等待会话消息...',
      },
    ];
  }, [messages]);

  useEffect(() => {
    shouldStickToBottomRef.current = true;
    loadingEarlierRef.current = false;
    restoreScrollAnchorRef.current = null;
    setMessageWindowSize(DEFAULT_MESSAGE_WINDOW_SIZE);
  }, [listKey]);

  useEffect(() => {
    if (messageWindowSize === DEFAULT_MESSAGE_WINDOW_SIZE) {
      shouldStickToBottomRef.current = true;
    }
  }, [messageWindowSize, visibleMessages.length]);

  const renderedMessageCount = Math.min(
    messageWindowSize,
    visibleMessages.length,
  );
  const hiddenMessageCount = Math.max(
    visibleMessages.length - renderedMessageCount,
    0,
  );
  const renderedMessages = useMemo(
    () => visibleMessages.slice(hiddenMessageCount),
    [hiddenMessageCount, visibleMessages],
  );

  useLayoutEffect(() => {
    if (!shouldStickToBottomRef.current) return;
    if (messageWindowSize > DEFAULT_MESSAGE_WINDOW_SIZE) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messageWindowSize, renderedMessages]);

  useLayoutEffect(() => {
    const anchor = restoreScrollAnchorRef.current;
    if (!anchor) return;
    restoreScrollAnchorRef.current = null;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop =
      anchor.scrollTop + Math.max(el.scrollHeight - anchor.scrollHeight, 0);
  }, [renderedMessages]);

  const loadMoreMessages = () => {
    if (loadingEarlierRef.current) return;
    const el = listRef.current;
    restoreScrollAnchorRef.current = el
      ? {
          scrollHeight: el.scrollHeight,
          scrollTop: el.scrollTop,
        }
      : null;
    loadingEarlierRef.current = true;
    shouldStickToBottomRef.current = false;
    setMessageWindowSize((value) =>
      Math.min(value + MESSAGE_WINDOW_STEP, visibleMessages.length),
    );
    window.setTimeout(() => {
      loadingEarlierRef.current = false;
    }, 120);
  };

  const handleScroll = () => {
    if (hiddenMessageCount <= 0) return;
    const el = listRef.current;
    if (!el || el.scrollTop > TOP_LOAD_THRESHOLD) return;
    loadMoreMessages();
  };

  const processingInfo = useMemo(() => {
    if (!responding) return null;
    let lastUserIdx = -1;
    for (let i = renderedMessages.length - 1; i >= 0; i -= 1) {
      if (renderedMessages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return null;
    const hasNonUserAfter = renderedMessages
      .slice(lastUserIdx + 1)
      .some((item) => item.role !== 'user');
    if (!hasNonUserAfter) return null;
    const userMsg = renderedMessages[lastUserIdx];
    return {
      insertAfterIndex: lastUserIdx,
      startTime: userMsg.timestamp
        ? new Date(userMsg.timestamp).getTime()
        : Date.now(),
    };
  }, [responding, renderedMessages]);

  const scrollToBottom = useCallback(() => {
    if (!shouldStickToBottomRef.current) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    if (!responding) return;
    scrollToBottom();
  }, [responding, renderedMessages, scrollToBottom]);

  return (
    <section
      ref={listRef}
      className={styles.messages}
      aria-live="polite"
      onScroll={handleScroll}
    >
      {hiddenMessageCount > 0 && (
        <div className={styles.messageWindowNotice}>
          已省略更早的 {hiddenMessageCount} 条消息，上滑自动加载
        </div>
      )}
      {renderedMessages.map((message, index) => {
        const sourceIndex = hiddenMessageCount + index;
        return (
          <Fragment key={message.id || `${message.role}-${sourceIndex}`}>
            <MessageItem
              message={message}
              userProfile={userProfile}
              canApprove={canApprove}
              onScrollBottom={scrollToBottom}
              onApprove={onApprove}
            />
            {processingInfo && index === processingInfo.insertAfterIndex && (
              <ProcessingHeader startTime={processingInfo.startTime} />
            )}
          </Fragment>
        );
      })}
      {responding && <StreamingIndicator />}
    </section>
  );
}
