<script setup lang="ts">
import type { ValidationIssue } from '@robots-txt-optimizer/core'

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

const lineCount = computed(() => {
  const text = model.value
  if (text.length === 0) {
    return 1
  }

  let count = 1
  for (let index = 0; index < text.length; index++) {
    if (text.charCodeAt(index) === 10) {
      count++
    }
  }
  return count
})

const lineNumbers = computed(() => {
  const count = lineCount.value
  const numbers = new Array<string>(count)
  for (let index = 0; index < count; index++) {
    numbers[index] = String(index + 1)
  }
  return numbers.join('\n')
})

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
        ref="highlightRef"
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
        spellcheck="false"
        class="relative z-10 min-h-0 w-full h-full resize-y border-0 bg-transparent px-3 py-2 text-sm font-mono leading-5 outline-none"
        @scroll="syncScroll"
      />
    </div>
  </div>
</template>
