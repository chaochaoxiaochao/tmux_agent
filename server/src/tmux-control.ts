import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as cmd from './tmux-control.cmd.js';
import { sliceSendKeys, sendKeysArgv } from './send-keys.js';

const execFileP = promisify(execFile);

export interface WindowMeta { id: string; index: number; name: string; active: boolean; panes: number }
export interface SessionMeta { name: string; attached: boolean; windowCount: number }

export interface TmuxControlOpts {
  socket?: string;
  session: string;
}

export class TmuxControl {
  constructor(private opts: TmuxControlOpts) {}

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
    const { stdout } = await this.run(cmd.listSessions());
    return stdout.trim().split('\n').filter(Boolean).map(cmd.parseSessionLine);
  }

  async hasSession(name: string): Promise<boolean> {
    try { await this.run(cmd.hasSession(name)); return true; }
    catch { return false; }
  }

  async listWindows(): Promise<WindowMeta[]> {
    const { stdout } = await this.run(cmd.listWindows(this.opts.session));
    return stdout.trim().split('\n').filter(Boolean).map(cmd.parseWindowLine);
  }

  async capturePane(windowId: string, lines = 8): Promise<string[]> {
    const { stdout } = await this.run(cmd.capturePane(this.opts.session, windowId, lines));
    return stdout.replace(/\n$/, '').split('\n');
  }

  async newWindow(name?: string): Promise<WindowMeta> {
    const { stdout } = await this.run(cmd.newWindow(this.opts.session, name));
    return cmd.parseWindowLine(stdout.trim());
  }

  async splitWindow(windowId: string, dir: 'h' | 'v'): Promise<void> {
    await this.run(cmd.splitWindow(this.opts.session, windowId, dir));
  }

  async killWindow(windowId: string): Promise<void> {
    await this.run(cmd.killWindow(this.opts.session, windowId));
  }

  async sendKeys(windowId: string, text: string): Promise<void> {
    const segs = sliceSendKeys(text);
    for (const seg of segs) {
      const argv = sendKeysArgv(this.opts.session, windowId, seg);
      await this.run(argv);
    }
  }

  async paneCwd(windowId: string): Promise<string | null> {
    try {
      const { stdout } = await this.run(cmd.displayPaneCwd(this.opts.session, windowId));
      return stdout.trim() || null;
    } catch { return null; }
  }
}

export class TmuxError extends Error {
  constructor(public code: number, public stderr: string) {
    super(stderr.trim().split('\n')[0] || 'tmux error');
  }
}
