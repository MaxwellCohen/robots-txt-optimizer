<script setup lang="ts">
import { defaultSimulationConfig, type SimulationConfig } from '@robots-txt-optimizer/core'

const route = useRoute()
const router = useRouter()
const { loading, error, fetchRobotsTxt } = useRobotsFetch()
const { analysis, analyzing, runAnalysis, debouncedAnalyze } = useRobotsAnalysis()
const { textFromQuery, decodeTextFromQuery, debouncedSyncTextToUrl } = useRobotsTextUrl()
const { simulationFromQuery, decodeSimulationFromQuery, debouncedSyncSimulationToUrl } = useSimulationUrl()

const simulationConfig = ref<SimulationConfig>(defaultSimulationConfig())

const hasResults = computed(() => analysis.value !== null)

const loadedUrl = ref<string | null>(null)
const fetchedText = ref<string | null>(null)
const shareUrl = ref<string | null>(null)
const initialPastedText = ref('')

const urlFromQuery = computed(() => {
  const queryUrl = route.query.url
  return typeof queryUrl === 'string' ? queryUrl : ''
})

async function analyzeUrl(url: string, updateQuery = true) {
  if (updateQuery) {
    const { r: _, ...rest } = route.query
    await router.replace({ query: { ...rest, url } })
  }

  const result = await fetchRobotsTxt(url)
  if (result) {
    loadedUrl.value = result.finalUrl
    fetchedText.value = result.text
    shareUrl.value = url
    runAnalysis(result.text)
  } else {
    loadedUrl.value = null
    fetchedText.value = null
    shareUrl.value = null
    runAnalysis('')
  }
}

async function onAnalyzeUrl(url: string) {
  await analyzeUrl(url)
}

function onAnalyzeText(text: string) {
  debouncedAnalyze(text)
  debouncedSyncTextToUrl(text, {
    shareUrl: shareUrl.value,
    fetchedText: fetchedText.value
  })
}

async function loadTextFromQuery(encoded: string) {
  const text = await decodeTextFromQuery(encoded)
  if (!text) {
    return
  }

  loadedUrl.value = null
  fetchedText.value = null
  shareUrl.value = null
  initialPastedText.value = text
  runAnalysis(text)
}

async function loadSimulationFromQuery(encoded: string) {
  const config = await decodeSimulationFromQuery(encoded)
  if (config) {
    simulationConfig.value = config
  }
}

onMounted(async () => {
  if (simulationFromQuery.value) {
    await loadSimulationFromQuery(simulationFromQuery.value)
  }

  if (textFromQuery.value) {
    await loadTextFromQuery(textFromQuery.value)
    return
  }

  if (urlFromQuery.value) {
    await analyzeUrl(urlFromQuery.value, false)
  }
})

watch(urlFromQuery, (url, previous) => {
  if (url && url !== previous && !textFromQuery.value) {
    analyzeUrl(url, false)
  }
})

watch(textFromQuery, (encoded, previous) => {
  if (encoded && encoded !== previous) {
    loadTextFromQuery(encoded)
  }
})

watch(simulationFromQuery, (encoded, previous) => {
  if (encoded && encoded !== previous) {
    loadSimulationFromQuery(encoded)
  }
})

watch(simulationConfig, (config) => {
  debouncedSyncSimulationToUrl(config)
}, { deep: true })

useSeoMeta({
  title: 'Robots.txt Optimizer',
  description: 'Validate, analyze, and optimize your robots.txt file. Check allow/block rules per user-agent and get improvement suggestions.',
  ogTitle: 'Robots.txt Optimizer',
  ogDescription: 'Validate, analyze, and optimize your robots.txt file.'
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 space-y-8">
    <div class="space-y-2 text-center">
      <h1 class="text-3xl font-bold tracking-tight">
        Robots.txt Optimizer
      </h1>
      <p class="text-muted max-w-2xl mx-auto">
        Validate syntax, summarize allow/block rules per user-agent, simulate common paths, and get suggestions to simplify your robots.txt.
      </p>
    </div>

    <RobotsInput
      :loading="loading || analyzing"
      :fetch-error="error"
      :initial-url="urlFromQuery"
      :initial-pasted-text="initialPastedText"
      :loaded-url="loadedUrl"
      :loaded-text="fetchedText"
      :validation-issues="analysis?.validation.issues ?? []"
      @analyze-url="onAnalyzeUrl"
      @analyze-text="onAnalyzeText"
    />

    <template v-if="hasResults && analysis">
      <RobotsValidationReport :validation="analysis.validation" />

      <RobotsDirectiveSummary :rows="analysis.directiveSummary" />

      <RobotsPathSimulation
        :document="analysis.document"
        :config="simulationConfig"
        @update:config="simulationConfig = $event"
      />

      <RobotsOptimizationList
        :suggestions="analysis.suggestions"
        :optimized-text="analysis.optimizedText"
      />
    </template>
  </div>
</template>
