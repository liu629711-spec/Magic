// vendored from codex-ui@0.1.0（用户确认可用）src/components/ConversationView/types.ts
import type { ReactNode } from 'react';

export type ConversationMode = 'live' | 'history' | 'subagent';

export type ConversationSource =
  | 'local-codex'
  | 'aima-history'
  | 'aima-subagent'
  | 'demo';

export type ConversationRole =
  | 'user'
  | 'assistant'
  | 'system'
  | 'tool'
  | 'approval';

export interface ToolCallInfo {
  toolName: string;
  toolArgs?: string;
  status?: 'running' | 'done' | 'error';
  exitCode?: number;
}

export interface ToolDetailItem {
  label: string;
  category?: 'explore' | 'edit' | 'search' | 'run';
  command?: string;
  output?: string;
  exitCode?: number;
}

export interface ToolSummaryInfo {
  icon: string;
  label: string;
  category: 'explore' | 'edit' | 'search' | 'run';
  count: number;
  details?: ToolDetailItem[];
}

export interface TurnFoldInfo {
  durationSeconds: number;
  foldedMessages: ConversationMessage[];
}

export interface ConversationMemoryReference {
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  note?: string;
  raw: string;
}

export interface ConversationMemoryReferenceGroup {
  items: ConversationMemoryReference[];
  rolloutIds?: string[];
  raw?: string;
}

export interface ConversationSteerMessage {
  id: string;
  text: string;
  status?: 'sending' | 'sent' | 'failed';
}

export interface ConversationMessage {
  id?: string;
  role: ConversationRole;
  text: string;
  timestamp?: string;
  itemId?: string;
  streaming?: boolean;
  requestId?: string;
  decision?: string;
  toolCall?: ToolCallInfo;
  toolSummary?: ToolSummaryInfo;
  turnFold?: TurnFoldInfo;
  memoryReferences?: ConversationMemoryReferenceGroup;
}

export interface ConversationSession {
  id: string;
  title: string;
  subtitle?: string;
  cwd?: string;
  mode: ConversationMode;
  source: ConversationSource;
  readOnly: boolean;
  requirementId?: number;
  taskId?: number;
  taskName?: string;
  agentId?: string;
  updatedAt?: string;
  raw?: unknown;
}

export interface ConversationCapabilities {
  mode: ConversationMode;
  readOnly: boolean;
  canSendMessage: boolean;
  canSteer?: boolean;
  canApprove: boolean;
  canSwitchLocalSession: boolean;
}

export interface ConversationOutput {
  id: string;
  text: string;
}

export interface ConversationSlashCommand {
  name: string;
  usage?: string;
  description?: string;
}

export interface ConversationUserProfile {
  name?: string;
  jobNo?: string;
  label?: string;
  title?: string;
}

export interface ConversationViewModel {
  session: ConversationSession;
  messages: ConversationMessage[];
}

export interface ConversationViewProps {
  mode: ConversationCapabilities['mode'];
  ready: boolean;
  status?: string;
  statusKind?: 'ok' | 'pending' | 'warn' | 'error' | '';
  loading?: boolean;
  error?: string | null;
  sessions: ConversationSession[];
  activeSessionId?: string;
  messages: ConversationMessage[];
  steerMessage?: ConversationSteerMessage;
  outputs?: ConversationOutput[];
  progress?: string;
  capabilities?: ConversationCapabilities;
  userProfile?: ConversationUserProfile;
  slashCommands?: ConversationSlashCommand[];
  workspacePath?: string;
  newSessionTitle?: string;
  hideComposer?: boolean;
  responding?: boolean;
  statusPopoverContent?: ReactNode;
  statusPopoverTitle?: ReactNode;
  statusPopoverOpen?: boolean;
  onStatusPopoverOpenChange?: (open: boolean) => void;
  onNewSession?: () => void;
  onSelectSession?: (sessionId: string, session: ConversationSession) => void;
  onSendMessage?: (text: string) => void;
  onApprove?: (requestId: string, decision: string) => void;
  onSlashCommandSelect?: (command: ConversationSlashCommand) => void;
}
