import type { FastifyInstance } from 'fastify';
import { upsert, removeMissing, snapshot, AgentState } from './agent-state-registry.js';
import { resolveClaudeSession } from './claude-session-resolver.js';

const SCAN_INTERVAL_MS = 5000;
const DONE_DECAY_MS = 10 * 60 * 1000;  // 'done' decays to 'idle' after 10 min

// 给定 claude 进程 .status,推 scanner 想写的状态。hook 设的 request/done 在外层另判。
function mapScannerState(status: string): AgentState {
  return status === 'busy' ? 'running' : 'idle';
}

// 综合 hook 状态(existing.state)和 scanner 观察到的真实状态(scannerState),决定最终 state。
// - request 永不衰减,scanner 不覆盖
// - done 10min 内保留;超过 10min 由 scanner 状态接管(通常变 idle)
// - 其他 (running / idle) 直接跟随 scanner
function reconcileState(existingState: AgentState | undefined, existingTs: number | undefined, scannerState: AgentState, now: number): AgentState {
  if (existingState === 'request') return 'request';
  if (existingState === 'done') {
    const age = existingTs ? now - existingTs : Infinity;
    if (age < DONE_DECAY_MS) return 'done';
    // decayed → fall through to scanner state
  }
  return scannerState;
}

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
        const claudeInfo = await resolveClaudeSession(p.panePid);
        const existing = existingMap.get(p.id);
        const scannerState: AgentState = claudeInfo ? mapScannerState(claudeInfo.status) : 'running';
        const newState = reconcileState(existing?.state, existing?.lastEventAt, scannerState, Date.now());
        // 状态发生变化时(包括首次发现)bump lastEventAt;否则保留旧值。
        const bumpTime = !existing || existing.state !== newState;
        upsert({
          paneId: p.id,
          session: p.session,
          windowId: p.windowId,
          windowIndex: p.windowIndex,
          windowName: p.windowName,
          paneIndex: p.index,
          cwd: p.path,
          state: newState,
          claudeSessionId: claudeInfo?.sessionId || undefined,
          claudeSessionName: claudeInfo?.name || undefined,
          ...(bumpTime ? { lastEventAt: Date.now() } : {}),
        });
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
