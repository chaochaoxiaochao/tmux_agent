import type { RichNotification, Button, AgentRow } from './types.js';

export function buildLarkCard(n: RichNotification): any {
  const elements: any[] = [];

  // Phase 3 layout: 每个 agent 两行 markdown (手机表格 cell 限高省略截字, 改用纯
  // 段落). header 已表达事件类型, 不重复 body/fields.
  if (n.agents && n.agents.length > 0) {
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: buildAgentsMarkdown(n.agents) } });
  } else if (n.agentsSnapshot) {
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: n.agentsSnapshot } });
  } else {
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: n.body } });
  }

  // Phase 3 inputSlot 弃用: 飞书 client form 提交事件不走 card.action.trigger
  // (WS 长连无法收到). 自由文本走 "飞书私聊直接打字 + im.message.receive_v1"
  // 路由 (Phase 3 Task 2 提供).

  // schema 2.0: action tag 已废弃, 按钮直接作为 element 或装进 column_set.
  // 用 column_set 让按钮排成一行 (横向多列, 每列 1 个 button).
  if (n.buttons.length > 0) {
    elements.push({
      tag: 'column_set',
      flex_mode: 'none',
      horizontal_spacing: 'small',
      columns: n.buttons.map(b => ({
        tag: 'column',
        width: 'auto',
        vertical_align: 'top',
        elements: [buttonToCardAction(b)],
      })),
    });
  }

  return {
    schema: '2.0',
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: n.headline },
      template: pickHeaderColor(n.headline),
    },
    body: { elements },
  };
}

// 每个 agent 渲染为 markdown 两行: 一行主标识 + 一行细节.
// 不用 table, 因为飞书 cell 限高 + 截字.
function buildAgentsMarkdown(agents: AgentRow[]): string {
  const lines: string[] = [];
  for (const a of agents) {
    const where = a.deepLink
      ? `[${a.session}:${a.windowLabel}#${a.paneIndex}](${a.deepLink})`
      : `${a.session}:${a.windowLabel}#${a.paneIndex}`;
    const here = a.isCurrent ? ' **← 本次**' : '';
    const cwdShort = a.cwd ? a.cwd.split('/').slice(-2).join('/') : '';
    const subParts: string[] = [];
    if (a.claudeLabel) subParts.push(`\`${a.claudeLabel}\``);
    subParts.push(a.time);
    if (cwdShort) subParts.push(`\`${cwdShort}\``);
    if (a.lastMessage) subParts.push(`"${a.lastMessage}"`);
    // 第 1 行: 状态 + session:win#pane (粗体作主行)
    lines.push(`${a.stateLabel} · **${where}**${here}`);
    // 第 2 行: 细节, 缩进让视觉成一组
    lines.push(`　　${subParts.join(' · ')}`);
  }
  return lines.join('\n');
}

// 留作未来 (table cell 限制解决后), 暂时不调用.
function buildAgentsTable(agents: AgentRow[]): any {
  // 飞书私聊单屏窄, 5 列会被挤换行. 压成 2 列:
  // 列 1 "状态" (短): 🟢 / ⏳ / ✅ / 💤 + 短文字
  // 列 2 "Agent" (主): session:window#pane (链接) + claude label + cwd 末段 + time + ← 本次
  const columns = [
    { name: 'state',  display_name: '状态',  data_type: 'lark_md', horizontal_align: 'left', width: '80px' },
    { name: 'detail', display_name: 'Agent', data_type: 'lark_md', horizontal_align: 'left', width: 'auto' },
  ];
  const rows = agents.map(a => {
    const where = a.deepLink
      ? `[${a.session}:${a.windowLabel}#${a.paneIndex}](${a.deepLink})`
      : `${a.session}:${a.windowLabel}#${a.paneIndex}`;
    const cwdShort = a.cwd ? a.cwd.split('/').slice(-2).join('/') : '';
    const here = a.isCurrent ? ' **← 本次**' : '';
    const subParts: string[] = [];
    if (a.claudeLabel) subParts.push(`\`${a.claudeLabel}\``);
    subParts.push(a.time);
    if (cwdShort) subParts.push(`\`${cwdShort}\``);
    if (a.lastMessage) subParts.push(`"${a.lastMessage}"`);
    const detail = `${where}${here}\n${subParts.join(' · ')}`;
    return { state: a.stateLabel, detail };
  });
  return {
    tag: 'table',
    columns,
    rows,
    page_size: 10,
    row_height: 'low',
    header_style: { bold: true, lines: 1 },
  };
}

function buttonToCardAction(b: Button): any {
  const base: any = {
    tag: 'button',
    text: { tag: 'plain_text', content: b.text },
    type: b.style,
  };
  if (b.kind === 'link') base.url = b.url;
  else base.value = b.value;
  return base;
}

// Headline emoji prefixes must stay in sync with src/notify/render.ts; if you
// add a new event headline there, add its color here or it falls back to grey.
function pickHeaderColor(headline: string): string {
  if (headline.startsWith('✅')) return 'green';
  if (headline.startsWith('🔐')) return 'orange';
  if (headline.startsWith('❓')) return 'blue';
  if (headline.startsWith('🔔')) return 'turquoise';
  return 'grey';
}
