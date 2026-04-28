<template>
  <div class="attached">
    <header class="bar">
      <button @click="$router.push('/')">← wall</button>
      <span class="bc">{{ session }} : {{ id }}</span>
      <span class="spacer"></span>
      <button class="kbd-btn" @click="dialogOpen = true">⌨ input</button>
    </header>
    <div class="body">
      <div class="term-area"><XtermPane :session="session" :window-id="id" /></div>
      <StatusPanel :window-id="id" :title="`${session} : ${id}`" />
    </div>
    <ScrollControls :session="session" :window-id="id" />
    <FixedButtonBar @send="onSend" />
    <InputDialog v-model:open="dialogOpen" :session="session" :window-id="id" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import XtermPane from '../components/XtermPane.vue';
import StatusPanel from '../components/StatusPanel.vue';
import ScrollControls from '../components/ScrollControls.vue';
import FixedButtonBar from '../components/FixedButtonBar.vue';
import InputDialog from '../components/InputDialog.vue';
import { api } from '../api';

const props = defineProps<{ session: string; id: string }>();
const dialogOpen = ref(false);

async function onSend(payload: string) {
  try { await api.send(props.session, props.id, payload); }
  catch (e: any) { alert(e.message); }
}
</script>

<style scoped>
.attached { display: flex; flex-direction: column; height: 100%; }
.bar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid #222; }
.bc { color: var(--ink-dim); font: 12px ui-monospace, monospace; }
.spacer { flex: 1; }
.kbd-btn { color: var(--accent); border-color: var(--accent); }
.body { display: flex; flex: 1; min-height: 0; }
.term-area { flex: 1; min-height: 0; padding: 8px; }
</style>
