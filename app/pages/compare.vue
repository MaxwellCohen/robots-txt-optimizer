<script setup lang="ts">
import { compareRobotsTxt, type RobotsComparison } from '@robots-txt-optimizer/core'
import { useDebounceFn } from '@vueuse/core'
import { useRobotsFetch } from '~/composables/useRobotsFetch'

useSeoMeta({
  title: 'Compare robots.txt files',
  description: 'Compare two robots.txt files — staging vs production or before vs after — and see exactly which crawl verdicts changed.',
  ogTitle: 'Compare robots.txt files — Robots.txt Optimizer',
  ogDescription: 'See which paths and crawlers gain or lose access between two robots.txt files.'
})

const route = useRoute()
const router = useRouter()

function createSide(queryKey: 'a' | 'b') {
  const fetcher = useRobotsFetch()
  const initial = route.query[queryKey]
  return reactive({
    queryKey,
    url: typeof initial === 'string' ? initial : '',
    text: '',
    fetcher
  })
}

const sides = [createSide('a'), createSide('b')] as const
const labels = { a: 'Before', b: 'After' } as const

async function load(side: typeof sides[number], updateQuery = true) {
  const url = side.url.trim()
  if (!url) {
    return
  }
  if (updateQuery) {
    await router.replace({ query: { ...route.query, [side.queryKey]: url } })
  }
  const result = await side.fetcher.fetchRobotsTxt(url)
  if (result) {
    side.text = result.text
  }
}

const comparison = ref<RobotsComparison | null>(null)

const recompare = useDebounceFn(() => {
  const [before, after] = sides
  comparison.value = before.text.trim() || after.text.trim()
    ? compareRobotsTxt(before.text, after.text)
    : null
}, 300)

watch(() => [sides[0].text, sides[1].text], recompare)

onMounted(() => {
  for (const side of sides) {
    if (side.url) {
      load(side, false)
    }
  }
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 space-y-8">
    <div class="space-y-2 text-center">
      <h1 class="text-3xl font-bold tracking-tight">
        Compare robots.txt files
      </h1>
      <p class="text-muted max-w-2xl mx-auto">
        Load staging and production, or an old and new version, to see which crawlers and paths gain or lose access.
      </p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div
        v-for="side in sides"
        :key="side.queryKey"
        class="space-y-4 rounded-lg bg-default p-4 ring ring-default"
      >
        <h2 class="font-semibold">
          {{ labels[side.queryKey] }}
        </h2>
        <div class="flex gap-2">
          <UInput
            v-model="side.url"
            placeholder="example.com"
            class="flex-1"
            @keyup.enter="load(side)"
          />
          <UButton
            :loading="side.fetcher.loading"
            icon="i-lucide-download"
            variant="outline"
            @click="load(side)"
          >
            Fetch
          </UButton>
        </div>
        <UAlert
          v-if="side.fetcher.error"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
          :title="side.fetcher.error.message"
        />
        <RobotsLineNumberTextarea
          v-model="side.text"
          :rows="12"
          :validation-issues="[]"
          placeholder="Paste robots.txt content"
        />
      </div>
    </div>

    <UCard v-if="comparison">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-git-compare"
            class="size-5"
          />
          <h2 class="font-semibold">
            Differences
          </h2>
        </div>
      </template>
      <RobotsComparisonDetails :comparison="comparison" />
    </UCard>
  </div>
</template>
