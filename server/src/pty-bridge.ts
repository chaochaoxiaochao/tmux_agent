import type { FastifyInstance } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import * as pty from 'node-pty';
import { getSlashList } from './slash-cache.js';

const PREWARM_DELAY_MS = 200;  // 等 selectWindow + attach 稳

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

    let ptyProc: pty.IPty;
    try {
      ptyProc = pty.spawn('tmux', [...tmuxPrefix, 'attach-session', '-t', session], {
        name: 'xterm-256color',
        // Start big — most desktop browsers will resize down via the WS resize
        // message anyway. Starting at 80x24 made tmux 'window-size latest' shrink
        // the pane during the spawn→resize gap, and Claude Code's HUD lines got
        // clipped because the pane was briefly that small.
        cols: 200,
        rows: 50,
        cwd: process.env.HOME,
        env: process.env as any,
      });
    } catch {
      try { conn.close(1011, 'pty spawn failed'); } catch { }
      return;
    }

    let killFallback: NodeJS.Timeout | null = null;

    ptyProc.onData(data => {
      try { conn.send(data, { binary: true }); } catch { /* dead */ }
    });
    ptyProc.onExit(() => {
      if (killFallback) { clearTimeout(killFallback); killFallback = null; }
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
      // SIGHUP gives the tmux client a chance to exit cleanly. If it's stuck in
      // a syscall (common when WeChat webview drops the WS abruptly), SIGHUP is
      // ignored — fall back to SIGKILL after 1s so the kernel force-closes the
      // unix socket fd and tmux server can't end up spinning on an orphan peer.
      try { ptyProc.kill('SIGHUP'); } catch { }
      killFallback = setTimeout(() => {
        killFallback = null;
        try { ptyProc.kill('SIGKILL'); } catch { }
      }, 1000);
    });

    // ----- Slash list prewarm (SDK route) -----
    // 进 attached view 时如果 active pane 是 claude, 拉 slash list 推前端。
    // stale-while-revalidate: 过期先返旧, 后台刷, 完成再推第二帧。
    setTimeout(async () => {
      try {
        const panes = await app.tmux.listPanes(session, id);
        const active = panes.find(p => p.active);
        if (active?.cmd !== 'claude') {
          // 显式推空 list 覆盖前端 cache (跨 window 复用 composer 时防止上一份残留)
          try { conn.send(JSON.stringify({ type: 'slash-menu-list', items: [] })); } catch { /* dead */ }
          return;
        }
        const cwd = active.path || process.env.HOME || '/';
        const r = await getSlashList(cwd);
        try {
          conn.send(JSON.stringify({ type: 'slash-menu-list', items: r.immediate }));
        } catch { /* dead */ }
        if (r.revalidating) {
          r.revalidating.then(items => {
            try { conn.send(JSON.stringify({ type: 'slash-menu-list', items })); } catch { }
          }).catch(() => undefined);
        }
      } catch {
        // listPanes 失败 / SDK 失败 → 不推 list, 前端 cache 空, 可接受
      }
    }, PREWARM_DELAY_MS);
  });
}
