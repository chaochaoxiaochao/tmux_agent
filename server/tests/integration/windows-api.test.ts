import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startTmux, TmuxFixture } from './tmux-server.fixture.js';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

let fx: TmuxFixture;
let app: FastifyInstance;
let S = 'test';
const base = `/api/sessions/${S}/windows`;

beforeEach(async () => {
  fx = startTmux();
  app = await buildServer({
    server: { host: '127.0.0.1', port: 0 },
    tmux: { session: '', cwdFallback: '/tmp', socket: fx.socket } as any,
    ui: { accent: 'green', density: 'comfortable' },
    buttons: [], statusRules: [],
    log: { level: 'info', file: '/tmp/tmux-agent-test.log' },
  } as any);
});
afterEach(async () => { await app.close(); fx.cleanup(); });

describe('windows API (multi-session)', () => {
  it('GET /api/sessions returns the test session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.some((s: any) => s.name === S)).toBe(true);
  });

  it('GET /api/sessions/:session/windows returns initial window', async () => {
    const res = await app.inject({ method: 'GET', url: base });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('active');
  });

  it('POST /api/sessions/:session/windows creates window', async () => {
    const res = await app.inject({ method: 'POST', url: base, payload: { name: 'foo' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('foo');
  });

  it('POST .../windows/:id/kill removes it', async () => {
    const created = (await app.inject({ method: 'POST', url: base, payload: { name: 'kill-me' } })).json();
    const res = await app.inject({ method: 'POST', url: `${base}/${encodeURIComponent(created.id)}/kill` });
    expect(res.statusCode).toBe(204);
    const list = (await app.inject({ method: 'GET', url: base })).json();
    expect(list.some((w: any) => w.id === created.id)).toBe(false);
  });

  it('returns 404 for unknown window kill', async () => {
    const res = await app.inject({ method: 'POST', url: `${base}/@9999/kill` });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('window_not_found');
  });

  it('returns empty list for missing session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions/does-not-exist/windows' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });
});
