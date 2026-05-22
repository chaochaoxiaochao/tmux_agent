// server/src/wall-channel.ts
import type { FastifyInstance } from 'fastify';

type WSConn = { send: (data: string) => void; on: (ev: string, cb: () => void) => void };

const subscribers = new Set<WSConn>();
const onSubscribeCbs = new Set<() => void>();
const onUnsubscribeAllCbs = new Set<() => void>();

export function broadcast(frame: object): void {
  const payload = JSON.stringify(frame);
  for (const s of subscribers) { try { s.send(payload); } catch { /* dead */ } }
}

export function hasSubscribers(): boolean {
  return subscribers.size > 0;
}

export function onFirstSubscribe(cb: () => void): void {
  onSubscribeCbs.add(cb);
}

export function onAllUnsubscribed(cb: () => void): void {
  onUnsubscribeAllCbs.add(cb);
}

export function registerWallWebSocket(app: FastifyInstance): void {
  app.get('/ws/wall', { websocket: true } as any, (conn: WSConn) => {
    const wasEmpty = subscribers.size === 0;
    subscribers.add(conn);
    if (wasEmpty) {
      for (const cb of onSubscribeCbs) { try { cb(); } catch { /* swallow */ } }
    }
    conn.on('close', () => {
      subscribers.delete(conn);
      if (subscribers.size === 0) {
        for (const cb of onUnsubscribeAllCbs) { try { cb(); } catch { /* swallow */ } }
      }
    });
  });
}
