<script setup lang="ts">
import { compareRobotsTxt } from '@robots-txt-optimizer/core'
import type { RobotsSnapshot } from '~/composables/useRobotsSnapshots'

const props = defineProps<{
  previous: RobotsSnapshot
  current: string
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const expanded = ref(false)

const comparison = computed(() => compareRobotsTxt(props.previous.text, props.current))

const savedAt = computed(() =>
  new Date(props.previous.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
)
</script>

<template>
  <UAlert
    color="warning"
    variant="subtle"
    icon="i-lucide-history"
    title="This robots.txt changed since you last checked it"
    :description="`Last seen ${savedAt}. ${comparison.verdictChanges.length} crawl verdict${comparison.verdictChanges.length === 1 ? '' : 's'} changed.`"
    :actions="[
      { label: expanded ? 'Hide changes' : 'Show changes', color: 'warning', variant: 'outline', onClick: () => { expanded = !expanded } }
    ]"
    close
    @update:open="emit('dismiss')"
  />

  <UCard v-if="expanded">
    <RobotsComparisonDetails
      :comparison="comparison"
      before-label="Last check"
      after-label="Now"
    />
  </UCard>
</template>
