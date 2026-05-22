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
// - scanner 看到 claude 进程 busy 时直接覆盖 done/request:
//     · 父 Agent 派 subagent 触发 Stop hook 后仍在跑 → 不卡死在 "已完成"
//     · 用户批准/拒绝 PermissionRequest 后 claude 继续 busy → 不卡死在 "等输入"
//   .status 字段是 claude 自己秒级更新的 ground truth,比 hook 边界事件更可靠。
// - scanner 看到 idle 时,hook 设的 request/done 仍然保留:
//     · request 不衰减,等下一个 hook 事件改写
//     · done 10min 内保留;超过 10min 由 scanner 状态接管(通常变 idle)
function reconcileState(existingState: AgentState | undefined, existingTs: number | undefined, scannerState: AgentState, now: number): AgentState {
  if (scannerState === 'running') return 'running';
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
