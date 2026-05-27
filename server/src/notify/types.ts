export type NotifyEventKind = 'Stop' | 'PermissionRequest' | 'Notification';

export interface NotifyEvent {
  paneId: string;
  session: string;
  windowId: string;
  hook_event_name: NotifyEventKind;
  tool_name: string;
  message: string;
  tool_input?: unknown;
  session_id: string;
  cwd: string;
  background_running: boolean;
}

export interface Button {
  text: string;
  style: 'primary' | 'danger' | 'default';
  kind: 'callback' | 'link';
  url?: string;
  value?: { action: string; paneId: string; eventId: string; [k: string]: unknown };
}

export interface AgentRow {
  state: string;          // running / request / done / idle
  stateLabel: string;     // 🟢 跑着 / ⏳ 等输入 / ✅ 刚完成 / 💤 闲着
  session: string;
  windowLabel: string;    // windowName || windowId
  paneIndex: number;
  paneId: string;
  cwd: string;
  time: string;           // HH:MM:SS
  claudeLabel?: string;   // claudeSessionName || sliced id
  lastMessage?: string;
  isCurrent: boolean;     // 是否是 ev.paneId 对应的那行
  deepLink?: string;
}

export interface RichNotification {
  headline: string;
  body: string;
  fields: Array<{ label: string; value: string }>;
  agentsSnapshot?: string;     // markdown 字符串, wecom 用
  agents?: AgentRow[];         // 结构化, lark 卡片 table 用
  deepLink?: string;
  buttons: Button[];
  eventId: string;
  paneId: string;
  session: string;
  windowId: string;
}

export interface Channel {
  readonly kind: 'wecom' | 'lark';
  enabled: boolean;
  init(): Promise<void>;
  send(n: RichNotification): Promise<void>;
  shutdown(): Promise<void>;
}
