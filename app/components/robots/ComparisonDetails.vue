<script setup lang="ts">
import type { RobotsComparison } from '@robots-txt-optimizer/core'

const props = withDefaults(defineProps<{
  comparison: RobotsComparison
  beforeLabel?: string
  afterLabel?: string
}>(), {
  beforeLabel: 'Before',
  afterLabel: 'After'
})

const columns = computed(() => [
  { accessorKey: 'userAgent', header: 'User-agent' },
  { accessorKey: 'path', header: 'Path' },
  { accessorKey: 'before', header: props.beforeLabel },
  { accessorKey: 'after', header: props.afterLabel }
])

const MAX_ROWS = 200

const verdictRows = computed(() =>
  props.comparison.verdictChanges.slice(0, MAX_ROWS).map(change => ({
    userAgent: change.userAgent,
    path: change.path,
    before: change.before,
    after: change.after,
    beforeRule: change.beforeLine ? `line ${change.beforeLine}: ${change.beforeRule}` : change.beforeRule,
    afterRule: change.afterLine ? `line ${change.afterLine}: ${change.afterRule}` : change.afterRule
  }))
)

const verdictBadge = (allowed: boolean) => allowed
  ? { color: 'primary' as const, label: 'Allowed' }
  : { color: 'error' as const, label: 'Blocked' }

const totalChanges = computed(() => props.comparison.verdictChanges.length)
const newlyBlocked = computed(() => props.comparison.verdictChanges.filter(change => !change.after).length)
</script>

<template>
  <div class="space-y-6">
    <div
      v-if="comparison.crawlerChanges.length"
      class="space-y-2"
    >
      <h3 class="text-sm font-medium text-muted">
        Crawler access changes
      </h3>
      <ul class="grid gap-2 sm:grid-cols-2">
        <li
          v-for="change in comparison.crawlerChanges"
          :key="change.crawler.token"
          class="flex items-center justify-between gap-2 rounded-lg border border-default p-3 text-sm"
        >
          <span class="font-mono">{{ change.crawler.token }}</span>
          <span class="flex items-center gap-1 text-xs">
            <UBadge
              color="neutral"
              variant="subtle"
            >{{ crawlerStatusStyle[change.before].label }}</UBadge>
            <UIcon
              name="i-lucide-arrow-right"
              class="size-3"
            />
            <UBadge
              :color="crawlerStatusStyle[change.after].color"
              variant="subtle"
            >{{ crawlerStatusStyle[change.after].label }}</UBadge>
          </span>
        </li>
      </ul>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-muted">
        Crawl verdict changes
        <span
          v-if="verdictRows.length"
          class="font-normal"
        >
          — {{ newlyBlocked }} newly blocked, {{ totalChanges - newlyBlocked }} newly allowed
        </span>
      </h3>
      <UTable
        v-if="verdictRows.length"
        :data="verdictRows"
        :columns="columns"
      >
        <template #before-cell="{ row }">
          <UTooltip :text="row.original.beforeRule">
            <UBadge
              :color="verdictBadge(row.original.before).color"
              variant="subtle"
            >
              {{ verdictBadge(row.original.before).label }}
            </UBadge>
          </UTooltip>
        </template>
        <template #after-cell="{ row }">
          <UTooltip :text="row.original.afterRule">
            <UBadge
              :color="verdictBadge(row.original.after).color"
              variant="subtle"
            >
              {{ verdictBadge(row.original.after).label }}
            </UBadge>
          </UTooltip>
        </template>
      </UTable>
      <p
        v-if="totalChanges > verdictRows.length"
        class="text-xs text-muted"
      >
        Showing the first {{ verdictRows.length }} of {{ totalChanges }} changes.
      </p>
      <p
        v-else-if="!verdictRows.length"
        class="text-sm text-muted"
      >
        No change in what crawlers may fetch across {{ comparison.checkedPaths.length }} paths and {{ comparison.checkedUserAgents.length }} user-agents.
      </p>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-muted">
        Text changes
      </h3>
      <RobotsDiffView :lines="comparison.diff" />
    </div>
  </div>
</template>
