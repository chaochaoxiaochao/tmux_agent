import { broadcast } from './wall-channel.js';

// running   = scanner saw status:busy. Claude in flight.
// request   = hook PermissionRequest / AskUserQuestion. Waiting for user.
// done      = hook Stop. Just completed a turn (decays to idle after 10min).
// idle      = scanner saw status:idle. Waiting at prompt.
export type AgentState = 'running' | 'request' | 'done' | 'idle';

export interface AgentEntry {
  paneId: string;
  session: string;
  windowId: string;
  windowIndex: number;
  windowName?: string;
  paneIndex: number;
  claudeSessionId?: string;
  claudeSessionName?: string;
  cwd: string;
  state: AgentState;
  lastEventAt: number;
  lastMessage?: string;
}

export interface AgentStateFrame {
  type: 'agent-state';
  agents: AgentEntry[];
}

const entries = new Map<string, AgentEntry>();

export function snapshot(): AgentEntry[] {
  return [...entries.values()];
}

export function upsert(partial: Partial<AgentEntry> & { paneId: string }): void {
  const existing = entries.get(partial.paneId);
  const merged: AgentEntry = {
    paneId: partial.paneId,
    session: partial.session ?? existing?.session ?? '',
    windowId: partial.windowId ?? existing?.windowId ?? '',
    windowIndex: partial.windowIndex ?? existing?.windowIndex ?? 0,
    windowName: partial.windowName ?? existing?.windowName,
    paneIndex: partial.paneIndex ?? existing?.paneIndex ?? 0,
    claudeSessionId: partial.claudeSessionId ?? existing?.claudeSessionId,
    claudeSessionName: partial.claudeSessionName ?? existing?.claudeSessionName,
    cwd: partial.cwd ?? existing?.cwd ?? '',
    state: partial.state ?? existing?.state ?? 'running',
    lastEventAt: partial.lastEventAt ?? existing?.lastEventAt ?? Date.now(),
    lastMessage: partial.lastMessage ?? existing?.lastMessage,
  };
  const changed = !existing || !sameEntry(existing, merged);
  entries.set(partial.paneId, merged);
  if (changed) publish();
}

function sameEntry(a: AgentEntry, b: AgentEntry): boolean {
  return a.paneId === b.paneId
    && a.session === b.session
    && a.windowId === b.windowId
    && a.windowIndex === b.windowIndex
    && a.windowName === b.windowName
    && a.paneIndex === b.paneIndex
    && a.claudeSessionId === b.claudeSessionId
    && a.claudeSessionName === b.claudeSessionName
    && a.cwd === b.cwd
    && a.state === b.state
    && a.lastMessage === b.lastMessage;
  // Note: lastEventAt intentionally excluded — it's metadata, not content.
}

export function removeMissing(currentPaneIds: Set<string>): void {
  let changed = false;
  for (const id of entries.keys()) {
    if (!currentPaneIds.has(id)) { entries.delete(id); changed = true; }
  }
  if (changed) publish();
}

function publish(): void {
  const frame: AgentStateFrame = { type: 'agent-state', agents: snapshot() };
  broadcast(frame);
}
