import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as cmd from './tmux-control.cmd.js';
import { sliceSendKeys, sendKeysArgv } from './send-keys.js';

const execFileP = promisify(execFile);

export interface WindowMeta { id: string; index: number; name: string; active: boolean; panes: number }
export interface SessionMeta { name: string; attached: boolean; windowCount: number }
export interface PaneMeta { id: string; index: number; active: boolean; size: string; cmd: string; path: string; inMode: boolean }

export interface TmuxControlOpts {
  socket?: string;
}

export class TmuxControl {
  constructor(private opts: TmuxControlOpts = {}) {}

  private async run(argv: string[]): Promise<{ stdout: string; stderr: string }> {
    const prefix = this.opts.socket ? ['-L', this.opts.socket] : [];
    try {
      const { stdout, stderr } = await execFileP('tmux', [...prefix, ...argv]);
      return { stdout, stderr };
    } catch (e: any) {
      throw new TmuxError(e.code ?? 1, e.stderr?.toString() ?? e.message);
    }
  }

  async listSessions(): Promise<SessionMeta[]> {
    try {
      const { stdout } = await this.run(cmd.listSessions());
      return stdout.trim().split('\n').filter(Boolean).map(cmd.parseSessionLine);
    } catch {
      return [];
    }
  }

  async hasSession(name: string): Promise<boolean> {
    try { await this.run(cmd.hasSession(name)); return true; }
    catch { return false; }
  }

  async listWindows(session: string): Promise<WindowMeta[]> {
    if (!await this.hasSession(session)) return [];
    const { stdout } = await this.run(cmd.listWindows(session));
    return stdout.trim().split('\n').filter(Boolean).map(cmd.parseWindowLine);
  }

  async capturePane(session: string, windowId: string, lines = 8): Promise<string[]> {
    const { stdout } = await this.run(cmd.capturePane(session, windowId, lines));
    return stdout.replace(/\n$/, '').split('\n');
  }

  async newWindow(session: string, name?: string): Promise<WindowMeta> {
    const { stdout } = await this.run(cmd.newWindow(session, name));
    return cmd.parseWindowLine(stdout.trim());
  }

  async splitWindow(session: string, windowId: string, dir: 'h' | 'v'): Promise<void> {
    await this.run(cmd.splitWindow(session, windowId, dir));
  }

  async killWindow(session: string, windowId: string): Promise<void> {
    await this.run(cmd.killWindow(session, windowId));
  }

  async selectWindow(session: string, windowId: string): Promise<void> {
    await this.run(cmd.selectWindow(session, windowId));
  }

  async copyMode(session: string, windowId: string): Promise<void> {
    await this.run(cmd.copyMode(session, windowId));
  }

  async listPanes(session: string, windowId: string): Promise<PaneMeta[]> {
    try {
      const { stdout } = await this.run(cmd.listPanes(session, windowId));
      return stdout.trim().split('\n').filter(Boolean).map(cmd.parsePaneLine);
    } catch { return []; }
  }

  async selectPane(session: string, windowId: string, paneId: string): Promise<void> {
    await this.run(cmd.selectPane(session, windowId, paneId));
  }

  async toggleZoom(session: string, windowId: string, paneId: string): Promise<void> {
    await this.run(cmd.toggleZoom(session, windowId, paneId));
  }

  async isWindowZoomed(session: string, windowId: string): Promise<boolean> {
    try {
      const { stdout } = await this.run(cmd.windowZoomedFlag(session, windowId));
      return stdout.trim() === '1';
    } catch { return false; }
  }

  // Idempotent "make sure window is zoomed on its active pane".
  // - If already zoomed, no-op.
  // - Otherwise toggle zoom on the active pane.
  // Caller doesn't need to know pane id.
  async ensureZoomedOnActive(session: string, windowId: string): Promise<void> {
    if (await this.isWindowZoomed(session, windowId)) return;
    const panes = await this.listPanes(session, windowId);
    if (panes.length <= 1) return;     // single pane = no-op
    const active = panes.find(p => p.active) ?? panes[0];
    await this.run(cmd.toggleZoom(session, windowId, active.id));
  }

  async sendKey(session: string, windowId: string, key: string): Promise<void> {
    await this.run(['send-keys', '-t', `${session}:${windowId}`, key]);
  }

  async sendKeys(session: string, windowId: string, text: string): Promise<void> {
    const segs = sliceSendKeys(text);
    for (const seg of segs) {
      const argv = sendKeysArgv(session, windowId, seg);
      await this.run(argv);
    }
  }

  async paneCwd(session: string, windowId: string): Promise<string | null> {
    try {
      const { stdout } = await this.run(cmd.displayPaneCwd(session, windowId));
      return stdout.trim() || null;
    } catch { return null; }
  }

  async newSession(name: string): Promise<void> {
    await this.run(cmd.newSession(name));
  }
}

export class TmuxError extends Error {
  constructor(public code: number, public stderr: string) {
    super(stderr.trim().split('\n')[0] || 'tmux error');
  }
}
