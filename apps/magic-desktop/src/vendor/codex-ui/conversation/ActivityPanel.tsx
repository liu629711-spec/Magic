// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/ActivityPanel.tsx
import type { ConversationOutput, ConversationSession } from './types.ts';
import styles from './ConversationView.module.css';

interface ActivityPanelProps {
  visible: boolean;
  progress?: string;
  outputs?: ConversationOutput[];
  session?: ConversationSession | null;
}

export function ActivityPanel({
  visible,
  progress = '暂无进行中的任务',
  outputs = [],
  session,
}: ActivityPanelProps) {
  if (!visible) return null;

  return (
    <aside className={styles.activityPanel} aria-label="会话信息">
      <section>
        <div className={styles.panelHeading}>
          进度 <span>›</span>
        </div>
        <p>{progress}</p>
      </section>
      <section>
        <h2>输出</h2>
        <ul>
          {outputs.length ? (
            outputs
              .slice(0, 8)
              .map((output) => <li key={output.id}>{output.text}</li>)
          ) : (
            <li>暂无输出</li>
          )}
        </ul>
      </section>
      <section>
        <h2>来源</h2>
        <p>{session?.cwd || session?.subtitle || '暂无来源'}</p>
      </section>
    </aside>
  );
}
