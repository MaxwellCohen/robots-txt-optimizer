<script setup lang="ts">
import type { OptimizationSuggestion } from '#shared/robots/types'

const props = defineProps<{
  suggestions: OptimizationSuggestion[]
  optimizedText: string
}>()

const typeLabels: Record<OptimizationSuggestion['type'], string> = {
  duplicate_directive: 'Duplicate rule',
  duplicate_group: 'Duplicate group',
  dead_rule: 'Dead rule',
  redundant_catchall: 'Redundant catch-all',
  empty_group: 'Empty group'
}

const toast = useToast()

function copyOptimized() {
  navigator.clipboard.writeText(props.optimizedText)
  toast.add({
    title: 'Copied to clipboard',
    icon: 'i-lucide-check'
  })
}
</script>

<template>
  <div class="space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-sparkles"
            class="size-5"
          />
          <h2 class="font-semibold">
            Optimization suggestions
          </h2>
        </div>
      </template>

      <UEmpty
        v-if="suggestions.length === 0"
        icon="i-lucide-check-circle"
        title="No optimizations suggested"
        description="Your robots.txt looks clean — no duplicate, dead, or redundant rules detected."
      />

      <ul
        v-else
        class="space-y-3"
      >
        <li
          v-for="(suggestion, index) in suggestions"
          :key="index"
          class="rounded-lg border border-default p-4"
        >
          <div class="flex items-center gap-2 mb-2">
            <UBadge
              color="primary"
              variant="subtle"
            >
              {{ typeLabels[suggestion.type] }}
            </UBadge>
            <span
              v-if="suggestion.lines.length"
              class="text-xs text-muted"
            >
              Line {{ suggestion.lines.join(', ') }}
            </span>
          </div>
          <p class="text-sm">
            {{ suggestion.message }}
          </p>
        </li>
      </ul>
    </UCard>

    <UCard v-if="optimizedText && suggestions.length > 0">
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-file-code"
              class="size-5"
            />
            <h2 class="font-semibold">
              Optimized robots.txt
            </h2>
          </div>
          <UButton
            icon="i-lucide-copy"
            variant="outline"
            size="sm"
            @click="copyOptimized"
          >
            Copy
          </UButton>
        </div>
      </template>

      <pre class="text-sm font-mono overflow-x-auto p-4 rounded-lg bg-elevated">{{ optimizedText }}</pre>
    </UCard>
  </div>
</template>
