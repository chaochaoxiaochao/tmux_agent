import { describe, it, expect } from 'vitest';
import { buildLarkCard } from '../../../src/notify/lark-card.js';
import type { RichNotification } from '../../../src/notify/types.js';

const base: RichNotification = {
  headline: '🔐 Claude Code 等权限批准',
  body: '主人我需要你批准 `Bash` 操作',
  fields: [{ label: 'Session', value: 'main' }, { label: 'Cwd', value: '/tmp' }],
  buttons: [{ text: '🔗 Web', style: 'default', kind: 'link', url: 'https://x' }],
  eventId: 'e1', paneId: '%1', session: 'main', windowId: '@2',
};

describe('buildLarkCard', () => {
  it('produces interactive card with header.title + elements', () => {
    const c = buildLarkCard(base);
    expect(c.header.title.content).toBe(base.headline);
    expect(c.header.title.tag).toBe('plain_text');
    expect(Array.isArray(c.elements)).toBe(true);
  });

  it('link button becomes url-style action button (no callback)', () => {
    const c = buildLarkCard(base);
    const action = c.elements.find((e: any) => e.tag === 'action');
    expect(action.actions[0].url).toBe('https://x');
    expect(action.actions[0].value).toBeUndefined();
  });

  it('callback button gets value with action/paneId/eventId', () => {
    const c = buildLarkCard({
      ...base,
      buttons: [{ text: 'Approve', style: 'primary', kind: 'callback',
        value: { action: 'approve', paneId: '%1', eventId: 'e1' } }],
    });
    const action = c.elements.find((e: any) => e.tag === 'action');
    expect(action.actions[0].value.action).toBe('approve');
    expect(action.actions[0].url).toBeUndefined();
  });
});
