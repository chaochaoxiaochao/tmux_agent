<template>
  <div
    class="attached"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <header class="bar">
      <button @click="$router.push('/')">← wall</button>
      <button @click="$router.push('/agent')">🤖 agent</button>
      <span class="bc">{{ session }} : {{ id }}</span>
      <span class="spacer"></span>
      <button class="refresh-slash" :class="refreshState" @click="handleRefreshSlash" :disabled="refreshState === 'loading'" :title="refreshTitle">
        <span v-if="refreshState === 'loading'">⏳</span>
        <span v-else-if="refreshState === 'ok'">✓</span>
        <span v-else-if="refreshState === 'err'">✗</span>
        <span v-else>🔄</span>
      </button>
      <button class="bug" :class="bugState" @click="dumpDiag" :disabled="bugState === 'loading'" :title="bugTitle">
        <span v-if="bugState === 'loading'">⏳ saving…</span>
        <span v-else-if="bugState === 'ok'">✓ saved</span>
        <span v-else-if="bugState === 'err'">✗ failed</span>
        <span v-else>🐞 debug</span>
      </button>
    </header>
    <PaneStrip :session="session" :window-id="id" :panes="panes" />
    <div class="body">
      <div class="term-area"><XtermPane
        ref="xterm"
        :session="session"
        :window-id="id"
        @slash-menu-list="onSlashMenuList"
        @pane-meta="onPaneMeta"
      /></div>
    </div>
    <ScrollControls :session="session" :window-id="id" :in-copy-mode="activePane?.inMode ?? false" />
    <AttachedComposer
      ref="composer"
      :session="session"
      :window-id="id"
      :pending-files="pendingFiles"
      @pending-consumed="pendingFiles = []"
    />

    <!-- drag-and-drop overlay: shows while a file is being dragged over the
         page. On drop we inject files directly to the terminal. -->
    <div v-if="dragActive" class="drop-overlay">
      <div class="drop-box">
        <div class="drop-icon">⬇</div>
        <div class="drop-text">{{ dropHintText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import XtermPane from '../components/XtermPane.vue';
import ScrollControls from '../components/ScrollControls.vue';
import AttachedComposer from '../components/AttachedComposer.vue';
import PaneStrip from '../components/PaneStrip.vue';
import { api } from '../api';
import type { SlashMenuItem, PaneMetaFrame, PaneMetaItem } from '../types';

const props = defineProps<{ session: string; id: string; pane?: string }>();
const pendingFiles = ref<File[]>([]);
const dragActive = ref(false);
let dragDepth = 0;

// XtermPane ref so the 🐞 button can pull its diagnostic ring buffer.
const xterm = ref<InstanceType<typeof XtermPane> | null>(null);
// AttachedComposer ref so we can forward XtermPane's slash-menu-list event
// into the composer's slash-mirror cache (method exposed in Task 6).
const composer = ref<InstanceType<typeof AttachedComposer> | null>(null);

function onSlashMenuList(payload: { items: SlashMenuItem[] }) {
  composer.value?.onSlashMenuList(payload);
}

const panes = ref<PaneMetaItem[]>([]);
const activePane = computed(() => panes.value.find(p => p.active) ?? null);

function onPaneMeta(payload: PaneMetaFrame) {
  if (payload.session !== props.session || payload.windowId !== props.id) return;
  panes.value = payload.panes;
}

// 切换 window 时清空，避免短暂显示上一个 window 的状态
watch(() => [props.session, props.id], () => { panes.value = []; });

const bugState = ref<'' | 'loading' | 'ok' | 'err'>('');
const bugTitle = ref('dump diagnostics to server log');

const refreshState = ref<'' | 'loading' | 'ok' | 'err'>('');
const refreshTitle = ref('refresh slash menu list');

async function handleRefreshSlash() {
  if (refreshState.value === 'loading') return;
  refreshState.value = 'loading';
  refreshTitle.value = 'refreshing…';
  try {
    const r = await api.slashRefresh(props.session, props.id);
    composer.value?.onSlashMenuList({ items: r.items });
    refreshState.value = 'ok';
    refreshTitle.value = `refreshed: ${r.items.length} items`;
  } catch (e: any) {
    refreshState.value = 'err';
    refreshTitle.value = `failed: ${e?.message ?? e}`;
  }
  setTimeout(() => {
    refreshState.value = '';
    refreshTitle.value = 'refresh slash menu list';
  }, 2500);
}

async function dumpDiag() {
  // Guard against double-click while a request is in flight.
  if (bugState.value === 'loading') return;

  const collector = xterm.value?.collectDiagnostics as (() => any) | undefined;
  if (!collector) {
    bugTitle.value = 'xterm not ready';
    bugState.value = 'err';
    setTimeout(() => { bugState.value = ''; }, 2500);
    return;
  }

  bugState.value = 'loading';
  bugTitle.value = 'uploading…';

  const payload = collector();
  try {
    const r = await fetch('/api/debug-dump', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const { path } = await r.json();
    bugTitle.value = `saved: ${path}`;
    bugState.value = 'ok';
  } catch (e: any) {
    bugTitle.value = `failed: ${e.message ?? e}`;
    bugState.value = 'err';
  }
  // Stay visible long enough that the user can read it after a mobile tap.
  setTimeout(() => { bugState.value = ''; }, 2500);
}

const dropHintText = computed(() => 'drop to attach');

// dragenter/dragleave fire for every child, so we count depth to keep the
// overlay visible until the drag truly leaves the page.
function onDragEnter(e: DragEvent) {
  if (!hasFiles(e)) return;
  dragDepth++;
  dragActive.value = true;
}
function onDragOver(e: DragEvent) {
  if (!hasFiles(e)) return;
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}
function onDragLeave(_e: DragEvent) {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dragActive.value = false;
}
// 桌面拖拽: 直接上传 + 把 @<path> 注入到终端的 PTY 输入区 (用户熟悉的体验)。
// 手机走 composer 的 📎/粘贴, 没有拖拽场景。
async function onDrop(e: DragEvent) {
  dragDepth = 0;
  dragActive.value = false;
  const files = e.dataTransfer?.files;
  if (!files || !files.length) return;
  for (const f of Array.from(files)) {
    void injectAttachment(f);
  }
}

async function injectAttachment(file: File) {
  try {
    const b64 = await fileToBase64(file);
    const r = await api.upload(
      props.session,
      props.id,
      file.name || 'pasted',
      file.type || 'application/octet-stream',
      b64,
    );
    // Trailing space 方便用户接着打 prompt; 不带换行, 由用户自己回车发送。
    await api.send(props.session, props.id, `@${r.path} `);
  } catch (e: any) {
    alert(`upload failed: ${e.message ?? e}`);
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const s = r.result as string;
      const idx = s.indexOf(',');
      res(idx >= 0 ? s.slice(idx + 1) : s);
    };
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
function hasFiles(e: DragEvent): boolean {
  // dataTransfer.types includes 'Files' when OS files are being dragged.
  // Text drags from inside the browser won't trigger the overlay.
  return Array.from(e.dataTransfer?.types ?? []).includes('Files');
}

// Visiting a window:
// 1. clear any pending attention notification (wall stops pulsing)
// 2. ensure the window is zoomed on its active pane so mobile sees one pane
//    full-screen instead of a cramped multi-pane layout. Backend checks
//    window_zoomed_flag and only toggles when needed — idempotent.
async function onEnter() {
  api.clearAttention(props.session, props.id).catch(() => { /* best effort */ });
  // 路由参数带 pane 时,先把那个 pane 设成 active(支持 AgentView / 企微 deep link 精确定位到 claude pane);
  // 不带 pane 就维持 window 自己的 active pane。
  if (props.pane) {
    fetch(
      `/api/sessions/${encodeURIComponent(props.session)}/windows/${encodeURIComponent(props.id)}/panes/${encodeURIComponent(props.pane)}/select`,
      { method: 'POST' },
    ).catch(() => { /* best effort */ });
  }
  api.ensureZoomed(props.session, props.id).catch(() => { /* best effort */ });
}

onMounted(onEnter);
watch(() => [props.session, props.id, props.pane], onEnter);
</script>

<style scoped>
.attached { display: flex; flex-direction: column; height: 100%; position: relative; }
.bar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid #222; }
.bc { color: var(--ink-dim); font: 12px ui-monospace, monospace; }
.bar .spacer { flex: 1; }
.bar .bug {
  font-size: 13px; padding: 4px 10px;
  min-width: 88px;             /* fixed width so state changes don't jitter neighbors */
  background: transparent; border: 1px solid var(--ink-faint); color: var(--ink-dim);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
}
.bar .bug:hover  { color: var(--ink); border-color: var(--ink-dim); }
.bar .bug:active { background: rgba(255, 255, 255, 0.1); }   /* press feedback */
.bar .bug:disabled { cursor: wait; }
.bar .bug.loading { background: var(--ink-faint); color: var(--ink); border-color: var(--ink-dim); }
.bar .bug.ok  { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 700; }
.bar .bug.err { background: var(--err);    color: #fff; border-color: var(--err);    font-weight: 700; }
.bar .refresh-slash {
  font-size: 13px; padding: 4px 10px;
  min-width: 44px;
  background: transparent; border: 1px solid var(--ink-faint); color: var(--ink-dim);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.12s, color 0.12s, border-color 0.12s;
  margin-right: 6px;
}
.bar .refresh-slash:hover  { color: var(--ink); border-color: var(--ink-dim); }
.bar .refresh-slash:active { background: rgba(255, 255, 255, 0.1); }
.bar .refresh-slash:disabled { cursor: wait; }
.bar .refresh-slash.loading { background: var(--ink-faint); color: var(--ink); border-color: var(--ink-dim); }
.bar .refresh-slash.ok  { background: var(--accent); color: #000; border-color: var(--accent); font-weight: 700; }
.bar .refresh-slash.err { background: var(--err);    color: #fff; border-color: var(--err);    font-weight: 700; }
.body { display: flex; flex: 1; min-height: 0; }
.term-area { flex: 1; min-height: 0; padding: 0; overflow: hidden; }

.drop-overlay {
  position: absolute; inset: 0; z-index: 900;
  background: rgba(0, 0, 0, 0.55);
  display: flex; align-items: center; justify-content: center;
  pointer-events: none; /* don't eat drop events; the host catches them */
}
.drop-box {
  border: 2px dashed var(--accent);
  border-radius: 12px;
  padding: 32px 48px;
  background: var(--bg-alt);
  color: var(--accent);
  text-align: center;
  font: 14px ui-monospace, monospace;
}
.drop-icon { font-size: 32px; line-height: 1; margin-bottom: 8px; }
.drop-text { letter-spacing: 0.5px; }
</style>
