<template>
  <div class="composer">
    <!-- 功能键栏:左侧 4 个写死的导航键 + 右侧动态 config buttons。
         按下立刻 api.send 进 PTY,不动文本不动焦点。 -->
    <div class="fnkeys">
      <button
        v-for="k in fnKeys"
        :key="k.label"
        class="fnkey"
        @click="sendKey(k.payload)"
      >{{ k.label }}</button>
    </div>
    <!-- 输入框 + send 按钮。Enter / 点击 send 走 api.send 发文本,清空并 blur。 -->
    <div class="inputrow">
      <textarea
        ref="inputEl"
        v-model="text"
        :placeholder="placeholder"
        rows="1"
        class="input"
        @keydown="onKeydown"
        @input="autoGrow"
      ></textarea>
      <button
        class="btn send"
        :disabled="!canSend"
        @click="send"
      >↩</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { api } from '../api';
import type { Button as ConfigButton } from '../types';

const props = defineProps<{
  session: string;
  windowId: string;
}>();

interface FnKey { label: string; payload: string }

// 左侧写死的终端必备键。终端转义:
//   Esc      =
//   Tab      = \t
//   ArrowUp  = [A
//   ArrowDown= [B
const HARDCODED_KEYS: FnKey[] = [
  { label: 'Esc',  payload: '\x1b' },
  { label: 'Tab',  payload: '\t' },
  { label: '↑',    payload: '\x1b[A' },
  { label: '↓',    payload: '\x1b[B' },
];
const HARDCODED_PAYLOADS = new Set(HARDCODED_KEYS.map(k => k.payload));

const configButtons = ref<ConfigButton[]>([]);

onMounted(async () => {
  try {
    configButtons.value = await api.buttons();
  } catch {
    // 拿不到就空着,左侧固定键仍然可用
    configButtons.value = [];
  }
});

const fnKeys = computed<FnKey[]>(() => {
  // config buttons 中与固定键 payload 重复的剔掉(典型:config 默认有 Esc)
  const extras = configButtons.value
    .filter(b => !HARDCODED_PAYLOADS.has(b.payload))
    .map(b => ({ label: b.label, payload: b.payload }));
  return [...HARDCODED_KEYS, ...extras];
});

async function sendKey(payload: string) {
  try {
    await api.send(props.session, props.windowId, payload);
  } catch (e) {
    // silent log,功能键失败不弹 alert 打扰
    console.warn('[composer] sendKey failed', e);
  }
}

const text = ref('');
const inputEl = ref<HTMLTextAreaElement | null>(null);

const placeholder = 'type or paste...';
const canSend = computed(() => text.value.length > 0);

// 触屏不 autofocus,桌面 autofocus(用户进 attached view 想直接打字)
const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
onMounted(() => {
  if (!isTouchDevice) {
    nextTick(() => inputEl.value?.focus());
  }
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

async function send() {
  if (!canSend.value) return;
  const body = text.value + '\n';
  try {
    await api.send(props.session, props.windowId, body);
  } catch (e: any) {
    alert(e?.message ?? 'send failed');
    return; // 失败保留 text,让用户重试
  }
  text.value = '';
  // 主动 blur:手机软键盘收起
  inputEl.value?.blur();
  nextTick(autoGrow); // 重置高度
}

function onKeydown(ev: KeyboardEvent) {
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
}
.fnkeys {
  display: flex; gap: 6px; padding: 6px 8px;
  overflow-x: auto; overflow-y: hidden;
  scrollbar-width: thin;
}
.fnkey {
  flex: 0 0 auto;
  font: 12px ui-monospace, JetBrains Mono, monospace;
  padding: 6px 10px;
  background: var(--bg); color: var(--ink);
  border: 1px solid var(--ink-faint);
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}
.fnkey:active { background: rgba(255, 255, 255, 0.1); }
.inputrow {
  display: flex; gap: 6px; align-items: flex-end;
  padding: 6px 8px;
}
.input {
  flex: 1;
  min-height: 32px;
  max-height: 124px;
  resize: none;
  font: 13px/1.4 ui-monospace, JetBrains Mono, monospace;
  background: var(--bg); color: var(--ink);
  border: 1px solid var(--ink-faint);
  border-radius: 6px;
  padding: 6px 8px;
  outline: none;
}
.input:focus { border-color: var(--accent); }
.btn {
  flex: 0 0 auto;
  font: 13px ui-monospace, monospace;
  padding: 6px 12px;
  background: var(--bg); color: var(--ink);
  border: 1px solid var(--ink-faint);
  border-radius: 6px;
  cursor: pointer;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn.send { color: var(--accent); border-color: var(--accent); font-weight: 600; }

/* 桌面端有真键盘,功能键栏隐藏 */
@media (min-width: 601px) {
  .fnkeys { display: none; }
}
</style>
