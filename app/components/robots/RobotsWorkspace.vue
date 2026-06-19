<script setup lang="ts">
import {
  defaultSimulationConfig,
  type SimulationConfig
} from '@robots-txt-optimizer/core/simulation-config'

const RobotsResults = defineAsyncComponent(
  () => import('~/components/robots/RobotsResults.vue')
)

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
</script>

<template>
  <div class="space-y-8">
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

    <RobotsResults
      v-if="hasResults && analysis"
      :analysis="analysis"
      :simulation-config="simulationConfig"
      @update:simulation-config="simulationConfig = $event"
    />
  </div>
</template>
