import { describe, it, expect } from 'vitest';
import { mergeConfig, validateConfig, DEFAULT_CONFIG } from '../../../src/config.schema.js';

describe('config.notify', () => {
  it('DEFAULT_CONFIG has notify with both channels disabled', () => {
    expect(DEFAULT_CONFIG.notify).toBeDefined();
    expect(DEFAULT_CONFIG.notify.channels.wecom.enabled).toBe(false);
    expect(DEFAULT_CONFIG.notify.channels.lark.enabled).toBe(false);
  });

  it('mergeConfig accepts partial notify', () => {
    const cfg = mergeConfig({
      notify: { channels: { wecom: { enabled: true, webhook_url_env: 'WECOM_WEBHOOK_URL' } } } as any,
    });
    expect(cfg.notify.channels.wecom.enabled).toBe(true);
    expect(cfg.notify.channels.lark.enabled).toBe(false);
  });

  it('validateConfig rejects lark.enabled=true without owner_open_id', () => {
    const cfg = mergeConfig({
      notify: { channels: { lark: { enabled: true, app_id: 'cli_x', app_secret_env: 'X', owner_open_id: '' } } } as any,
    });
    expect(() => validateConfig(cfg)).toThrow(/lark.+owner_open_id/);
  });
});
