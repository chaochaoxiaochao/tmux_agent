import * as lark from '@larksuiteoapi/node-sdk';
import type { Channel, RichNotification } from './types.js';
import type { NotifyConfig } from '../config.schema.js';
import type { TmuxControl } from '../tmux-control.js';
import { buildLarkCard } from './lark-card.js';
import { handleCardAction } from './lark-router.js';

export class LarkChannel implements Channel {
  readonly kind = 'lark' as const;
  enabled: boolean;
  // protected so Phase 2 subclass (WS + EventDispatcher) can reuse client/cfg.
  protected client?: lark.Client;
  protected wsClient?: any;

  constructor(protected cfg: NotifyConfig['channels']['lark'], protected tmux?: TmuxControl) {
    this.enabled = cfg.enabled;
  }

  async init() {
    const secret = process.env[this.cfg.app_secret_env];
    if (!secret) throw new Error(`env ${this.cfg.app_secret_env} is empty`);

    this.client = new lark.Client({
      appId: this.cfg.app_id,
      appSecret: secret,
      appType: lark.AppType.SelfBuild,
    });

    // 只有提供了 tmux (即 Phase 2 buildServer 注入) 时才启动 WS 接收回调.
    // Phase 1 / 仅发送场景下 tmux=undefined, init 跳过 WS, 节省连接.
    if (this.tmux) {
      const dispatcher = new (lark as any).EventDispatcher({
        loggerLevel: ((lark as any).LoggerLevel && (lark as any).LoggerLevel.debug) || 0,
      });
      dispatcher.register({
        'card.action.trigger': async (ev: any) => {
          console.error('[lark][cb] card.action.trigger', JSON.stringify(ev));
          return handleCardAction(ev, {
            ownerOpenId: this.cfg.owner_open_id,
            tmux: this.tmux!,
          });
        },
      });
      this.wsClient = new (lark as any).WSClient({
        appId: this.cfg.app_id,
        appSecret: secret,
        loggerLevel: ((lark as any).LoggerLevel && (lark as any).LoggerLevel.debug) || 0,
      });
      await this.wsClient.start({ eventDispatcher: dispatcher });
    }
  }

  async send(n: RichNotification) {
    if (!this.client) return;
    const card = buildLarkCard(n);
    try {
      await this.client.im.message.create({
        params: { receive_id_type: 'open_id' },
        data: {
          receive_id: this.cfg.owner_open_id,
          msg_type: 'interactive',
          content: JSON.stringify(card),
        },
      });
    } catch (e: any) {
      const detail = e?.response?.data ? JSON.stringify(e.response.data) : '';
      console.error('[lark] send failed:', (e as Error).message, detail);
    }
  }

  async shutdown() {
    if (this.wsClient) {
      try { await this.wsClient.stop(); }
      catch (e) { console.error('[lark] WS stop failed:', (e as Error).message); }
      this.wsClient = undefined; // make shutdown idempotent
    }
  }
}
