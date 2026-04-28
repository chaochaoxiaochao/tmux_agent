import { describe, it, expect } from 'vitest';
import { sliceSendKeys, sendKeysArgv } from '../../src/send-keys.js';

describe('sliceSendKeys', () => {
  it('plain text → single literal segment', () => {
    expect(sliceSendKeys('hello'))
      .toEqual([{ kind: 'literal', text: 'hello' }]);
  });

  it('text + newline → literal + Enter', () => {
    expect(sliceSendKeys('y\n'))
      .toEqual([
        { kind: 'literal', text: 'y' },
        { kind: 'key', key: 'Enter' },
      ]);
  });

  it('only newline → just Enter', () => {
    expect(sliceSendKeys('\n'))
      .toEqual([{ kind: 'key', key: 'Enter' }]);
  });

  it('escape char → Escape key', () => {
    expect(sliceSendKeys('\x1b'))
      .toEqual([{ kind: 'key', key: 'Escape' }]);
  });

  it('tab → Tab key', () => {
    expect(sliceSendKeys('\t'))
      .toEqual([{ kind: 'key', key: 'Tab' }]);
  });

  it('mixed: text\\ttext\\n', () => {
    expect(sliceSendKeys('a\tb\n'))
      .toEqual([
        { kind: 'literal', text: 'a' },
        { kind: 'key', key: 'Tab' },
        { kind: 'literal', text: 'b' },
        { kind: 'key', key: 'Enter' },
      ]);
  });

  it('empty input → empty list', () => {
    expect(sliceSendKeys('')).toEqual([]);
  });
});

describe('sendKeysArgv', () => {
  it('builds argv per segment', () => {
    const segs = sliceSendKeys('y\n');
    const argvs = segs.map(s => sendKeysArgv('main', '@7', s));
    expect(argvs).toEqual([
      ['send-keys', '-t', 'main:@7', '-l', 'y'],
      ['send-keys', '-t', 'main:@7', 'Enter'],
    ]);
  });
});
