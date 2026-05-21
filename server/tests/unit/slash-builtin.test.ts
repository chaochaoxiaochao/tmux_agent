import { describe, it, expect } from 'vitest';
import { BUILTIN_SLASH, mergeBuiltin } from '../../src/slash-builtin';

describe('BUILTIN_SLASH', () => {
  it('contains 8 high-frequency commands', () => {
    expect(BUILTIN_SLASH).toHaveLength(8);
    expect(BUILTIN_SLASH.map(b => b.name).sort()).toEqual(
      ['agents','clear','compact','config','cost','help','model','resume'].sort()
    );
  });
  it('every builtin has a desc', () => {
    for (const b of BUILTIN_SLASH) {
      expect(b.desc).toBeTruthy();
    }
  });
});

describe('mergeBuiltin', () => {
  it('returns all 8 builtins when sdk list is empty', () => {
    const r = mergeBuiltin([]);
    expect(r).toHaveLength(8);
    expect(r.map(i => i.name).sort()).toEqual(BUILTIN_SLASH.map(b => b.name).sort());
  });

  it('keeps SDK items at the front, appends builtin not in SDK', () => {
    const sdk = [{ name: 'brainstorming' }, { name: 'writing-plans' }];
    const r = mergeBuiltin(sdk);
    expect(r).toHaveLength(10);
    expect(r.slice(0, 2)).toEqual(sdk);
    expect(r.slice(2).map(i => i.name).sort()).toEqual(BUILTIN_SLASH.map(b => b.name).sort());
  });

  it('drops builtin when SDK has same-name (SDK precedence)', () => {
    const sdk = [{ name: 'clear', desc: 'user-custom clear' }];
    const r = mergeBuiltin(sdk);
    expect(r).toHaveLength(8);
    expect(r[0]).toEqual({ name: 'clear', desc: 'user-custom clear' });
    expect(r.filter(i => i.name === 'clear')).toHaveLength(1);
  });

  it('does not mutate input array', () => {
    const sdk = [{ name: 'foo' }];
    const before = [...sdk];
    mergeBuiltin(sdk);
    expect(sdk).toEqual(before);
  });
});
