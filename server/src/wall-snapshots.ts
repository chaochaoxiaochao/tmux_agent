import type { FastifyInstance } from 'fastify';
import { evaluateStatus, WindowStatus } from './status-rules.js';

export interface WallWindow {
  id: string; index: number; name: string; active: boolean; panes: number;
  preview: string[];
  status: WindowStatus;
  lastOutputAgeMs: number;
}
export interface WallSnapshot { ts: number; windows: WallWindow[] }

export function registerWallChannel(app: FastifyInstance) {
  const subscribers = new Set<any>();
  let timer: NodeJS.Timeout | null = null;
  const lastSeen = new Map<string, { hash: string; ts: number }>();

  async function tick() {
    const start = Date.now();
    let snap: WallSnapshot;
    try {
      const ws = await app.tmux.listWindows();
      const windows: WallWindow[] = [];
      for (const w of ws) {
        let preview: string[] = [];
        try { preview = await app.tmux.capturePane(w.id, 8); }
        catch {
          windows.push({ ...w, preview: [], status: 'err', lastOutputAgeMs: 0 });
          continue;
        }
        const hash = preview.join('\n');
        const prev = lastSeen.get(w.id);
        const ts = Date.now();
        if (!prev || prev.hash !== hash) lastSeen.set(w.id, { hash, ts });
        const lastOutputAgeMs = ts - (lastSeen.get(w.id)!.ts);
        const status = evaluateStatus(preview, app.cfg.statusRules, lastOutputAgeMs);
        windows.push({ ...w, preview, status, lastOutputAgeMs });
      }
      snap = { ts: Date.now(), windows };
    } catch {
      snap = { ts: Date.now(), windows: [] };
    }
    const payload = JSON.stringify({ type: 'snapshot', payload: snap });
    for (const s of subscribers) { try { s.send(payload); } catch { /* dead */ } }
    const elapsed = Date.now() - start;
    const next = elapsed > 1000 ? 2000 : 1000;
    if (subscribers.size > 0) timer = setTimeout(tick, next);
    else timer = null;
  }

  app.get('/ws/wall', { websocket: true } as any, (conn) => {
    subscribers.add(conn);
    if (!timer) timer = setTimeout(tick, 0);
    conn.on('close', () => {
      subscribers.delete(conn);
      if (subscribers.size === 0 && timer) { clearTimeout(timer); timer = null; }
    });
  });
}
