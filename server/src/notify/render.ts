import type { NotifyEvent, RichNotification, Button, AgentRow } from './types.js';
import { snapshot, type AgentEntry } from '../agent-state-registry.js';

export interface RenderOpts { eventId: string; publicUrl?: string }

const STATE_ORDER: Record<string, number> = { request: 0, running: 1, done: 2, idle: 3 };
const STATE_HEADER: Record<string, string> = {
  request: '⏳ 等输入',
  running: '🟢 跑着',
  done: '✅ 刚完成',
  idle: '💤 闲着',
};

// 老 hook (notify_wechat.sh.bak) 按 state 分组渲染 agents 列表。这里用 TS 重写
// 等价逻辑,失败时返回 undefined,channel 渲染会跳过该段不退化主体。
export function renderAgentsSection(agents: AgentEntry[], curPaneId: string, publicUrl?: string): string | undefined {
  if (agents.length === 0) return undefined;
  const groups = new Map<string, AgentEntry[]>();
  for (const a of agents) {
    const arr = groups.get(a.state) ?? [];
    arr.push(a);
    groups.set(a.state, arr);
  }
  const sortedStates = [...groups.keys()].sort(
    (a, b) => (STATE_ORDER[a] ?? 3) - (STATE_ORDER[b] ?? 3),
  );
  const lines: string[] = [];
  for (const state of sortedStates) {
    const items = groups.get(state)!;
    const header = STATE_HEADER[state] ?? `💤 ${state}`;
    lines.push(`**${header} (${items.length})**`);
    for (const a of items) {
      const clabel = a.claudeSessionName?.trim() || a.claudeSessionId?.slice(0, 8) || '';
      const winLabel = a.windowName?.trim() || a.windowId;
      const time = new Date(a.lastEventAt).toLocaleTimeString();
      const here = a.paneId === curPaneId ? ' ← 本次' : '';
      const linkPart = publicUrl
        ? `[${a.session}:${winLabel}#${a.paneIndex}](${publicUrl}/#/w/${encodeURIComponent(a.session)}/${encodeURIComponent(a.windowId)}/${encodeURIComponent(a.paneId)})`
        : `${a.session}:${winLabel}#${a.paneIndex}`;
      const cwdPart = a.cwd ? ` · \`${a.cwd}\`` : '';
      const msgPart = a.lastMessage ? ` · "${a.lastMessage}"` : '';
      const cPart = clabel ? ` · \`${clabel}\`` : '';
      lines.push(`- ${linkPart}${cPart} · ${time}${cwdPart}${msgPart}${here}`);
    }
  }
  return lines.join('\n');
}

// 反查 session 标签: claudeSessionName (用户 /rename 的) > cwd 末段 > session 字段.
function sessionLabel(ev: NotifyEvent, agents: AgentEntry[]): string {
  const mine = agents.find(a => a.paneId === ev.paneId);
  if (mine?.claudeSessionName) return mine.claudeSessionName;
  const tail = ev.cwd?.split('/').filter(Boolean).pop();
  return tail || ev.session || '?';
}

export function renderNotification(ev: NotifyEvent, opts: RenderOpts): RichNotification {
  const agents = (() => { try { return snapshot(); } catch { return []; } })();
  const sLabel = sessionLabel(ev, agents);

  let headline: string;
  let body: string;
  const fields = [
    { label: 'Session', value: sLabel },
    { label: 'Cwd', value: ev.cwd },
    { label: 'Time', value: new Date().toLocaleString() },
  ];

  if (ev.hook_event_name === 'Stop') {
    headline = '✅ Claude Code 任务完成';
    body = '主人我完成任务了';
  } else if (ev.hook_event_name === 'PermissionRequest' && ev.tool_name === 'AskUserQuestion') {
    headline = '❓ Claude Code 需要询问';
    const q = (ev.tool_input as any)?.questions?.[0]?.question ?? '';
    body = q ? `主人我需要问你：\n${q}` : '主人我需要问你';
  } else if (ev.hook_event_name === 'PermissionRequest') {
    headline = '🔐 Claude Code 等权限批准';
    body = `主人我需要你批准 \`${ev.tool_name || '?'}\` 操作`;
  } else {
    headline = '🔔 Claude Code 等输入';
    body = ev.message || '主人有事找你';
  }

  let deepLink: string | undefined;
  if (opts.publicUrl) {
    deepLink = `${opts.publicUrl}/#/w/${encodeURIComponent(ev.session)}/${encodeURIComponent(ev.windowId)}`;
  }

  // 用户决定: 卡片只做"概览通知", 不带任何 callback/link 按钮.
  // 一是手机渲染兼容性差 (column_set + button 飞书 client 会 fallback 到"请升级"),
  // 二是卡片简洁,交互通过 web 进行。Phase 2 的按钮回调路径在 lark-router
  // 保留可用,但 render 不再生成按钮。
  const buttons: Button[] = [];

  let agentsSnapshot: string | undefined;
  let agentRows: AgentRow[] | undefined;
  try {
    const section = renderAgentsSection(agents, ev.paneId, opts.publicUrl);
    if (section) agentsSnapshot = `────── 当前所有 agents ──────\n${section}`;
    agentRows = buildAgentRows(agents, ev.paneId, opts.publicUrl);
  } catch {
    // 静默: agents 段失败不影响主体
  }

  return {
    headline, body, fields,
    deepLink, buttons, agentsSnapshot, agents: agentRows,
    inputSlot: true,
    eventId: opts.eventId,
    paneId: ev.paneId, session: ev.session, windowId: ev.windowId,
  };
}

// 给 lark-card 用的结构化数据 (按 state 排序; agentsSnapshot 是给 wecom 的 markdown).
function buildAgentRows(agents: AgentEntry[], curPaneId: string, publicUrl?: string): AgentRow[] | undefined {
  if (agents.length === 0) return undefined;
  const sorted = [...agents].sort((a, b) => (STATE_ORDER[a.state] ?? 3) - (STATE_ORDER[b.state] ?? 3));
  return sorted.map((a): AgentRow => ({
    state: a.state,
    stateLabel: STATE_HEADER[a.state] ?? `💤 ${a.state}`,
    session: a.session,
    windowLabel: a.windowName?.trim() || a.windowId,
    paneIndex: a.paneIndex,
    paneId: a.paneId,
    cwd: a.cwd,
    time: new Date(a.lastEventAt).toLocaleTimeString(),
    claudeLabel: a.claudeSessionName?.trim() || a.claudeSessionId?.slice(0, 8) || undefined,
    lastMessage: a.lastMessage || undefined,
    isCurrent: a.paneId === curPaneId,
    deepLink: publicUrl
      ? `${publicUrl}/#/w/${encodeURIComponent(a.session)}/${encodeURIComponent(a.windowId)}/${encodeURIComponent(a.paneId)}`
      : undefined,
  }));
}
