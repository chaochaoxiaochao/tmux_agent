<template>
  <div class="attached">
    <header class="bar">
      <button @click="$router.push('/')">← wall</button>
      <span class="bc">{{ session }} : {{ id }}</span>
      <span class="spacer"></span>
      <button class="kbd-btn" @click="dialogOpen = true">⌨ input</button>
    </header>
    <PaneStrip :session="session" :window-id="id" />
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
import { onMounted, ref, watch } from 'vue';
import XtermPane from '../components/XtermPane.vue';
import StatusPanel from '../components/StatusPanel.vue';
import ScrollControls from '../components/ScrollControls.vue';
import FixedButtonBar from '../components/FixedButtonBar.vue';
import InputDialog from '../components/InputDialog.vue';
import PaneStrip from '../components/PaneStrip.vue';
import { api } from '../api';

const props = defineProps<{ session: string; id: string }>();
const dialogOpen = ref(false);

async function onSend(payload: string) {
  try { await api.send(props.session, props.id, payload); }
  catch (e: any) { alert(e.message); }
}

// Visiting a window:
// 1. clear any pending attention notification (wall stops pulsing)
// 2. if window has 2+ panes, auto-zoom the active one for a focused mobile view
async function onEnter() {
  api.clearAttention(props.session, props.id).catch(() => { /* best effort */ });
  try {
    const panes = await api.panes(props.session, props.id);
    if (panes.length > 1) {
      const active = panes.find(p => p.active) ?? panes[0];
      // resize-pane -Z is a toggle, but tmux keeps the zoom state per-window;
      // calling it twice in a row would un-zoom. Instead, we only zoom when
      // the window isn't already in a zoomed state. There's no direct flag,
      // so heuristic: if exactly one pane is reported with non-trivial size
      // and others are 0x0, it's likely already zoomed. Skipping to avoid
      // double-toggle. Otherwise zoom.
      const looksZoomed = panes.filter(p => p.size === '0x0').length === panes.length - 1;
      if (!looksZoomed) {
        await api.zoomPane(props.session, props.id, active.id);
      }
    }
  } catch { /* best effort, ignore */ }
}

onMounted(onEnter);
watch(() => [props.session, props.id], onEnter);
</script>

<style scoped>
.attached { display: flex; flex-direction: column; height: 100%; }
.bar { display: flex; align-items: center; gap: 12px; padding: 8px 16px; border-bottom: 1px solid #222; }
.bc { color: var(--ink-dim); font: 12px ui-monospace, monospace; }
.spacer { flex: 1; }
.kbd-btn { color: var(--accent); border-color: var(--accent); }
.body { display: flex; flex: 1; min-height: 0; }
.term-area { flex: 1; min-height: 0; padding: 0; overflow: hidden; }
</style>
