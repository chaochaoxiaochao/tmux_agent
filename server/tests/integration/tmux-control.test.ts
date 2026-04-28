import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { startTmux, TmuxFixture } from './tmux-server.fixture.js';
import { TmuxControl } from '../../src/tmux-control.js';

let fx: TmuxFixture;
let ctl: TmuxControl;
const S = 'test';

beforeEach(() => {
  fx = startTmux();
  ctl = new TmuxControl({ socket: fx.socket });
});
afterEach(() => fx.cleanup());

describe('TmuxControl (real tmux)', () => {
  it('listWindows returns the initial window', async () => {
    const ws = await ctl.listWindows(S);
    expect(ws.length).toBe(1);
    expect(ws[0].active).toBe(true);
    expect(ws[0].panes).toBe(1);
  });

  it('listSessions returns the test session', async () => {
    const sessions = await ctl.listSessions();
    expect(sessions.some(s => s.name === S)).toBe(true);
  });

  it('hasSession returns true for existing, false for missing', async () => {
    expect(await ctl.hasSession(S)).toBe(true);
    expect(await ctl.hasSession('does-not-exist')).toBe(false);
  });

  it('newWindow + listWindows reflects new entry', async () => {
    const w = await ctl.newWindow(S, 'foo');
    expect(w.name).toBe('foo');
    const ws = await ctl.listWindows(S);
    expect(ws.length).toBe(2);
    expect(ws.some(x => x.name === 'foo')).toBe(true);
  });

  it('splitWindow doubles pane count', async () => {
    const before = (await ctl.listWindows(S))[0];
    await ctl.splitWindow(S, before.id, 'h');
    const after = (await ctl.listWindows(S)).find(w => w.id === before.id)!;
    expect(after.panes).toBe(2);
  });

  it('killWindow removes the window', async () => {
    const created = await ctl.newWindow(S, 'victim');
    await ctl.killWindow(S, created.id);
    const ws = await ctl.listWindows(S);
    expect(ws.some(x => x.id === created.id)).toBe(false);
  });

  it('sendKeys + capturePane sees the input', async () => {
    const w = (await ctl.listWindows(S))[0];
    await ctl.sendKeys(S, w.id, 'echo HELLO_FROM_TEST\n');
    await new Promise(r => setTimeout(r, 500));
    const out = await ctl.capturePane(S, w.id, 30);
    expect(out.join('\n')).toContain('HELLO_FROM_TEST');
  });

  it('listWindows on missing session returns []', async () => {
    expect(await ctl.listWindows('does-not-exist')).toEqual([]);
  });
});
