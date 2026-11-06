<script setup lang="ts">
import type { ValidationIssue } from '@robots-txt-optimizer/core'

const props = withDefaults(defineProps<{
  rows?: number
  placeholder?: string
  ariaLabel?: string
  validationIssues?: ValidationIssue[]
}>(), {
  rows: 12,
  ariaLabel: 'robots.txt content',
  validationIssues: () => []
})

const model = defineModel<string>({ default: '' })

const gutterEl = useTemplateRef<HTMLElement>('gutter')
const highlightEl = useTemplateRef<HTMLElement>('highlight')

const { lineCount, lineNumbers, syncScroll } = useLineGutter(model)

const lineSpacer = computed(() => {
  const count = lineCount.value
  if (count <= 1) {
    return ' '
  }
  return ` ${'\n '.repeat(count - 1)}`
})

const errorLineNumbers = computed(() => {
  const lines = new Set<number>()
  for (const issue of props.validationIssues) {
    if (issue.severity === 'error' && issue.line !== undefined) {
      lines.add(issue.line)
    }
  }
  return [...lines].sort((a, b) => a - b)
})
</script>

<template>
  <div
    class="flex w-full overflow-hidden rounded-md border border-default bg-default ring-offset-2 ring-offset-default focus-within:ring-2 focus-within:ring-primary"
  >
    <div
      ref="gutter"
      aria-hidden="true"
      class="m-0 shrink-0 overflow-hidden border-r border-default bg-elevated"
    >
      <div class="relative">
        <pre
          class="m-0 select-none px-3 py-2 text-right text-sm font-mono leading-5 tabular-nums text-muted"
        >{{ lineNumbers }}</pre>
        <span
          v-for="lineNumber in errorLineNumbers"
          :key="lineNumber"
          class="absolute right-3 font-mono text-sm font-medium leading-5 text-error"
          :style="{ top: `calc(0.5rem + ${(lineNumber - 1) * 1.25}rem)` }"
        >{{ lineNumber }}</span>
      </div>
    </div>
    <div class="relative min-h-0 min-w-0 flex-1">
      <div
        v-if="errorLineNumbers.length > 0"
        ref="highlight"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div class="relative">
          <pre
            class="m-0 invisible px-3 py-2 text-sm leading-5"
          >{{ lineSpacer }}</pre>
          <div
            v-for="lineNumber in errorLineNumbers"
            :key="lineNumber"
            class="absolute inset-x-3 bg-error/10"
            :style="{ top: `calc(0.5rem + ${(lineNumber - 1) * 1.25}rem)`, height: '1.25rem' }"
          />
        </div>
      </div>
      <textarea
        v-model="model"
        :rows="rows"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        spellcheck="false"
        class="relative z-10 min-h-0 w-full h-full resize-y border-0 bg-transparent px-3 py-2 text-sm font-mono leading-5 outline-none"
        @scroll="syncScroll($event, gutterEl, highlightEl)"
      />
    </div>
  </div>
</template>
