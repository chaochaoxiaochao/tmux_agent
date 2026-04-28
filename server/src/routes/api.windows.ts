import { FastifyInstance } from 'fastify';

export async function registerWindowsRoutes(app: FastifyInstance) {
  app.get('/api/sessions', async () => app.tmux.listSessions());

  app.get('/api/windows', async () => app.tmux.listWindows());

  app.post<{ Body: { name?: string } }>('/api/windows', async (req) => {
    return app.tmux.newWindow(req.body?.name);
  });

  app.post('/api/windows/kill-all', async (_req, reply) => {
    const ws = await app.tmux.listWindows();
    for (const w of ws) {
      try { await app.tmux.killWindow(w.id); } catch { /* race ok */ }
    }
    reply.status(204).send();
  });

  app.post<{ Params: { id: string } }>('/api/windows/:id/kill', async (req, reply) => {
    const id = req.params.id;
    const exists = (await app.tmux.listWindows()).some(w => w.id === id);
    if (!exists) {
      reply.status(404).send({ error: 'window_not_found', message: `window ${id}` });
      return;
    }
    await app.tmux.killWindow(id);
    reply.status(204).send();
  });

  app.post<{ Params: { id: string }, Body: { dir: 'h' | 'v' } }>('/api/windows/:id/split', async (req, reply) => {
    const exists = (await app.tmux.listWindows()).some(w => w.id === req.params.id);
    if (!exists) {
      reply.status(404).send({ error: 'window_not_found', message: req.params.id });
      return;
    }
    await app.tmux.splitWindow(req.params.id, req.body.dir);
    reply.status(204).send();
  });

  const MAX_SEND_BYTES = 16 * 1024;

  app.post<{ Params: { id: string }, Body: { text: string } }>('/api/windows/:id/send', async (req, reply) => {
    const text = req.body?.text ?? '';
    if (Buffer.byteLength(text, 'utf8') > MAX_SEND_BYTES) {
      reply.status(400).send({ error: 'payload_too_large', message: `text exceeds ${MAX_SEND_BYTES} bytes` });
      return;
    }
    const exists = (await app.tmux.listWindows()).some(w => w.id === req.params.id);
    if (!exists) {
      reply.status(404).send({ error: 'window_not_found', message: req.params.id });
      return;
    }
    try {
      await app.tmux.sendKeys(req.params.id, text);
    } catch (e: any) {
      reply.status(502).send({ error: 'send_failed', message: e.message });
      return;
    }
    reply.status(204).send();
  });
}
