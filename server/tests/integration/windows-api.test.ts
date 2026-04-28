import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startTmux, TmuxFixture } from './tmux-server.fixture.js';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

let fx: TmuxFixture;
let app: FastifyInstance;

beforeEach(async () => {
  fx = startTmux();
  app = await buildServer({
    server: { host: '127.0.0.1', port: 0 },
    tmux: { session: fx.session, cwdFallback: '/tmp', socket: fx.socket } as any,
    ui: { accent: 'green', density: 'comfortable' },
    buttons: [], commands: [], statusRules: [],
    log: { level: 'info', file: '/tmp/tmux-agent-test.log' },
  } as any);
});
afterEach(async () => { await app.close(); fx.cleanup(); });

describe('windows API', () => {
  it('GET /api/sessions returns the test session', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sessions' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.some((s: any) => s.name === 'test')).toBe(true);
  });

  it('GET /api/windows returns initial window', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/windows' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0]).toHaveProperty('id');
    expect(body[0]).toHaveProperty('active');
  });

  it('POST /api/windows creates window', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/windows', payload: { name: 'foo' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('foo');
  });

  it('POST /api/windows/:id/kill removes it', async () => {
    const created = (await app.inject({ method: 'POST', url: '/api/windows', payload: { name: 'kill-me' } })).json();
    const res = await app.inject({ method: 'POST', url: `/api/windows/${encodeURIComponent(created.id)}/kill` });
    expect(res.statusCode).toBe(204);
    const list = (await app.inject({ method: 'GET', url: '/api/windows' })).json();
    expect(list.some((w: any) => w.id === created.id)).toBe(false);
  });

  it('returns 404 for unknown window kill', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/windows/@9999/kill' });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('window_not_found');
  });
});
