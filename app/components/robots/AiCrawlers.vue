<script setup lang="ts">
import {
  applyCrawlerPolicy,
  CRAWLER_CATEGORY_LABELS,
  CRAWLER_POLICY_PRESETS,
  crawlerPolicyFromPreset,
  type CrawlerAccess,
  type CrawlerAccessStatus,
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

const aiBlocked = computed(() =>
  props.access.filter(entry => entry.crawler.category !== 'search' && entry.status === 'blocked').length
)
const aiTotal = computed(() => props.access.filter(entry => entry.crawler.category !== 'search').length)

const statusStyle: Record<CrawlerAccessStatus, { label: string, color: 'primary' | 'warning' | 'error' }> = {
  allowed: { label: 'Allowed', color: 'primary' },
  partial: { label: 'Partly blocked', color: 'warning' },
  blocked: { label: 'Blocked', color: 'error' }
}

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
  <UCard>
    <UCollapsible
      :default-open="true"
      :unmount-on-hide="false"
    >
      <template #default="{ open }">
        <div
          class="flex w-full cursor-pointer flex-col gap-1"
          role="button"
          tabindex="0"
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-bot"
              class="size-5"
            />
            <h2 class="font-semibold">
              Search &amp; AI crawlers
            </h2>
            <UBadge
              color="neutral"
              variant="subtle"
            >
              {{ aiBlocked }}/{{ aiTotal }} AI bots blocked
            </UBadge>
            <UIcon
              name="i-lucide-chevron-down"
              class="size-4 text-muted transition-transform duration-200"
              :class="{ 'rotate-180': open }"
            />
          </div>
          <p class="text-sm text-muted">
            Which well-known crawlers can access your site root, and quick presets to change it
          </p>
        </div>
      </template>

      <template #content>
        <div class="mt-4 space-y-6 border-t border-default pt-4">
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
                  :color="statusStyle[entry.status].color"
                  variant="subtle"
                  class="shrink-0"
                >
                  {{ statusStyle[entry.status].label }}
                </UBadge>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </UCollapsible>
  </UCard>
</template>
