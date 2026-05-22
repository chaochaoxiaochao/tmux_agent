import type { FastifyInstance } from 'fastify';
import { evaluateStatus, WindowStatus } from './status-rules.js';
import { getAttention, AttentionKind } from './attention.js';
import { broadcast, hasSubscribers, onFirstSubscribe, onAllUnsubscribed } from './wall-channel.js';

export interface WallWindow {
  session: string;
  id: string; index: number; name: string; active: boolean; panes: number;
  preview: string[];
  status: WindowStatus;
  lastOutputAgeMs: number;
  attention?: AttentionKind;
}
export interface WallSession {
  name: string;
  attached: boolean;
  windows: WallWindow[];
}
export interface WallSnapshot { ts: number; sessions: WallSession[] }

export function registerWallSnapshots(app: FastifyInstance) {
  let timer: NodeJS.Timeout | null = null;
  const lastSeen = new Map<string, { hash: string; ts: number }>();

  async function tick() {
    const start = Date.now();
    let snap: WallSnapshot;
    try {
      const sessions = await app.tmux.listSessions();
      const out: WallSession[] = [];
      for (const s of sessions) {
        const ws = await app.tmux.listWindows(s.name);
        const windows: WallWindow[] = [];
        for (const w of ws) {
          const key = `${s.name}:${w.id}`;
          let preview: string[] = [];
          try { preview = await app.tmux.capturePane(s.name, w.id, 8); }
          catch {
            windows.push({ session: s.name, ...w, preview: [], status: 'err', lastOutputAgeMs: 0 });
            continue;
          }
          const hash = preview.join('\n');
          const prev = lastSeen.get(key);
          const ts = Date.now();
          if (!prev || prev.hash !== hash) lastSeen.set(key, { hash, ts });
          const lastOutputAgeMs = ts - (lastSeen.get(key)!.ts);
          const status = evaluateStatus(preview, app.cfg.statusRules, lastOutputAgeMs);
          const attention = getAttention(s.name, w.id)?.kind;
          windows.push({ session: s.name, ...w, preview, status, lastOutputAgeMs, attention });
        }
        out.push({ name: s.name, attached: s.attached, windows });
      }
      snap = { ts: Date.now(), sessions: out };
    } catch {
      snap = { ts: Date.now(), sessions: [] };
    }
    broadcast({ type: 'snapshot', payload: snap });
    const elapsed = Date.now() - start;
    const next = elapsed > 1500 ? 2500 : 1000;
    if (hasSubscribers()) timer = setTimeout(tick, next);
    else timer = null;
  }

  onFirstSubscribe(() => {
    if (!timer) timer = setTimeout(tick, 0);
  });
  onAllUnsubscribed(() => {
    if (timer) { clearTimeout(timer); timer = null; }
  });
}
