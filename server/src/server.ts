import Fastify, { FastifyInstance } from 'fastify';
import { TmuxControl } from './tmux-control.js';
import type { Config } from './config.schema.js';
import { DEFAULT_CONFIG } from './config.schema.js';
import { registerWindowsRoutes } from './routes/api.windows.js';
import { registerButtonsRoutes } from './routes/api.buttons.js';
import { registerCompletionRoutes } from './routes/api.completion.js';
import { registerNotifyRoutes } from './routes/api.notify.js';
import { registerUploadRoutes } from './routes/api.upload.js';
import { registerDebugRoutes } from './routes/api.debug.js';
import { registerSlashRoutes } from './routes/api.slash.js';
import { registerPtyBridge } from './pty-bridge.js';
import { registerWallSnapshots } from './wall-snapshots.js';
import { registerWallWebSocket } from './wall-channel.js';
import { startAgentStateScanner } from './agent-state-scanner.js';
import { registerAgentStateRoutes } from './routes/api.agent-state.js';
import { NotificationCenter } from './notify/center.js';
import { WecomChannel } from './notify/channel-wecom.js';
import { LarkChannel } from './notify/channel-lark.js';
import type { Channel } from './notify/types.js';
import fastifyStatic from '@fastify/static';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ExtendedConfig extends Config {
  tmux: Config['tmux'] & { socket?: string };
  configPath?: string;
}

export async function buildServer(cfg: ExtendedConfig): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: cfg.log.level } });

  const tmux = new TmuxControl({ socket: cfg.tmux.socket });
  app.decorate('tmux', tmux);
  app.decorate('cfg', cfg);

  // Integration test fixtures construct cfg without going through mergeConfig,
  // so cfg.notify may be undefined despite the Config type marking it required.
  const notifyCfg = cfg.notify ?? DEFAULT_CONFIG.notify;
  const channels: Channel[] = [];
  if (notifyCfg.channels.wecom.enabled) channels.push(new WecomChannel(notifyCfg.channels.wecom));
  if (notifyCfg.channels.lark.enabled) channels.push(new LarkChannel(notifyCfg.channels.lark, tmux));
  const notifyCenter = new NotificationCenter(channels, { publicUrl: cfg.server.publicUrl });
  await notifyCenter.init();
  // Decorated for Phase 2 callback routes (lark-router) to access center off app.
  app.decorate('notifyCenter', notifyCenter);
  app.addHook('onClose', async () => { await notifyCenter.shutdown(); });

  await registerWindowsRoutes(app);
  registerButtonsRoutes(app);
  registerCompletionRoutes(app);
  registerNotifyRoutes(app, notifyCenter);
  await registerUploadRoutes(app);
  await registerDebugRoutes(app);
  registerSlashRoutes(app);
  await registerPtyBridge(app);
  registerWallWebSocket(app);
  registerWallSnapshots(app);
  registerAgentStateRoutes(app);
  startAgentStateScanner(app);

  const webDist = path.resolve(__dirname, '../../web/dist');
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/' });
  }

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
    notifyCenter: NotificationCenter;
  }
}
