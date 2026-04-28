<template>
  <div v-if="open" class="overlay" @click.self="close">
    <div class="dialog">
      <header class="dialog-bar">
        <span>send to {{ session }} : {{ windowId }}</span>
        <button class="close" @click="close">✕</button>
      </header>

      <textarea
        ref="ta"
        v-model="text"
        placeholder="type, paste, or 🎤 voice..."
        rows="4"
        autofocus
      ></textarea>

      <footer class="actions">
        <button @click="toggleVoice" :class="{ rec: recording }">
          {{ recording ? '● rec' : '🎤' }}
        </button>
        <span class="spacer"></span>
        <button @click="close">cancel</button>
        <button class="send" @click="sendNow" :disabled="!text">send ⏎</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { api } from '../api';

const props = defineProps<{ open: boolean; session: string; windowId: string }>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

const text = ref('');
const recording = ref(false);
const ta = ref<HTMLTextAreaElement | null>(null);

watch(() => props.open, (v) => {
  if (v) {
    text.value = '';
    nextTick(() => ta.value?.focus());
  } else if (rec) {
    try { rec.stop(); } catch { }
  }
});

function close() { emit('update:open', false); }

async function sendNow() {
  if (!text.value) return;
  try { await api.send(props.session, props.windowId, text.value + '\n'); }
  catch (e: any) { alert(e.message); return; }
  close();
}

let rec: any = null;
function toggleVoice() {
  const W = window as any;
  const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!SR) { alert('Web Speech API unsupported'); return; }
  if (recording.value && rec) { try { rec.stop(); } catch { } return; }
  rec = new SR();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = navigator.language || 'en-US';
  rec.onresult = (ev: any) => { text.value += ev.results[0][0].transcript; };
  rec.onend = () => { recording.value = false; };
  rec.onerror = () => { recording.value = false; };
  rec.start();
  recording.value = true;
}
</script>

<style scoped>
.overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, 0.55);
  display: flex; align-items: flex-end; justify-content: center;
}
.dialog {
  width: 100%; max-width: 720px;
  background: var(--bg-alt);
  border-top: 1px solid var(--ink-faint);
  border-radius: 12px 12px 0 0;
  display: flex; flex-direction: column;
  padding: 12px;
  gap: 10px;
}
.dialog-bar {
  display: flex; align-items: center; justify-content: space-between;
  font: 11px ui-monospace, monospace; color: var(--ink-dim);
}
.close { padding: 2px 8px; }
textarea {
  width: 100%;
  font: 13px/1.4 ui-monospace, JetBrains Mono, monospace;
  background: var(--bg);
  color: var(--ink);
  border: 1px solid var(--ink-faint);
  border-radius: 6px;
  padding: 8px;
  resize: vertical;
  min-height: 80px;
  max-height: 40vh;
  outline: none;
}
textarea:focus { border-color: var(--accent); }
.actions { display: flex; gap: 8px; align-items: center; }
.spacer { flex: 1; }
.send { color: var(--accent); border-color: var(--accent); font-weight: 600; }
.send:disabled { opacity: 0.4; }
button.rec { background: var(--err); color: #000; }
</style>
