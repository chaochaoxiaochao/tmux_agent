import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { registerNotifyRoutes } from '../../../src/routes/api.notify.js';
import { getAttention, clearAttention } from '../../../src/attention.js';

function fakeCenter() {
  return { dispatch: vi.fn().mockResolvedValue(undefined), init: vi.fn(), shutdown: vi.fn() } as any;
}

describe('POST /api/notify route', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = Fastify({ logger: false });
    clearAttention('s1', '@w1');
  });
  afterEach(async () => { await app.close(); });

  it('legacy {session,windowId,kind} sets attention + 204', async () => {
    registerNotifyRoutes(app);
    const r = await app.inject({ method: 'POST', url: '/api/notify',
      payload: { session: 's1', windowId: '@w1', kind: 'done' } });
    expect(r.statusCode).toBe(204);
    expect(getAttention('s1', '@w1')?.kind).toBe('done');
  });

  it('legacy missing fields → 400', async () => {
    registerNotifyRoutes(app);
    const r = await app.inject({ method: 'POST', url: '/api/notify', payload: {} });
    expect(r.statusCode).toBe(400);
  });

  it('structured payload with valid hook_event_name calls center.dispatch + 204', async () => {
    const center = fakeCenter();
    registerNotifyRoutes(app, center);
    const r = await app.inject({ method: 'POST', url: '/api/notify',
      payload: { hook_event_name: 'Stop', session: 's1', windowId: '@w1', paneId: '%1',
                 tool_name: '', message: '', session_id: 'sid', cwd: '/tmp' } });
    expect(r.statusCode).toBe(204);
    expect(center.dispatch).toHaveBeenCalledOnce();
    expect(getAttention('s1', '@w1')?.kind).toBe('done');
  });

  it('structured payload without center returns 204 (no throw)', async () => {
    registerNotifyRoutes(app);
    const r = await app.inject({ method: 'POST', url: '/api/notify',
      payload: { hook_event_name: 'Stop', session: 's1', windowId: '@w1' } });
    expect(r.statusCode).toBe(204);
  });

  it('structured payload with unknown hook_event_name → 400', async () => {
    const center = fakeCenter();
    registerNotifyRoutes(app, center);
    const r = await app.inject({ method: 'POST', url: '/api/notify',
      payload: { hook_event_name: 'DropTables', session: 's1', windowId: '@w1' } });
    expect(r.statusCode).toBe(400);
    expect(center.dispatch).not.toHaveBeenCalled();
  });
});
