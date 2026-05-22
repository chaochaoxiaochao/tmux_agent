export interface WindowMeta { id: string; index: number; name: string; active: boolean; panes: number }
export interface SessionMeta { name: string; attached: boolean; windowCount: number }
export interface Button { id: string; label: string; payload: string }
export interface FileItem { kind: 'file'; path: string; mtime: number }
export interface CommandSuggestion { kind: 'command'; name: string; hint: string; payload: string }
export type CompletionItem = FileItem | CommandSuggestion;
export type AttentionKind = 'input-needed' | 'done';
export interface WallSnapshotWindow extends WindowMeta {
  session: string;
  preview: string[];
  status: 'ok' | 'warn' | 'err' | 'running' | 'idle';
  lastOutputAgeMs: number;
  attention?: AttentionKind;
}
export interface WallSnapshotSession {
  name: string;
  attached: boolean;
  windows: WallSnapshotWindow[];
}
export interface WallSnapshot { ts: number; sessions: WallSnapshotSession[] }
export interface UiConfig { accent: string; density: string; cwdFallback: string }
export interface UploadResult { path: string; mimeType: string; size: number }
export interface SlashMenuItem { name: string; desc?: string }
export type SlashMenuFrame =
  | { type: 'slash-menu-list'; items: SlashMenuItem[] };
export interface PaneMetaItem {
  id: string;
  index: number;
  active: boolean;
  size: string;
  cmd: string;
  path: string;
  inMode: boolean;
}
export interface PaneMetaFrame {
  type: 'pane-meta';
  session: string;
  windowId: string;
  panes: PaneMetaItem[];
}
export type AgentState = 'running' | 'request' | 'stop';

export interface AgentEntry {
  paneId: string;
  session: string;
  windowId: string;
  windowIndex: number;
  windowName?: string;
  paneIndex: number;
  claudeSessionId?: string;
  cwd: string;
  state: AgentState;
  lastEventAt: number;
  lastMessage?: string;
}

export interface AgentStateFrame {
  type: 'agent-state';
  agents: AgentEntry[];
}
