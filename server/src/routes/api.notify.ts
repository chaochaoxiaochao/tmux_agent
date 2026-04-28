import { FastifyInstance } from 'fastify';
import { setAttention, clearAttention, AttentionKind } from '../attention.js';

export function registerNotifyRoutes(app: FastifyInstance) {
  app.post<{ Body: { session: string; windowId: string; kind: AttentionKind } }>(
    '/api/notify',
    async (req, reply) => {
      const { session, windowId, kind } = req.body ?? ({} as any);
      if (!session || !windowId || (kind !== 'input-needed' && kind !== 'done')) {
        reply.status(400).send({ error: 'bad_input', message: 'session, windowId, kind required' });
        return;
      }
      setAttention(session, windowId, kind);
      reply.status(204).send();
    },
  );

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
