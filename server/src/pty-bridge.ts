import type { FastifyInstance } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import * as pty from 'node-pty';

export async function registerPtyBridge(app: FastifyInstance) {
  await app.register(websocketPlugin);

  app.get('/ws/term/:session/:id', { websocket: true } as any, (conn, req) => {
    const { session, id } = req.params as { session: string; id: string };
    const socketName = (app.cfg.tmux as any).socket as string | undefined;
    const tmuxPrefix = socketName ? ['-L', socketName] : [];

    // Make the target window active before attach. Avoids racing a prefix-key
    // sequence after attach, which would leave tmux in command-prompt mode and
    // paint the status bar yellow.
    app.tmux.selectWindow(session, id).catch(() => { /* best effort */ });

    const ptyProc = pty.spawn('tmux', [...tmuxPrefix, 'attach-session', '-t', session], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.env.HOME,
      env: process.env as any,
    });

    ptyProc.onData(data => {
      try { conn.send(data, { binary: true }); } catch { /* dead */ }
    });
    ptyProc.onExit(() => {
      try { conn.close(1011, 'pty exited'); } catch { }
    });

    conn.on('message', (raw: any, isBinary: boolean) => {
      if (isBinary) {
        ptyProc.write(Buffer.isBuffer(raw) ? raw.toString('utf8') : raw);
      } else {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'resize' && Number.isFinite(msg.cols) && Number.isFinite(msg.rows)) {
            ptyProc.resize(msg.cols, msg.rows);
          }
        } catch { /* ignore */ }
      }
    });

    conn.on('close', () => {
      try { ptyProc.kill('SIGHUP'); } catch { }
    });
  });
}
