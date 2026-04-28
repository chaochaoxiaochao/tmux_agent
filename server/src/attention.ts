// Attention map: tracks which (session, windowId) panes have a pending
// notification from external hooks (Claude Code's Notification / Stop).
// The wall snapshot annotates each window with its current attention so the
// frontend can pulse it. Visiting AttachedView clears it.

export type AttentionKind = 'input-needed' | 'done';
export interface AttentionEntry { kind: AttentionKind; ts: number }

const TTL_MS = 10 * 60 * 1000;   // auto-expire after 10 min if no one acks

const map = new Map<string, AttentionEntry>();

function key(session: string, windowId: string) { return `${session}|${windowId}`; }

export function setAttention(session: string, windowId: string, kind: AttentionKind) {
  map.set(key(session, windowId), { kind, ts: Date.now() });
}

export function clearAttention(session: string, windowId: string) {
  map.delete(key(session, windowId));
}

export function getAttention(session: string, windowId: string): AttentionEntry | undefined {
  const e = map.get(key(session, windowId));
  if (!e) return undefined;
  if (Date.now() - e.ts > TTL_MS) {
    map.delete(key(session, windowId));
    return undefined;
  }
  return e;
}

export function clearAll() { map.clear(); }
