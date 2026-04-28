<template>
  <div class="wall">
    <div v-if="status !== 'open'" class="status-banner">● {{ status }}</div>
    <div class="grid">
      <div v-for="w in windows" :key="w.id" class="tile" :class="['st-' + w.status]" @click="open(w)">
        <header>
          <span class="dot"></span>
          <span class="name">{{ w.name }}</span>
          <span class="age">{{ Math.round(w.lastOutputAgeMs / 1000) }}s</span>
        </header>
        <pre class="preview">{{ w.preview.join('\n') }}</pre>
      </div>
      <div v-if="windows.length === 0 && status === 'open'" class="empty">
        <p>no windows · session may not exist</p>
        <button @click="createSession">create session</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ReconnectingWS } from '../ws';
import { api } from '../api';
import type { WallSnapshotWindow } from '../types';

const windows = ref<WallSnapshotWindow[]>([]);
const status = ref<'connecting' | 'open' | 'closed'>('connecting');
const router = useRouter();
const sessionName = ref<string>('claude');

const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/wall`;
let ws: ReconnectingWS | null = null;

onMounted(() => {
  ws = new ReconnectingWS(wsUrl, {
    onStatus: s => status.value = s,
    onMessage: msg => {
      if (msg?.type === 'snapshot') windows.value = msg.payload.windows;
    },
  });
});
onUnmounted(() => ws?.close());

function open(w: WallSnapshotWindow) { router.push(`/w/${encodeURIComponent(w.id)}`); }

async function createSession() {
  try { await api.createSession(sessionName.value); } catch (e: any) { alert(e.message); }
}
</script>

<style scoped>
.wall { padding: 16px; }
.status-banner { color: var(--warn); font-size: 12px; margin-bottom: 8px; }
.grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
.tile { background: var(--bg-alt); border: 1px solid var(--ink-faint); border-radius: 6px; padding: 10px; cursor: pointer; }
.tile:hover { border-color: var(--accent); }
.tile.st-warn { border-color: var(--warn); }
.tile.st-err { border-color: var(--err); }
.tile header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.tile.st-warn .dot { background: var(--warn); }
.tile.st-err .dot { background: var(--err); }
.name { flex: 1; font-weight: 600; }
.age { color: var(--ink-faint); font: 11px ui-monospace, monospace; }
.preview { color: var(--ink-dim); font: 11px ui-monospace, monospace; white-space: pre-wrap; max-height: 140px; overflow: hidden; margin: 0; }
.empty { color: var(--ink-faint); padding: 24px; text-align: center; }
</style>
