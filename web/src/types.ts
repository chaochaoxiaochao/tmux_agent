export interface WindowMeta { id: string; index: number; name: string; active: boolean; panes: number }
export interface SessionMeta { name: string; attached: boolean; windowCount: number }
export interface Button { id: string; label: string; payload: string }
export interface CommandItem { name: string; hint: string; payload: string }
export interface FileItem { kind: 'file'; path: string; mtime: number }
export interface CommandSuggestion { kind: 'command'; name: string; hint: string; payload: string }
export type CompletionItem = FileItem | CommandSuggestion;
export interface WallSnapshotWindow extends WindowMeta {
  session: string;
  preview: string[];
  status: 'ok' | 'warn' | 'err' | 'running' | 'idle';
  lastOutputAgeMs: number;
}
export interface WallSnapshotSession {
  name: string;
  attached: boolean;
  windows: WallSnapshotWindow[];
}
export interface WallSnapshot { ts: number; sessions: WallSnapshotSession[] }
export interface UiConfig { accent: string; density: string; commands: CommandItem[]; cwdFallback: string }
