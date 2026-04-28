export interface Config {
  server: { host: string; port: number };
  tmux: { session: string; cwdFallback: string };
  ui: { accent: 'green' | 'blue' | 'amber'; density: 'comfortable' | 'compact' };
  buttons: Button[];
  commands: Command[];
  statusRules: StatusRule[];
  log: { level: 'debug' | 'info' | 'warn' | 'error'; file: string };
}

export interface Button { id: string; label: string; payload: string }
export interface Command { name: string; hint: string; payload: string }
export interface StatusRule { match: string; status: 'ok' | 'warn' | 'err' }

export const DEFAULT_CONFIG: Config = {
  server: { host: '0.0.0.0', port: 7681 },
  tmux: { session: 'claude', cwdFallback: '~' },
  ui: { accent: 'green', density: 'comfortable' },
  buttons: [
    { id: 'btn-yes', label: 'Yes', payload: 'y\n' },
    { id: 'btn-no', label: 'No', payload: 'n\n' },
    { id: 'btn-yes-all', label: 'Yes·all', payload: '2\n' },
    { id: 'btn-esc', label: 'Esc', payload: '\u001b' },
  ],
  commands: [
    { name: 'commit', hint: 'git commit -m', payload: 'git commit -m "' },
    { name: 'clear', hint: 'clear screen', payload: 'clear\n' },
  ],
  statusRules: [
    { match: '\\[y/N\\]|Apply edit\\?|Continue\\?', status: 'warn' },
    { match: 'Error:|panic:|FATAL', status: 'err' },
    { match: '✓|passed|finished', status: 'ok' },
  ],
  log: { level: 'info', file: '~/.local/share/tmux-agent/server.log' },
};

export function mergeConfig(partial: Partial<Config>): Config {
  return {
    server: { ...DEFAULT_CONFIG.server, ...(partial.server ?? {}) },
    tmux: { ...DEFAULT_CONFIG.tmux, ...(partial.tmux ?? {}) },
    ui: { ...DEFAULT_CONFIG.ui, ...(partial.ui ?? {}) },
    buttons: partial.buttons ?? DEFAULT_CONFIG.buttons,
    commands: partial.commands ?? DEFAULT_CONFIG.commands,
    statusRules: partial.statusRules ?? DEFAULT_CONFIG.statusRules,
    log: { ...DEFAULT_CONFIG.log, ...(partial.log ?? {}) },
  };
}

export function validateConfig(cfg: Config): void {
  if (!['green', 'blue', 'amber'].includes(cfg.ui.accent)) {
    throw new Error(`invalid ui.accent: ${cfg.ui.accent}`);
  }
  if (!['comfortable', 'compact'].includes(cfg.ui.density)) {
    throw new Error(`invalid ui.density: ${cfg.ui.density}`);
  }
  for (const r of cfg.statusRules) {
    try { new RegExp(r.match); }
    catch (e) { throw new Error(`invalid statusRule regex: ${r.match}`); }
  }
  for (const b of cfg.buttons) {
    if (Buffer.byteLength(b.payload, 'utf8') > 4096) {
      throw new Error(`button ${b.id} payload exceeds 4 KB`);
    }
  }
}
