import { FastifyInstance } from 'fastify';

const MAX_SEND_BYTES = 16 * 1024;

export async function registerWindowsRoutes(app: FastifyInstance) {
  app.get('/api/sessions', async () => app.tmux.listSessions());

  app.post<{ Body: { name: string } }>('/api/sessions', async (req, reply) => {
    const name = req.body?.name;
    if (!name) { reply.status(400).send({ error: 'bad_input', message: 'name required' }); return; }
    await app.tmux.newSession(name);
    reply.status(204).send();
  });

  // List windows of a specific session
  app.get<{ Params: { session: string } }>('/api/sessions/:session/windows', async (req) => {
    return app.tmux.listWindows(req.params.session);
  });

  // Create window in a session
  app.post<{ Params: { session: string }, Body: { name?: string } }>(
    '/api/sessions/:session/windows',
    async (req, reply) => {
      if (!await app.tmux.hasSession(req.params.session)) {
        reply.status(404).send({ error: 'session_not_found', message: req.params.session });
        return;
      }
      return app.tmux.newWindow(req.params.session, req.body?.name);
    },
  );

  // Kill all windows of a session
  app.post<{ Params: { session: string } }>(
    '/api/sessions/:session/windows/kill-all',
    async (req, reply) => {
      const ws = await app.tmux.listWindows(req.params.session);
      for (const w of ws) {
        try { await app.tmux.killWindow(req.params.session, w.id); } catch { /* race ok */ }
      }
      reply.status(204).send();
    },
  );

  app.post<{ Params: { session: string; id: string } }>(
    '/api/sessions/:session/windows/:id/kill',
    async (req, reply) => {
      const { session, id } = req.params;
      const exists = (await app.tmux.listWindows(session)).some(w => w.id === id);
      if (!exists) {
        reply.status(404).send({ error: 'window_not_found', message: `${session}:${id}` });
        return;
      }
      await app.tmux.killWindow(session, id);
      reply.status(204).send();
    },
  );

  app.post<{ Params: { session: string; id: string }, Body: { dir: 'h' | 'v' } }>(
    '/api/sessions/:session/windows/:id/split',
    async (req, reply) => {
      const { session, id } = req.params;
      const exists = (await app.tmux.listWindows(session)).some(w => w.id === id);
      if (!exists) {
        reply.status(404).send({ error: 'window_not_found', message: `${session}:${id}` });
        return;
      }
      await app.tmux.splitWindow(session, id, req.body.dir);
      reply.status(204).send();
    },
  );

  // List panes in a window. Used by the AttachedView pane-tab strip and
  // for "auto-zoom on enter" decision.
  app.get<{ Params: { session: string; id: string } }>(
    '/api/sessions/:session/windows/:id/panes',
    async (req, reply) => {
      const { session, id } = req.params;
      const exists = (await app.tmux.listWindows(session)).some(w => w.id === id);
      if (!exists) {
        reply.status(404).send({ error: 'window_not_found', message: `${session}:${id}` });
        return;
      }
      return app.tmux.listPanes(session, id);
    },
  );

  // Select a pane (make it active).
  app.post<{ Params: { session: string; id: string; pane: string } }>(
    '/api/sessions/:session/windows/:id/panes/:pane/select',
    async (req, reply) => {
      const { session, id, pane } = req.params;
      try { await app.tmux.selectPane(session, id, pane); }
      catch (e: any) { reply.status(502).send({ error: 'select_failed', message: e.message }); return; }
      reply.status(204).send();
    },
  );

  // Toggle zoom on a pane (equivalent to tmux prefix+z).
  app.post<{ Params: { session: string; id: string; pane: string } }>(
    '/api/sessions/:session/windows/:id/panes/:pane/zoom',
    async (req, reply) => {
      const { session, id, pane } = req.params;
      try { await app.tmux.toggleZoom(session, id, pane); }
      catch (e: any) { reply.status(502).send({ error: 'zoom_failed', message: e.message }); return; }
      reply.status(204).send();
    },
  );

  // Idempotent: make sure the window is zoomed on its active pane.
  // Used when the AttachedView mounts so mobile users always see one pane
  // full-screen instead of a cramped multi-pane layout.
  app.post<{ Params: { session: string; id: string } }>(
    '/api/sessions/:session/windows/:id/ensure-zoom',
    async (req, reply) => {
      const { session, id } = req.params;
      try { await app.tmux.ensureZoomedOnActive(session, id); }
      catch (e: any) { reply.status(502).send({ error: 'zoom_failed', message: e.message }); return; }
      reply.status(204).send();
    },
  );

  // Enter tmux copy-mode for the given window. Lets the client read the
  // window's scrollback buffer without touching the prefix key.
  app.post<{ Params: { session: string; id: string } }>(
    '/api/sessions/:session/windows/:id/copy-mode',
    async (req, reply) => {
      const { session, id } = req.params;
      const exists = (await app.tmux.listWindows(session)).some(w => w.id === id);
      if (!exists) {
        reply.status(404).send({ error: 'window_not_found', message: `${session}:${id}` });
        return;
      }
      try { await app.tmux.copyMode(session, id); }
      catch (e: any) { reply.status(502).send({ error: 'copy_mode_failed', message: e.message }); return; }
      reply.status(204).send();
    },
  );

  // Send a single named tmux key (e.g. Up, Down, PageUp, PageDown, q, Escape)
  // to a window. Used by the copy-mode controls. Distinct from /send (which
  // takes free text and goes through the slicer).
  app.post<{ Params: { session: string; id: string }, Body: { key: string } }>(
    '/api/sessions/:session/windows/:id/key',
    async (req, reply) => {
      const { session, id } = req.params;
      const key = req.body?.key;
      if (!key || typeof key !== 'string' || key.length > 32) {
        reply.status(400).send({ error: 'bad_input', message: 'key required (string, ≤32)' });
        return;
      }
      const exists = (await app.tmux.listWindows(session)).some(w => w.id === id);
      if (!exists) {
        reply.status(404).send({ error: 'window_not_found', message: `${session}:${id}` });
        return;
      }
      try { await app.tmux.sendKey(session, id, key); }
      catch (e: any) { reply.status(502).send({ error: 'send_failed', message: e.message }); return; }
      reply.status(204).send();
    },
  );

  app.post<{ Params: { session: string; id: string }, Body: { text: string } }>(
    '/api/sessions/:session/windows/:id/send',
    async (req, reply) => {
      const { session, id } = req.params;
      const text = req.body?.text ?? '';
      if (Buffer.byteLength(text, 'utf8') > MAX_SEND_BYTES) {
        reply.status(400).send({ error: 'payload_too_large', message: `text exceeds ${MAX_SEND_BYTES} bytes` });
        return;
      }
      const exists = (await app.tmux.listWindows(session)).some(w => w.id === id);
      if (!exists) {
        reply.status(404).send({ error: 'window_not_found', message: `${session}:${id}` });
        return;
      }
      try {
        await app.tmux.sendKeys(session, id, text);
      } catch (e: any) {
        reply.status(502).send({ error: 'send_failed', message: e.message });
        return;
      }
      reply.status(204).send();
    },
  );
}
