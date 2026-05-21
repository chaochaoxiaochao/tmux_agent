<template>
  <div class="composer">
    <!-- 输入框 + send 按钮。Enter / 点击 send 走 api.send 发文本,清空并 blur。
         功能键(Esc/Ctrl+C/Yes/No/方向键)由 ScrollControls 提供,不在 composer 里重复。 -->
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
      >send ↩</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { api } from '../api';

const props = defineProps<{
  session: string;
  windowId: string;
}>();

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
</style>
