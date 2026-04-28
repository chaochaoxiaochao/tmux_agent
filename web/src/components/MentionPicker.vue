<template>
  <div v-if="items.length" class="picker">
    <div v-for="(it, i) in items" :key="i" class="row" :class="{ sel: i === active }"
         @mousedown.prevent="$emit('pick', it)">
      <span class="kind">{{ it.kind === 'file' ? '📄' : '/' }}</span>
      <span class="label">{{ it.kind === 'file' ? it.path : it.name }}</span>
      <span v-if="it.kind === 'command'" class="hint">{{ it.hint }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CompletionItem } from '../types';
defineProps<{ items: CompletionItem[]; active: number }>();
defineEmits<{ (e: 'pick', it: CompletionItem): void }>();
</script>

<style scoped>
.picker { position: absolute; bottom: 50px; left: 8px; right: 8px; max-height: 240px; overflow: auto;
  background: var(--bg-alt); border: 1px solid var(--ink-faint); border-radius: 6px; }
.row { display: flex; gap: 8px; padding: 6px 10px; cursor: pointer; font: 12px ui-monospace, monospace; }
.row.sel { background: rgba(155, 210, 139, 0.12); }
.kind { color: var(--ink-faint); }
.label { flex: 1; }
.hint { color: var(--ink-dim); }
</style>
