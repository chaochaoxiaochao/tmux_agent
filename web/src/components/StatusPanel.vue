<template>
  <aside class="status">
    <header>{{ title }}</header>
    <dl>
      <dt>window</dt><dd>{{ windowId }}</dd>
      <dt>cpu</dt><dd>—</dd>
      <dt>mem</dt><dd>—</dd>
      <dt>uptime</dt><dd>—</dd>
    </dl>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ windowId: string; title: string }>();
</script>

<style scoped>
.status { padding: 12px; background: var(--bg-alt); border-left: 1px solid #1a1a1a; min-width: 180px; }
header { font-weight: 600; margin-bottom: 8px; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0; font: 11px ui-monospace, monospace; }
dt { color: var(--ink-faint); } dd { margin: 0; color: var(--ink-dim); }
@media (max-width: 600px) { .status { display: none; } }
</style>
