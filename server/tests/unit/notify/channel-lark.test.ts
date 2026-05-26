import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@larksuiteoapi/node-sdk', () => {
  const createMock = vi.fn().mockResolvedValue({ data: { message_id: 'om_x' } });
  return {
    Client: vi.fn().mockImplementation(() => ({
      im: { message: { create: createMock } },
    })),
    AppType: { SelfBuild: 'SelfBuild' },
    __createMock: createMock,
  };
});

import { LarkChannel } from '../../../src/notify/channel-lark.js';
import * as lark from '@larksuiteoapi/node-sdk';
import type { RichNotification } from '../../../src/notify/types.js';

const cfg = {
  enabled: true, app_id: 'cli_x', app_secret_env: 'LARK_APP_SECRET',
  owner_open_id: 'ou_x', send_target: 'user' as const,
};
const n: RichNotification = {
  headline: '✅ done', body: 'hi', fields: [],
  buttons: [], eventId: 'e1', paneId: '%1', session: 'main', windowId: '@2',
};

describe('LarkChannel (no WS in Phase 1)', () => {
  beforeEach(() => { process.env.LARK_APP_SECRET = 'sec'; vi.clearAllMocks(); });

  it('init builds Client with app_id + appSecret from env', async () => {
    const ch = new LarkChannel(cfg);
    await ch.init();
    expect((lark as any).Client).toHaveBeenCalledWith(expect.objectContaining({
      appId: 'cli_x', appSecret: 'sec', appType: 'SelfBuild',
    }));
  });

  it('init throws when app_secret env missing', async () => {
    delete process.env.LARK_APP_SECRET;
    const ch = new LarkChannel(cfg);
    await expect(ch.init()).rejects.toThrow(/LARK_APP_SECRET/);
  });

  it('send calls im.message.create with owner_open_id + interactive content', async () => {
    const ch = new LarkChannel(cfg);
    await ch.init();
    await ch.send(n);
    expect((lark as any).__createMock).toHaveBeenCalledOnce();
    const arg = (lark as any).__createMock.mock.calls[0][0];
    expect(arg.params.receive_id_type).toBe('open_id');
    expect(arg.data.receive_id).toBe('ou_x');
    expect(arg.data.msg_type).toBe('interactive');
    expect(typeof arg.data.content).toBe('string');
    expect(JSON.parse(arg.data.content).header.title.content).toBe('✅ done');
  });
});
