export type Segment =
  | { kind: 'literal'; text: string }
  | { kind: 'key'; key: 'Enter' | 'Tab' | 'Escape' };

const KEY_MAP: Record<string, 'Enter' | 'Tab' | 'Escape'> = {
  '\n': 'Enter',
  '\t': 'Tab',
  '\x1b': 'Escape',
};

export function sliceSendKeys(text: string): Segment[] {
  const out: Segment[] = [];
  let buf = '';
  for (const ch of text) {
    const key = KEY_MAP[ch];
    if (key) {
      if (buf) {
        out.push({ kind: 'literal', text: buf });
        buf = '';
      }
      out.push({ kind: 'key', key });
    } else {
      buf += ch;
    }
  }
  if (buf) out.push({ kind: 'literal', text: buf });
  return out;
}

export function sendKeysArgv(session: string, windowId: string, seg: Segment): string[] {
  const target = `${session}:${windowId}`;
  if (seg.kind === 'literal') return ['send-keys', '-t', target, '-l', seg.text];
  return ['send-keys', '-t', target, seg.key];
}
