import { execFileSync } from 'node:child_process';

export interface TmuxFixture {
  socket: string;
  session: string;
  exec: (...argv: string[]) => string;
  cleanup: () => void;
}

export function startTmux(): TmuxFixture {
  const socket = `tmux-agent-test-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const session = 'test';
  const exec = (...argv: string[]): string => {
    return execFileSync('tmux', ['-L', socket, ...argv], { encoding: 'utf8' });
  };
  exec('new-session', '-d', '-s', session, '-x', '120', '-y', '30');
  return {
    socket, session, exec,
    cleanup: () => {
      try { execFileSync('tmux', ['-L', socket, 'kill-server'], { encoding: 'utf8' }); }
      catch { /* already dead */ }
    },
  };
}
