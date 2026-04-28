import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, mergeConfig, validateConfig } from '../../src/config.schema.js';

describe('config defaults', () => {
  it('DEFAULT_CONFIG matches spec', () => {
    expect(DEFAULT_CONFIG.server.host).toBe('127.0.0.1');
    expect(DEFAULT_CONFIG.server.port).toBe(7681);
    expect(DEFAULT_CONFIG.tmux.session).toBe('claude');
    expect(DEFAULT_CONFIG.ui.accent).toBe('green');
    expect(DEFAULT_CONFIG.buttons.length).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.buttons.find(b => b.id === 'btn-yes')?.payload).toBe('y\n');
    expect(DEFAULT_CONFIG.buttons.find(b => b.id === 'btn-esc')?.payload).toBe('\u001b');
  });
});

describe('mergeConfig', () => {
  it('overlays partial user config on defaults', () => {
    const merged = mergeConfig({ server: { port: 9000 } } as any);
    expect(merged.server.host).toBe('127.0.0.1');
    expect(merged.server.port).toBe(9000);
    expect(merged.tmux.session).toBe('claude');
  });

  it('user-supplied buttons fully replace defaults', () => {
    const merged = mergeConfig({ buttons: [{ id: 'x', label: 'X', payload: 'x' }] } as any);
    expect(merged.buttons).toHaveLength(1);
    expect(merged.buttons[0].id).toBe('x');
  });
});

describe('validateConfig', () => {
  it('rejects invalid statusRules regex', () => {
    expect(() => validateConfig({
      ...DEFAULT_CONFIG,
      statusRules: [{ match: '[unclosed', status: 'warn' }],
    })).toThrow(/regex/i);
  });

  it('rejects invalid accent', () => {
    expect(() => validateConfig({
      ...DEFAULT_CONFIG,
      ui: { ...DEFAULT_CONFIG.ui, accent: 'pink' as any },
    })).toThrow(/accent/i);
  });

  it('rejects invalid density', () => {
    expect(() => validateConfig({
      ...DEFAULT_CONFIG,
      ui: { ...DEFAULT_CONFIG.ui, density: 'luxe' as any },
    })).toThrow(/density/i);
  });

  it('rejects button payload > 4 KB', () => {
    expect(() => validateConfig({
      ...DEFAULT_CONFIG,
      buttons: [{ id: 'huge', label: 'H', payload: 'x'.repeat(4097) }],
    })).toThrow(/4 KB/);
  });

  it('accepts default config', () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });
});

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { loadConfig, saveButtons } from '../../src/config.js';

function tmpFile(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tmux-agent-cfg-'));
  return path.join(dir, name);
}

describe('loadConfig', () => {
  it('writes defaults when file missing', () => {
    const p = tmpFile('config.yaml');
    const cfg = loadConfig(p);
    expect(cfg.server.host).toBe('127.0.0.1');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('reads existing partial yaml and merges with defaults', () => {
    const p = tmpFile('config.yaml');
    fs.writeFileSync(p, 'server:\n  port: 9000\n');
    const cfg = loadConfig(p);
    expect(cfg.server.port).toBe(9000);
    expect(cfg.tmux.session).toBe('claude');
  });

  it('throws on yaml parse error', () => {
    const p = tmpFile('config.yaml');
    fs.writeFileSync(p, 'server:\n  port: : :\n');
    expect(() => loadConfig(p)).toThrow();
  });
});

describe('saveButtons', () => {
  it('rewrites only the buttons section, preserves other keys', () => {
    const p = tmpFile('config.yaml');
    fs.writeFileSync(p, 'server:\n  port: 9000\nbuttons:\n  - id: old\n    label: Old\n    payload: old\n');
    saveButtons(p, [{ id: 'new', label: 'New', payload: 'new\n' }]);
    const text = fs.readFileSync(p, 'utf8');
    expect(text).toContain('port: 9000');
    expect(text).toContain('id: new');
    expect(text).not.toContain('id: old');
  });
});
