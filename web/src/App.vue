<template>
  <div class="app-root">
    <header class="topbar">
      <span class="brand">tmux · agent</span>
      <span class="host">{{ host }}</span>
      <span class="spacer"></span>
      <button @click="newWin">+ window</button>
      <button @click="killAll" class="danger">kill all</button>
    </header>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { api } from './api';
const host = location.host;
async function newWin() {
  const name = prompt('window name (optional)') || undefined;
  try { await api.newWindow(name); } catch (e: any) { alert(e.message); }
}
async function killAll() {
  if (!confirm('Kill all windows in this session?')) return;
  try { await api.killAll(); } catch (e: any) { alert(e.message); }
}
</script>

<style scoped>
.topbar { display: flex; gap: 12px; align-items: center; padding: 8px 16px; border-bottom: 1px solid #222; background: #0e0e0e; }
.brand { font-weight: 700; color: #9bd28b; }
.host { color: #888; font: 12px ui-monospace, JetBrains Mono, monospace; }
.spacer { flex: 1; }
.danger { color: var(--err); border-color: var(--err); }
</style>
