import { pendingEvents } from './pending-events.js';
import type { TmuxControl } from '../tmux-control.js';

export interface LarkRouterCtx {
  ownerOpenId: string;
  tmux: TmuxControl;
}

export interface ReplyCard {
  text: string;
  ts: string;
  ack?: string;
}

export async function handleCardAction(ev: any, ctx: LarkRouterCtx): Promise<ReplyCard | undefined> {
  // SDK normalized payload 是顶层结构 (operator / action 在顶层),
  // 但 webhook 模式 raw 数据有 event 包装. 两层都试一下兼容.
  const sender = ev?.event?.operator?.open_id ?? ev?.operator?.open_id;
  if (sender !== ctx.ownerOpenId) return undefined; // 静默 drop 非 owner

  const value = ev?.event?.action?.value ?? ev?.action?.value ?? {};
  const { action, paneId, eventId } = value;
  if (!action || !paneId || !eventId) return undefined;
  const knownActions = ['approve', 'deny', 'cancel', 'text', 'answer', 'text_input'];
  if (!knownActions.includes(action)) return undefined; // 未知 action 静默丢, 不烧 eventId

  const entry = pendingEvents.get(eventId);
  if (!entry) {
    return { text: '⏰ 这条请求已超时,请打开 web 直接处理。', ts: new Date().toISOString() };
  }
  if (entry.fired) {
    return { text: '✅ 已处理过,无需重复点击。', ts: new Date().toISOString() };
  }
  pendingEvents.markFired(eventId);

  switch (action) {
    case 'approve':
      await ctx.tmux.sendKeysToPane(paneId, 'y', true);
      break;
    case 'deny':
      await ctx.tmux.sendKeysToPane(paneId, 'n', true);
      break;
    case 'cancel':
      await ctx.tmux.sendKeysToPane(paneId, '\x03', false);
      break;
    case 'text': {
      const t = String(value.text ?? '');
      if (t) await ctx.tmux.sendKeysToPane(paneId, t, true);
      break;
    }
    case 'answer': {
      const idx = Number(value.option_index ?? -1);
      const text = entry.options?.[idx];
      if (text) await ctx.tmux.sendKeysToPane(paneId, text, true);
      break;
    }
    case 'text_input': {
      // SDK normalized: form_value 在顶层 action 下; webhook raw: 在 ev.event.action 下.
      const formText = ev?.action?.form_value?.pane_text ?? ev?.event?.action?.form_value?.pane_text;
      const t = String(formText ?? '');
      if (t) await ctx.tmux.sendKeysToPane(paneId, t, true);
      break;
    }
  }

  return {
    text: `✅ 已 ${action} at ${new Date().toLocaleTimeString()}`,
    ts: new Date().toISOString(),
    ack: action,
  };
}
