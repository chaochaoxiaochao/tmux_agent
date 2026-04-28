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
            <span class="tile-dot"></span>
            <span class="tile-name">{{ w.index }}: {{ w.name }}</span>
            <span class="age">{{ Math.round(w.lastOutputAgeMs / 1000) }}s</span>
          </header>
          <pre class="preview">{{ w.preview.join('\n') }}</pre>
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
</script>

<style scoped>
.wall { padding: 16px; }
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

.tile { background: var(--bg-alt); border: 1px solid var(--ink-faint); border-radius: 6px; padding: 10px; cursor: pointer; }
.tile:hover { border-color: var(--accent); }
.tile.st-warn { border-color: var(--warn); }
.tile.st-err { border-color: var(--err); }
.tile header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 0; border: none; }
.tile-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.tile.st-warn .tile-dot { background: var(--warn); }
.tile.st-err .tile-dot { background: var(--err); }
.tile-name { flex: 1; font-weight: 600; font-family: ui-monospace, monospace; font-size: 12px; }
.age { color: var(--ink-faint); font: 11px ui-monospace, monospace; }
.preview {
  color: var(--ink-dim); font: 11px ui-monospace, monospace; white-space: pre-wrap;
  max-height: 140px; overflow: hidden; margin: 0;
}

.session-empty { color: var(--ink-faint); padding: 12px; }
.empty { color: var(--ink-faint); padding: 24px; text-align: center; }
.empty input { margin: 8px; }
</style>
