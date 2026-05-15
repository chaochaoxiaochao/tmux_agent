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
      <span class="bc">{{ session }} : {{ id }}</span>
    </header>
    <PaneStrip :session="session" :window-id="id" />
    <div class="body">
      <div class="term-area"><XtermPane :session="session" :window-id="id" @tap="dialogOpen = true" /></div>
    </div>
    <ScrollControls :session="session" :window-id="id" />
    <InputDialog
      v-model:open="dialogOpen"
      :session="session"
      :window-id="id"
      :initial-files="pendingFiles"
    />

    <!-- drag-and-drop overlay: shows while a file is being dragged over the
         page. On drop we open InputDialog with the files pre-loaded so the
         user can add a message and send. -->
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
import InputDialog from '../components/InputDialog.vue';
import PaneStrip from '../components/PaneStrip.vue';
import { api } from '../api';

const props = defineProps<{ session: string; id: string }>();
const dialogOpen = ref(false);
const pendingFiles = ref<File[]>([]);
const dragActive = ref(false);
let dragDepth = 0;

const dropHintText = computed(() =>
  dialogOpen.value ? 'drop to attach' : 'drop to paste @path into terminal',
);

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
async function onDrop(e: DragEvent) {
  dragDepth = 0;
  dragActive.value = false;
  const files = e.dataTransfer?.files;
  if (!files || !files.length) return;
  const arr = Array.from(files);

  // If the InputDialog is open, route files into its chip strip so the user
  // can write a message and send. Otherwise (desktop default — user is
  // typing in the xterm), upload silently and inject `@<path> ` into the
  // pane so they can keep typing the prompt right after.
  if (dialogOpen.value) {
    pendingFiles.value = arr;
    return;
  }

  for (const f of arr) {
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
    // Trailing space so the user can keep typing without sticking to the
    // path. No newline — user submits the prompt themselves.
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
  api.ensureZoomed(props.session, props.id).catch(() => { /* best effort */ });
}

onMounted(onEnter);
watch(() => [props.session, props.id], onEnter);
// Clear pendingFiles once the dialog has consumed them, so a later re-open
// (e.g. mobile tap on terminal) doesn't accidentally re-upload old files.
watch(dialogOpen, (v) => { if (!v) pendingFiles.value = []; });
</script>

<style scoped>
.attached { display: flex; flex-direction: column; height: 100%; position: relative; }
.bar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid #222; }
.bc { color: var(--ink-dim); font: 12px ui-monospace, monospace; }
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
