<template>
  <div class="btnbar">
    <button v-for="b in buttons" :key="b.id" @click="$emit('send', b.payload)">{{ b.label }}</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Button } from '../types';
import { api } from '../api';

const buttons = ref<Button[]>([]);
defineEmits<{ (e: 'send', payload: string): void }>();

onMounted(async () => { buttons.value = await api.buttons(); });
</script>

<style scoped>
.btnbar { display: flex; gap: 8px; padding: 8px; flex-wrap: wrap; border-top: 1px solid #222; background: var(--bg-alt); }
.btnbar button { font-weight: 600; }
</style>
