<template>
  <div ref="root" class="xterm-host"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ReconnectingWS } from '../ws';

const props = defineProps<{ windowId: string }>();
const root = ref<HTMLDivElement | null>(null);
let term: Terminal | null = null;
let fit: FitAddon | null = null;
let ws: ReconnectingWS | null = null;
let ro: ResizeObserver | null = null;

function wsUrl(id: string) {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/term/${encodeURIComponent(id)}`;
}

function sendResize() {
  if (!term || !ws) return;
  ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
}

onMounted(() => {
  if (!root.value) return;
  term = new Terminal({ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, theme: { background: '#000' } });
  fit = new FitAddon();
  term.loadAddon(fit);
  term.open(root.value);
  fit.fit();

  ws = new ReconnectingWS(wsUrl(props.windowId), {
    onMessage: data => {
      if (data instanceof ArrayBuffer) term?.write(new Uint8Array(data));
    },
  });

  term.onData(d => ws?.send(new TextEncoder().encode(d)));

  ro = new ResizeObserver(() => { fit?.fit(); sendResize(); });
  ro.observe(root.value);

  setTimeout(sendResize, 200);
});

onUnmounted(() => {
  ro?.disconnect();
  ws?.close();
  term?.dispose();
});

watch(() => props.windowId, () => {
  ws?.close();
  ws = new ReconnectingWS(wsUrl(props.windowId), {
    onMessage: data => { if (data instanceof ArrayBuffer) term?.write(new Uint8Array(data)); },
  });
  setTimeout(sendResize, 200);
});
</script>

<style scoped>
.xterm-host { width: 100%; height: 100%; }
</style>
