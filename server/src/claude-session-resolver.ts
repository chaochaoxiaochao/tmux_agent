import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'sessions');

export interface ClaudeSessionInfo {
  pid: number;
  sessionId: string;
  name?: string;
  status: string;  // 'busy' | 'idle' | other
  cwd: string;
}

// 给定 tmux pane_pid (shell pid), 找到该 pane 下跑的 claude 进程 pid.
// pane_pid 自己就是 claude (pane 直起 claude, 无 shell 包裹), 或者 claude 是其子.
async function findClaudePid(panePid: number): Promise<number | null> {
  // 1) pane_pid 自己是 claude?
  try {
    const { stdout } = await execFileP('ps', ['-p', String(panePid), '-o', 'comm='], { timeout: 1000 });
    if (stdout.trim() === 'claude') return panePid;
  } catch { /* ps failed */ }

  // 2) 找 pane_pid 的子进程里叫 claude 的
  try {
    const { stdout } = await execFileP('pgrep', ['-P', String(panePid), '-x', 'claude'], { timeout: 1000 });
    const lines = stdout.trim().split('\n').filter(Boolean);
    if (lines.length > 0) return Number(lines[0]);
  } catch { /* pgrep returns 1 when no match */ }

  return null;
}

export async function resolveClaudeSession(panePid: number): Promise<ClaudeSessionInfo | null> {
  const claudePid = await findClaudePid(panePid);
  if (claudePid === null) return null;

  const file = path.join(SESSIONS_DIR, `${claudePid}.json`);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const j = JSON.parse(raw);
    return {
      pid: claudePid,
      sessionId: j.sessionId ?? '',
      name: j.name ?? undefined,
      status: j.status ?? 'idle',
      cwd: j.cwd ?? '',
    };
  } catch {
    return null;
  }
}
