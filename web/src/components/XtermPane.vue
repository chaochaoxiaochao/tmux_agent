<template>
  <div class="xterm-wrap">
    <div ref="root" class="xterm-host"></div>
    <!-- Mobile-only click catcher. Sits over the terminal to intercept taps so
         xterm's hidden textarea doesn't grab focus (which would pop the OS
         keyboard with no way to dismiss it). Click bubbles up as @tap so the
         parent can open InputDialog. Hidden on desktop via @media. -->
    <div class="tap-overlay" @click="$emit('tap')"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ReconnectingWS } from '../ws';

const props = defineProps<{ session: string; windowId: string }>();
defineEmits<{ (e: 'tap'): void }>();

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

function refit() {
  if (!fit || !term) return;
  fit.fit();
  sendResize();
}

function connect() {
  ws?.close();
  ws = new ReconnectingWS(wsUrl(props.session, props.windowId), {
    onMessage: data => {
      if (data instanceof ArrayBuffer) term?.write(new Uint8Array(data));
    },
  });
  // Layout often isn't fully stable on first paint (font metrics still
  // loading, dvh adjusting after attach view mounts). Re-fit a few times
  // so xterm reaches its final cols/rows before tmux locks in pane size.
  setTimeout(refit, 100);
  setTimeout(refit, 400);
  setTimeout(refit, 1000);
}

const onWinResize = () => refit();

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
  window.addEventListener('resize', onWinResize);
  window.addEventListener('orientationchange', onWinResize);
  (window as any).visualViewport?.addEventListener?.('resize', onWinResize);
});

onUnmounted(() => {
  ro?.disconnect();
  window.removeEventListener('resize', onWinResize);
  window.removeEventListener('orientationchange', onWinResize);
  (window as any).visualViewport?.removeEventListener?.('resize', onWinResize);
  ws?.close();
  term?.dispose();
});

watch(() => [props.session, props.windowId], () => connect());
</script>

<style scoped>
.xterm-wrap {
  position: relative;
  width: 100%; height: 100%;
}
.xterm-host {
  width: 100%; height: 100%;
  padding: 4px 6px; box-sizing: border-box;
  background: #000;
  overflow: hidden;          /* never show internal scrollbars; FitAddon owns sizing */
  contain: strict;           /* don't let xterm's measure pass push parent layout */
}
/* Click catcher hidden on desktop — desktop users want native xterm
 * interaction (focus, copy/paste, etc.). */
.tap-overlay { display: none; }

/* Mobile (<=600px): the overlay covers the terminal and absorbs taps,
 * preventing xterm's helper-textarea from getting focus and popping the
 * OS keyboard. Tap fires @tap so the parent opens InputDialog. */
@media (max-width: 600px) {
  .tap-overlay {
    display: block;
    position: absolute; inset: 0;
    background: transparent;
    cursor: pointer;
  }
}
</style>
