import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startTmux, TmuxFixture } from './tmux-server.fixture.js';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

let fx: TmuxFixture;
let app: FastifyInstance;
const S = 'test';
const base = `/api/sessions/${S}/windows`;

beforeEach(async () => {
  fx = startTmux();
  app = await buildServer({
    server: { host: '127.0.0.1', port: 0 },
    tmux: { session: '', cwdFallback: '/tmp', socket: fx.socket } as any,
    ui: { accent: 'green', density: 'comfortable' },
    buttons: [], commands: [], statusRules: [],
    log: { level: 'info', file: '/tmp/tmux-agent-test.log' },
  } as any);
});
afterEach(async () => { await app.close(); fx.cleanup(); });

async function capture(app: FastifyInstance, id: string): Promise<string> {
  const out = await (app as any).tmux.capturePane(S, id, 30);
  return out.join('\n');
}

describe('POST /api/sessions/:session/windows/:id/send', () => {
  it('injects text + enter', async () => {
    const ws = (await app.inject({ method: 'GET', url: base })).json();
    const id = ws[0].id;
    const res = await app.inject({
      method: 'POST',
      url: `${base}/${encodeURIComponent(id)}/send`,
      payload: { text: 'echo SENDKEYS_OK\n' },
    });
    expect(res.statusCode).toBe(204);
    await new Promise(r => setTimeout(r, 500));
    expect(await capture(app, id)).toContain('SENDKEYS_OK');
  });

  it('rejects payload over 16 KB', async () => {
    const ws = (await app.inject({ method: 'GET', url: base })).json();
    const id = ws[0].id;
    const huge = 'x'.repeat(20000);
    const res = await app.inject({
      method: 'POST',
      url: `${base}/${encodeURIComponent(id)}/send`,
      payload: { text: huge },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('payload_too_large');
  });

  it('404 for unknown window', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `${base}/@9999/send`,
      payload: { text: 'x' },
    });
    expect(res.statusCode).toBe(404);
  });
});
