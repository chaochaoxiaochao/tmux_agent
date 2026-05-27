import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleCardAction, type ReplyCard } from '../../../src/notify/lark-router.js';
import { pendingEvents } from '../../../src/notify/pending-events.js';

const tmuxSpy = { sendKeysToPane: vi.fn().mockResolvedValue(undefined) };

const ctxBase = {
  ownerOpenId: 'ou_owner',
  tmux: tmuxSpy as any,
};

function makeEvent(action: string, extra: any = {}, sender = 'ou_owner') {
  return {
    event: {
      operator: { open_id: sender },
      action: { value: { action, paneId: '%9', eventId: 'e_abc', ...extra } },
    },
  };
}

describe('handleCardAction', () => {
  beforeEach(() => { tmuxSpy.sendKeysToPane.mockClear(); });

  it('non-owner sender is dropped silently', async () => {
    pendingEvents.set('e_abc', { paneId: '%9' });
    const reply = await handleCardAction(makeEvent('approve', {}, 'ou_stranger'), ctxBase);
    expect(tmuxSpy.sendKeysToPane).not.toHaveBeenCalled();
    expect(reply).toBeUndefined();
  });

  it('expired event returns timeout reply card', async () => {
    // 不 set pendingEvents → get 返回 undefined
    const reply = await handleCardAction(makeEvent('approve', { eventId: 'e_nope' }), ctxBase);
    expect(tmuxSpy.sendKeysToPane).not.toHaveBeenCalled();
    expect((reply as ReplyCard).text).toMatch(/超时/);
  });

  it('approve sends "y" + Enter to pane', async () => {
    pendingEvents.set('e_app1', { paneId: '%9' });
    await handleCardAction(makeEvent('approve', { eventId: 'e_app1' }), ctxBase);
    expect(tmuxSpy.sendKeysToPane).toHaveBeenCalledWith('%9', 'y', true);
  });

  it('deny sends "n" + Enter', async () => {
    pendingEvents.set('e_d1', { paneId: '%9' });
    await handleCardAction(makeEvent('deny', { eventId: 'e_d1' }), ctxBase);
    expect(tmuxSpy.sendKeysToPane).toHaveBeenCalledWith('%9', 'n', true);
  });

  it('cancel sends Ctrl-C (\\x03) without Enter', async () => {
    pendingEvents.set('e_c1', { paneId: '%9' });
    await handleCardAction(makeEvent('cancel', { eventId: 'e_c1' }), ctxBase);
    expect(tmuxSpy.sendKeysToPane).toHaveBeenCalledWith('%9', '\x03', false);
  });

  it('text sends payload.text + Enter', async () => {
    pendingEvents.set('e_t1', { paneId: '%9' });
    await handleCardAction(makeEvent('text', { eventId: 'e_t1', text: '继续' }), ctxBase);
    expect(tmuxSpy.sendKeysToPane).toHaveBeenCalledWith('%9', '继续', true);
  });

  it('answer uses pendingEvents.options[idx] as text', async () => {
    pendingEvents.set('e_ans1', { paneId: '%9', options: ['YesA', 'NoB'] });
    await handleCardAction(makeEvent('answer', { eventId: 'e_ans1', option_index: 1 }), ctxBase);
    expect(tmuxSpy.sendKeysToPane).toHaveBeenCalledWith('%9', 'NoB', true);
  });

  it('text_input pulls form_value.pane_text and sends to pane', async () => {
    pendingEvents.set('e_ti', { paneId: '%9' });
    // SDK-normalized shape (Phase 2 fix): operator/action 顶层, form_value 在 action 里
    const ev = {
      operator: { open_id: 'ou_owner' },
      action: {
        value: { action: 'text_input', paneId: '%9', eventId: 'e_ti' },
        form_value: { pane_text: 'hello world' },
      },
    };
    await handleCardAction(ev, ctxBase);
    expect(tmuxSpy.sendKeysToPane).toHaveBeenCalledWith('%9', 'hello world', true);
  });

  it('repeated click on same eventId returns "已处理过"', async () => {
    pendingEvents.set('e_dup', { paneId: '%9' });
    await handleCardAction(makeEvent('approve', { eventId: 'e_dup' }), ctxBase);
    tmuxSpy.sendKeysToPane.mockClear();
    const reply = await handleCardAction(makeEvent('approve', { eventId: 'e_dup' }), ctxBase);
    expect(tmuxSpy.sendKeysToPane).not.toHaveBeenCalled();
    expect((reply as ReplyCard).text).toMatch(/已处理/);
  });
});
