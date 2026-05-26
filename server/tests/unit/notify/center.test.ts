import { describe, it, expect, vi } from 'vitest';
import { NotificationCenter } from '../../../src/notify/center.js';
import type { Channel, NotifyEvent } from '../../../src/notify/types.js';

function fakeChannel(kind: 'wecom' | 'lark', sendImpl: () => Promise<void>): Channel {
  return {
    kind, enabled: true,
    async init() {},
    send: vi.fn(sendImpl) as any,
    async shutdown() {},
  };
}

const ev: NotifyEvent = {
  paneId: '%1', session: 'main', windowId: '@2',
  hook_event_name: 'Stop', tool_name: '', message: '',
  session_id: 'sid', cwd: '/tmp', background_running: false,
};

describe('NotificationCenter', () => {
  it('dispatch calls send on each enabled channel', async () => {
    const a = fakeChannel('wecom', async () => {});
    const b = fakeChannel('lark', async () => {});
    const c = new NotificationCenter([a, b], { publicUrl: 'https://x' });
    await c.dispatch(ev);
    expect((a.send as any).mock.calls.length).toBe(1);
    expect((b.send as any).mock.calls.length).toBe(1);
  });

  it('one channel throwing does not block the other (Promise.allSettled)', async () => {
    const a = fakeChannel('wecom', async () => { throw new Error('boom'); });
    const b = fakeChannel('lark', async () => {});
    const c = new NotificationCenter([a, b], { publicUrl: 'https://x' });
    await expect(c.dispatch(ev)).resolves.toBeUndefined();
    expect((b.send as any).mock.calls.length).toBe(1);
  });

  it('disabled channels are skipped', async () => {
    const a = fakeChannel('wecom', async () => {});
    a.enabled = false;
    const b = fakeChannel('lark', async () => {});
    const c = new NotificationCenter([a, b], { publicUrl: 'https://x' });
    await c.dispatch(ev);
    expect((a.send as any).mock.calls.length).toBe(0);
    expect((b.send as any).mock.calls.length).toBe(1);
  });
});
