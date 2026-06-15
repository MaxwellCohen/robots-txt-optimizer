<script setup lang="ts">
const model = defineModel<string>({ default: '' })

withDefaults(defineProps<{
  rows?: number
  placeholder?: string
}>(), {
  rows: 12
})

const lineNumbersRef = ref<HTMLElement | null>(null)

const lineCount = computed(() => Math.max(model.value.split('\n').length, 1))

const lineNumbers = computed(() =>
  Array.from({ length: lineCount.value }, (_, index) => index + 1).join('\n')
)

function syncScroll(event: Event) {
  const target = event.target as HTMLTextAreaElement
  if (lineNumbersRef.value) {
    lineNumbersRef.value.scrollTop = target.scrollTop
  }
}
</script>

<template>
  <div
    class="flex w-full overflow-hidden rounded-md border border-default bg-default ring-offset-2 ring-offset-default focus-within:ring-2 focus-within:ring-primary"
  >
    <pre
      ref="lineNumbersRef"
      aria-hidden="true"
      class="m-0 shrink-0 select-none overflow-hidden border-r border-default bg-elevated px-3 py-2 text-right text-sm font-mono leading-5 text-muted tabular-nums"
    >{{ lineNumbers }}</pre>
    <textarea
      v-model="model"
      :rows="rows"
      :placeholder="placeholder"
      spellcheck="false"
      class="min-h-0 min-w-0 flex-1 resize-y border-0 bg-transparent px-3 py-2 text-sm font-mono leading-5 outline-none"
      @scroll="syncScroll"
    />
  </div>
</template>
