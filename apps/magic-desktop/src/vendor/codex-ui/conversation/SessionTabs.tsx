// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/SessionTabs.tsx
import type { ConversationSession } from './types.ts';
import styles from './ConversationView.module.css';

interface SessionTabsProps {
  sessions: ConversationSession[];
  activeSessionId?: string;
  workspacePath?: string;
  loading?: boolean;
  onSelectSession?: (sessionId: string, session: ConversationSession) => void;
}

export function SessionTabs({
  sessions,
  activeSessionId,
  workspacePath,
  loading,
  onSelectSession,
}: SessionTabsProps) {
  return (
    <nav className={styles.sessionDrawer} aria-label="会话">
      <div className={styles.sessionWorkspacePath}>
        {workspacePath || '未返回工作路径'}
      </div>
      <div className={styles.sessionList} aria-live="polite">
        {sessions.length === 0 ? (
          <div className={styles.sessionEmpty}>
            {loading ? '会话加载中...' : '暂无会话'}
          </div>
        ) : (
          sessions.map((session) => {
            const sessionMeta = session.updatedAt || session.subtitle || '最近';
            return (
              <button
                key={session.id}
                type="button"
                title={[session.title, sessionMeta].filter(Boolean).join('\n')}
                className={[
                  styles.sessionTab,
                  session.id === activeSessionId ? styles.sessionTabActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={loading}
                aria-busy={loading}
                onClick={() => {
                  if (loading) return;
                  onSelectSession?.(session.id, session);
                }}
              >
                <span className={styles.sessionTitle}>
                  {session.mode === 'subagent' && (
                    <span className={styles.sessionSubagentBadge}>子会话</span>
                  )}
                  <span className={styles.sessionTitleText}>
                    {session.title}
                  </span>
                </span>
                <small>{sessionMeta}</small>
              </button>
            );
          })
        )}
      </div>
    </nav>
  );
}
