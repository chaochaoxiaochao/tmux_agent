<template>
  <div class="btnbar">
    <button
      v-for="b in buttons"
      :key="b.label"
      :class="b.cls"
      @click="$emit('send', b.payload)"
    >{{ b.label }}</button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{ (e: 'send', payload: string): void }>();

// Hard-coded reply keys. Previously this was config-driven (and editable from
// the UI), but the working set converged on these — keep them in code so the
// layout is stable and there's nothing to misconfigure on a fresh install.
const buttons = [
  { label: 'Yes',     payload: 'y\n', cls: 'yes' },
  { label: 'Yes·all', payload: '2\n', cls: 'yes' },
  { label: 'No',      payload: 'n\n', cls: 'no'  },
];
</script>

<style scoped>
.btnbar {
  display: flex; gap: 6px; padding: 4px 6px;
  border-top: 1px solid #222; background: var(--bg-alt);
}
.btnbar button {
  font-weight: 600; font-size: 13px;
  padding: 6px 12px; min-width: 56px;
}
.btnbar button.yes { color: var(--accent); border-color: var(--accent); }
.btnbar button.no  { color: var(--err);    border-color: var(--err); }
</style>
