import { FastifyInstance } from 'fastify';
import * as path from 'node:path';
import { filterAndRank, listFilesIn, isPathSafe } from '../completion.js';
import { expandHome } from '../config.js';

export function registerCompletionRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { q?: string; cwd?: string } }>('/api/files', async (req, reply) => {
    const q = req.query.q ?? '';
    const fallback = path.resolve(expandHome(app.cfg.tmux.cwdFallback));
    let cwd: string;
    if (req.query.cwd) {
      const abs = path.resolve(expandHome(req.query.cwd));
      if (!isPathSafe(abs, fallback)) {
        reply.status(400).send({ error: 'path_outside_root', message: 'cwd outside cwdFallback' });
        return;
      }
      cwd = abs;
    } else {
      cwd = fallback;
    }
    const files = await listFilesIn(cwd);
    return filterAndRank(files, q).map(f => ({ kind: 'file', path: f.path, mtime: f.mtime }));
  });

  app.get<{ Querystring: { q?: string } }>('/api/commands', async (req) => {
    const q = (req.query.q ?? '').toLowerCase();
    const list = app.cfg.commands.filter(c => c.name.toLowerCase().includes(q));
    return list.map(c => ({ kind: 'command', name: c.name, hint: c.hint, payload: c.payload }));
  });

  app.get('/api/config', async () => ({
    accent: app.cfg.ui.accent,
    density: app.cfg.ui.density,
    commands: app.cfg.commands,
    cwdFallback: app.cfg.tmux.cwdFallback,
  }));
}
