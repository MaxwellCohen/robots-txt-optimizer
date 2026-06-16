<script setup lang="ts">
import type { ValidationIssue } from '#shared/robots/types'

const model = defineModel<string>({ default: '' })

const props = withDefaults(defineProps<{
  rows?: number
  placeholder?: string
  validationIssues?: ValidationIssue[]
}>(), {
  rows: 12,
  validationIssues: () => []
})

const lineNumbersRef = ref<HTMLElement | null>(null)
const highlightRef = ref<HTMLElement | null>(null)

const lines = computed(() => model.value.split('\n'))

const lineCount = computed(() => Math.max(lines.value.length, 1))

const displayLines = computed(() =>
  lines.value.length > 0 ? lines.value : ['']
)

const errorLines = computed(() => new Set(
  props.validationIssues
    .filter(issue => issue.severity === 'error' && issue.line !== undefined)
    .map(issue => issue.line!)
))

function syncScroll(event: Event) {
  const target = event.target as HTMLTextAreaElement
  if (lineNumbersRef.value) {
    lineNumbersRef.value.scrollTop = target.scrollTop
  }
  if (highlightRef.value) {
    highlightRef.value.scrollTop = target.scrollTop
  }
}
</script>

<template>
  <div
    class="flex w-full overflow-hidden rounded-md border border-default bg-default ring-offset-2 ring-offset-default focus-within:ring-2 focus-within:ring-primary"
  >
    <div
      ref="lineNumbersRef"
      aria-hidden="true"
      class="m-0 shrink-0 select-none overflow-hidden border-r border-default bg-elevated px-3 py-2 text-right text-sm font-mono leading-5 tabular-nums"
    >
      <div
        v-for="lineNumber in lineCount"
        :key="lineNumber"
        class="leading-5"
        :class="errorLines.has(lineNumber) ? 'font-medium text-error' : 'text-muted'"
      >
        {{ lineNumber }}
      </div>
    </div>
    <div class="relative min-h-0 min-w-0 flex-1">
      <div
        v-if="errorLines.size > 0"
        ref="highlightRef"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-0 overflow-hidden px-3 py-2"
      >
        <div
          v-for="(_line, index) in displayLines"
          :key="index"
          class="leading-5 text-sm"
          :class="errorLines.has(index + 1) ? 'bg-error/10' : ''"
        >
          &nbsp;
        </div>
      </div>
      <textarea
        v-model="model"
        :rows="rows"
        :placeholder="placeholder"
        spellcheck="false"
        class="relative z-10 min-h-0 w-full h-full resize-y border-0 bg-transparent px-3 py-2 text-sm font-mono leading-5 outline-none"
        @scroll="syncScroll"
      />
    </div>
  </div>
</template>
