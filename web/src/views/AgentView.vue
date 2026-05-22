<template>
  <div class="agent-view">
    <header class="bar">
      <button @click="$router.push('/')">tile</button>
      <button class="active" disabled>🤖 agent</button>
    </header>
    <div class="list">
      <div
        v-for="a in groupedAgents"
        :key="a.paneId"
        class="row"
        :class="'st-' + a.state"
        @click="goAttached(a)"
      >
        <div class="line1">
          <span class="state">{{ stateIcon(a.state) }}</span>
          <span class="addr">{{ a.session }}:{{ a.windowName || a.windowId }}#{{ a.paneIndex }}</span>
          <span class="age">{{ formatAge(a.lastEventAt) }}</span>
        </div>
        <div class="line2">
          <span class="cwd">{{ shortCwd(a.cwd) }}</span>
          <template v-if="a.lastMessage">
            <span class="sep">·</span>
            <span class="msg">{{ a.lastMessage }}</span>
          </template>
        </div>
      </div>
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

const STATE_ORDER: Record<AgentState, number> = { request: 0, running: 1, stop: 2 };

const groupedAgents = computed(() => {
  return [...agents.value].sort((a, b) =>
    STATE_ORDER[a.state] - STATE_ORDER[b.state] || b.lastEventAt - a.lastEventAt);
});

function stateIcon(s: AgentState): string {
  return s === 'running' ? '▶' : s === 'request' ? '⏳' : '✅';
}

function shortCwd(cwd: string): string {
  if (!cwd) return '';
  const parts = cwd.split('/').filter(Boolean);
  return '.../' + parts.slice(-2).join('/');
}

function formatAge(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h`;
}

function goAttached(a: AgentEntry) {
  router.push(`/w/${encodeURIComponent(a.session)}/${encodeURIComponent(a.windowId)}`);
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
.row {
  padding: 10px 12px; margin-bottom: 6px;
  border-left: 3px solid var(--ink-faint);
  background: var(--bg-alt);
  border-radius: 4px;
  cursor: pointer;
}
.row.st-request { border-left-color: var(--warn); }
.row.st-running { border-left-color: var(--accent); }
.row.st-stop    { border-left-color: var(--ink-dim); }
.row:hover { background: #1c1c1c; }
.line1 { display: flex; align-items: baseline; gap: 8px; font: 13px ui-monospace, monospace; }
.line1 .state { font-size: 14px; }
.line1 .addr { color: var(--ink); font-weight: 600; flex: 1; min-width: 0; }
.line1 .age  { color: var(--ink-faint); font-size: 11px; }
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
