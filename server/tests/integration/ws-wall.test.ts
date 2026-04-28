import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { startTmux, TmuxFixture } from './tmux-server.fixture.js';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

let fx: TmuxFixture; let app: FastifyInstance; let port: number;

beforeEach(async () => {
  fx = startTmux();
  app = await buildServer({
    server: { host: '127.0.0.1', port: 0 },
    tmux: { session: fx.session, cwdFallback: '/tmp', socket: fx.socket } as any,
    ui: { accent: 'green', density: 'comfortable' },
    buttons: [], commands: [],
    statusRules: [{ match: '\\[y/N\\]', status: 'warn' }],
    log: { level: 'info', file: '/tmp/tmux-agent-test.log' },
  } as any);
  await app.listen({ host: '127.0.0.1', port: 0 });
  port = (app.server.address() as any).port;
});
afterEach(async () => { await app.close(); fx.cleanup(); });

describe('/ws/wall', () => {
  it('receives at least one snapshot containing the test window', async () => {
    const sock = new WebSocket(`ws://127.0.0.1:${port}/ws/wall`);
    const got = await new Promise<any>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), 3000);
      sock.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'snapshot') { clearTimeout(t); resolve(msg.payload); }
      });
      sock.on('error', e => { clearTimeout(t); reject(e); });
    });
    sock.close();
    expect(got.windows.length).toBeGreaterThan(0);
    expect(got.windows[0]).toHaveProperty('preview');
    expect(got.windows[0]).toHaveProperty('status');
  }, 5000);

  it('flags warn status when [y/N] visible', async () => {
    const ws = (await app.inject({ method: 'GET', url: '/api/windows' })).json();
    const id = ws[0].id;
    await app.inject({
      method: 'POST', url: `/api/windows/${encodeURIComponent(id)}/send`,
      payload: { text: 'echo "Apply? [y/N]"\n' },
    });
    await new Promise(r => setTimeout(r, 800));

    const sock = new WebSocket(`ws://127.0.0.1:${port}/ws/wall`);
    const snap = await new Promise<any>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout')), 3000);
      sock.on('message', d => {
        const msg = JSON.parse(d.toString());
        if (msg.type === 'snapshot') { clearTimeout(t); resolve(msg.payload); }
      });
    });
    sock.close();
    const w = snap.windows.find((x: any) => x.id === id);
    expect(w.status).toBe('warn');
  }, 5000);
});
