<script setup lang="ts">
export interface ExplainedItem {
  label: string
  explanation: string
}

defineProps<{
  items: ExplainedItem[]
  /** Pre-rendered plain text used instead of the list for very large rule sets. */
  bulkText?: string
}>()
</script>

<template>
  <pre
    v-if="bulkText"
    class="max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5"
  >{{ bulkText }}</pre>
  <ul
    v-else-if="items.length > 0"
    class="space-y-3"
  >
    <li
      v-for="(item, index) in items"
      :key="index"
    >
      <span class="font-mono text-xs">{{ item.label }}</span>
      <span class="block text-xs text-muted mt-0.5">
        {{ item.explanation }}
      </span>
    </li>
  </ul>
  <span
    v-else
    class="text-muted"
  >—</span>
</template>
