import { describe, it, expect } from 'vitest';
import { VERSION } from '../../src/version.js';

describe('version', () => {
  it('exports a non-empty string', () => {
    expect(typeof VERSION).toBe('string');
    expect(VERSION.length).toBeGreaterThan(0);
  });
});
