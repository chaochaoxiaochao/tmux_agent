import { describe, it, expect } from 'vitest';
import { filterAndRank } from '../../src/completion.js';

describe('filterAndRank', () => {
  it('substring match', () => {
    const files = [
      { path: 'src/auth/mod.rs', mtime: 100 },
      { path: 'src/util.rs', mtime: 200 },
    ];
    expect(filterAndRank(files, 'aut').map(f => f.path))
      .toEqual(['src/auth/mod.rs']);
  });

  it('sort by mtime desc', () => {
    const files = [
      { path: 'a/x.ts', mtime: 100 },
      { path: 'b/x.ts', mtime: 200 },
    ];
    expect(filterAndRank(files, 'x').map(f => f.path))
      .toEqual(['b/x.ts', 'a/x.ts']);
  });

  it('limit 50', () => {
    const files = Array.from({ length: 100 }, (_, i) => ({ path: `f${i}.ts`, mtime: i }));
    expect(filterAndRank(files, 'f')).toHaveLength(50);
  });

  it('empty query returns all (capped)', () => {
    const files = [{ path: 'a.ts', mtime: 1 }];
    expect(filterAndRank(files, '').map(f => f.path)).toEqual(['a.ts']);
  });
});
