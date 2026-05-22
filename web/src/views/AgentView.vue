<template>
  <div class="agent-view">
    <header class="bar">
      <button @click="$router.push('/')">tile</button>
      <button class="active" disabled>🤖 agent</button>
    </header>
    <div class="list">
      <template v-for="g in groups" :key="g.state">
        <div v-if="g.items.length > 0" class="group">
          <div class="group-header" :class="'st-' + g.state">
            {{ groupHeader(g.state, g.items.length) }}
          </div>
          <div
            v-for="a in g.items"
            :key="a.paneId"
            class="row"
            :class="'st-' + a.state"
            @click="goAttached(a)"
          >
            <div class="line1">
              <span class="state">{{ stateIcon(a.state) }}</span>
              <span class="addr">{{ a.session }}:{{ a.windowName || a.windowId }}#{{ a.paneIndex }}</span>
              <span v-if="claudeLabel(a)" class="sname">{{ claudeLabel(a) }}</span>
              <span class="age">{{ formatTime(a.lastEventAt) }}</span>
            </div>
            <div class="line2">
              <span class="cwd">{{ a.cwd }}</span>
              <template v-if="a.lastMessage">
                <span class="sep">·</span>
                <span class="msg">{{ a.lastMessage }}</span>
              </template>
            </div>
          </div>
        </div>
      </template>
      <div v-if="agents.length === 0" class="empty">No claude agents running.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ReconnectingWS } from '../ws';
import type { AgentEntry, AgentStateFrame, AgentState } from '../types';

const router = useRouter();
const agents = ref<AgentEntry[]>([]);

const STATE_ORDER: AgentState[] = ['request', 'running', 'done', 'idle'];

const groups = computed(() => STATE_ORDER.map(state => ({
  state,
  items: agents.value
    .filter(a => a.state === state)
    .sort((a, b) => b.lastEventAt - a.lastEventAt),
})));

function stateIcon(s: AgentState): string {
  if (s === 'request') return '⏳';
  if (s === 'running') return '▶';
  if (s === 'done') return '✅';
  return '💤';
}

function groupHeader(s: AgentState, n: number): string {
  if (s === 'request') return `⏳ 等输入 (${n})`;
  if (s === 'running') return `🟢 跑着 (${n})`;
  if (s === 'done') return `✅ 刚完成 (${n})`;
  return `💤 闲着 (${n})`;
}

function claudeLabel(a: AgentEntry): string {
  if (a.claudeSessionName) return a.claudeSessionName;
  if (a.claudeSessionId) return a.claudeSessionId.slice(0, 8);
  return '';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

function goAttached(a: AgentEntry) {
  // 带 paneId 跳路由,AttachedView 进去后会主动把它设为 active(否则默认显示 window 当前 active pane,可能不是 claude)。
  router.push(`/w/${encodeURIComponent(a.session)}/${encodeURIComponent(a.windowId)}/${encodeURIComponent(a.paneId)}`);
}

let ws: ReconnectingWS | null = null;
onMounted(async () => {
  try {
    const r = await fetch('/api/agent-state/snapshot');
    if (r.ok) {
      const data = await r.json();
      agents.value = data.agents ?? [];
    }
  } catch { /* fall through to WS */ }

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new ReconnectingWS(`${proto}://${location.host}/ws/wall`, {
    onMessage: data => {
      if (data && typeof data === 'object' && (data as any).type === 'agent-state') {
        agents.value = (data as AgentStateFrame).agents;
      }
    },
  });
});
onUnmounted(() => ws?.close());
</script>

<style scoped>
.agent-view { display: flex; flex-direction: column; height: 100dvh; }
.bar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid #222; background: var(--bg-alt); }
.bar button {
  font: 13px ui-monospace, monospace;
  padding: 4px 12px; border-radius: 4px;
  background: transparent; border: 1px solid var(--ink-faint); color: var(--ink-dim);
  cursor: pointer;
}
.bar button.active { background: var(--accent); color: #000; border-color: var(--accent); cursor: default; }
.bar button:hover:not(.active):not(:disabled) { border-color: var(--accent); color: var(--ink); }
.list { flex: 1; overflow-y: auto; padding: 8px 12px; }
.group { margin-bottom: 14px; }
.group-header {
  font: 600 13px ui-monospace, monospace;
  padding: 4px 4px 6px;
  border-bottom: 1px solid #222;
  margin-bottom: 6px;
}
.group-header.st-request { color: var(--warn); }
.group-header.st-running { color: var(--accent); }
.group-header.st-done    { color: var(--ink); }
.group-header.st-idle    { color: var(--ink-dim); }
.row {
  padding: 10px 12px; margin-bottom: 6px;
  border-left: 3px solid var(--ink-faint);
  background: var(--bg-alt);
  border-radius: 4px;
  cursor: pointer;
}
.row.st-request { border-left-color: var(--warn); }
.row.st-running { border-left-color: var(--accent); }
.row.st-done    { border-left-color: var(--ink); }
.row.st-idle    { border-left-color: var(--ink-dim); }
.row:hover { background: #1c1c1c; }
.line1 { display: flex; align-items: baseline; gap: 8px; font: 13px ui-monospace, monospace; }
.line1 .state { font-size: 14px; }
.line1 .addr { color: var(--ink); font-weight: 600; flex-shrink: 0; }
.line1 .sname { color: var(--accent); font-size: 11px; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.line1 .age  { color: var(--ink-faint); font-size: 11px; margin-left: auto; flex-shrink: 0; }
.line2 {
  margin-top: 4px;
  font: 12px ui-monospace, monospace;
  color: var(--ink-dim);
  display: flex; align-items: baseline; gap: 6px; flex-wrap: nowrap;
  overflow: hidden;
}
.line2 .cwd { color: var(--ink-faint); flex-shrink: 0; }
.line2 .sep { color: var(--ink-faint); }
.line2 .msg {
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  min-width: 0; flex: 1;
}
.empty { padding: 32px 16px; text-align: center; color: var(--ink-faint); font: 13px ui-monospace, monospace; }
</style>
