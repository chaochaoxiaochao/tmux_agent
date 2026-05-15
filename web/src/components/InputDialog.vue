<template>
  <div v-if="open" class="overlay" @click.self="close">
    <div class="dialog">
      <header class="dialog-bar">
        <span>send to {{ session }} : {{ windowId }}</span>
        <button class="close" @click="close">✕</button>
      </header>

      <!-- attachments strip (hapi-style chips above the textarea) -->
      <div v-if="attachments.length" class="chips">
        <div
          v-for="a in attachments"
          :key="a.id"
          class="chip"
          :class="{ err: a.status === 'error' }"
        >
          <img v-if="a.previewUrl" :src="a.previewUrl" class="thumb" alt="" />
          <span v-else class="thumb fallback">{{ fileIcon(a.mimeType) }}</span>
          <span class="name" :title="a.name">{{ a.name }}</span>
          <span v-if="a.status === 'uploading'" class="spinner" />
          <span v-else-if="a.status === 'error'" class="err-text">failed</span>
          <button class="rm" @click="removeAttachment(a.id)" aria-label="remove">✕</button>
        </div>
      </div>

      <textarea
        ref="ta"
        v-model="text"
        placeholder="type or paste..."
        rows="4"
        autofocus
        @paste="onPaste"
      ></textarea>

      <footer class="actions">
        <button class="clip" @click="openPicker" :title="'attach'" aria-label="attach">
          <!-- paperclip svg copied from hapi for visual parity -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a1.5 1.5 0 0 1-2.12-2.12l7.78-7.78" />
          </svg>
        </button>
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="image/*,application/pdf,text/*"
          @change="onFilesPicked"
          style="display:none"
        />
        <span class="spacer"></span>
        <button @click="close">cancel</button>
        <button class="send" @click="sendNow" :disabled="!canSend">send ⏎</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { api } from '../api';

const props = defineProps<{
  open: boolean;
  session: string;
  windowId: string;
  // Files to immediately upload when the dialog opens. Used by AttachedView's
  // drag-and-drop entry point — drop on the page, dialog pops up with the
  // files already on their way to the server.
  initialFiles?: File[];
}>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  status: 'uploading' | 'ready' | 'error';
  path?: string;       // server-side absolute path, present once uploaded
  previewUrl?: string; // data URL for small images
}

const text = ref('');
const ta = ref<HTMLTextAreaElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const attachments = ref<Attachment[]>([]);

const PREVIEW_MAX_BYTES = 5 * 1024 * 1024;

const canSend = computed(() => {
  if (!text.value && !attachments.value.length) return false;
  // block send while any attachment is still uploading or failed
  return attachments.value.every(a => a.status === 'ready');
});

watch(() => props.open, async (v) => {
  if (v) {
    // wipe in-flight state on every open
    await cleanupAttachments();
    text.value = '';
    attachments.value = [];
    // initialFiles arrives from drag-and-drop: kick off uploads before the
    // user even sees the dialog so chips populate immediately.
    if (props.initialFiles?.length) {
      for (const f of props.initialFiles) void uploadOne(f);
    }
    nextTick(() => ta.value?.focus());
  }
});

function close() {
  void cleanupAttachments();
  attachments.value = [];
  emit('update:open', false);
}

function openPicker() { fileInput.value?.click(); }

async function onFilesPicked(e: Event) {
  const input = e.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  input.value = '';
  for (const f of files) void uploadOne(f);
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  const imgs: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind === 'file') {
      const f = it.getAsFile();
      if (f) imgs.push(f);
    }
  }
  if (imgs.length) {
    e.preventDefault();
    for (const f of imgs) void uploadOne(f);
  }
}

async function uploadOne(file: File) {
  const id = Math.random().toString(36).slice(2);
  const att: Attachment = {
    id,
    name: file.name || 'pasted',
    mimeType: file.type || 'application/octet-stream',
    status: 'uploading',
  };
  // preview for small images
  if (file.type.startsWith('image/') && file.size <= PREVIEW_MAX_BYTES) {
    try { att.previewUrl = await fileToDataUrl(file); } catch { /* preview is optional */ }
  }
  attachments.value.push(att);

  try {
    const b64 = await fileToBase64(file);
    const r = await api.upload(props.session, props.windowId, att.name, att.mimeType, b64);
    // user may have removed it mid-flight
    const cur = attachments.value.find(a => a.id === id);
    if (!cur) {
      // best-effort cleanup if upload still succeeded
      api.deleteUpload(r.path).catch(() => undefined);
      return;
    }
    cur.path = r.path;
    cur.status = 'ready';
  } catch {
    const cur = attachments.value.find(a => a.id === id);
    if (cur) cur.status = 'error';
  }
}

async function removeAttachment(id: string) {
  const idx = attachments.value.findIndex(a => a.id === id);
  if (idx < 0) return;
  const [removed] = attachments.value.splice(idx, 1);
  if (removed.path) api.deleteUpload(removed.path).catch(() => undefined);
}

async function cleanupAttachments() {
  // fire-and-forget delete of any server-side blobs we still own
  for (const a of attachments.value) {
    if (a.path) api.deleteUpload(a.path).catch(() => undefined);
  }
}

async function sendNow() {
  if (!canSend.value) return;
  // Build the message: `@<path1> @<path2> ... <text>\n` — same shape hapi uses.
  // Claude Code reads `@<absolute-path>` and pulls the file into context.
  const refs = attachments.value
    .filter(a => a.status === 'ready' && a.path)
    .map(a => `@${a.path}`)
    .join(' ');
  const body = refs ? (text.value ? `${refs} ${text.value}` : refs) : text.value;
  try { await api.send(props.session, props.windowId, body + '\n'); }
  catch (e: any) { alert(e.message); return; }
  // server now owns the lifecycle of the file (Claude reads it); don't delete.
  attachments.value = [];
  text.value = '';
  emit('update:open', false);
}

function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📄';
  if (mime.startsWith('text/')) return '📝';
  return '📎';
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
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.55);
  display: flex; align-items: flex-end; justify-content: center;
}
.dialog {
  width: 100%; max-width: 720px;
  background: var(--bg-alt);
  border-top: 1px solid var(--ink-faint);
  border-radius: 12px 12px 0 0;
  display: flex; flex-direction: column;
  padding: 12px;
  gap: 10px;
}
.dialog-bar {
  display: flex; align-items: center; justify-content: space-between;
  font: 11px ui-monospace, monospace; color: var(--ink-dim);
}
.close { padding: 2px 8px; }
textarea {
  width: 100%;
  font: 13px/1.4 ui-monospace, JetBrains Mono, monospace;
  background: var(--bg);
  color: var(--ink);
  border: 1px solid var(--ink-faint);
  border-radius: 6px;
  padding: 8px;
  resize: vertical;
  min-height: 80px;
  max-height: 40vh;
  outline: none;
}
textarea:focus { border-color: var(--accent); }
.actions { display: flex; gap: 8px; align-items: center; }
.spacer { flex: 1; }
.send { color: var(--accent); border-color: var(--accent); font-weight: 600; }
.send:disabled { opacity: 0.4; }
.clip {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 50%;
  background: transparent; color: var(--ink-dim);
  border: 1px solid var(--ink-faint);
  cursor: pointer;
}
.clip:hover { color: var(--ink); border-color: var(--ink-dim); }

.chips {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 6px 4px 4px;
  background: var(--bg);
  border: 1px solid var(--ink-faint);
  border-radius: 8px;
  font: 12px ui-monospace, monospace;
  color: var(--ink);
  max-width: 240px;
}
.chip.err { border-color: var(--err); }
.chip.err .name { text-decoration: line-through; color: var(--err); }
.thumb {
  width: 28px; height: 28px; border-radius: 4px;
  object-fit: cover; background: var(--bg-alt);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 16px;
  flex: 0 0 28px;
}
.thumb.fallback { color: var(--ink-dim); }
.name {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 140px;
}
.err-text { color: var(--err); font-size: 11px; }
.spinner {
  width: 12px; height: 12px; border-radius: 50%;
  border: 2px solid var(--ink-faint);
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.rm {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; padding: 0; border-radius: 4px;
  font-size: 11px; line-height: 1;
  background: transparent; color: var(--ink-dim);
  border: none; cursor: pointer;
}
.rm:hover { color: var(--ink); background: var(--bg-alt); }
</style>
