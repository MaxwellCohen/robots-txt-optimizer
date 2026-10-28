<script setup lang="ts">
import {
  buildOptimizedText,
  type OptimizationSuggestion,
  type RobotsDocument
} from '@robots-txt-optimizer/core'

const props = defineProps<{
  document: RobotsDocument
  suggestions: OptimizationSuggestion[]
}>()

const emit = defineEmits<{
  applyText: [text: string]
}>()

const typeLabels: Record<OptimizationSuggestion['type'], string> = {
  duplicate_directive: 'Duplicate rule',
  duplicate_group: 'Duplicate group',
  dead_rule: 'Dead rule',
  redundant_catchall: 'Redundant catch-all',
  empty_group: 'Empty group',
  missing_user_agent: 'Missing user-agent'
}

/** Suggestions that only flag something for review; they never change the output. */
const reviewOnly = new Set<OptimizationSuggestion['type']>(['redundant_catchall'])

const suggestionKey = (suggestion: OptimizationSuggestion) =>
  `${suggestion.type}:${suggestion.lines.join(',')}:${suggestion.message}`

const excluded = ref(new Set<string>())

// A new analysis starts with every suggestion selected again.
watch(() => props.suggestions, () => {
  excluded.value = new Set()
})

const actionable = computed(() => props.suggestions.filter(s => !reviewOnly.has(s.type)))

const selected = computed(() =>
  props.suggestions.filter(s => !excluded.value.has(suggestionKey(s)))
)

function toggle(suggestion: OptimizationSuggestion, include: boolean | 'indeterminate') {
  const next = new Set(excluded.value)
  if (include === true) {
    next.delete(suggestionKey(suggestion))
  } else {
    next.add(suggestionKey(suggestion))
  }
  excluded.value = next
}

const optimizedText = computed(() => buildOptimizedText(props.document, selected.value))
const hasChanges = computed(() => optimizedText.value !== props.document.raw.trimEnd())

const view = ref<'diff' | 'full'>('diff')
const viewItems = [
  { label: 'Changes', value: 'diff' },
  { label: 'Full file', value: 'full' }
]

const toast = useToast()

function copyOptimized() {
  navigator.clipboard.writeText(optimizedText.value)
  toast.add({
    title: 'Copied to clipboard',
    icon: 'i-lucide-check'
  })
}

function applyToEditor() {
  emit('applyText', `${optimizedText.value}\n`)
  toast.add({
    title: 'Optimized robots.txt applied to the editor',
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

            <template v-else>
              <p
                v-if="actionable.length"
                class="mb-3 text-sm text-muted"
              >
                Untick a suggestion to leave that part of the file unchanged.
              </p>
              <ul class="space-y-3">
                <li
                  v-for="suggestion in suggestions"
                  :key="suggestionKey(suggestion)"
                  class="flex gap-3 rounded-lg border border-default p-4"
                >
                  <UCheckbox
                    v-if="!reviewOnly.has(suggestion.type)"
                    :model-value="!excluded.has(suggestionKey(suggestion))"
                    :aria-label="`Apply: ${suggestion.message}`"
                    class="mt-0.5"
                    @update:model-value="toggle(suggestion, $event)"
                  />
                  <UIcon
                    v-else
                    name="i-lucide-eye"
                    class="mt-0.5 size-4 shrink-0 text-muted"
                  />
                  <div>
                    <div class="mb-2 flex items-center gap-2">
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
                      <span
                        v-if="reviewOnly.has(suggestion.type)"
                        class="text-xs text-muted"
                      >
                        Review only
                      </span>
                    </div>
                    <p class="text-sm">
                      {{ suggestion.message }}
                    </p>
                  </div>
                </li>
              </ul>
            </template>
          </div>
        </template>
      </UCollapsible>
    </UCard>

    <UCard v-if="hasChanges">
      <UCollapsible
        :default-open="true"
        :unmount-on-hide="false"
      >
        <template #default="{ open }">
          <div
            class="flex w-full cursor-pointer flex-wrap items-center justify-between gap-4"
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
            <div
              class="flex items-center gap-2"
              @click.stop
            >
              <UTabs
                v-model="view"
                :items="viewItems"
                :content="false"
                size="xs"
              />
              <UButton
                icon="i-lucide-copy"
                variant="outline"
                size="sm"
                @click="copyOptimized"
              >
                Copy
              </UButton>
              <UButton
                icon="i-lucide-check"
                size="sm"
                @click="applyToEditor"
              >
                Apply to editor
              </UButton>
            </div>
          </div>
        </template>

        <template #content>
          <div class="mt-4 border-t border-default pt-4">
            <RobotsDiffView
              v-if="view === 'diff'"
              :before="document.raw"
              :after="optimizedText"
            />
            <RobotsLineNumberPre
              v-else
              :text="optimizedText"
            />
          </div>
        </template>
      </UCollapsible>
    </UCard>
  </div>
</template>
