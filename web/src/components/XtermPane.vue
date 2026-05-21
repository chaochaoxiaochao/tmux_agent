<template>
  <div class="xterm-wrap">
    <div ref="root" class="xterm-host"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ReconnectingWS } from '../ws';
import type { SlashMenuFrame, SlashMenuItem } from '../types';

const props = defineProps<{ session: string; windowId: string }>();
const emit = defineEmits<{
  (e: 'slash-menu-list', payload: { items: SlashMenuItem[] }): void;
}>();

const root = ref<HTMLDivElement | null>(null);
let term: Terminal | null = null;
let fit: FitAddon | null = null;
let ws: ReconnectingWS | null = null;
let ro: ResizeObserver | null = null;

// --- diagnostic instrumentation ---
// Records every ws state change / resize / received-frame into a ring
// buffer (last 200 entries). The "🐞" button in AttachedView's header
// posts the buffer to /api/debug-dump so we can read it server-side
// without needing a remote-inspect setup. Frame events are NOT throttled
// here — we want full fidelity for diagnosis — but they're cheap (a
// single push, no DOM update, no string formatting in hot path).
const TAG = '[xterm-pane]';
const RING_MAX = 200;
const ring: string[] = [];

function fmtTime() {
  const d = new Date();
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${d.toLocaleTimeString('en-GB', { hour12: false })}.${ms}`;
}
function dbg(...args: any[]) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  const line = `${fmtTime()} ${msg}`;
  ring.push(line);
  if (ring.length > RING_MAX) ring.shift();
  // Also mirror to console when explicitly opted in (desktop debugging).
  if (typeof window !== 'undefined' && window.localStorage?.getItem('PTY_DEBUG') === '1') {
    console.log(TAG, msg);
  }
}

function recordFrame(size: number) {
  dbg(`rx ${size}B`);
}

// Exposed for AttachedView's 🐞 button. Returns the current ring contents
// plus a snapshot of terminal state at the moment of capture.
defineExpose({
  collectDiagnostics() {
    return {
      session: props.session,
      windowId: props.windowId,
      ts: new Date().toISOString(),
      cols: term?.cols ?? null,
      rows: term?.rows ?? null,
      readyState: (ws as any)?.sock?.readyState ?? null,
      userAgent: navigator.userAgent,
      visualViewport: (window as any).visualViewport
        ? { w: (window as any).visualViewport.width, h: (window as any).visualViewport.height }
        : null,
      window: { w: window.innerWidth, h: window.innerHeight },
      ring: ring.slice(),
    };
  },
});

function wsUrl(session: string, id: string) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws/term/${encodeURIComponent(session)}/${encodeURIComponent(id)}`;
}

function sendResize(reason?: string) {
  if (!term || !ws) return;
  dbg(`resize → ${term.cols}x${term.rows}${reason ? ` (${reason})` : ''}`);
  ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
}

function refit(reason?: string) {
  if (!fit || !term) return;
  fit.fit();
  sendResize(reason);
}

function connect() {
  ws?.close();
  dbg(`connect → ${props.session}:${props.windowId}`);
  ws = new ReconnectingWS(wsUrl(props.session, props.windowId), {
    onMessage: data => {
      if (data instanceof ArrayBuffer) {
        recordFrame(data.byteLength);
        term?.write(new Uint8Array(data));
      } else {
        // ReconnectingWS 在收到文本帧时已经 JSON.parse 过, 所以 data 是 object。
        // 这里只需识别 type:'slash-menu-list' 帧。
        let frame: SlashMenuFrame | null = null;
        if (data && typeof data === 'object' && (data as any).type === 'slash-menu-list') {
          frame = data as SlashMenuFrame;
        }
        if (frame) {
          emit('slash-menu-list', { items: frame.items });
        } else {
          dbg('rx non-binary frame:', typeof data, data);
        }
      }
    },
    onStatus: s => {
      dbg(`ws status: ${s}`);
      // ws.onopen also fires for reconnects (e.g. mobile webview killing
      // idle sockets). The server's new PTY starts at its default cols/rows
      // — we MUST re-send our actual size or the next burst of output gets
      // rendered with cursor coordinates meant for a 200x50 pane inside our
      // 46x29 viewport. That's the "garbled lines after the screen was
      // idle" symptom on iOS / WeWork / Telegram webviews.
      if (s === 'open') sendResize('ws-open');
    },
  });
  // Layout often isn't fully stable on first paint (font metrics still
  // loading, dvh adjusting after attach view mounts). Re-fit a few times
  // so xterm reaches its final cols/rows before tmux locks in pane size.
  setTimeout(() => refit('boot-100ms'), 100);
  setTimeout(() => refit('boot-400ms'), 400);
  setTimeout(() => refit('boot-1000ms'), 1000);
}

const onWinResize = () => refit('window-resize');
const onOrientation = () => refit('orientationchange');
const onVisualViewport = () => refit('visualViewport');

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

  // 防止 xterm 自动 focus 弹手机原生键盘: xterm 在 open() 后会渲染一个
  // .xterm-helper-textarea 用来接键盘事件。tabIndex=-1 只防 Tab,
  // 阻不住点击 focus,所以触屏额外加 readonly + inputMode='none'
  // (移动浏览器看 inputMode=none 不弹键盘)。桌面端保留默认,选中复制不影响。
  const helperTa = root.value.querySelector('.xterm-helper-textarea') as HTMLTextAreaElement | null;
  if (helperTa) {
    helperTa.tabIndex = -1;
    const isTouchDevice = 'ontouchstart' in window;
    if (isTouchDevice) {
      helperTa.readOnly = true;
      helperTa.inputMode = 'none';
    }
  }

  connect();

  term.onData(d => ws?.send(new TextEncoder().encode(d)));

  ro = new ResizeObserver(() => { fit?.fit(); sendResize('resize-observer'); });
  ro.observe(root.value);
  window.addEventListener('resize', onWinResize);
  window.addEventListener('orientationchange', onOrientation);
  (window as any).visualViewport?.addEventListener?.('resize', onVisualViewport);
});

onUnmounted(() => {
  dbg('unmount');
  ro?.disconnect();
  window.removeEventListener('resize', onWinResize);
  window.removeEventListener('orientationchange', onOrientation);
  (window as any).visualViewport?.removeEventListener?.('resize', onVisualViewport);
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
</style>
