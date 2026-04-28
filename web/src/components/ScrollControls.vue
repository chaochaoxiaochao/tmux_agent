<template>
  <div class="scrollctl">
    <button class="primary" @click="enter" :title="'Enter tmux copy-mode (history)'">📜 history</button>
    <button @click="key('Up')" :title="'Scroll up one line'">↑</button>
    <button @click="key('Down')" :title="'Scroll down one line'">↓</button>
    <button @click="key('PageUp')" :title="'Page up'">PgUp</button>
    <button @click="key('PageDown')" :title="'Page down'">PgDn</button>
    <button @click="key('q')" :title="'Exit copy-mode'">exit</button>
  </div>
</template>

<script setup lang="ts">
import { api } from '../api';
const props = defineProps<{ session: string; windowId: string }>();

async function enter() {
  try { await api.copyMode(props.session, props.windowId); }
  catch (e: any) { alert(e.message); }
}

async function key(k: string) {
  try { await api.sendKey(props.session, props.windowId, k); }
  catch (e: any) { alert(e.message); }
}
</script>

<style scoped>
.scrollctl { display: flex; gap: 6px; padding: 6px 8px; flex-wrap: wrap; border-top: 1px solid #222; background: var(--bg-alt); }
.scrollctl button { font: 11px ui-monospace, monospace; padding: 5px 10px; min-width: 40px; }
.scrollctl button.primary { color: var(--accent); border-color: var(--accent); font-weight: 600; }
</style>
