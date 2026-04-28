<template>
  <div class="wall">
    <div v-if="status !== 'open'" class="status-banner">● {{ status }}</div>
    <div v-if="snap && snap.sessions.length === 0" class="empty">
      <p>no tmux sessions</p>
      <input v-model="newSessionName" placeholder="session name" />
      <button @click="createSession">create session</button>
    </div>
    <section v-for="s in snap?.sessions ?? []" :key="s.name" class="session">
      <header class="session-header">
        <span class="dot" :class="{ attached: s.attached }"></span>
        <span class="name">{{ s.name }}</span>
        <span class="count">{{ s.windows.length }} window{{ s.windows.length === 1 ? '' : 's' }}</span>
        <button class="add" @click="newWindow(s.name)">+ window</button>
      </header>
      <div class="grid">
        <div
          v-for="w in s.windows"
          :key="`${s.name}:${w.id}`"
          class="tile"
          :class="['st-' + w.status]"
          @click="open(s.name, w)"
        >
          <header>
            <span class="tile-dot" :class="{ pulse: w.status === 'warn' }"></span>
            <span class="tile-name">{{ w.index }}: {{ w.name }}</span>
            <span class="status-badge" v-if="statusLabel(w.status)">{{ statusLabel(w.status) }}</span>
            <span class="age">{{ humanAge(w.lastOutputAgeMs) }}</span>
          </header>
          <pre class="preview-summary">{{ summarize(w.preview) }}</pre>
          <pre class="preview-full">{{ w.preview.join('\n') }}</pre>
        </div>
        <div v-if="s.windows.length === 0" class="session-empty">no windows</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ReconnectingWS } from '../ws';
import { api } from '../api';
import type { WallSnapshot, WallSnapshotWindow } from '../types';

const snap = ref<WallSnapshot | null>(null);
const status = ref<'connecting' | 'open' | 'closed'>('connecting');
const router = useRouter();
const newSessionName = ref<string>('claude');

const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/wall`;
let ws: ReconnectingWS | null = null;

onMounted(() => {
  ws = new ReconnectingWS(wsUrl, {
    onStatus: s => status.value = s,
    onMessage: msg => {
      if (msg?.type === 'snapshot') snap.value = msg.payload;
    },
  });
});
onUnmounted(() => ws?.close());

function open(session: string, w: WallSnapshotWindow) {
  router.push(`/w/${encodeURIComponent(session)}/${encodeURIComponent(w.id)}`);
}

async function createSession() {
  if (!newSessionName.value) return;
  try { await api.createSession(newSessionName.value); }
  catch (e: any) { alert(e.message); }
}

async function newWindow(session: string) {
  const name = prompt(`window name in session "${session}" (optional)`) || undefined;
  try { await api.newWindow(session, name); }
  catch (e: any) { alert(e.message); }
}

// Pick the last few non-blank lines of preview as a multi-line summary.
// On mobile we show this in place of the full preview, so 3 lines is a
// useful glance: usually shows the prompt + last command output.
function summarize(lines: string[]): string {
  const out: string[] = [];
  for (let i = lines.length - 1; i >= 0 && out.length < 3; i--) {
    const t = lines[i].replace(/\s+$/, '');
    if (t) out.unshift(t);
  }
  return out.length ? out.join('\n') : '(idle)';
}

function humanAge(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 5)   return 'live';
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

function statusLabel(s: string): string {
  if (s === 'warn') return 'wait';   // user input wanted
  if (s === 'err')  return 'err';
  return '';                          // ok / running / idle = no label
}
</script>

<style scoped>
.wall { padding: 16px; box-sizing: border-box; }
@media (max-width: 600px) { .wall { padding: 8px; } }
.status-banner { color: var(--warn); font-size: 12px; margin-bottom: 8px; }

.session { margin-bottom: 22px; }
.session-header {
  display: flex; align-items: center; gap: 8px; padding: 8px 4px; margin-bottom: 8px;
  border-bottom: 1px solid #1a1a1a;
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-faint); }
.dot.attached { background: var(--accent); }
.name { font-weight: 700; font-size: 14px; font-family: ui-monospace, JetBrains Mono, monospace; }
.count { color: var(--ink-faint); font-size: 11px; flex: 1; }
.add { font-size: 11px; padding: 3px 8px; }

.grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }

.tile {
  background: var(--bg-alt); border: 1px solid var(--ink-faint); border-radius: 6px;
  padding: 10px; cursor: pointer;
  min-width: 0;
  overflow: hidden;
}
.tile:hover { border-color: var(--accent); }
.tile.st-running { border-color: var(--accent); }
.tile.st-warn { border-color: var(--warn); background: rgba(232, 184, 109, 0.06); }
.tile.st-err  { border-color: var(--err);  background: rgba(217, 119, 102, 0.06); }
.tile.st-idle { opacity: 0.7; }

.tile header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 0; border: none;
  min-width: 0;
}
.tile-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-faint); flex: 0 0 8px; }
.tile.st-running .tile-dot { background: var(--accent); }
.tile.st-ok      .tile-dot { background: var(--accent); }
.tile.st-warn    .tile-dot { background: var(--warn); }
.tile.st-err     .tile-dot { background: var(--err); }
.tile-dot.pulse {
  animation: pulse-dot 1.2s ease-in-out infinite;
}
@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 var(--warn); opacity: 1; }
  50%      { box-shadow: 0 0 0 6px rgba(232, 184, 109, 0); opacity: 0.6; }
}

.tile-name {
  flex: 1; font-weight: 600; font-family: ui-monospace, monospace; font-size: 12px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}
.status-badge {
  flex: 0 0 auto;
  font: 10px ui-monospace, monospace;
  padding: 1px 6px; border-radius: 8px;
  background: var(--warn); color: #000;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.tile.st-err .status-badge { background: var(--err); }
.age { color: var(--ink-faint); font: 11px ui-monospace, monospace; flex: 0 0 auto; }

.preview-summary {
  color: var(--ink-dim); font: 11px/1.4 ui-monospace, monospace;
  white-space: pre-wrap; word-break: break-all;
  max-height: 60px; overflow: hidden; margin: 0;
}
.preview-full {
  color: var(--ink-dim); font: 11px ui-monospace, monospace; white-space: pre-wrap;
  max-height: 140px; overflow: hidden; margin: 8px 0 0; word-break: break-all;
}

/* Mobile: only summary, hide the full preview block */
@media (max-width: 600px) {
  .preview-full { display: none; }
}

.session-empty { color: var(--ink-faint); padding: 12px; }
.empty { color: var(--ink-faint); padding: 24px; text-align: center; }
.empty input { margin: 8px; }
</style>
