// 真实 Claude TUI 菜单浮窗采样。
// 采样方法:tmux capture-pane -t <claude pane> -p -e。
// 注意:这些是手工归纳的"形状对",不是 1:1 字节级真实样本;
//        Task 7 验证时拿真实 tmux capture-pane 再校一遍,如形状不符再回来更新。

const ESC = '\x1b';
const HL_ON = `${ESC}[7m`;
const HL_OFF = `${ESC}[27m`;

export const FIX_IDLE = `\
some normal claude output text
> prompt cursor here _
`;

export const FIX_MENU_NO_HIGHLIGHT = `\
> /_
╭─────────────────────────────────────────╮
│  /clear      clear conversation         │
│  /compact    compact context            │
│  /cost       show cost                  │
│  /help       show help                  │
╰─────────────────────────────────────────╯
`;

export const FIX_MENU_HIGHLIGHT_2ND = `\
> /_
╭─────────────────────────────────────────╮
│  /clear      clear conversation         │
│  ${HL_ON}/compact    compact context            ${HL_OFF}│
│  /cost       show cost                  │
│  /help       show help                  │
╰─────────────────────────────────────────╯
`;

export const FIX_MENU_HALF_DRAWN = `\
> /_
╭─────────────────────────────────────────╮
│  /clear      clear conversation         │
`;

export const FIX_SPINNER_BOX = `\
╭─────────────────────────╮
│  ⠋  thinking...         │
╰─────────────────────────╯
`;
