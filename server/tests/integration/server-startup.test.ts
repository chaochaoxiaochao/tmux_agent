import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadConfigForMain } from '../../src/main.js';

describe('main config loading', () => {
  it('writes default config when missing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmux-agent-main-'));
    const p = path.join(dir, 'config.yaml');
    const cfg = loadConfigForMain(p);
    expect(cfg.server.host).toBe('0.0.0.0');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('throws on bad regex in statusRules', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmux-agent-main-'));
    const p = path.join(dir, 'config.yaml');
    fs.writeFileSync(p, 'statusRules:\n  - match: "[bad"\n    status: warn\n');
    expect(() => loadConfigForMain(p)).toThrow(/regex/i);
  });
});
