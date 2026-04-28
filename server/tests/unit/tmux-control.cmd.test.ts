import { describe, it, expect } from 'vitest';
import * as cmd from '../../src/tmux-control.cmd.js';

describe('tmux argv builders', () => {
  it('listSessions', () => {
    expect(cmd.listSessions()).toEqual(['list-sessions', '-F', '#{session_name}|#{session_attached}|#{session_windows}']);
  });

  it('listWindows', () => {
    expect(cmd.listWindows('main'))
      .toEqual(['list-windows', '-t', 'main', '-F', '#{window_id}|#{window_index}|#{window_name}|#{window_active}|#{window_panes}']);
  });

  it('capturePane (last 8 lines)', () => {
    expect(cmd.capturePane('main', '@7', 8))
      .toEqual(['capture-pane', '-p', '-t', 'main:@7', '-S', '-8']);
  });

  it('newWindow with name', () => {
    expect(cmd.newWindow('main', 'foo'))
      .toEqual(['new-window', '-t', 'main', '-P', '-F', '#{window_id}|#{window_index}|#{window_name}|#{window_active}|#{window_panes}', '-n', 'foo']);
  });

  it('newWindow without name', () => {
    expect(cmd.newWindow('main'))
      .toEqual(['new-window', '-t', 'main', '-P', '-F', '#{window_id}|#{window_index}|#{window_name}|#{window_active}|#{window_panes}']);
  });

  it('splitWindow horizontal', () => {
    expect(cmd.splitWindow('main', '@7', 'h'))
      .toEqual(['split-window', '-t', 'main:@7', '-h']);
  });

  it('splitWindow vertical', () => {
    expect(cmd.splitWindow('main', '@7', 'v'))
      .toEqual(['split-window', '-t', 'main:@7', '-v']);
  });

  it('killWindow', () => {
    expect(cmd.killWindow('main', '@7'))
      .toEqual(['kill-window', '-t', 'main:@7']);
  });

  it('hasSession', () => {
    expect(cmd.hasSession('main')).toEqual(['has-session', '-t', 'main']);
  });

  it('displayPaneCwd', () => {
    expect(cmd.displayPaneCwd('main', '@7'))
      .toEqual(['display-message', '-p', '-t', 'main:@7', '#{pane_current_path}']);
  });
});
