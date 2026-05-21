export interface SlashMenuItem { name: string; desc?: string }
export type SlashParseResult =
  | { state: 'idle' }
  | { state: 'menu'; items: SlashMenuItem[]; active: number };

// 移除 ANSI CSI 序列(\x1b[ ... 末字母),用于 box-drawing / 文本检测。
const ANSI_CSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_CSI, '');
}

// 高亮 SGR:任意包含 7m 的 CSI 序列。
const HIGHLIGHT_SGR = /\x1b\[[0-9;]*7[;0-9]*m/;

export function parseSlashMenu(buf: string): SlashParseResult {
  const rawLines = buf.split('\n');

  let topIdx = -1, bottomIdx = -1;
  for (let i = 0; i < rawLines.length; i++) {
    const plain = stripAnsi(rawLines[i]);
    if (topIdx < 0 && plain.includes('╭')) topIdx = i;
    else if (topIdx >= 0 && plain.includes('╰')) { bottomIdx = i; break; }
  }
  if (topIdx < 0 || bottomIdx < 0 || bottomIdx <= topIdx) {
    return { state: 'idle' };
  }

  const items: SlashMenuItem[] = [];
  let active = 0;
  let sawHighlight = false;
  for (let i = topIdx + 1; i < bottomIdx; i++) {
    const raw = rawLines[i];
    const plain = stripAnsi(raw);
    const inner = plain.replace(/^\s*│?/, '').replace(/│?\s*$/, '').trim();
    if (!inner.startsWith('/')) continue;
    const isHighlight = HIGHLIGHT_SGR.test(raw);
    const body = inner.slice(1);
    const m = body.match(/^(\S+)(?:\s+(.*))?$/);
    if (!m) continue;
    const item: SlashMenuItem = { name: m[1] };
    if (m[2] && m[2].trim()) item.desc = m[2].trim();
    items.push(item);
    if (isHighlight && !sawHighlight) {
      active = items.length - 1;
      sawHighlight = true;
    }
  }

  if (items.length === 0) return { state: 'idle' };
  return { state: 'menu', items, active };
}
