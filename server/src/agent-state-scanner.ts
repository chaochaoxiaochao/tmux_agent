import type { FastifyInstance } from 'fastify';
import { upsert, removeMissing, snapshot } from './agent-state-registry.js';

const SCAN_INTERVAL_MS = 5000;

export function startAgentStateScanner(app: FastifyInstance): { stop: () => void } {
  let stopped = false;

  async function scan(): Promise<void> {
    if (stopped) return;
    try {
      const panes = await app.tmux.listAllPanes();
      const currentIds = new Set<string>();
      for (const p of panes) {
        if (p.cmd !== 'claude') continue;
        currentIds.add(p.id);
        const existing = snapshot().find(e => e.paneId === p.id);
        if (!existing) {
          upsert({
            paneId: p.id,
            session: p.session,
            windowId: p.windowId,
            windowIndex: p.windowIndex,
            paneIndex: p.index,
            cwd: p.path,
            state: 'running',
            lastEventAt: Date.now(),
          });
        } else if (existing.cwd !== p.path) {
          upsert({ paneId: p.id, cwd: p.path });
        }
      }
      removeMissing(currentIds);
    } catch {
      // tmux 暂时不通,跳过
    }
  }

  const timer = setInterval(() => void scan(), SCAN_INTERVAL_MS);
  // 启动立即跑一次,不等 5s
  void scan();

  return {
    stop: () => { stopped = true; clearInterval(timer); },
  };
}
