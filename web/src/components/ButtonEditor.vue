<template>
  <div class="editor">
    <h3>编辑按钮</h3>
    <div v-for="b in buttons" :key="b.id" class="row">
      <input v-model="b.label" />
      <input v-model="b.payload" placeholder="payload (\n=Enter, \t=Tab, \x1b=ESC)" />
      <button @click="save(b)">save</button>
      <button @click="del(b.id)">del</button>
    </div>
    <div class="row">
      <input v-model="newLabel" placeholder="label" />
      <input v-model="newPayload" placeholder="payload" />
      <button @click="add">+ add</button>
    </div>
    <button class="close" @click="$emit('close')">close</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';
import type { Button } from '../types';

const buttons = ref<Button[]>([]);
const newLabel = ref(''); const newPayload = ref('');
const emit = defineEmits<{ (e: 'close'): void; (e: 'changed'): void }>();

onMounted(async () => { buttons.value = await api.buttons(); });
async function save(b: Button) { await api.updateButton(b.id, { label: b.label, payload: b.payload }); emit('changed'); }
async function del(id: string) { await api.deleteButton(id); buttons.value = buttons.value.filter(b => b.id !== id); emit('changed'); }
async function add() {
  if (!newLabel.value) return;
  const b = await api.createButton({ label: newLabel.value, payload: newPayload.value });
  buttons.value.push(b);
  newLabel.value = newPayload.value = '';
  emit('changed');
}
</script>

<style scoped>
.editor { position: fixed; right: 16px; bottom: 80px; width: 360px; padding: 12px; background: var(--bg-alt);
  border: 1px solid var(--ink-faint); border-radius: 6px; }
.row { display: flex; gap: 6px; margin-bottom: 6px; }
.row input { flex: 1; }
.close { margin-top: 8px; }
</style>
