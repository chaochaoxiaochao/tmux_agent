<template>
  <div class="btnbar">
    <button v-for="b in buttons" :key="b.id" @click="$emit('send', b.payload)">{{ b.label }}</button>
    <button class="edit" @click="editing = !editing">edit</button>
    <ButtonEditor v-if="editing" @close="editing = false" @changed="reload" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';
import type { Button } from '../types';
import ButtonEditor from './ButtonEditor.vue';

const buttons = ref<Button[]>([]);
const editing = ref(false);
defineEmits<{ (e: 'send', payload: string): void }>();

async function reload() { buttons.value = await api.buttons(); }
onMounted(reload);
</script>

<style scoped>
.btnbar { display: flex; gap: 8px; padding: 8px; flex-wrap: wrap; border-top: 1px solid #222; background: var(--bg-alt); position: relative; }
.btnbar button { font-weight: 600; }
.btnbar button.edit { margin-left: auto; font-weight: 400; color: var(--ink-dim); }
</style>
