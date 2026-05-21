<template>
  <div class="composer">
    <div class="picker-anchor">
      <MentionPicker
        :items="completionItems"
        :active="completionActive"
        @pick="pickCompletion"
      />
    </div>
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
import MentionPicker from './MentionPicker.vue';
import type { CompletionItem } from '../types';

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
      : await api.commands(trig.suffix);
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
  // 普通模式: Enter = send; Shift+Enter = 换行
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
</style>
