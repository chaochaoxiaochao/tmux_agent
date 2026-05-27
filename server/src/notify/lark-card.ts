import type { RichNotification, Button, AgentRow } from './types.js';

export function buildLarkCard(n: RichNotification): any {
  const elements: any[] = [];

  elements.push({
    tag: 'div',
    text: { tag: 'lark_md', content: n.body },
  });

  if (n.fields.length > 0) {
    elements.push({
      tag: 'div',
      fields: n.fields.map(f => ({
        is_short: true,
        text: { tag: 'lark_md', content: `**${f.label}**\n\`${f.value}\`` },
      })),
    });
  }

  // agents 段优先用结构化 table 组件; 没有结构化数据则退化到 markdown.
  if (n.agents && n.agents.length > 0) {
    elements.push({ tag: 'hr' });
    elements.push({ tag: 'markdown', content: '**当前所有 agents**' });
    elements.push(buildAgentsTable(n.agents));
  } else if (n.agentsSnapshot) {
    elements.push({ tag: 'hr' });
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: n.agentsSnapshot } });
  }

  // Phase 3: 自由输入文本框 + 发送到 pane 按钮. 放在底部按钮排之前, 让 input
  // 框出现在快捷按钮上方. schema 2.0 风格 - input 直接是 body.elements 成员;
  // 发送按钮单独封一个 column_set, 不混进下面的快捷按钮排.
  if (n.inputSlot) {
    elements.push({
      tag: 'input',
      name: 'pane_text',
      placeholder: { tag: 'plain_text', content: '直接打字发送到 pane...' },
    });
    elements.push({
      tag: 'column_set',
      flex_mode: 'none',
      horizontal_spacing: 'small',
      columns: [{
        tag: 'column',
        width: 'auto',
        vertical_align: 'top',
        elements: [{
          tag: 'button',
          text: { tag: 'plain_text', content: '📨 发送到 pane' },
          type: 'primary',
          value: { action: 'text_input', paneId: n.paneId, eventId: n.eventId },
        }],
      }],
    });
  }

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

// 飞书 schema 2.0 table 组件: columns 定义列, rows 是单元格内容.
// row[colName] 可以是 string (lark_md) 或 markdown 段, 这里全用 markdown.
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
