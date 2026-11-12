<script setup lang="ts">
import {
  defaultSimulationConfig,
  type SimulationConfig
} from '@robots-txt-optimizer/core/simulation-config'

const route = useRoute()
const router = useRouter()
const { loading, error, lastResult, lastRequestedUrl, fetchRobotsTxt } = useRobotsFetch()
const { recordSnapshot } = useRobotsSnapshots()
const { analysis, analyzing, runAnalysis, debouncedAnalyze } = useRobotsAnalysis()
const { textFromQuery, textWrittenToQuery, decodeTextFromQuery, debouncedSyncTextToUrl } = useRobotsTextUrl()
const { simulationFromQuery, decodeSimulationFromQuery, debouncedSyncSimulationToUrl } = useSimulationUrl()

const simulationConfig = ref<SimulationConfig>(defaultSimulationConfig())

const loadedUrl = ref<string | null>(null)
const fetchedText = ref<string | null>(null)
const shareUrl = ref<string | null>(null)
const pastedText = ref('')
const previousSnapshot = ref<RobotsSnapshot | null>(null)

const urlFromQuery = computed(() => {
  const queryUrl = route.query.url
  return typeof queryUrl === 'string' ? queryUrl : ''
})
const urlInput = ref(urlFromQuery.value)

async function analyzeUrl(url: string, updateQuery = true) {
  if (updateQuery) {
    await router.replace({ query: { ...omitQueryKeys(route.query, ROBOTS_TEXT_QUERY_KEY), url } })
  }

  const result = await fetchRobotsTxt(url)
  previousSnapshot.value = result ? recordSnapshot(result.finalUrl, result.text) : null
  if (result) {
    loadedUrl.value = result.finalUrl
    fetchedText.value = result.text
    shareUrl.value = url
    pastedText.value = result.text
    runAnalysis(result.text)
  } else {
    loadedUrl.value = null
    fetchedText.value = null
    shareUrl.value = null
    runAnalysis('')
  }
}

watch(pastedText, (text) => {
  if (fetchedText.value != null && text !== fetchedText.value) {
    loadedUrl.value = null
    shareUrl.value = null
    fetchedText.value = null
  }

  debouncedAnalyze(text)
  debouncedSyncTextToUrl(text, {
    shareUrl: shareUrl.value,
    fetchedText: fetchedText.value
  })
})

async function loadTextFromQuery(encoded: string) {
  const text = await decodeTextFromQuery(encoded)
  if (!text) {
    return
  }

  loadedUrl.value = null
  fetchedText.value = null
  shareUrl.value = null
  pastedText.value = text
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
  if (url) {
    urlInput.value = url
  }
  if (url && url !== previous && !textFromQuery.value) {
    analyzeUrl(url, false)
  }
})

watch(textFromQuery, (encoded, previous) => {
  if (!encoded || encoded === previous || encoded === textWrittenToQuery.value) {
    return
  }
  loadTextFromQuery(encoded)
})

watch(simulationFromQuery, (encoded, previous) => {
  if (encoded && encoded !== previous) {
    loadSimulationFromQuery(encoded)
  }
})

watch(simulationConfig, (config) => {
  debouncedSyncSimulationToUrl(config)
}, { deep: true })
</script>

<template>
  <div class="space-y-8">
    <RobotsInput
      v-model:url="urlInput"
      v-model:text="pastedText"
      :loading="loading || analyzing"
      :fetch-error="error"
      :loaded-url="loadedUrl"
      :validation-issues="analysis?.validation.issues ?? []"
      @analyze-url="analyzeUrl"
    />

    <RobotsChangeBanner
      v-if="previousSnapshot && fetchedText"
      :previous="previousSnapshot"
      :current="fetchedText"
      @dismiss="previousSnapshot = null"
    />

    <RobotsFetchDiagnostics
      v-if="lastResult"
      :result="lastResult"
      :requested-url="lastRequestedUrl"
    />

    <template v-if="analysis">
      <RobotsValidationReport :validation="analysis.validation" />

      <RobotsAiCrawlers
        :document="analysis.document"
        :access="analysis.crawlerAccess"
        @apply-text="pastedText = $event"
      />

      <RobotsDirectiveSummary :rows="analysis.directiveSummary" />

      <RobotsPathSimulation
        v-model:config="simulationConfig"
        :document="analysis.document"
      />

      <RobotsSitemapCheck :document="analysis.document" />

      <RobotsOptimizationList
        :document="analysis.document"
        :suggestions="analysis.suggestions"
        @apply-text="pastedText = $event"
      />
    </template>
  </div>
</template>
