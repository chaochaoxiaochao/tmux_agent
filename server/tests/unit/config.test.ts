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
