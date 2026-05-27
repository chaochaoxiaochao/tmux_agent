import { describe, it, expect, vi } from 'vitest';
import { TmuxControl } from '../../src/tmux-control.js';

describe('TmuxControl.sendKeysToPane', () => {
  it('passes paneId as -t target (not session:windowId)', async () => {
    const tc = new TmuxControl({});
    const runSpy = vi.spyOn(tc as any, 'run').mockResolvedValue({ stdout: '', stderr: '' });
    await tc.sendKeysToPane('%5', 'hello', true);
    const calls = runSpy.mock.calls.map(c => c[0] as string[]);
    expect(calls[0]).toEqual(['send-keys', '-t', '%5', '-l', 'hello']);
    expect(calls[1]).toEqual(['send-keys', '-t', '%5', 'Enter']);
  });

  it('withEnter=false skips the trailing Enter', async () => {
    const tc = new TmuxControl({});
    const runSpy = vi.spyOn(tc as any, 'run').mockResolvedValue({ stdout: '', stderr: '' });
    await tc.sendKeysToPane('%5', '\x03', false);
    expect(runSpy.mock.calls.length).toBe(1);
  });
});
