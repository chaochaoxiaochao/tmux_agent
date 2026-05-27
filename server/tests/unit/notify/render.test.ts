import { describe, it, expect } from 'vitest';
import { renderNotification } from '../../../src/notify/render.js';
import type { NotifyEvent } from '../../../src/notify/types.js';

const base: Omit<NotifyEvent, 'hook_event_name' | 'tool_name' | 'message' | 'tool_input'> = {
  paneId: '%1', session: 'main', windowId: '@2',
  session_id: 'sid', cwd: '/tmp/foo', background_running: false,
};

describe('renderNotification', () => {
  it('Stop event uses ✅ headline', () => {
    const r = renderNotification(
      { ...base, hook_event_name: 'Stop', tool_name: '', message: '', tool_input: undefined },
      { eventId: 'e1', publicUrl: 'https://x' },
    );
    expect(r.headline).toContain('完成');
    expect(r.headline.startsWith('✅')).toBe(true);
    expect(r.eventId).toBe('e1');
    expect(r.deepLink).toBe('https://x/#/w/main/%402');
  });

  it('PermissionRequest with Bash uses 🔐 headline', () => {
    const r = renderNotification(
      { ...base, hook_event_name: 'PermissionRequest', tool_name: 'Bash',
        message: '', tool_input: undefined },
      { eventId: 'e2', publicUrl: 'https://x' },
    );
    expect(r.headline.startsWith('🔐')).toBe(true);
    expect(r.body).toContain('Bash');
  });

  it('AskUserQuestion uses ❓ headline and exposes options in fields/body', () => {
    const r = renderNotification(
      { ...base, hook_event_name: 'PermissionRequest', tool_name: 'AskUserQuestion',
        message: '', tool_input: { questions: [{ question: 'q?', options: [{ label: 'A' }, { label: 'B' }] }] } },
      { eventId: 'e3', publicUrl: 'https://x' },
    );
    expect(r.headline.startsWith('❓')).toBe(true);
    expect(r.body).toContain('q?');
  });

  // 卡片按钮特性已弃用 (手机渲染兼容差), 所有事件下 r.buttons 都是空数组.
  it('all event kinds produce empty buttons array (notify-only mode)', () => {
    for (const ev of [
      { hook_event_name: 'Stop' as const, tool_name: '' },
      { hook_event_name: 'PermissionRequest' as const, tool_name: 'Bash' },
      { hook_event_name: 'PermissionRequest' as const, tool_name: 'AskUserQuestion',
        tool_input: { questions: [{ question: 'q?', options: [{ label: 'A' }] }] } },
    ]) {
      const r = renderNotification(
        { ...base, message: '', tool_input: undefined, ...ev },
        { eventId: 'e', publicUrl: 'https://x' },
      );
      expect(r.buttons).toEqual([]);
    }
  });
});
