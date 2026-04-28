<template>
  <div class="inputbar">
    <input v-model="text" @keydown.enter="send" placeholder="type or 🎤 to speak..." />
    <button @click="toggleVoice" :class="{ rec: recording }">{{ recording ? '● rec' : '🎤' }}</button>
    <button class="send" @click="send">send ⏎</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const text = ref('');
const recording = ref(false);
const emit = defineEmits<{ (e: 'send', payload: string): void }>();

function send() {
  if (!text.value) return;
  emit('send', text.value + '\n');
  text.value = '';
}

let rec: any = null;
function toggleVoice() {
  const W = window as any;
  const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!SR) { alert('Web Speech API unsupported in this browser'); return; }
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
.inputbar { display: flex; gap: 6px; padding: 8px; border-top: 1px solid #222; }
.inputbar input { flex: 1; }
button.rec { background: #d97766; color: #000; }
button.send { border-color: var(--accent); color: var(--accent); }
</style>
