import { FastifyInstance } from 'fastify';
import { saveButtons } from '../config.js';
import type { Button } from '../config.schema.js';

export function registerButtonsRoutes(app: FastifyInstance) {
  const cfg = app.cfg;
  const cfgPath = (cfg as any).configPath as string | undefined;

  function persist() { if (cfgPath) saveButtons(cfgPath, cfg.buttons); }
  function genId() { return `btn-${Math.random().toString(36).slice(2, 8)}`; }

  app.get('/api/buttons', async () => cfg.buttons);

  app.post<{ Body: { label: string; payload: string } }>('/api/buttons', async (req, reply) => {
    const { label, payload } = (req.body ?? {}) as any;
    if (typeof label !== 'string' || typeof payload !== 'string') {
      reply.status(400).send({ error: 'bad_input', message: 'label and payload required' }); return;
    }
    if (Buffer.byteLength(payload, 'utf8') > 4096) {
      reply.status(400).send({ error: 'payload_too_large', message: 'button payload exceeds 4 KB' }); return;
    }
    const b: Button = { id: genId(), label, payload };
    cfg.buttons.push(b);
    persist();
    return b;
  });

  app.put<{ Params: { id: string }, Body: Partial<Button> }>('/api/buttons/:id', async (req, reply) => {
    const b = cfg.buttons.find(x => x.id === req.params.id);
    if (!b) { reply.status(404).send({ error: 'button_not_found', message: req.params.id }); return; }
    if (req.body.label !== undefined) b.label = req.body.label;
    if (req.body.payload !== undefined) {
      if (Buffer.byteLength(req.body.payload, 'utf8') > 4096) {
        reply.status(400).send({ error: 'payload_too_large', message: 'button payload exceeds 4 KB' }); return;
      }
      b.payload = req.body.payload;
    }
    persist();
    return b;
  });

  app.delete<{ Params: { id: string } }>('/api/buttons/:id', async (req, reply) => {
    const idx = cfg.buttons.findIndex(x => x.id === req.params.id);
    if (idx < 0) { reply.status(404).send({ error: 'button_not_found', message: req.params.id }); return; }
    cfg.buttons.splice(idx, 1);
    persist();
    reply.status(204).send();
  });
}
