import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startTmux, TmuxFixture } from './tmux-server.fixture.js';
import { TmuxControl } from '../../src/tmux-control.js';

let fx: TmuxFixture;
let ctl: TmuxControl;

beforeEach(() => {
  fx = startTmux();
  ctl = new TmuxControl({ socket: fx.socket, session: fx.session });
});
afterEach(() => fx.cleanup());

describe('TmuxControl (real tmux)', () => {
  it('listWindows returns the initial window', async () => {
    const ws = await ctl.listWindows();
    expect(ws.length).toBe(1);
    expect(ws[0].active).toBe(true);
    expect(ws[0].panes).toBe(1);
  });

  it('hasSession returns true for existing, false for missing', async () => {
    expect(await ctl.hasSession('test')).toBe(true);
    expect(await ctl.hasSession('does-not-exist')).toBe(false);
  });

  it('newWindow + listWindows reflects new entry', async () => {
    const w = await ctl.newWindow('foo');
    expect(w.name).toBe('foo');
    const ws = await ctl.listWindows();
    expect(ws.length).toBe(2);
    expect(ws.some(x => x.name === 'foo')).toBe(true);
  });

  it('splitWindow doubles pane count', async () => {
    const before = (await ctl.listWindows())[0];
    await ctl.splitWindow(before.id, 'h');
    const after = (await ctl.listWindows()).find(w => w.id === before.id)!;
    expect(after.panes).toBe(2);
  });

  it('killWindow removes the window', async () => {
    const created = await ctl.newWindow('victim');
    await ctl.killWindow(created.id);
    const ws = await ctl.listWindows();
    expect(ws.some(x => x.id === created.id)).toBe(false);
  });

  it('sendKeys + capturePane sees the input', async () => {
    const w = (await ctl.listWindows())[0];
    await ctl.sendKeys(w.id, 'echo HELLO_FROM_TEST\n');
    // give the shell a moment
    await new Promise(r => setTimeout(r, 500));
    const out = await ctl.capturePane(w.id, 30);
    expect(out.join('\n')).toContain('HELLO_FROM_TEST');
  });
});
