import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PendingEvents } from '../../../src/notify/pending-events.js';

describe('PendingEvents', () => {
  let pe: PendingEvents;
  beforeEach(() => { pe = new PendingEvents({ ttlMs: 1000 }); });

  it('set + get returns same entry', () => {
    pe.set('e1', { paneId: '%1' });
    expect(pe.get('e1')?.paneId).toBe('%1');
  });

  it('expired entries return undefined', () => {
    vi.useFakeTimers();
    pe.set('e2', { paneId: '%2' });
    vi.advanceTimersByTime(1500);
    expect(pe.get('e2')).toBeUndefined();
    vi.useRealTimers();
  });

  it('markFired makes second get see fired=true', () => {
    pe.set('e3', { paneId: '%3' });
    pe.markFired('e3');
    expect(pe.get('e3')?.fired).toBe(true);
  });

  it('markFired on missing eventId is no-op', () => {
    expect(() => pe.markFired('nope')).not.toThrow();
  });
});
