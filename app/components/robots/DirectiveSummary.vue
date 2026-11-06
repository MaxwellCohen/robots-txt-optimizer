<script setup lang="ts">
import type { DirectiveSummaryRow } from '@robots-txt-optimizer/core'
import type { ExplainedItem } from './ExplainedList.vue'
import { explainOtherDirective, explainPattern, formatDirectiveSummaryMarkdown } from '@robots-txt-optimizer/core'

const props = defineProps<{
  rows: DirectiveSummaryRow[]
}>()

const copyWithToast = useCopyWithToast()

const markdown = computed(() => formatDirectiveSummaryMarkdown(props.rows))

function copyMarkdown() {
  return copyWithToast(markdown.value, 'Copied markdown to clipboard')
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

const largeRuleList = 30

function formatRuleBlock(
  patterns: string[],
  effect: 'allow' | 'disallow',
  allowPatterns: string[] = []
): string {
  return patterns.map((pattern) => {
    const explanation = explainPattern(
      pattern,
      effect,
      effect === 'disallow' ? { allowPatterns } : undefined
    )
    return `${pattern} — ${explanation}`
  }).join('\n')
}

function explainedItems(
  patterns: string[],
  effect: 'allow' | 'disallow',
  allowPatterns: string[] = []
): ExplainedItem[] {
  return patterns.map(pattern => ({
    label: pattern,
    explanation: explainPattern(
      pattern,
      effect,
      effect === 'disallow' ? { allowPatterns } : undefined
    )
  }))
}

const tableData = computed(() =>
  props.rows.map((row) => {
    const largeAllow = row.allow.length > largeRuleList
    const largeDisallow = row.disallow.length > largeRuleList
    return {
      userAgents: row.userAgents,
      allow: largeAllow ? [] : explainedItems(row.allow, 'allow'),
      disallow: largeDisallow ? [] : explainedItems(row.disallow, 'disallow', row.allow),
      allowText: largeAllow ? formatRuleBlock(row.allow, 'allow') : '',
      disallowText: largeDisallow ? formatRuleBlock(row.disallow, 'disallow', row.allow) : '',
      other: row.other.map(item => ({
        label: `${item.name}: ${item.value}`,
        explanation: explainOtherDirective(item.name, item.value)
      })),
      startLine: row.startLine
    }
  })
)
</script>

<template>
  <RobotsCollapsibleCard
    icon="i-lucide-list"
    title="Directive summary"
  >
    <template
      v-if="rows.length > 0"
      #actions
    >
      <UButton
        icon="i-lucide-copy"
        variant="outline"
        size="sm"
        @click="copyMarkdown"
      >
        Copy as Markdown
      </UButton>
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
        <RobotsExplainedList
          :items="row.original.allow"
          :bulk-text="row.original.allowText"
        />
      </template>

      <template #disallow-cell="{ row }">
        <RobotsExplainedList
          :items="row.original.disallow"
          :bulk-text="row.original.disallowText"
        />
      </template>

      <template #other-cell="{ row }">
        <RobotsExplainedList :items="row.original.other" />
      </template>
    </UTable>
    <UEmpty
      v-else
      icon="i-lucide-file-question"
      title="No user-agent groups found"
    />
  </RobotsCollapsibleCard>
</template>
