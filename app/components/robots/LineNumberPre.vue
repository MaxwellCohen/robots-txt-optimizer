<script setup lang="ts">
const props = defineProps<{
  text: string
}>()

const gutterEl = useTemplateRef<HTMLElement>('gutter')
const { lineNumbers, syncScroll } = useLineGutter(() => props.text)
</script>

<template>
  <div
    class="flex w-full overflow-hidden rounded-lg border border-default bg-elevated"
  >
    <pre
      ref="gutter"
      aria-hidden="true"
      class="m-0 shrink-0 select-none overflow-hidden border-r border-default px-3 py-4 text-right text-sm font-mono leading-5 text-muted tabular-nums"
    >{{ lineNumbers }}</pre>
    <pre
      class="m-0 min-w-0 flex-1 overflow-auto p-4 text-sm font-mono leading-5"
      @scroll="syncScroll($event, gutterEl)"
    >{{ text }}</pre>
  </div>
</template>
