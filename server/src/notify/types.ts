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

export interface RichNotification {
  headline: string;
  body: string;
  fields: Array<{ label: string; value: string }>;
  agentsSnapshot?: string;
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
