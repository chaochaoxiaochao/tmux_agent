<template>
  <div class="sessionrow">
    <span class="label">session</span>
    <span class="pill active">
      <span class="dot"></span>{{ name }}
      <span class="count">·{{ windowCount }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../api';
const name = ref('—'); const windowCount = ref(0);
onMounted(async () => {
  try {
    const s = await api.sessions();
    if (s.length) { name.value = s[0].name; windowCount.value = s[0].windowCount; }
  } catch { }
});
</script>

<style scoped>
.sessionrow { display: flex; align-items: center; gap: 8px; padding: 6px 16px; border-bottom: 1px solid #1a1a1a; }
.label { color: var(--ink-faint); font-size: 11px; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1.5px solid var(--accent);
  border-radius: 12px; font: 11px ui-monospace, monospace; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
.count { color: var(--ink-faint); }
</style>
