import { fetchSlashList } from './slash-sdk.js';
import { mergeBuiltin } from './slash-builtin.js';
import type { SlashMenuItem } from './slash-types.js';

interface CacheEntry { items: SlashMenuItem[]; fetchedAt: number }

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<SlashMenuItem[]>>();
const TTL_MS = 10 * 60 * 1000;  // 10 minutes

export interface GetSlashResult {
  /** Items available immediately (may be stale). Always non-undefined. */
  immediate: SlashMenuItem[];
  /** If non-null, a background revalidate is in flight; await it to get a fresh list. */
  revalidating: Promise<SlashMenuItem[]> | null;
}

/**
 * Get slash list for the given cwd.
 *
 * - Fresh cache hit: returns immediate, no revalidate.
 * - Stale cache hit: returns immediate (stale), kicks off background revalidate.
 * - No cache (or force=true): awaits SDK, returns fresh immediate.
 *
 * Concurrent calls for the same cwd dedup via inFlight Map.
 */
export async function getSlashList(cwd: string, force = false): Promise<GetSlashResult> {
  const now = Date.now();
  const entry = cache.get(cwd);
  const isFresh = entry && (now - entry.fetchedAt) < TTL_MS;

  if (entry && isFresh && !force) {
    return { immediate: entry.items, revalidating: null };
  }
  if (entry && !force) {
    // Stale-while-revalidate: serve old, refresh in background.
    return { immediate: entry.items, revalidating: revalidate(cwd) };
  }
  // No cache or forced: await SDK before returning.
  const items = await revalidate(cwd);
  return { immediate: items, revalidating: null };
}

function revalidate(cwd: string): Promise<SlashMenuItem[]> {
  const existing = inFlight.get(cwd);
  if (existing) return existing;
  const p = fetchAndStore(cwd).finally(() => inFlight.delete(cwd));
  inFlight.set(cwd, p);
  return p;
}

async function fetchAndStore(cwd: string): Promise<SlashMenuItem[]> {
  const sdkItems = await fetchSlashList(cwd);
  const merged = mergeBuiltin(sdkItems);
  cache.set(cwd, { items: merged, fetchedAt: Date.now() });
  return merged;
}

/** Test helper: clear cache + inFlight. Not exported in prod use. */
export function __resetForTests(): void {
  cache.clear();
  inFlight.clear();
}
