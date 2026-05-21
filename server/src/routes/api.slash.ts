import { FastifyInstance } from 'fastify';
import { getSlashList } from '../slash-cache.js';

interface RefreshBody { session: string; windowId: string }

export function registerSlashRoutes(app: FastifyInstance) {
  app.post<{ Body: RefreshBody }>('/api/slash-menu/refresh', async (req, reply) => {
    const { session, windowId } = req.body || ({} as RefreshBody);
    if (!session || !windowId) {
      reply.status(400).send({ error: 'missing_params', message: 'session and windowId required' });
      return;
    }
    let panes;
    try {
      panes = await app.tmux.listPanes(session, windowId);
    } catch (e: any) {
      reply.status(500).send({ error: 'listPanes_failed', message: e?.message ?? 'tmux error' });
      return;
    }
    const active = panes.find(p => p.active);
    if (active?.cmd !== 'claude') {
      reply.send({ items: [] });
      return;
    }
    const cwd = active.path || process.env.HOME || '/';
    const r = await getSlashList(cwd, true);  // force=true 强刷
    reply.send({ items: r.immediate });
  });
}
