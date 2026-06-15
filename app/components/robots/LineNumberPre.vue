<script setup lang="ts">
const props = defineProps<{
  text: string
}>()

const lineNumbersRef = ref<HTMLElement | null>(null)

const lineCount = computed(() => Math.max(props.text.split('\n').length, 1))

const lineNumbers = computed(() =>
  Array.from({ length: lineCount.value }, (_, index) => index + 1).join('\n')
)

function syncScroll(event: Event) {
  const target = event.target as HTMLElement
  if (lineNumbersRef.value) {
    lineNumbersRef.value.scrollTop = target.scrollTop
  }
}
</script>

<template>
  <div
    class="mt-4 flex w-full overflow-hidden rounded-lg border border-default bg-elevated"
  >
    <pre
      ref="lineNumbersRef"
      aria-hidden="true"
      class="m-0 shrink-0 select-none overflow-hidden border-r border-default px-3 py-4 text-right text-sm font-mono leading-5 text-muted tabular-nums"
    >{{ lineNumbers }}</pre>
    <pre
      class="m-0 min-w-0 flex-1 overflow-auto p-4 text-sm font-mono leading-5"
      @scroll="syncScroll"
    >{{ text }}</pre>
  </div>
</template>
