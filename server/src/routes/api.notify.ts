import { FastifyInstance } from 'fastify';
import { setAttention, clearAttention, AttentionKind } from '../attention.js';
import type { NotifyEvent } from '../notify/types.js';
import type { NotificationCenter } from '../notify/center.js';

export function registerNotifyRoutes(app: FastifyInstance, center?: NotificationCenter) {
  app.post('/api/notify', async (req, reply) => {
    const body = (req.body ?? {}) as any;

    // 新契约: hook 发的结构化 payload
    if (typeof body.hook_event_name === 'string') {
      const ev: NotifyEvent = {
        paneId: body.paneId ?? '',
        session: body.session ?? '',
        windowId: body.windowId ?? '',
        hook_event_name: body.hook_event_name,
        tool_name: body.tool_name ?? '',
        message: body.message ?? '',
        tool_input: body.tool_input,
        session_id: body.session_id ?? '',
        cwd: body.cwd ?? '',
        background_running: Boolean(body.background_running),
      };
      // 1) 保留 wall flash (旧 attention)
      if (ev.session && ev.windowId) {
        const kind: AttentionKind = ev.hook_event_name === 'Stop' ? 'done' : 'input-needed';
        setAttention(ev.session, ev.windowId, kind);
      }
      // 2) fanout 到 channels
      if (center) {
        await center.dispatch(ev);
      }
      reply.status(204).send();
      return;
    }

    // 老契约: 仅 wall flash
    const { session, windowId, kind } = body;
    if (!session || !windowId || (kind !== 'input-needed' && kind !== 'done')) {
      reply.status(400).send({ error: 'bad_input', message: 'session, windowId, kind required' });
      return;
    }
    setAttention(session, windowId, kind);
    reply.status(204).send();
  });

  app.post<{ Body: { session: string; windowId: string } }>(
    '/api/notify/clear',
    async (req, reply) => {
      const { session, windowId } = req.body ?? ({} as any);
      if (!session || !windowId) {
        reply.status(400).send({ error: 'bad_input', message: 'session, windowId required' });
        return;
      }
      clearAttention(session, windowId);
      reply.status(204).send();
    },
  );
}
