import type { Channel, RichNotification } from './types.js';
import type { NotifyConfig } from '../config.schema.js';

export class WecomChannel implements Channel {
  readonly kind = 'wecom' as const;
  enabled: boolean;
  private webhookUrl = '';

  constructor(private cfg: NotifyConfig['channels']['wecom']) {
    this.enabled = cfg.enabled;
  }

  async init() {
    const url = process.env[this.cfg.webhook_url_env];
    if (!url) throw new Error(`env ${this.cfg.webhook_url_env} is empty`);
    this.webhookUrl = url;
  }

  async send(n: RichNotification) {
    const lines: string[] = [];
    lines.push(`## ${n.headline}`);
    lines.push(n.body);
    for (const f of n.fields) lines.push(`>${f.label}: \`${f.value}\``);
    if (n.deepLink) lines.push(`>[👉 打开 Web](${n.deepLink})`);
    if (n.agentsSnapshot) lines.push(n.agentsSnapshot);
    const content = lines.join('\n');

    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ msgtype: 'markdown', markdown: { content } }),
      });
    } catch (e) {
      console.error('[wecom] send failed:', (e as Error).message);
    }
  }

  async shutdown() {}
}
