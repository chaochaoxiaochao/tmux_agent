export interface SlashMenuItem { name: string; desc?: string }
export type SlashParseResult =
  | { state: 'idle' }
  | { state: 'menu'; items: SlashMenuItem[]; active: number };

// 移除 ANSI CSI 序列(\x1b[ ... 末字母),用于纯文本扫描。
const ANSI_CSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
function stripAnsi(s: string): string { return s.replace(ANSI_CSI, ''); }

// 一行里至少 10 个连续 ─ (U+2500) → 视为分隔线。
const SEPARATOR_RE = /─{10,}/;

// item 行的 fg SGR 色码:\x1b[3Xm 或 \x1b[9Xm (X=0..7)。
const FG_SGR_RE = /\x1b\[(3[0-7]|9[0-7])m/;

export function parseSlashMenu(buf: string): SlashParseResult {
  const rawLines = buf.split('\n');

  // 1) 从底向上找最后一道连续 ─ 分隔线。
  let separatorBottomIdx = -1;
  for (let i = rawLines.length - 1; i >= 0; i--) {
    if (SEPARATOR_RE.test(stripAnsi(rawLines[i]))) {
      separatorBottomIdx = i;
      break;
    }
  }
  if (separatorBottomIdx < 0) return { state: 'idle' };

  // 2) 真菜单在 separatorBottomIdx 下方;从 +1 开始扫连续 /-led 行。
  const items: { name: string; desc?: string; fgColor?: string }[] = [];
  for (let i = separatorBottomIdx + 1; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const plain = stripAnsi(raw).trimStart();
    if (!plain.startsWith('/')) {
      // 允许缩进的 desc 续行(>=4 空格起头, 不是 /),跳过不收
      const stripped = stripAnsi(raw);
      if (/^\s{4,}\S/.test(stripped) && items.length > 0) continue;
      // 否则菜单结束
      break;
    }
    // 解析 name + desc
    const body = plain.slice(1); // 去前导 /
    const m = body.match(/^(\S+)(?:\s+(.*))?$/);
    if (!m) continue;
    const item: { name: string; desc?: string; fgColor?: string } = { name: m[1] };
    const descPart = m[2]?.trim();
    if (descPart) {
      // desc 部分本身可能含 ANSI,strip 一遍存
      item.desc = stripAnsi(descPart);
    }
    // 抓该 raw 行的第一个 fg SGR
    const fgMatch = raw.match(FG_SGR_RE);
    if (fgMatch) item.fgColor = fgMatch[1];
    items.push(item);
  }

  if (items.length === 0) return { state: 'idle' };

  // 3) 高亮检测:统计 fg 出现次数, 少数派 (出现次数最少且 < items.length) = active。
  //    全相同/全无 → active = 0。
  const counts = new Map<string, number>();
  for (const it of items) {
    if (it.fgColor) counts.set(it.fgColor, (counts.get(it.fgColor) ?? 0) + 1);
  }
  let active = 0;
  if (counts.size >= 2) {
    // 取出现次数最少的色;若并列, 取第一个出现该色的 item 索引。
    let minCount = Infinity;
    let minColor: string | null = null;
    for (const [c, n] of counts) {
      if (n < minCount) { minCount = n; minColor = c; }
    }
    if (minColor !== null) {
      const idx = items.findIndex(it => it.fgColor === minColor);
      if (idx >= 0) active = idx;
    }
  }

  // 4) 输出 SlashMenuItem (剥掉 fgColor 内部字段)。
  const out: SlashMenuItem[] = items.map(it =>
    it.desc !== undefined ? { name: it.name, desc: it.desc } : { name: it.name }
  );
  return { state: 'menu', items: out, active };
}
