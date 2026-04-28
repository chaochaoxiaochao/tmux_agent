<template>
  <div class="app-root">
    <header class="topbar">
      <span class="brand">tmux · agent</span>
      <span class="host">{{ host }}</span>
    </header>
    <router-view />
  </div>
</template>

<script setup lang="ts">
const host = location.host;
</script>

<style scoped>
.topbar { display: flex; gap: 12px; align-items: center; padding: 8px 16px; border-bottom: 1px solid #222; background: #0e0e0e; }
.brand { font-weight: 700; color: #9bd28b; }
.host { color: #888; font: 12px ui-monospace, JetBrains Mono, monospace; }
</style>
