<script setup lang="ts">
import type { OptimizationSuggestion } from '@robots-txt-optimizer/core'

const props = defineProps<{
  suggestions: OptimizationSuggestion[]
  optimizedText: string
}>()

const typeLabels: Record<OptimizationSuggestion['type'], string> = {
  duplicate_directive: 'Duplicate rule',
  duplicate_group: 'Duplicate group',
  dead_rule: 'Dead rule',
  redundant_catchall: 'Redundant catch-all',
  empty_group: 'Empty group',
  missing_user_agent: 'Missing user-agent'
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
      <UCollapsible
        :default-open="true"
        :unmount-on-hide="false"
      >
        <template #default="{ open }">
          <div
            class="flex w-full cursor-pointer items-center gap-2"
            role="button"
            tabindex="0"
          >
            <UIcon
              name="i-lucide-sparkles"
              class="size-5"
            />
            <h2 class="font-semibold">
              Optimization suggestions
            </h2>
            <UBadge
              v-if="suggestions.length > 0"
              color="primary"
              variant="subtle"
            >
              {{ suggestions.length }}
            </UBadge>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-muted transition-transform duration-200"
              :class="{ 'rotate-180': open }"
            />
          </div>
        </template>

        <template #content>
          <div class="mt-4 border-t border-default pt-4">
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
          </div>
        </template>
      </UCollapsible>
    </UCard>

    <UCard v-if="optimizedText && suggestions.length > 0">
      <UCollapsible
        :default-open="true"
        :unmount-on-hide="false"
      >
        <template #default="{ open }">
          <div
            class="flex w-full cursor-pointer items-center justify-between gap-4"
            role="button"
            tabindex="0"
          >
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-file-code"
                class="size-5"
              />
              <h2 class="font-semibold">
                Optimized robots.txt
              </h2>
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 text-muted transition-transform duration-200"
                :class="{ 'rotate-180': open }"
              />
            </div>
            <UButton
              icon="i-lucide-copy"
              variant="outline"
              size="sm"
              @click.stop="copyOptimized"
            >
              Copy
            </UButton>
          </div>
        </template>

        <template #content>
          <div class="border-t border-default pt-4">
            <RobotsLineNumberPre :text="optimizedText" />
          </div>
        </template>
      </UCollapsible>
    </UCard>
  </div>
</template>
