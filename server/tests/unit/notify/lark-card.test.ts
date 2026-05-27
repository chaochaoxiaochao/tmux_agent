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
    expect(Array.isArray(c.body.elements)).toBe(true);
  });

  it('link button becomes url-style button inside column_set (no callback)', () => {
    const c = buildLarkCard(base);
    const colset = c.body.elements.find((e: any) => e.tag === 'column_set');
    const btn = colset.columns[0].elements[0];
    expect(btn.tag).toBe('button');
    expect(btn.url).toBe('https://x');
    expect(btn.value).toBeUndefined();
  });

  it('callback button gets value with action/paneId/eventId', () => {
    const c = buildLarkCard({
      ...base,
      buttons: [{ text: 'Approve', style: 'primary', kind: 'callback',
        value: { action: 'approve', paneId: '%1', eventId: 'e1' } }],
    });
    const colset = c.body.elements.find((e: any) => e.tag === 'column_set');
    const btn = colset.columns[0].elements[0];
    expect(btn.value.action).toBe('approve');
    expect(btn.url).toBeUndefined();
  });

  it('inputSlot=true adds an input element + send-to-pane button', () => {
    const c = buildLarkCard({ ...base, inputSlot: true });
    const input = c.body.elements.find((e: any) => e.tag === 'input');
    expect(input).toBeDefined();
    expect(input.name).toBe('pane_text');
    // 找含 text_input action 的 button (在 column_set 里)
    const allButtons = c.body.elements
      .filter((e: any) => e.tag === 'column_set')
      .flatMap((cs: any) => cs.columns.flatMap((col: any) => col.elements))
      .filter((el: any) => el.tag === 'button');
    const sendBtn = allButtons.find((b: any) => b.value?.action === 'text_input');
    expect(sendBtn).toBeDefined();
    expect(sendBtn.value.paneId).toBe(base.paneId);
  });
});
