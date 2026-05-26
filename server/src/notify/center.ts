import { randomUUID } from 'node:crypto';
import type { Channel, NotifyEvent } from './types.js';
import { renderNotification } from './render.js';
import { pendingEvents } from './pending-events.js';

export interface CenterOpts { publicUrl?: string }

export class NotificationCenter {
  constructor(private channels: Channel[], private opts: CenterOpts = {}) {}

  async init() {
    for (const c of this.channels) {
      try { await c.init(); }
      catch (e) {
        console.error(`[notify] channel ${c.kind} init failed:`, (e as Error).message);
        c.enabled = false;
      }
    }
  }

  async dispatch(ev: NotifyEvent) {
    const eventId = randomUUID();
    pendingEvents.set(eventId, {
      paneId: ev.paneId,
      options: ((ev.tool_input as any)?.questions?.[0]?.options ?? []).map((o: any) => o.label ?? String(o)),
    });
    const n = renderNotification(ev, { eventId, publicUrl: this.opts.publicUrl });
    await Promise.allSettled(
      this.channels.filter(c => c.enabled).map(c => c.send(n)),
    );
  }

  async shutdown() {
    await Promise.allSettled(this.channels.map(c => c.shutdown()));
  }
}
