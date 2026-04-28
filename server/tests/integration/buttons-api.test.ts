import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let cfgPath: string;

beforeEach(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmux-agent-btns-'));
  cfgPath = path.join(dir, 'config.yaml');
  fs.writeFileSync(cfgPath, 'buttons: []\n');
  app = await buildServer({
    server: { host: '127.0.0.1', port: 0 },
    tmux: { session: 'noop', cwdFallback: '/tmp' } as any,
    ui: { accent: 'green', density: 'comfortable' },
    buttons: [{ id: 'btn-yes', label: 'Yes', payload: 'y\n' }],
    commands: [], statusRules: [],
    log: { level: 'info', file: '/tmp/tmux-agent-test.log' },
    configPath: cfgPath,
  } as any);
});
afterEach(async () => { await app.close(); });

describe('buttons CRUD', () => {
  it('GET returns initial', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/buttons' });
    expect(r.json()).toEqual([{ id: 'btn-yes', label: 'Yes', payload: 'y\n' }]);
  });

  it('POST creates with generated id', async () => {
    const r = await app.inject({ method: 'POST', url: '/api/buttons', payload: { label: 'X', payload: 'x' } });
    expect(r.statusCode).toBe(200);
    const b = r.json();
    expect(b.id).toMatch(/^btn-/);
    expect(b.label).toBe('X');
    const file = fs.readFileSync(cfgPath, 'utf8');
    expect(file).toContain(b.id);
  });

  it('PUT updates', async () => {
    const r = await app.inject({ method: 'PUT', url: '/api/buttons/btn-yes', payload: { label: 'YES' } });
    expect(r.json().label).toBe('YES');
  });

  it('DELETE removes', async () => {
    const r = await app.inject({ method: 'DELETE', url: '/api/buttons/btn-yes' });
    expect(r.statusCode).toBe(204);
    const list = (await app.inject({ method: 'GET', url: '/api/buttons' })).json();
    expect(list).toEqual([]);
  });

  it('rejects payload over 4 KB', async () => {
    const r = await app.inject({
      method: 'POST', url: '/api/buttons',
      payload: { label: 'huge', payload: 'x'.repeat(5000) },
    });
    expect(r.statusCode).toBe(400);
  });
});
