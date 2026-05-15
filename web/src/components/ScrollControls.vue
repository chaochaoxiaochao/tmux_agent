<template>
  <div class="scrollctl">
    <div class="left">
      <button
        class="primary"
        :class="{ active: inCopyMode }"
        @click="toggleHistory"
        :title="inCopyMode ? 'Exit copy-mode' : 'Enter tmux copy-mode (history)'"
      >📜 {{ inCopyMode ? 'exit' : 'history' }}</button>
      <button @click="key('PageUp')"   :disabled="!inCopyMode" title="Page up">PgUp</button>
      <button @click="key('PageDown')" :disabled="!inCopyMode" title="Page down">PgDn</button>
      <span class="sep"></span>
      <button class="accent" @click="reply('y\n')" title="Yes">Yes</button>
      <button class="accent" @click="reply('2\n')" title="Yes · all">Yes·all</button>
      <button class="danger" @click="reply('n\n')" title="No">No</button>
      <span class="sep"></span>
      <button @click="key('Escape')" title="Escape">Esc</button>
      <button class="danger" @click="key('C-c')"    title="Ctrl-C">^C</button>
      <button class="accent" @click="key('Enter')"  title="Enter">⏎</button>
    </div>
    <div class="dpad">
      <button class="b-up"    @click="key('Up')"    title="Up">↑</button>
      <button class="b-left"  @click="key('Left')"  title="Left">←</button>
      <button class="b-down"  @click="key('Down')"  title="Down">↓</button>
      <button class="b-right" @click="key('Right')" title="Right">→</button>
    </div>
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

async function reply(payload: string) {
  try { await api.send(props.session, props.windowId, payload); }
  catch (e: any) { alert(e.message); }
}

// Reset when window changes
watch(() => [props.session, props.windowId], () => { inCopyMode.value = false; });
</script>

<style scoped>
.scrollctl {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 4px 6px 4px 16px;
  border-top: 1px solid #222;
  background: var(--bg-alt);
}
.left {
  display: flex; gap: 4px; flex-wrap: wrap; align-items: center;
  flex: 1; min-width: 0;
}
.scrollctl button {
  font: 12px ui-monospace, monospace;
  padding: 5px 10px; min-width: 40px;
}
.scrollctl button.primary { color: var(--accent); border-color: var(--accent); font-weight: 600; }
.scrollctl button.primary.active { background: var(--accent); color: #000; }
.scrollctl button.accent  { color: var(--accent); border-color: var(--accent); font-weight: 600; }
.scrollctl button.danger  { color: var(--err);    border-color: var(--err);    font-weight: 600; }
.scrollctl button:disabled { opacity: 0.4; cursor: default; }
.sep { width: 1px; align-self: stretch; background: var(--ink-faint); margin: 2px 4px; opacity: 0.5; }

/* D-pad cross on the right. 3-col grid: ↑ centered on row 1, ← ↓ → on row 2. */
.dpad {
  display: grid;
  grid-template-columns: repeat(3, 38px);
  grid-template-rows: 30px 30px;
  gap: 3px;
  flex-shrink: 0;
}
.dpad button {
  font-size: 14px; font-weight: 600;
  padding: 0; min-width: 0;
  display: flex; align-items: center; justify-content: center;
}
.b-up    { grid-column: 2; grid-row: 1; }
.b-left  { grid-column: 1; grid-row: 2; }
.b-down  { grid-column: 2; grid-row: 2; }
.b-right { grid-column: 3; grid-row: 2; }
</style>
