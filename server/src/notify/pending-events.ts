export interface PendingEntry {
  paneId: string;
  options?: string[];          // 给 AskUserQuestion
  expiresAt: number;
  fired?: boolean;
}

export interface PendingEventsOpts { ttlMs?: number }

export class PendingEvents {
  private map = new Map<string, PendingEntry>();
  private ttlMs: number;

  constructor(opts: PendingEventsOpts = {}) {
    this.ttlMs = opts.ttlMs ?? 5 * 60 * 1000;
  }

  set(eventId: string, partial: Omit<PendingEntry, 'expiresAt'>) {
    this.map.set(eventId, { ...partial, expiresAt: Date.now() + this.ttlMs });
  }

  get(eventId: string): PendingEntry | undefined {
    const e = this.map.get(eventId);
    if (!e) return undefined;
    if (Date.now() > e.expiresAt) { this.map.delete(eventId); return undefined; }
    return e;
  }

  markFired(eventId: string): void {
    const e = this.get(eventId);
    if (e) e.fired = true;
  }
}

export const pendingEvents = new PendingEvents();
