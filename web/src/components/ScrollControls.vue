<template>
  <div class="scrollctl">
    <button
      class="primary"
      :class="{ active: inCopyMode }"
      @click="toggleHistory"
      :title="inCopyMode ? 'Exit copy-mode' : 'Enter tmux copy-mode (history)'"
    >
      📜 {{ inCopyMode ? 'exit' : 'history' }}
    </button>
    <button @click="key('Up')" :disabled="!inCopyMode" :title="'Scroll up one line'">↑</button>
    <button @click="key('Down')" :disabled="!inCopyMode" :title="'Scroll down one line'">↓</button>
    <button @click="key('PageUp')" :disabled="!inCopyMode" :title="'Page up'">PgUp</button>
    <button @click="key('PageDown')" :disabled="!inCopyMode" :title="'Page down'">PgDn</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { api } from '../api';

const props = defineProps<{ session: string; windowId: string }>();

// Tracks our intent. tmux's actual copy-mode state could drift (e.g. user
// pressed q in the terminal directly, or auto-exited). The button is a
// best-effort toggle; the underlying RPCs (copy-mode / send-keys q) are
// idempotent so calling either redundantly is harmless.
const inCopyMode = ref(false);

async function toggleHistory() {
  try {
    if (inCopyMode.value) {
      await api.sendKey(props.session, props.windowId, 'q');
      inCopyMode.value = false;
    } else {
      await api.copyMode(props.session, props.windowId);
      inCopyMode.value = true;
    }
  } catch (e: any) {
    alert(e.message);
  }
}

async function key(k: string) {
  try { await api.sendKey(props.session, props.windowId, k); }
  catch (e: any) { alert(e.message); }
}

// Reset when window changes
watch(() => [props.session, props.windowId], () => { inCopyMode.value = false; });
</script>

<style scoped>
.scrollctl { display: flex; gap: 6px; padding: 6px 8px; flex-wrap: wrap; border-top: 1px solid #222; background: var(--bg-alt); }
.scrollctl button { font: 11px ui-monospace, monospace; padding: 5px 10px; min-width: 40px; }
.scrollctl button.primary { color: var(--accent); border-color: var(--accent); font-weight: 600; }
.scrollctl button.primary.active { background: var(--accent); color: #000; }
.scrollctl button:disabled { opacity: 0.4; cursor: default; }
</style>
