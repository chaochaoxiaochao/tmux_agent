import type { TmuxControl, PaneMeta } from './tmux-control.js';

const POLL_INTERVAL_MS = 2000;

export class PaneMetaPusher {
  private timer: NodeJS.Timeout | null = null;
  private lastSerialized: string | null = null;
  private disposed = false;
  private pushing = false;
  // Last seen cmd of the active pane. Used to detect non-claude → claude edges
  // so a freshly-started claude inside an already-attached pane triggers a
  // slash list refresh. null = no observation yet (bootstrap).
  private lastActiveCmd: string | null = null;

  constructor(
    private tmux: TmuxControl,
    private session: string,
    private windowId: string,
    private send: (frame: object) => void,
    // Fired when active pane cmd transitions to 'claude'. Receives the active
    // pane's cwd so the caller can fetch and push a fresh slash list.
    private onClaudeAppeared?: (cwd: string) => void,
  ) {}

  start(): void {
    // Route bootstrap through pushNow so it shares the `pushing` mutex with
    // event-triggered pushes — otherwise a REST handler firing pushNow during
    // the bootstrap listPanes await would race two pollAndPush calls.
    void this.pushNow('bootstrap');
  }

  // If `pushing` is true, the in-flight pollAndPush will see the latest tmux
  // state when it next polls — dropping this frame is intentional. The 2s
  // poll interval bounds worst-case staleness.
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

    // Detect non-claude → claude edge on the active pane. Fires once per
    // transition; the lastActiveCmd update below covers both the no-active
    // case (null) and ordinary cmd changes, so we won't re-fire while it
    // stays 'claude'. Bootstrap (lastActiveCmd === null) does NOT fire —
    // pty-bridge's own prewarm covers initial fetch.
    const active = panes.find(p => p.active);
    const activeCmd = active?.cmd ?? null;
    if (
      this.lastActiveCmd !== null &&
      this.lastActiveCmd !== 'claude' &&
      activeCmd === 'claude' &&
      this.onClaudeAppeared
    ) {
      const cwd = active?.path || process.env.HOME || '/';
      try { this.onClaudeAppeared(cwd); } catch { /* caller's problem */ }
    }
    this.lastActiveCmd = activeCmd;

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
