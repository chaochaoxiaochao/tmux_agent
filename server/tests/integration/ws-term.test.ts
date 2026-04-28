import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { startTmux, TmuxFixture } from './tmux-server.fixture.js';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

let fx: TmuxFixture;
let app: FastifyInstance;
let port: number;
const S = 'test';

beforeEach(async () => {
  fx = startTmux();
  app = await buildServer({
    server: { host: '127.0.0.1', port: 0 },
    tmux: { session: '', cwdFallback: '/tmp', socket: fx.socket } as any,
    ui: { accent: 'green', density: 'comfortable' },
    buttons: [], commands: [], statusRules: [],
    log: { level: 'info', file: '/tmp/tmux-agent-test.log' },
  } as any);
  await app.listen({ host: '127.0.0.1', port: 0 });
  port = (app.server.address() as any).port;
});
afterEach(async () => { await app.close(); fx.cleanup(); });

describe('/ws/term/:session/:id', () => {
  it('echoes a typed command back via PTY', async () => {
    const ws = (await app.inject({ method: 'GET', url: `/api/sessions/${S}/windows` })).json();
    const id = ws[0].id;
    const sock = new WebSocket(`ws://127.0.0.1:${port}/ws/term/${S}/${encodeURIComponent(id)}`);
    let buf = '';
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('timeout: buf=' + buf.slice(-200))), 8000);
      sock.on('open', () => {
        sock.send(JSON.stringify({ type: 'resize', cols: 80, rows: 24 }));
        setTimeout(() => sock.send(Buffer.from('echo WSTERM_OK\n')), 500);
      });
      sock.on('message', (data) => {
        buf += Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
        if (buf.includes('WSTERM_OK')) { clearTimeout(t); resolve(); }
      });
      sock.on('error', e => { clearTimeout(t); reject(e); });
    });
    sock.close();
    expect(buf).toContain('WSTERM_OK');
  }, 12000);
});
