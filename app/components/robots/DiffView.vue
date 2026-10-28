<script setup lang="ts">
import { diffLines, diffStats, type DiffLine } from '@robots-txt-optimizer/core'

const props = withDefaults(defineProps<{
  before?: string
  after?: string
  /** Precomputed diff; takes precedence over before/after. */
  lines?: DiffLine[]
  /** Hide long runs of unchanged lines, keeping this many lines of context. */
  context?: number
}>(), {
  context: 3
})

type Row
  = | { kind: 'line', type: 'same' | 'add' | 'remove', text: string, oldLine?: number, newLine?: number }
    | { kind: 'gap', count: number }

const lines = computed(() => props.lines ?? diffLines(props.before ?? '', props.after ?? ''))
const stats = computed(() => diffStats(lines.value))

const rows = computed<Row[]>(() => {
  const all = lines.value
  const keep = all.map(() => false)
  all.forEach((line, index) => {
    if (line.type !== 'same') {
      for (let k = Math.max(0, index - props.context); k <= Math.min(all.length - 1, index + props.context); k++) {
        keep[k] = true
      }
    }
  })

  const result: Row[] = []
  let hidden = 0
  all.forEach((line, index) => {
    if (keep[index]) {
      if (hidden) {
        result.push({ kind: 'gap', count: hidden })
        hidden = 0
      }
      result.push({ kind: 'line', ...line })
    } else {
      hidden++
    }
  })
  if (hidden) {
    result.push({ kind: 'gap', count: hidden })
  }
  return result
})
</script>

<template>
  <div class="space-y-2">
    <p class="text-xs text-muted">
      <span class="text-primary">+{{ stats.added }}</span>
      <span class="ml-2 text-error">−{{ stats.removed }}</span>
    </p>
    <div
      v-if="stats.added || stats.removed"
      class="overflow-auto rounded-lg border border-default bg-elevated font-mono text-sm leading-5"
    >
      <div class="min-w-fit">
        <template
          v-for="(row, index) in rows"
          :key="index"
        >
          <div
            v-if="row.kind === 'gap'"
            class="border-y border-default bg-default px-3 py-0.5 text-xs text-muted"
          >
            ⋯ {{ row.count }} unchanged line{{ row.count === 1 ? '' : 's' }}
          </div>
          <div
            v-else
            class="flex whitespace-pre"
            :class="{
              'bg-primary/10': row.type === 'add',
              'bg-error/10': row.type === 'remove'
            }"
          >
            <span class="w-10 shrink-0 select-none px-2 text-right text-muted tabular-nums">{{ row.oldLine ?? '' }}</span>
            <span class="w-10 shrink-0 select-none px-2 text-right text-muted tabular-nums">{{ row.newLine ?? '' }}</span>
            <span
              class="w-5 shrink-0 select-none text-center"
              :class="{ 'text-primary': row.type === 'add', 'text-error': row.type === 'remove' }"
            >{{ row.type === 'add' ? '+' : row.type === 'remove' ? '−' : ' ' }}</span>
            <span class="pr-4">{{ row.text }}</span>
          </div>
        </template>
      </div>
    </div>
    <p
      v-else
      class="text-sm text-muted"
    >
      No differences.
    </p>
  </div>
</template>
