import { describe, it, expect } from 'vitest';
import type {
  NotifyEvent, NotifyEventKind, Button, RichNotification, Channel,
} from '../../../src/notify/types.js';

describe('notify types module', () => {
  it('exports NotifyEvent shape compatible with hook payload', () => {
    const ev: NotifyEvent = {
      paneId: '%1', session: 'main', windowId: '@2',
      hook_event_name: 'Stop', tool_name: '', message: 'done',
      session_id: 'sid', cwd: '/tmp', background_running: false,
    };
    expect(ev.hook_event_name).toBe('Stop');
  });

  it('Button.kind narrows to callback/link', () => {
    const link: Button = { text: 'Open', style: 'default', kind: 'link', url: 'https://x' };
    const cb: Button = { text: 'OK', style: 'primary', kind: 'callback',
      value: { action: 'approve', paneId: '%1', eventId: 'e1' } };
    expect(link.kind).toBe('link');
    expect(cb.kind).toBe('callback');
  });
});
