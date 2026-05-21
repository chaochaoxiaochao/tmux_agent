import type { FastifyInstance } from 'fastify';
import websocketPlugin from '@fastify/websocket';
import * as pty from 'node-pty';
import { SlashMenuTracker } from './slash-tracker.js';
import type { SlashMenuItem } from './slash-parser.js';

const PROBE_WAIT_MS = 600;   // 等 Claude 渲染菜单的上限
const PROBE_SETTLE_MS = 150; // Backspace 后等 Claude 重画"无菜单"的时间

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
    let probing = false;

    const tracker = new SlashMenuTracker(frame => {
      // probe 期间也不推 onChange 帧给前端(避免 slash-menu 中间帧抖动)
      if (probing) return;
      try { conn.send(JSON.stringify(frame)); } catch { /* dead */ }
    });

    ptyProc.onData(data => {
      if (!probing) {
        try { conn.send(data, { binary: true }); } catch { /* dead */ }
      }
      try { tracker.feed(data); } catch { /* parser fault must not poison binary path */ }
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

    // ----- Probe lifecycle -----

    async function probeSlashMenu(): Promise<SlashMenuItem[]> {
      probing = true;
      try {
        const items = await new Promise<SlashMenuItem[]>(resolve => {
          let done = false;
          const timer = setTimeout(() => {
            if (done) return;
            done = true;
            tracker.cancelOnceMenu();
            resolve([]);
          }, PROBE_WAIT_MS);
          tracker.onceMenu(menuItems => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            resolve(menuItems);
          });
          // 触发 Claude 弹菜单
          try { ptyProc.write('/'); } catch { /* */ }
        });
        // 撤销 /
        try { ptyProc.write('\x7f'); } catch { /* */ }
        // 等 Claude 重画 "无菜单" 状态被 tracker 吃掉
        await new Promise(r => setTimeout(r, PROBE_SETTLE_MS));
        return items;
      } finally {
        probing = false;
        tracker.reset(); // 清掉 probe 期间累积的 buffer, 避免污染后续正常 PTY 流
      }
    }

    // 自动 prewarm:延迟一会儿等 selectWindow 完成 + tmux client attach 稳定。
    setTimeout(async () => {
      try {
        const panes = await app.tmux.listPanes(session, id);
        const active = panes.find(p => p.active);
        if (active?.cmd !== 'claude') return;
        const items = await probeSlashMenu();
        try {
          conn.send(JSON.stringify({ type: 'slash-menu-list', items }));
        } catch { /* dead */ }
      } catch {
        // listPanes / probe 失败 → 不推 list,前端 cache 永远空,可接受
      }
    }, 200);
  });
}
