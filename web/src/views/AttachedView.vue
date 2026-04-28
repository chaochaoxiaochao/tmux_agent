<template>
  <div class="attached">
    <header class="bar">
      <button @click="$router.push('/')">← wall</button>
      <span class="bc">{{ id }}</span>
    </header>
    <div class="term-area">
      <XtermPane :window-id="id" />
    </div>
    <InputBar @send="onSend" />
    <FixedButtonBar @send="onSend" />
  </div>
</template>

<script setup lang="ts">
import XtermPane from '../components/XtermPane.vue';
import InputBar from '../components/InputBar.vue';
import FixedButtonBar from '../components/FixedButtonBar.vue';
import { api } from '../api';
const props = defineProps<{ id: string }>();

async function onSend(payload: string) {
  try { await api.send(props.id, payload); }
  catch (e: any) { alert(e.message); }
}
</script>

<style scoped>
.attached { display: flex; flex-direction: column; height: 100%; }
.bar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid #222; }
.bc { color: var(--ink-dim); font: 12px ui-monospace, monospace; }
.term-area { flex: 1; min-height: 0; padding: 8px; }
</style>
