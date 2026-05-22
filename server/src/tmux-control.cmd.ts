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

export function copyMode(session: string, windowId: string): string[] {
  return ['copy-mode', '-t', `${session}:${windowId}`];
}

const PANE_FMT = '#{pane_id}|#{pane_index}|#{pane_active}|#{pane_width}x#{pane_height}|#{pane_current_command}|#{pane_current_path}|#{pane_in_mode}';

export function listPanes(session: string, windowId: string): string[] {
  return ['list-panes', '-t', `${session}:${windowId}`, '-F', PANE_FMT];
}

export function parsePaneLine(line: string) {
  const [id, index, active, size, cmd, path, inMode] = line.split('|');
  return {
    id, cmd: cmd ?? '',
    index: Number(index),
    active: active === '1',
    size: size ?? '',
    path: path ?? '',
    inMode: inMode === '1',
  };
}

export function selectPane(session: string, windowId: string, paneId: string): string[] {
  return ['select-pane', '-t', `${session}:${windowId}.${paneId}`];
}

// Toggle zoom on a pane. tmux's resize-pane -Z is a toggle.
export function toggleZoom(session: string, windowId: string, paneId: string): string[] {
  return ['resize-pane', '-Z', '-t', `${session}:${windowId}.${paneId}`];
}

// Read whether the window is currently in a zoomed state.
// tmux's display-message -p '#{window_zoomed_flag}' returns "1" or "0".
export function windowZoomedFlag(session: string, windowId: string): string[] {
  return ['display-message', '-p', '-t', `${session}:${windowId}`, '#{window_zoomed_flag}'];
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

const ALL_PANES_FMT = '#{session_name}|#{window_id}|#{window_index}|#{window_name}|#{pane_id}|#{pane_index}|#{pane_active}|#{pane_width}x#{pane_height}|#{pane_current_command}|#{pane_current_path}|#{pane_in_mode}';

export function listAllPanes(): string[] {
  return ['list-panes', '-a', '-F', ALL_PANES_FMT];
}

export function parseAllPanesLine(line: string) {
  const [session, windowId, windowIndex, windowName, paneId, paneIndex, active, size, cmd, path, inMode] = line.split('|');
  return {
    session,
    windowId,
    windowIndex: Number(windowIndex),
    windowName: windowName ?? '',
    id: paneId,
    index: Number(paneIndex),
    active: active === '1',
    size: size ?? '',
    cmd: cmd ?? '',
    path: path ?? '',
    inMode: inMode === '1',
  };
}
