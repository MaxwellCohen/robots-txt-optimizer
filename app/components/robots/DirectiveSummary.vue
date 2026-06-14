<script setup lang="ts">
import type { DirectiveSummaryRow } from '#shared/robots/types'
import { explainOtherDirective, explainPattern } from '#shared/robots/explain-pattern'
import { formatDirectiveSummaryMarkdown } from '#shared/robots/format-markdown'

const props = defineProps<{
  rows: DirectiveSummaryRow[]
}>()

const toast = useToast()

const markdown = computed(() => formatDirectiveSummaryMarkdown(props.rows))

function copyMarkdown() {
  navigator.clipboard.writeText(markdown.value)
  toast.add({
    title: 'Copied markdown to clipboard',
    icon: 'i-lucide-check'
  })
}

const wrapCell = {
  meta: {
    class: {
      td: 'whitespace-normal align-top'
    }
  }
}

const columns = [
  { accessorKey: 'userAgents', header: 'User-agent', ...wrapCell },
  { accessorKey: 'allow', header: 'Allow', ...wrapCell },
  { accessorKey: 'disallow', header: 'Disallow', ...wrapCell },
  { accessorKey: 'other', header: 'Other', ...wrapCell }
]

const tableData = computed(() =>
  props.rows.map(row => ({
    userAgents: row.userAgents.length > 0 ? row.userAgents : [],
    allow: row.allow,
    disallow: row.disallow,
    other: row.other,
    startLine: row.startLine
  }))
)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-list"
            class="size-5"
          />
          <h2 class="font-semibold">
            Directive summary
          </h2>
        </div>
        <UButton
          v-if="rows.length > 0"
          icon="i-lucide-copy"
          variant="outline"
          size="sm"
          @click="copyMarkdown"
        >
          Copy as Markdown
        </UButton>
      </div>
    </template>

    <UTable
      v-if="tableData.length > 0"
      :data="tableData"
      :columns="columns"
    >
      <template #userAgents-cell="{ row }">
        <ul
          v-if="row.original.userAgents.length > 0"
          class="space-y-1"
        >
          <li
            v-for="(agent, index) in row.original.userAgents"
            :key="index"
            class="font-mono text-xs"
          >
            {{ agent }}
          </li>
        </ul>
        <span
          v-else
          class="text-muted"
        >—</span>
      </template>

      <template #allow-cell="{ row }">
        <ul
          v-if="row.original.allow.length > 0"
          class="space-y-3"
        >
          <li
            v-for="(pattern, index) in row.original.allow"
            :key="index"
          >
            <span class="font-mono text-xs">{{ pattern }}</span>
            <span class="block text-xs text-muted mt-0.5">
              {{ explainPattern(pattern, 'allow') }}
            </span>
          </li>
        </ul>
        <span
          v-else
          class="text-muted"
        >—</span>
      </template>

      <template #disallow-cell="{ row }">
        <ul
          v-if="row.original.disallow.length > 0"
          class="space-y-3"
        >
          <li
            v-for="(pattern, index) in row.original.disallow"
            :key="index"
          >
            <span class="font-mono text-xs">{{ pattern }}</span>
            <span class="block text-xs text-muted mt-0.5">
              {{ explainPattern(pattern, 'disallow', { allowPatterns: row.original.allow }) }}
            </span>
          </li>
        </ul>
        <span
          v-else
          class="text-muted"
        >—</span>
      </template>

      <template #other-cell="{ row }">
        <ul
          v-if="row.original.other.length > 0"
          class="space-y-3"
        >
          <li
            v-for="(item, index) in row.original.other"
            :key="index"
          >
            <span class="font-mono text-xs">{{ item.name }}: {{ item.value }}</span>
            <span class="block text-xs text-muted mt-0.5">
              {{ explainOtherDirective(item.name, item.value) }}
            </span>
          </li>
        </ul>
        <span
          v-else
          class="text-muted"
        >—</span>
      </template>
    </UTable>
    <UEmpty
      v-else
      icon="i-lucide-file-question"
      title="No user-agent groups found"
    />
  </UCard>
</template>
