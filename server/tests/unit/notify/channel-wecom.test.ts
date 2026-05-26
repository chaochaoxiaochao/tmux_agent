import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WecomChannel } from '../../../src/notify/channel-wecom.js';
import type { RichNotification } from '../../../src/notify/types.js';

const sample: RichNotification = {
  headline: '✅ Test', body: 'hi', fields: [{ label: 'Session', value: 'main' }],
  buttons: [{ text: '🔗 Web', style: 'default', kind: 'link', url: 'https://x' }],
  eventId: 'e1', paneId: '%1', session: 'main', windowId: '@2',
};

describe('WecomChannel', () => {
  beforeEach(() => { process.env.WECOM_WEBHOOK_URL = 'https://qy.example/hook'; });

  it('send POSTs markdown payload to webhook', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });
    vi.stubGlobal('fetch', fetchMock);
    const ch = new WecomChannel({ enabled: true, webhook_url_env: 'WECOM_WEBHOOK_URL' });
    await ch.init();
    await ch.send(sample);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://qy.example/hook');
    const body = JSON.parse(init.body);
    expect(body.msgtype).toBe('markdown');
    expect(body.markdown.content).toContain('Test');
    expect(body.markdown.content).toContain('Session');
  });

  it('init throws when env var missing', async () => {
    delete process.env.WECOM_WEBHOOK_URL;
    const ch = new WecomChannel({ enabled: true, webhook_url_env: 'WECOM_WEBHOOK_URL' });
    await expect(ch.init()).rejects.toThrow(/WECOM_WEBHOOK_URL/);
  });

  it('send swallows network errors (no throw)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')));
    const ch = new WecomChannel({ enabled: true, webhook_url_env: 'WECOM_WEBHOOK_URL' });
    await ch.init();
    await expect(ch.send(sample)).resolves.toBeUndefined();
  });
});
