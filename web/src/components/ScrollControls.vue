<template>
  <div class="scrollctl" @contextmenu.prevent>
    <div class="left">
      <button
        class="primary"
        :class="{ active: props.inCopyMode }"
        @click="toggleHistory"
        :title="props.inCopyMode ? 'Exit copy-mode' : 'Enter tmux copy-mode (history)'"
      >📜 {{ props.inCopyMode ? 'exit' : 'history' }}</button>
      <button class="repeat"
        @pointerdown.prevent="startRepeat('PageUp', $event)"
        @pointerup.prevent="stopRepeat" @pointerleave="stopRepeat" @pointercancel="stopRepeat"
        @contextmenu.prevent
        :disabled="!props.inCopyMode" title="Page up">PgUp</button>
      <button class="repeat"
        @pointerdown.prevent="startRepeat('PageDown', $event)"
        @pointerup.prevent="stopRepeat" @pointerleave="stopRepeat" @pointercancel="stopRepeat"
        @contextmenu.prevent
        :disabled="!props.inCopyMode" title="Page down">PgDn</button>
      <span class="sep"></span>
      <button class="accent" @click="reply('y\n')" title="Yes">Yes</button>
      <button class="accent" @click="reply('2\n')" title="Yes · all">Yes·all</button>
      <button class="danger" @click="reply('n\n')" title="No">No</button>
      <span class="sep"></span>
      <button @click="key('Escape')" title="Escape">Esc</button>
      <button class="danger" @click="key('C-c')"    title="Ctrl-C">^C</button>
      <button class="accent" @click="key('Enter')"  title="Enter">⏎</button>
      <span class="sep"></span>
      <button
        :disabled="props.activeCmd === 'claude'"
        @click="reply('claude\n')"
        :title="props.activeCmd === 'claude' ? 'Already in claude' : 'Start a new claude session (`claude` + Enter)'"
      >new</button>
      <button
        :disabled="props.activeCmd === 'claude'"
        @click="reply('claude -c\n')"
        :title="props.activeCmd === 'claude' ? 'Already in claude' : 'Resume last claude session (`claude -c` + Enter)'"
      >resume</button>
    </div>
    <div class="dpad" @contextmenu.prevent>
      <button class="b-up"
        @pointerdown.prevent="startRepeat('Up', $event)"
        @pointerup.prevent="stopRepeat" @pointerleave="stopRepeat" @pointercancel="stopRepeat"
        @contextmenu.prevent
        title="Up">↑</button>
      <button class="b-left"
        @pointerdown.prevent="startRepeat('Left', $event)"
        @pointerup.prevent="stopRepeat" @pointerleave="stopRepeat" @pointercancel="stopRepeat"
        @contextmenu.prevent
        title="Left">←</button>
      <button class="b-down"
        @pointerdown.prevent="startRepeat('Down', $event)"
        @pointerup.prevent="stopRepeat" @pointerleave="stopRepeat" @pointercancel="stopRepeat"
        @contextmenu.prevent
        title="Down">↓</button>
      <button class="b-right"
        @pointerdown.prevent="startRepeat('Right', $event)"
        @pointerup.prevent="stopRepeat" @pointerleave="stopRepeat" @pointercancel="stopRepeat"
        @contextmenu.prevent
        title="Right">→</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { api } from '../api';

const props = defineProps<{ session: string; windowId: string; inCopyMode: boolean; activeCmd: string }>();

async function toggleHistory() {
  try {
    if (props.inCopyMode) {
      await api.sendKey(props.session, props.windowId, 'q');
    } else {
      await api.copyMode(props.session, props.windowId);
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

// ---- d-pad press-and-hold repeat ----
// First key fires immediately; after INITIAL_DELAY a setInterval kicks in
// at REPEAT_INTERVAL until pointerup/leave/cancel. Matches OS keyboard
// repeat behavior so a quick tap doesn't accidentally fire twice.
const INITIAL_DELAY = 400;
const REPEAT_INTERVAL = 90;
let repeatDelayTimer: ReturnType<typeof setTimeout> | null = null;
let repeatIntervalTimer: ReturnType<typeof setInterval> | null = null;

function startRepeat(k: string, e: PointerEvent) {
  // Capture so pointerup fires even if finger slides slightly off the button.
  (e.currentTarget as Element)?.setPointerCapture?.(e.pointerId);
  stopRepeat();
  void key(k);
  repeatDelayTimer = setTimeout(() => {
    repeatIntervalTimer = setInterval(() => { void key(k); }, REPEAT_INTERVAL);
  }, INITIAL_DELAY);
}
function stopRepeat() {
  if (repeatDelayTimer) { clearTimeout(repeatDelayTimer); repeatDelayTimer = null; }
  if (repeatIntervalTimer) { clearInterval(repeatIntervalTimer); repeatIntervalTimer = null; }
}

// Reset when window changes
watch(() => [props.session, props.windowId], () => { stopRepeat(); });
onBeforeUnmount(() => { stopRepeat(); });
</script>

<style scoped>
.scrollctl {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 4px 6px 4px 16px;
  border-top: 2px solid #333;
  background: var(--bg-alt);
  /* 视觉分离:让 tmux status bar / 终端最后一行跟控制条之间有明确空隙 + 边线,
     不再"贴脸"显得像被遮挡。 */
  margin-top: 4px;
}
.left {
  display: flex; gap: 4px; flex-wrap: wrap; align-items: center;
  flex: 1; min-width: 0;
}
.scrollctl button {
  font: 12px ui-monospace, monospace;
  padding: 5px 10px; min-width: 40px;
  /* All buttons in this strip suppress the mobile long-press callout
     (select / copy / magnifier). Only the d-pad arrows and PgUp/PgDn
     actually act on press-and-hold (auto-repeat); everywhere else a
     long-press is just a slow tap. */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
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
