<script setup lang="ts">
import type { DirectiveSummaryRow } from '#shared/robots/types'

const props = defineProps<{
  rows: DirectiveSummaryRow[]
}>()

const columns = [
  { accessorKey: 'userAgents', header: 'User-agent' },
  { accessorKey: 'allow', header: 'Allow' },
  { accessorKey: 'disallow', header: 'Disallow' },
  { accessorKey: 'other', header: 'Other' }
]

const tableData = computed(() =>
  props.rows.map(row => ({
    userAgents: row.userAgents.length > 0 ? row.userAgents.join(', ') : '(none)',
    allow: row.allow.length > 0 ? row.allow.join(', ') : '—',
    disallow: row.disallow.length > 0 ? row.disallow.join(', ') : '—',
    other: row.other.length > 0
      ? row.other.map(o => `${o.name}: ${o.value}`).join('; ')
      : '—',
    startLine: row.startLine
  }))
)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-list"
          class="size-5"
        />
        <h2 class="font-semibold">
          Directive summary
        </h2>
      </div>
    </template>

    <UTable
      v-if="tableData.length > 0"
      :data="tableData"
      :columns="columns"
    />
    <UEmpty
      v-else
      icon="i-lucide-file-question"
      title="No user-agent groups found"
    />
  </UCard>
</template>
