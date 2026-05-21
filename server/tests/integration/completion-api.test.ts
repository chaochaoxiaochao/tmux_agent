import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { buildServer } from '../../src/server.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let root: string;

beforeEach(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'tmux-agent-cmpl-'));
  fs.mkdirSync(path.join(root, 'src/auth'), { recursive: true });
  fs.writeFileSync(path.join(root, 'src/auth/mod.rs'), '');
  fs.writeFileSync(path.join(root, 'src/util.rs'), '');
  app = await buildServer({
    server: { host: '127.0.0.1', port: 0 },
    tmux: { session: 'noop', cwdFallback: root } as any,
    ui: { accent: 'green', density: 'comfortable' },
    buttons: [],
    statusRules: [],
    log: { level: 'info', file: '/tmp/tmux-agent-test.log' },
  } as any);
});
afterEach(async () => { await app.close(); });

describe('completion API', () => {
  it('GET /api/files filters by q', async () => {
    const r = await app.inject({ method: 'GET', url: '/api/files?q=aut' });
    expect(r.statusCode).toBe(200);
    const body = r.json();
    expect(body.some((f: any) => f.path.includes('auth'))).toBe(true);
  });

  it('rejects cwd outside cwdFallback', async () => {
    const r = await app.inject({ method: 'GET', url: `/api/files?q=&cwd=${encodeURIComponent('/etc')}` });
    expect(r.statusCode).toBe(400);
  });
});
