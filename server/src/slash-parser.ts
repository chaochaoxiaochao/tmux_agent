export interface SlashMenuItem { name: string; desc?: string }
export type SlashParseResult =
  | { state: 'idle' }
  | { state: 'menu'; items: SlashMenuItem[]; active: number };

// 移除 ANSI CSI 序列(\x1b[ ... 末字母),用于 box-drawing / 文本检测。
const ANSI_CSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
function stripAnsi(s: string): string {
  return s.replace(ANSI_CSI, '');
}

// 高亮 SGR:7 作为独立参数(reverse video),不与 27/37/47/97 等多位参数误匹配。
const HIGHLIGHT_SGR = /\x1b\[(?:[0-9;]*;)?7(?:;[0-9;]*)?m/;

export function parseSlashMenu(buf: string): SlashParseResult {
  const rawLines = buf.split('\n');

  // 自底向上找最近的 ╰,再向上找最近的 ╭,避免旧菜单残留的 ╭ 锁死扫描。
  let bottomIdx = -1;
  for (let i = rawLines.length - 1; i >= 0; i--) {
    if (stripAnsi(rawLines[i]).includes('╰')) { bottomIdx = i; break; }
  }
  if (bottomIdx < 0) return { state: 'idle' };

  let topIdx = -1;
  for (let i = bottomIdx - 1; i >= 0; i--) {
    if (stripAnsi(rawLines[i]).includes('╭')) { topIdx = i; break; }
  }
  if (topIdx < 0) return { state: 'idle' };

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
