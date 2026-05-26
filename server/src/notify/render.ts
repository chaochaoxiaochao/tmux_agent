import type { NotifyEvent, RichNotification, Button } from './types.js';

export interface RenderOpts { eventId: string; publicUrl?: string }

export function renderNotification(ev: NotifyEvent, opts: RenderOpts): RichNotification {
  let headline: string;
  let body: string;
  const fields = [
    { label: 'Session', value: ev.session },
    { label: 'Cwd', value: ev.cwd },
    { label: 'Time', value: new Date().toLocaleString() },
  ];

  if (ev.hook_event_name === 'Stop') {
    headline = '✅ Claude Code 任务完成';
    body = '主人我完成任务了';
  } else if (ev.hook_event_name === 'PermissionRequest' && ev.tool_name === 'AskUserQuestion') {
    headline = '❓ Claude Code 需要询问';
    const q = (ev.tool_input as any)?.questions?.[0]?.question ?? '';
    body = q ? `主人我需要问你：\n${q}` : '主人我需要问你';
  } else if (ev.hook_event_name === 'PermissionRequest') {
    headline = '🔐 Claude Code 等权限批准';
    body = `主人我需要你批准 \`${ev.tool_name || '?'}\` 操作`;
  } else {
    headline = '🔔 Claude Code 等输入';
    body = ev.message || '主人有事找你';
  }

  let deepLink: string | undefined;
  if (opts.publicUrl) {
    deepLink = `${opts.publicUrl}/#/w/${encodeURIComponent(ev.session)}/${encodeURIComponent(ev.windowId)}`;
  }

  // Phase 1: 只放 link 类按钮 (Open Web)。callback 按钮在 Phase 2 加。
  const buttons: Button[] = [];
  if (deepLink) {
    buttons.push({ text: '🔗 打开 Web', style: 'default', kind: 'link', url: deepLink });
  }

  return {
    headline, body, fields,
    deepLink, buttons,
    eventId: opts.eventId,
    paneId: ev.paneId, session: ev.session, windowId: ev.windowId,
  };
}
