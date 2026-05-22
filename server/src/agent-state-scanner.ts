import type { FastifyInstance } from 'fastify';
import { upsert, removeMissing, snapshot, AgentState } from './agent-state-registry.js';
import { resolveClaudeSession } from './claude-session-resolver.js';

const SCAN_INTERVAL_MS = 5000;

// claude session status → AgentState. 'busy' = 正在跑 → running; 'idle' = 闲着 → stop.
// 'request'(等审批/AskUserQuestion)claude 不写在 sessions 文件,由 hook 显式 POST 覆盖。
function mapClaudeStatus(status: string): AgentState {
  return status === 'busy' ? 'running' : 'stop';
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
        // 不覆盖 hook 设的 request 状态:那是"等用户审批/输入",sessions 文件看不出来。
        // existing.state === 'request' 时保留,直到下次 hook POST 改变。
        const newState = existing?.state === 'request' ? 'request'
          : (claudeInfo ? mapClaudeStatus(claudeInfo.status) : 'running');
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
