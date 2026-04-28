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
let touchCleanup: (() => void) | null = null;

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

// Translate touch drags inside the xterm host into xterm scroll calls.
// xterm.js 5.x doesn't translate touch into scroll on its own; on mobile a
// vertical drag would otherwise scroll the page (or do nothing).
//
// Convention: dragging finger DOWN reveals older content (history above);
// dragging finger UP reveals newer content. xterm.scrollLines(n) with n<0
// scrolls toward older lines, n>0 toward newer.
function bindTouchScroll(host: HTMLElement, t: Terminal): () => void {
  let lastY: number | null = null;
  let acc = 0;
  const ROW_PX = 18;

  const onStart = (ev: TouchEvent) => {
    if (ev.touches.length !== 1) { lastY = null; return; }
    lastY = ev.touches[0].clientY;
    acc = 0;
  };
  const onMove = (ev: TouchEvent) => {
    if (lastY === null || ev.touches.length !== 1) return;
    const y = ev.touches[0].clientY;
    acc += y - lastY;
    lastY = y;
    while (acc >= ROW_PX)  { t.scrollLines(-1); acc -= ROW_PX; }   // finger down → history
    while (acc <= -ROW_PX) { t.scrollLines( 1); acc += ROW_PX; }   // finger up   → newer
    ev.preventDefault();
  };
  const onEnd = () => { lastY = null; };

  host.addEventListener('touchstart', onStart, { passive: true });
  host.addEventListener('touchmove', onMove, { passive: false });
  host.addEventListener('touchend', onEnd, { passive: true });
  host.addEventListener('touchcancel', onEnd, { passive: true });

  return () => {
    host.removeEventListener('touchstart', onStart);
    host.removeEventListener('touchmove', onMove);
    host.removeEventListener('touchend', onEnd);
    host.removeEventListener('touchcancel', onEnd);
  };
}

onMounted(() => {
  if (!root.value) return;
  term = new Terminal({
    fontFamily: 'JetBrains Mono, ui-monospace, monospace',
    fontSize: 13,
    scrollback: 5000,
    theme: { background: '#000' },
  });
  fit = new FitAddon();
  term.loadAddon(fit);
  term.open(root.value);
  fit.fit();

  connect();

  term.onData(d => ws?.send(new TextEncoder().encode(d)));

  ro = new ResizeObserver(() => { fit?.fit(); sendResize(); });
  ro.observe(root.value);

  touchCleanup = bindTouchScroll(root.value, term);
});

onUnmounted(() => {
  ro?.disconnect();
  touchCleanup?.();
  ws?.close();
  term?.dispose();
});

watch(() => [props.session, props.windowId], () => connect());
</script>

<style scoped>
.xterm-host { width: 100%; height: 100%; touch-action: none; overscroll-behavior: contain; }
</style>
