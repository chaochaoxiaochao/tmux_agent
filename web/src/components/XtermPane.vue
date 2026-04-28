<template>
  <div ref="root" class="xterm-host"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ReconnectingWS } from '../ws';

const props = defineProps<{ session: string; windowId: string }>();
const root = ref<HTMLDivElement | null>(null);
let term: Terminal | null = null;
let fit: FitAddon | null = null;
let ws: ReconnectingWS | null = null;
let ro: ResizeObserver | null = null;

function wsUrl(session: string, id: string) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws/term/${encodeURIComponent(session)}/${encodeURIComponent(id)}`;
}

function sendResize() {
  if (!term || !ws) return;
  ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
}

function connect() {
  ws?.close();
  ws = new ReconnectingWS(wsUrl(props.session, props.windowId), {
    onMessage: data => {
      if (data instanceof ArrayBuffer) term?.write(new Uint8Array(data));
    },
  });
  setTimeout(sendResize, 200);
}

onMounted(() => {
  if (!root.value) return;
  term = new Terminal({ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 13, theme: { background: '#000' } });
  fit = new FitAddon();
  term.loadAddon(fit);
  term.open(root.value);
  fit.fit();

  connect();

  term.onData(d => ws?.send(new TextEncoder().encode(d)));

  ro = new ResizeObserver(() => { fit?.fit(); sendResize(); });
  ro.observe(root.value);
});

onUnmounted(() => {
  ro?.disconnect();
  ws?.close();
  term?.dispose();
});

watch(() => [props.session, props.windowId], () => connect());
</script>

<style scoped>
.xterm-host { width: 100%; height: 100%; }
</style>
