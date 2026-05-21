import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 真实 Claude TUI 菜单 capture, tmux capture-pane -p -e 抓的整屏。
export const FIX_REAL_MENU: string = fs.readFileSync(
  path.join(__dirname, 'slash-parser.real-capture.txt'),
  'utf8'
);

// 普通 Claude 输出,无菜单。
export const FIX_IDLE_PROMPT = `\
✻ Crunched for 27s

some normal text
> prompt cursor here _
`;

// thinking spinner 周围只有一对分隔线但没有 /-led 行。
export const FIX_THINKING_NO_MENU = `\
────────────────────────────────────────
✻ Thinking…
────────────────────────────────────────
❯ _
`;

// 高亮在第三行(用 \x1b[94m 区别于其他行的 \x1b[37m)。
const HL = '\x1b[94m';
const NORMAL = '\x1b[37m';
const RESET = '\x1b[39m';
export const FIX_MENU_HIGHLIGHT_3RD = `\
────────────────────────────────────────
❯ /
────────────────────────────────────────
${NORMAL}/brainstorming           Use this before any creative work${RESET}
${NORMAL}/subagent-driven-development            Use when executing implementation plans${RESET}
${HL}/writing-plans           Use when you have a spec${RESET}
${NORMAL}/session-restore            Use when resuming work${RESET}
`;

// 全部 fg 同色 → active 应为 0。
export const FIX_MENU_NO_HIGHLIGHT = `\
────────────────────────────────────────
❯ /
────────────────────────────────────────
${NORMAL}/clear            clear conversation${RESET}
${NORMAL}/compact            compact context${RESET}
${NORMAL}/cost            show cost${RESET}
`;
