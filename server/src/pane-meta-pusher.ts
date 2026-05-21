import type { TmuxControl, PaneMeta } from './tmux-control.js';

const POLL_INTERVAL_MS = 2000;

export class PaneMetaPusher {
  private timer: NodeJS.Timeout | null = null;
  private lastSerialized: string | null = null;
  private disposed = false;
  private pushing = false;

  constructor(
    private tmux: TmuxControl,
    private session: string,
    private windowId: string,
    private send: (frame: object) => void,
  ) {}

  start(): void {
    void this.pollAndPush('bootstrap');
    this.timer = setInterval(() => void this.pollAndPush('poll'), POLL_INTERVAL_MS);
  }

  async pushNow(reason: string): Promise<void> {
    if (this.disposed || this.pushing) return;
    this.pushing = true;
    try {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      await this.pollAndPush(reason);
      if (!this.disposed) {
        this.timer = setInterval(() => void this.pollAndPush('poll'), POLL_INTERVAL_MS);
      }
    } finally {
      this.pushing = false;
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private async pollAndPush(_reason: string): Promise<void> {
    if (this.disposed) return;
    let panes: PaneMeta[];
    try {
      panes = await this.tmux.listPanes(this.session, this.windowId);
    } catch {
      return;
    }
    if (this.disposed) return;
    const frame = {
      type: 'pane-meta' as const,
      session: this.session,
      windowId: this.windowId,
      panes,
    };
    const ser = JSON.stringify(frame);
    if (ser === this.lastSerialized) return;
    this.lastSerialized = ser;
    try { this.send(frame); } catch { /* socket dead; close handler will dispose */ }
  }
}
