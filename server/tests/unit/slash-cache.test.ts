import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetchSlashList — pure cache logic, no real SDK
vi.mock('../../src/slash-sdk', () => {
  return {
    fetchSlashList: vi.fn(),
  };
});

import { fetchSlashList } from '../../src/slash-sdk.js';
import { getSlashList, __resetForTests } from '../../src/slash-cache.js';
import { BUILTIN_SLASH } from '../../src/slash-builtin.js';

const mockFetch = vi.mocked(fetchSlashList);

beforeEach(() => {
  __resetForTests();
  mockFetch.mockReset();
});

describe('getSlashList', () => {
  it('on first call awaits SDK and returns merged list', async () => {
    mockFetch.mockResolvedValue([{ name: 'foo' }]);
    const r = await getSlashList('/a');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/a');
    expect(r.revalidating).toBeNull();
    expect(r.immediate.map(i => i.name)).toContain('foo');
    expect(r.immediate.length).toBe(1 + BUILTIN_SLASH.length);  // 1 sdk + 8 builtin
  });

  it('on fresh cache hit returns immediate, no revalidate, no extra SDK call', async () => {
    mockFetch.mockResolvedValue([{ name: 'foo' }]);
    await getSlashList('/a');                  // first: SDK
    const r2 = await getSlashList('/a');       // second: cache hit
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(r2.revalidating).toBeNull();
    expect(r2.immediate.map(i => i.name)).toContain('foo');
  });

  it('on stale cache hit returns immediate (stale) + revalidate promise', async () => {
    mockFetch.mockResolvedValueOnce([{ name: 'old' }]);
    await getSlashList('/a');
    // Fast-forward time past TTL (10 minutes)
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    mockFetch.mockResolvedValueOnce([{ name: 'new' }]);
    const r = await getSlashList('/a');
    expect(r.immediate.map(i => i.name)).toContain('old');     // still stale
    expect(r.revalidating).not.toBeNull();
    const fresh = await r.revalidating!;
    expect(fresh.map(i => i.name)).toContain('new');
    vi.useRealTimers();
  });

  it('force=true bypasses cache, always awaits SDK', async () => {
    mockFetch.mockResolvedValueOnce([{ name: 'old' }]);
    await getSlashList('/a');                  // populate cache
    mockFetch.mockResolvedValueOnce([{ name: 'new' }]);
    const r = await getSlashList('/a', true);  // force
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(r.revalidating).toBeNull();
    expect(r.immediate.map(i => i.name)).toContain('new');
  });

  it('concurrent calls for the same cwd dedup the SDK call (inFlight)', async () => {
    let resolveSDK!: (v: { name: string }[]) => void;
    mockFetch.mockReturnValueOnce(new Promise(res => { resolveSDK = res; }));

    const p1 = getSlashList('/a');
    const p2 = getSlashList('/a');
    // both pending, only 1 SDK call should have been issued
    expect(mockFetch).toHaveBeenCalledTimes(1);
    resolveSDK([{ name: 'foo' }]);
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.immediate.map(i => i.name)).toContain('foo');
    expect(r2.immediate.map(i => i.name)).toContain('foo');
  });

  it('different cwds are independent', async () => {
    mockFetch.mockResolvedValueOnce([{ name: 'a-list' }]);
    mockFetch.mockResolvedValueOnce([{ name: 'b-list' }]);
    const ra = await getSlashList('/a');
    const rb = await getSlashList('/b');
    expect(ra.immediate.map(i => i.name)).toContain('a-list');
    expect(rb.immediate.map(i => i.name)).toContain('b-list');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
