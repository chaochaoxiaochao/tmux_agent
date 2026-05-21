import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { startTmux, TmuxFixture } from './tmux-server.fixture.js';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

let fx: TmuxFixture; let app: FastifyInstance; let port: number;
const S = 'test';
const base = `/api/sessions/${S}/windows`;

beforeEach(async () => {
  fx = startTmux();
  app = await buildServer({
    server: { host: '127.0.0.1', port: 0 },
    tmux: { session: '', cwdFallback: '/tmp', socket: fx.socket } as any,
    ui: { accent: 'green', density: 'comfortable' },
    buttons: [],
    statusRules: [{ match: '\\[y/N\\]', status: 'warn' }],
    log: { level: 'info', file: '/tmp/tmux-agent-test.log' },
  } as any);
  await app.listen({ host: '127.0.0.1', port: 0 });
  port = (app.server.address() as any).port;
});
afterEach(async () => { await app.close(); fx.cleanup(); });

describe('/ws/wall (multi-session)', () => {
  it('receives a snapshot containing the test session', async () => {
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
    expect(Array.isArray(got.sessions)).toBe(true);
    const s = got.sessions.find((x: any) => x.name === S);
    expect(s).toBeDefined();
    expect(s.windows.length).toBeGreaterThan(0);
    expect(s.windows[0]).toHaveProperty('preview');
    expect(s.windows[0]).toHaveProperty('status');
    expect(s.windows[0].session).toBe(S);
  }, 5000);

  it('flags warn status when [y/N] visible', async () => {
    const ws = (await app.inject({ method: 'GET', url: base })).json();
    const id = ws[0].id;
    await app.inject({
      method: 'POST', url: `${base}/${encodeURIComponent(id)}/send`,
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
    const s = snap.sessions.find((x: any) => x.name === S);
    const w = s.windows.find((x: any) => x.id === id);
    expect(w.status).toBe('warn');
  }, 5000);
});
