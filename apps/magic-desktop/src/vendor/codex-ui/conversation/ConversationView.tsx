// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/ConversationView.tsx
import { useMemo, useRef, useState } from 'react';
import { conversationCapabilities } from './capabilities.ts';
import { Composer } from './Composer.tsx';
import { AlertIcon, ListIcon, PlusIcon } from './icons.tsx';
import { MessageList } from './MessageList.tsx';
import { SessionTabs } from './SessionTabs.tsx';
import type { ConversationViewProps } from './types.ts';
import styles from './ConversationView.module.css';

export function ConversationView({
  mode,
  ready,
  status = '未连接',
  statusKind = '',
  loading,
  error,
  sessions,
  activeSessionId,
  messages,
  steerMessage,
  capabilities,
  userProfile,
  slashCommands,
  workspacePath,
  newSessionTitle = '新建会话',
  hideComposer,
  responding,
  statusPopoverContent,
  statusPopoverTitle,
  statusPopoverOpen,
  onStatusPopoverOpenChange,
  onNewSession,
  onSelectSession,
  onSendMessage,
  onApprove,
  onSlashCommandSelect,
}: ConversationViewProps) {
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false);
  const [internalStatusPopoverOpen, setInternalStatusPopoverOpen] =
    useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const resolvedCapabilities = useMemo(
    () => capabilities || conversationCapabilities(mode),
    [capabilities, mode],
  );
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [activeSessionId, sessions],
  );
  const readOnlyTip =
    activeSession?.mode === 'subagent'
      ? 'Subagent 会话为只读模式：仅展示执行过程，不会恢复为本机实时会话。'
      : '关联会话为只读模式：内容来自服务端的 Codex session，暂不支持继续发送消息。';
  const newSessionDisabled = loading || !onNewSession;
  const popoverOpen = statusPopoverOpen ?? internalStatusPopoverOpen;

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openSessionDrawer = () => {
    clearCloseTimer();
    setSessionDrawerOpen(true);
  };

  const scheduleCloseSessionDrawer = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setSessionDrawerOpen(false);
    }, 500);
  };

  const setPopoverOpen = (open: boolean) => {
    setInternalStatusPopoverOpen(open);
    onStatusPopoverOpenChange?.(open);
  };

  const statusNode = (
    <span
      className={[
        styles.status,
        statusPopoverContent ? styles.statusClickable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-kind={error ? 'error' : statusKind}
    >
      {error || status}
    </span>
  );

  return (
    <div className={styles.shell}>
      <section className={styles.connectionPanel}>
        <div className={styles.viewToolbar} aria-label="会话操作">
          <button
            type="button"
            className={[
              styles.viewButton,
              sessionDrawerOpen ? styles.viewButtonActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-label={sessionDrawerOpen ? '隐藏会话列表' : '显示会话列表'}
            aria-pressed={sessionDrawerOpen}
            title={sessionDrawerOpen ? '隐藏会话列表' : '显示会话列表'}
            onMouseEnter={openSessionDrawer}
            onMouseLeave={scheduleCloseSessionDrawer}
            onClick={() => setSessionDrawerOpen((value) => !value)}
          >
            <ListIcon />
          </button>
          <button
            type="button"
            className={styles.viewButton}
            aria-label={newSessionTitle}
            title={newSessionDisabled ? '暂无可用会话操作' : newSessionTitle}
            disabled={newSessionDisabled}
            onClick={() => onNewSession?.()}
          >
            <PlusIcon />
          </button>
          {resolvedCapabilities.readOnly && (
            <span
              className={styles.statusIcon}
              data-kind={error ? 'error' : statusKind}
              role="img"
              tabIndex={0}
              title={error || readOnlyTip}
              aria-label={error || status}
            >
              <AlertIcon />
            </span>
          )}
        </div>
        <div className={styles.statusToolbar} aria-label="会话状态">
          {statusPopoverContent ? (
            <button
              className={styles.statusPopoverButton}
              type="button"
              aria-expanded={popoverOpen}
              onClick={() => setPopoverOpen(!popoverOpen)}
            >
              {statusNode}
              {popoverOpen && (
                <span className={styles.statusPopover} role="dialog">
                  {statusPopoverTitle && (
                    <strong>{statusPopoverTitle}</strong>
                  )}
                  <span>{statusPopoverContent}</span>
                </span>
              )}
            </button>
          ) : (
            statusNode
          )}
        </div>
      </section>

      <div
        className={[
          styles.sessionDrawerWrap,
          sessionDrawerOpen ? styles.sessionDrawerWrapOpen : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onMouseEnter={openSessionDrawer}
        onMouseLeave={scheduleCloseSessionDrawer}
      >
        <SessionTabs
          sessions={sessions}
          activeSessionId={activeSessionId}
          workspacePath={
            workspacePath || activeSession?.cwd || '未返回工作路径'
          }
          loading={loading}
          onSelectSession={(sessionId, session) => {
            onSelectSession?.(sessionId, session);
            setSessionDrawerOpen(false);
          }}
        />
      </div>

      <section className={styles.workspace}>
        <MessageList
          listKey={activeSessionId || mode}
          messages={messages}
          userProfile={userProfile}
          canApprove={resolvedCapabilities.canApprove}
          responding={responding}
          onApprove={onApprove}
        />
      </section>

      {!hideComposer && (
        <Composer
          ready={ready}
          responding={responding}
          steerMessage={steerMessage}
          capabilities={resolvedCapabilities}
          slashCommands={slashCommands}
          onSend={onSendMessage}
          onSlashCommandSelect={onSlashCommandSelect}
        />
      )}
    </div>
  );
}
