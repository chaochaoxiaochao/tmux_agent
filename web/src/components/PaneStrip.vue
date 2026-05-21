<template>
  <div v-if="props.panes.length > 1" class="strip">
    <span class="label">panes</span>
    <button
      v-for="p in props.panes"
      :key="p.id"
      class="pane"
      :class="{ active: p.active }"
      @click="onClick(p)"
    >
      <span class="dot"></span>
      <span class="idx">{{ p.index }}</span>
      <span class="cmd">{{ p.cmd }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { api } from '../api';
import type { PaneMetaItem } from '../types';

const props = defineProps<{ session: string; windowId: string; panes: PaneMetaItem[] }>();

// Click switches active pane and toggles zoom on it. Re-clicking the same
// active pane just toggles zoom. Backend treats select-pane + resize-pane -Z
// as separate calls; we do them in sequence. AttachedView receives the
// updated panes via the WS pane-meta frame triggered by the backend.
async function onClick(p: PaneMetaItem) {
  try {
    if (!p.active) {
      await api.selectPane(props.session, props.windowId, p.id);
    }
    await api.zoomPane(props.session, props.windowId, p.id);
  } catch (e: any) {
    alert(e.message);
  }
}
</script>

<style scoped>
.strip {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px; flex-wrap: wrap;
  border-top: 1px solid #222; background: var(--bg-alt);
}
.label { color: var(--ink-faint); font: 10px ui-monospace, monospace; }
.pane {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 8px; border-radius: 4px;
  font: 11px ui-monospace, monospace;
  background: var(--bg); color: var(--ink-dim);
  border: 1px solid var(--ink-faint);
  cursor: pointer;
}
.pane:hover { border-color: var(--accent); color: var(--ink); }
.pane.active { border-color: var(--accent); color: var(--accent); }
.pane .dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--ink-faint);
}
.pane.active .dot { background: var(--accent); }
.pane .idx { font-weight: 600; }
.pane .cmd { color: var(--ink-faint); }
.pane.active .cmd { color: var(--ink-dim); }
</style>
