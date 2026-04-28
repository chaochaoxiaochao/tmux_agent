import { describe, it, expect } from 'vitest';
import { evaluateStatus } from '../../src/status-rules.js';
import type { StatusRule } from '../../src/config.schema.js';

const RULES: StatusRule[] = [
  { match: '\\[y/N\\]', status: 'warn' },
  { match: 'Error:', status: 'err' },
  { match: '✓', status: 'ok' },
];

describe('evaluateStatus', () => {
  it('matches warn pattern in last lines', () => {
    expect(evaluateStatus(['running...', 'do it? [y/N]'], RULES, 1000)).toBe('warn');
  });

  it('reverse scan: most recent line takes precedence over earlier', () => {
    expect(evaluateStatus(['tests ✓', 'do it? [y/N]'], RULES, 1000)).toBe('warn');
  });

  it('Error: → err', () => {
    expect(evaluateStatus(['Error: bad'], RULES, 1000)).toBe('err');
  });

  it('no match + recent output → running', () => {
    expect(evaluateStatus(['hello'], RULES, 100)).toBe('running');
  });

  it('no match + stale → idle', () => {
    expect(evaluateStatus(['hello'], RULES, 10000)).toBe('idle');
  });

  it('empty preview + stale → idle', () => {
    expect(evaluateStatus([], RULES, 10000)).toBe('idle');
  });
});
