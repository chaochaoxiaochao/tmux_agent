import type { FastifyInstance } from 'fastify';
import { upsert, removeMissing, snapshot } from './agent-state-registry.js';

const SCAN_INTERVAL_MS = 5000;

export function startAgentStateScanner(app: FastifyInstance): { stop: () => void } {
  let stopped = false;
  let scanning = false;

  async function scan(): Promise<void> {
    if (stopped) return;
    if (scanning) return;
    scanning = true;
    try {
      const panes = await app.tmux.listAllPanes();
      const existingMap = new Map(snapshot().map(e => [e.paneId, e]));
      const currentIds = new Set<string>();
      for (const p of panes) {
        if (p.cmd !== 'claude') continue;
        currentIds.add(p.id);
        const existing = existingMap.get(p.id);
        if (!existing) {
          upsert({
            paneId: p.id,
            session: p.session,
            windowId: p.windowId,
            windowIndex: p.windowIndex,
            windowName: p.windowName,
            paneIndex: p.index,
            cwd: p.path,
            state: 'running',
            lastEventAt: Date.now(),
          });
        } else if (existing.cwd !== p.path || existing.windowName !== p.windowName) {
          upsert({ paneId: p.id, cwd: p.path, windowName: p.windowName });
        }
      }
      removeMissing(currentIds);
    } catch {
      // tmux 暂时不通,跳过
    } finally {
      scanning = false;
    }
  }

  const timer = setInterval(() => void scan(), SCAN_INTERVAL_MS);
  // 启动立即跑一次,不等 5s
  void scan();

  return {
    stop: () => { stopped = true; clearInterval(timer); },
  };
}
