import type { PaneMetaPusher } from './pane-meta-pusher.js';

const pushers = new Map<string, Set<PaneMetaPusher>>();

function key(session: string, windowId: string): string {
  return `${session}|${windowId}`;
}

export function register(session: string, windowId: string, p: PaneMetaPusher): void {
  const k = key(session, windowId);
  let set = pushers.get(k);
  if (!set) { set = new Set(); pushers.set(k, set); }
  set.add(p);
}

export function unregister(session: string, windowId: string, p: PaneMetaPusher): void {
  const k = key(session, windowId);
  const set = pushers.get(k);
  if (!set) return;
  set.delete(p);
  if (set.size === 0) pushers.delete(k);
}

export function pushNow(session: string, windowId: string, reason: string): void {
  const set = pushers.get(key(session, windowId));
  if (!set) return;
  for (const p of set) void p.pushNow(reason);
}
