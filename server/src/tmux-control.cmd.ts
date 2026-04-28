const WINDOW_FMT = '#{window_id}|#{window_index}|#{window_name}|#{window_active}|#{window_panes}';
const SESSION_FMT = '#{session_name}|#{session_attached}|#{session_windows}';

export function listSessions(): string[] {
  return ['list-sessions', '-F', SESSION_FMT];
}

export function listWindows(session: string): string[] {
  return ['list-windows', '-t', session, '-F', WINDOW_FMT];
}

export function capturePane(session: string, windowId: string, lines: number): string[] {
  return ['capture-pane', '-p', '-t', `${session}:${windowId}`, '-S', `-${lines}`];
}

export function newWindow(session: string, name?: string): string[] {
  const argv = ['new-window', '-t', session, '-P', '-F', WINDOW_FMT];
  if (name) argv.push('-n', name);
  return argv;
}

export function splitWindow(session: string, windowId: string, dir: 'h' | 'v'): string[] {
  return ['split-window', '-t', `${session}:${windowId}`, `-${dir}`];
}

export function killWindow(session: string, windowId: string): string[] {
  return ['kill-window', '-t', `${session}:${windowId}`];
}

export function selectWindow(session: string, windowId: string): string[] {
  return ['select-window', '-t', `${session}:${windowId}`];
}

export function hasSession(session: string): string[] {
  return ['has-session', '-t', session];
}

export function displayPaneCwd(session: string, windowId: string): string[] {
  return ['display-message', '-p', '-t', `${session}:${windowId}`, '#{pane_current_path}'];
}

export function parseWindowLine(line: string) {
  const [id, index, name, active, panes] = line.split('|');
  return {
    id, name,
    index: Number(index),
    active: active === '1',
    panes: Number(panes),
  };
}

export function parseSessionLine(line: string) {
  const [name, attached, windows] = line.split('|');
  return { name, attached: attached === '1', windowCount: Number(windows) };
}

export function newSession(name: string): string[] {
  return ['new-session', '-d', '-s', name];
}
