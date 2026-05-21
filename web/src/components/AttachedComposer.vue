<template>
  <div ref="wrapEl" class="composer">
    <div class="picker-anchor">
      <MentionPicker
        :items="completionItems"
        :active="completionActive"
        @pick="pickCompletion"
      />
    </div>
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
    <div class="inputrow">
      <button class="btn clip" @click="openPicker" aria-label="attach">📎</button>
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/*,application/pdf,text/*"
        @change="onFilesPicked"
        style="display:none"
      />
      <textarea
        ref="inputEl"
        v-model="text"
        :placeholder="placeholder"
        rows="1"
        class="input"
        @keydown="onKeydown"
        @input="autoGrow"
        @paste="onPaste"
        @focus="onInputFocus"
      ></textarea>
      <button
        class="btn send"
        :disabled="!canSend"
        @click="send"
      >send ↩</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { api } from '../api';
import MentionPicker from './MentionPicker.vue';
import type { CompletionItem } from '../types';

const props = defineProps<{
  session: string;
  windowId: string;
  pendingFiles?: File[];
}>();
const emit = defineEmits<{ (e: 'pending-consumed'): void }>();

const text = ref('');
const inputEl = ref<HTMLTextAreaElement | null>(null);
const wrapEl = ref<HTMLDivElement | null>(null);

const placeholder = 'type or paste...';

interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  status: 'uploading' | 'ready' | 'error';
  path?: string;
  previewUrl?: string;
}

const attachments = ref<Attachment[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);
const PREVIEW_MAX_BYTES = 5 * 1024 * 1024;

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
function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼';
  if (mime.startsWith('video/')) return '🎬';
  if (mime.startsWith('audio/')) return '🎵';
  if (mime === 'application/pdf') return '📄';
  if (mime.startsWith('text/')) return '📝';
  return '📎';
}

async function uploadOne(file: File) {
  const id = Math.random().toString(36).slice(2);
  const att: Attachment = {
    id,
    name: file.name || 'pasted',
    mimeType: file.type || 'application/octet-stream',
    status: 'uploading',
  };
  if (file.type.startsWith('image/') && file.size <= PREVIEW_MAX_BYTES) {
    try { att.previewUrl = await fileToDataUrl(file); } catch { /* optional */ }
  }
  attachments.value.push(att);

  try {
    const b64 = await fileToBase64(file);
    const r = await api.upload(props.session, props.windowId, att.name, att.mimeType, b64);
    const cur = attachments.value.find(a => a.id === id);
    if (!cur) {
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

function removeAttachment(id: string) {
  const idx = attachments.value.findIndex(a => a.id === id);
  if (idx < 0) return;
  const [removed] = attachments.value.splice(idx, 1);
  if (removed.path) api.deleteUpload(removed.path).catch(() => undefined);
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

// 父组件 pendingFiles 变更 → 立刻上传 + emit pending-consumed
watch(() => props.pendingFiles, (files) => {
  if (!files || files.length === 0) return;
  for (const f of files) void uploadOne(f);
  emit('pending-consumed');
}, { immediate: true });

const canSend = computed(() => {
  if (!text.value && attachments.value.length === 0) return false;
  return attachments.value.every(a => a.status === 'ready');
});

// 触屏不 autofocus,桌面 autofocus(用户进 attached view 想直接打字)
const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;

function ensureComposerVisible() {
  if (!wrapEl.value) return;
  requestAnimationFrame(() => {
    setTimeout(() => {
      wrapEl.value?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }, 50);
  });
}

function onInputFocus() {
  ensureComposerVisible();
  setTimeout(ensureComposerVisible, 350); // 键盘动画完成后再校一次
}

const onViewportResize = () => {
  if (document.activeElement === inputEl.value) ensureComposerVisible();
};

onMounted(() => {
  if (!isTouchDevice) {
    nextTick(() => inputEl.value?.focus());
  }
  const vv = (window as any).visualViewport as VisualViewport | undefined;
  vv?.addEventListener('resize', onViewportResize);
});

onUnmounted(() => {
  const vv = (window as any).visualViewport as VisualViewport | undefined;
  vv?.removeEventListener('resize', onViewportResize);
});

function autoGrow() {
  const el = inputEl.value;
  if (!el) return;
  el.style.height = 'auto';
  // 最多 6 行高度后内部滚动 (按 line-height ~ 1.4 * 13px ≈ 18px 算)
  const maxH = 6 * 18 + 16; // 6 行 + padding
  el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
}

watch(text, () => nextTick(autoGrow));

const completionItems = ref<CompletionItem[]>([]);
const completionActive = ref(0);
const completionTrigger = ref<'/' | '@' | null>(null);

function detectTrigger(): { char: '/' | '@'; suffix: string } | null {
  const v = text.value;
  for (let i = v.length - 1; i >= 0; i--) {
    const c = v[i];
    if (c === ' ' || c === '\n') return null;
    if (c === '/' || c === '@') return { char: c as '/' | '@', suffix: v.slice(i + 1) };
  }
  return null;
}

// per-instance token (script setup top-level let 实际是模块级共享 —— Vue 3 SFC 坑;
// 多实例同页会互相吞掉补全请求。包成 ref 让每个 instance 独立。)
const completionToken = ref(0);
watch(text, async () => {
  const trig = detectTrigger();
  if (!trig) {
    completionItems.value = [];
    completionTrigger.value = null;
    return;
  }
  completionTrigger.value = trig.char;
  const token = ++completionToken.value;
  try {
    const items: CompletionItem[] = trig.char === '@'
      ? await api.files(trig.suffix)
      : []; // '/' 分支由 Task 6 用 prewarm cache 接上 — 过渡态返回空
    // 防止旧请求晚到覆盖新结果
    if (token !== completionToken.value) return;
    completionItems.value = items;
    completionActive.value = 0;
  } catch {
    if (token === completionToken.value) completionItems.value = [];
  }
});

function pickCompletion(it: CompletionItem) {
  const trig = detectTrigger();
  if (!trig) return;
  // text 末尾 = '<trig.char><trig.suffix>',需替换这一段
  const drop = 1 + trig.suffix.length; // 含触发字符
  const before = text.value.slice(0, text.value.length - drop);
  if (it.kind === 'file') {
    // @file: 追加 @<path>(尾随空格,光标留后)
    text.value = before + `@${it.path} `;
  } else {
    // /cmd: 替换为 payload,留框内等用户再按 send (与 Wall InputBar 历史行为一致)
    text.value = before + it.payload;
  }
  completionItems.value = [];
  completionTrigger.value = null;
  nextTick(() => inputEl.value?.focus());
}

async function send() {
  if (!canSend.value) return;
  const refs = attachments.value
    .filter(a => a.status === 'ready' && a.path)
    .map(a => `@${a.path}`)
    .join(' ');
  const body = refs
    ? (text.value ? `${refs} ${text.value}` : refs)
    : text.value;
  try {
    await api.send(props.session, props.windowId, body + '\n');
  } catch (e: any) {
    alert(e?.message ?? 'send failed');
    return;
  }
  text.value = '';
  attachments.value = []; // server 已接收,文件由 Claude 读;不在前端 delete
  // 主动 blur:手机软键盘收起
  inputEl.value?.blur();
  nextTick(autoGrow); // 重置高度
}

function onKeydown(ev: KeyboardEvent) {
  // 补全菜单展开时,方向键 / Enter / Esc 给菜单用
  if (completionItems.value.length) {
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      completionActive.value = (completionActive.value + 1) % completionItems.value.length;
      return;
    }
    if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      completionActive.value =
        (completionActive.value - 1 + completionItems.value.length) % completionItems.value.length;
      return;
    }
    if (ev.key === 'Enter') {
      ev.preventDefault();
      pickCompletion(completionItems.value[completionActive.value]);
      return;
    }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      completionItems.value = [];
      completionTrigger.value = null;
      return;
    }
  }
  // 普通模式 Enter 语义按设备分:
  //   - 桌面: Enter = send, Shift+Enter = 换行 (传统习惯)
  //   - 触屏: Enter = 换行 (textarea 原生), 发送只能点 send 按钮
  //     原因: 手机系统输入法的"换行/Go"键发的就是 Enter, 拦走会让用户无法
  //     输入多行 prompt; 而手机用户已经习惯靠 send 按钮发送 (微信/IM 都这样)
  if (isTouchDevice) return;
  if (ev.key === 'Enter' && !ev.shiftKey) {
    ev.preventDefault();
    send();
  }
}
</script>

<style scoped>
.composer {
  display: flex; flex-direction: column;
  border-top: 1px solid #222;
  background: var(--bg-alt);
  position: relative;
}
.picker-anchor {
  position: absolute;
  left: 0; right: 0;
  bottom: 100%;          /* 浮在 composer 顶部之上,不挡输入框 */
  pointer-events: none;  /* 允许 MentionPicker 内部 .picker 自己接事件,wrapper 不挡 */
}
.picker-anchor :deep(.picker) {
  position: static;       /* 覆盖 MentionPicker 原 absolute */
  margin: 0 8px;
  pointer-events: auto;
}
.inputrow {
  display: flex; gap: 8px; align-items: stretch;
  padding: 8px;
}
.input {
  flex: 1;
  min-height: 44px;
  max-height: 124px;
  resize: none;
  font: 13px/1.4 ui-monospace, JetBrains Mono, monospace;
  background: var(--bg); color: var(--ink);
  border: 1px solid var(--ink-faint);
  border-radius: 6px;
  padding: 10px 10px;
  outline: none;
}
.input:focus { border-color: var(--accent); }
.btn {
  flex: 0 0 auto;
  font: 14px ui-monospace, monospace;
  padding: 0 18px;
  min-width: 84px;
  background: var(--bg); color: var(--ink);
  border: 1px solid var(--ink-faint);
  border-radius: 6px;
  cursor: pointer;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn.send {
  color: var(--accent); border-color: var(--accent); font-weight: 600;
  font-size: 15px;
}
.chips {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 6px 8px 0;
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
  width: 24px; height: 24px; border-radius: 4px;
  object-fit: cover; background: var(--bg-alt);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 14px;
  flex: 0 0 24px;
}
.thumb.fallback { color: var(--ink-dim); }
.name {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 140px;
}
.err-text { color: var(--err); font-size: 11px; }
.spinner {
  width: 10px; height: 10px; border-radius: 50%;
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
.btn.clip { font-size: 16px; padding: 0 10px; min-width: auto; }
</style>
