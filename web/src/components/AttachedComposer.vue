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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
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

/* 桌面端有真键盘,功能键栏隐藏 */
@media (min-width: 601px) {
  .fnkeys { display: none; }
}
</style>
