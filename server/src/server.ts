import Fastify, { FastifyInstance } from 'fastify';
import { TmuxControl } from './tmux-control.js';
import type { Config } from './config.schema.js';
import { registerWindowsRoutes } from './routes/api.windows.js';
import { registerButtonsRoutes } from './routes/api.buttons.js';
import { registerCompletionRoutes } from './routes/api.completion.js';
import { registerPtyBridge } from './pty-bridge.js';
import { registerWallChannel } from './wall-snapshots.js';

export interface ExtendedConfig extends Config {
  tmux: Config['tmux'] & { socket?: string };
}

export async function buildServer(cfg: ExtendedConfig): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: cfg.log.level } });

  const tmux = new TmuxControl({ session: cfg.tmux.session, socket: cfg.tmux.socket });
  app.decorate('tmux', tmux);
  app.decorate('cfg', cfg);

  await registerWindowsRoutes(app);
  registerButtonsRoutes(app);
  registerCompletionRoutes(app);
  await registerPtyBridge(app);
  registerWallChannel(app);

  app.setErrorHandler((err, _req, reply) => {
    const status = (err as any).statusCode ?? 500;
    reply.status(status).send({ error: (err as any).code ?? 'internal', message: err.message });
  });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    tmux: TmuxControl;
    cfg: ExtendedConfig;
  }
}
