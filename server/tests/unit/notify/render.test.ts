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

  it('PermissionRequest (non-Ask) gets Approve/Deny/Open buttons', () => {
    const r = renderNotification(
      { ...base, hook_event_name: 'PermissionRequest', tool_name: 'Bash', message: '', tool_input: undefined },
      { eventId: 'e10', publicUrl: 'https://x' },
    );
    const kinds = r.buttons.map(b => `${b.kind}:${b.value?.action ?? b.url ?? ''}`);
    expect(kinds).toEqual(expect.arrayContaining([
      'callback:approve', 'callback:deny',
    ]));
    expect(r.buttons.some(b => b.kind === 'link')).toBe(true);
  });

  it('AskUserQuestion: each option becomes an answer button', () => {
    const r = renderNotification(
      { ...base, hook_event_name: 'PermissionRequest', tool_name: 'AskUserQuestion',
        message: '', tool_input: { questions: [{ question: 'q?', options: [{ label: 'A' }, { label: 'B' }] }] } },
      { eventId: 'e11', publicUrl: 'https://x' },
    );
    const answer = r.buttons.filter(b => b.value?.action === 'answer');
    expect(answer.length).toBe(2);
    expect(answer[0].value?.option_index).toBe(0);
    expect(answer[1].value?.option_index).toBe(1);
  });

  it('Stop event gets shortcut text buttons (继续/重试/停止)', () => {
    const r = renderNotification(
      { ...base, hook_event_name: 'Stop', tool_name: '', message: '', tool_input: undefined },
      { eventId: 'e12', publicUrl: 'https://x' },
    );
    const texts = r.buttons.filter(b => b.value?.action === 'text').map(b => b.value?.text);
    expect(texts).toEqual(expect.arrayContaining(['继续', '重试']));
  });
});
