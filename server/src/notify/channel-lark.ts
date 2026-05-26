import * as lark from '@larksuiteoapi/node-sdk';
import type { Channel, RichNotification } from './types.js';
import type { NotifyConfig } from '../config.schema.js';
import { buildLarkCard } from './lark-card.js';

export class LarkChannel implements Channel {
  readonly kind = 'lark' as const;
  enabled: boolean;
  // protected so Phase 2 subclass (WS + EventDispatcher) can reuse client/cfg.
  protected client?: lark.Client;

  constructor(protected cfg: NotifyConfig['channels']['lark']) {
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
    } catch (e) {
      console.error('[lark] send failed:', (e as Error).message);
    }
  }

  async shutdown() {}
}
