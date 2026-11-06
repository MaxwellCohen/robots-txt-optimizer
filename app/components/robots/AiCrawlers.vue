<script setup lang="ts">
import {
  applyCrawlerPolicy,
  CRAWLER_CATEGORY_LABELS,
  CRAWLER_POLICY_PRESETS,
  crawlerPolicyFromPreset,
  type CrawlerAccess,
  type CrawlerCategory,
  type CrawlerPolicyPreset,
  type RobotsDocument
} from '@robots-txt-optimizer/core'

const props = defineProps<{
  document: RobotsDocument
  access: CrawlerAccess[]
}>()

const emit = defineEmits<{
  applyText: [text: string]
}>()

const categories = computed(() => {
  const order: CrawlerCategory[] = ['search', 'ai-training', 'ai-search', 'ai-user']
  return order.map(category => ({
    category,
    label: CRAWLER_CATEGORY_LABELS[category],
    entries: props.access.filter(entry => entry.crawler.category === category)
  }))
})

const aiEntries = computed(() => props.access.filter(entry => entry.crawler.category !== 'search'))
const aiBlocked = computed(() => aiEntries.value.filter(entry => entry.status === 'blocked').length)
const aiTotal = computed(() => aiEntries.value.length)

const presets = Object.entries(CRAWLER_POLICY_PRESETS) as [CrawlerPolicyPreset, { label: string, description: string }][]

const toast = useToast()

function applyPreset(preset: CrawlerPolicyPreset) {
  emit('applyText', applyCrawlerPolicy(props.document, crawlerPolicyFromPreset(preset)))
  toast.add({
    title: 'AI crawler policy applied',
    description: 'The editor now contains explicit groups for each AI crawler.',
    icon: 'i-lucide-check'
  })
}
</script>

<template>
  <RobotsCollapsibleCard
    icon="i-lucide-bot"
    title="Search &amp; AI crawlers"
    description="Which well-known crawlers can access your site root, and quick presets to change it"
  >
    <template #badge>
      <UBadge
        color="neutral"
        variant="subtle"
      >
        {{ aiBlocked }}/{{ aiTotal }} AI bots blocked
      </UBadge>
    </template>

    <div class="space-y-6">
      <div class="flex flex-wrap gap-2">
        <UTooltip
          v-for="[preset, info] in presets"
          :key="preset"
          :text="info.description"
        >
          <UButton
            variant="outline"
            size="sm"
            icon="i-lucide-wand-sparkles"
            @click="applyPreset(preset)"
          >
            {{ info.label }}
          </UButton>
        </UTooltip>
      </div>

      <div
        v-for="group in categories"
        :key="group.category"
        class="space-y-2"
      >
        <h3 class="text-sm font-medium text-muted">
          {{ group.label }}
        </h3>
        <ul class="grid gap-2 sm:grid-cols-2">
          <li
            v-for="entry in group.entries"
            :key="entry.crawler.token"
            class="flex items-start justify-between gap-3 rounded-lg border border-default p-3 text-sm"
          >
            <div class="min-w-0">
              <p class="font-mono font-medium">
                {{ entry.crawler.token }}
              </p>
              <p class="text-xs text-muted">
                {{ entry.crawler.operator }} — {{ entry.crawler.description }}
              </p>
              <p class="mt-1 text-xs text-muted">
                {{ entry.hasSpecificGroup ? `Own group (${entry.matchedAgents.join(', ')})` : 'Uses the * group' }}<template v-if="entry.line">
                  · line {{ entry.line }}
                </template>
              </p>
            </div>
            <UBadge
              :color="crawlerStatusStyle[entry.status].color"
              variant="subtle"
              class="shrink-0"
            >
              {{ crawlerStatusStyle[entry.status].label }}
            </UBadge>
          </li>
        </ul>
      </div>
    </div>
  </RobotsCollapsibleCard>
</template>
