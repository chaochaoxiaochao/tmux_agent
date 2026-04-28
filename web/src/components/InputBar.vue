<template>
  <div ref="wrapEl" class="inputbar-wrap">
    <MentionPicker :items="items" :active="active" @pick="pick" />
    <div class="inputbar">
      <input
        ref="inputEl"
        v-model="text"
        @keydown="onKey"
        @focus="onFocus"
        placeholder="type or 🎤 ..."
      />
      <button @click="toggleVoice" :class="{ rec: recording }">{{ recording ? '● rec' : '🎤' }}</button>
      <button class="send" @click="send">send ⏎</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import MentionPicker from './MentionPicker.vue';
import { api } from '../api';
import type { CompletionItem } from '../types';

const text = ref('');
const recording = ref(false);
const items = ref<CompletionItem[]>([]);
const active = ref(0);
const triggerChar = ref<'@' | '/' | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const wrapEl = ref<HTMLDivElement | null>(null);

// On mobile, when the on-screen keyboard appears the visualViewport shrinks.
// Whenever it resizes (keyboard show/hide/rotate), make sure the input bar
// stays above the keyboard.
function ensureInputVisible() {
  if (!wrapEl.value) return;
  // Use rAF + small timeout so layout has stabilized after keyboard animation.
  requestAnimationFrame(() => {
    setTimeout(() => {
      wrapEl.value?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }, 50);
  });
}

function onFocus() {
  // Initial focus: keyboard may take ~300ms to appear, retry once.
  ensureInputVisible();
  setTimeout(ensureInputVisible, 350);
}

const onViewportResize = () => {
  // Only react if the input is the active element — avoids fighting the user
  // when the keyboard hides and they're scrolling around the terminal.
  if (document.activeElement === inputEl.value) ensureInputVisible();
};

onMounted(() => {
  const vv = (window as any).visualViewport as VisualViewport | undefined;
  vv?.addEventListener('resize', onViewportResize);
});
onUnmounted(() => {
  const vv = (window as any).visualViewport as VisualViewport | undefined;
  vv?.removeEventListener('resize', onViewportResize);
});

const emit = defineEmits<{ (e: 'send', payload: string): void }>();

function send() {
  if (!text.value) return;
  emit('send', text.value + '\n');
  text.value = '';
  items.value = [];
}

function detectTrigger(): { char: '@' | '/'; suffix: string } | null {
  const v = text.value;
  for (let i = v.length - 1; i >= 0; i--) {
    const c = v[i];
    if (c === ' ') return null;
    if (c === '@' || c === '/') return { char: c, suffix: v.slice(i + 1) };
  }
  return null;
}

watch(text, async () => {
  const trig = detectTrigger();
  if (!trig) { items.value = []; triggerChar.value = null; return; }
  triggerChar.value = trig.char;
  try {
    items.value = trig.char === '@'
      ? await api.files(trig.suffix)
      : await api.commands(trig.suffix);
    active.value = 0;
  } catch { items.value = []; }
});

function pick(it: CompletionItem) {
  const trig = detectTrigger();
  if (!trig) return;
  const before = text.value.slice(0, text.value.length - trig.suffix.length - 1);
  const insert = it.kind === 'file' ? `@${it.path} ` : it.payload;
  text.value = before + insert;
  items.value = [];
  inputEl.value?.focus();
}

function onKey(ev: KeyboardEvent) {
  if (items.value.length) {
    if (ev.key === 'ArrowDown') { active.value = (active.value + 1) % items.value.length; ev.preventDefault(); return; }
    if (ev.key === 'ArrowUp') { active.value = (active.value - 1 + items.value.length) % items.value.length; ev.preventDefault(); return; }
    if (ev.key === 'Enter') { pick(items.value[active.value]); ev.preventDefault(); return; }
    if (ev.key === 'Escape') { items.value = []; ev.preventDefault(); return; }
  } else if (ev.key === 'Enter') {
    send(); ev.preventDefault();
  }
}

let rec: any = null;
function toggleVoice() {
  const W = window as any;
  const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!SR) { alert('Web Speech API unsupported'); return; }
  if (recording.value && rec) { rec.stop(); return; }
  rec = new SR();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = navigator.language || 'en-US';
  rec.onresult = (ev: any) => { text.value += ev.results[0][0].transcript; };
  rec.onend = () => { recording.value = false; };
  rec.start();
  recording.value = true;
}
</script>

<style scoped>
.inputbar-wrap { position: relative; }
.inputbar { display: flex; gap: 6px; padding: 8px; border-top: 1px solid #222; }
.inputbar input { flex: 1; }
button.rec { background: #d97766; color: #000; }
button.send { border-color: var(--accent); color: var(--accent); }
</style>
