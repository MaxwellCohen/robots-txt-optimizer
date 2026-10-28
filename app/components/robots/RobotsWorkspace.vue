<script setup lang="ts">
import { useRoute, useRouter } from '#app'
import {
  defaultSimulationConfig,
  type SimulationConfig
} from '@robots-txt-optimizer/core/simulation-config'
import { useRobotsAnalysis } from '~/composables/useRobotsAnalysis'
import { useRobotsFetch } from '~/composables/useRobotsFetch'
import { useRobotsSnapshots, type RobotsSnapshot } from '~/composables/useRobotsSnapshots'
import { useRobotsTextUrl } from '~/composables/useRobotsTextUrl'
import { useSimulationUrl } from '~/composables/useSimulationUrl'

const route = useRoute()
const router = useRouter()
const { loading, error, lastResult, lastRequestedUrl, fetchRobotsTxt } = useRobotsFetch()
const { recordSnapshot } = useRobotsSnapshots()
const { analysis, analyzing, runAnalysis, debouncedAnalyze } = useRobotsAnalysis()
const { textFromQuery, textWrittenToQuery, decodeTextFromQuery, debouncedSyncTextToUrl } = useRobotsTextUrl()
const { simulationFromQuery, decodeSimulationFromQuery, debouncedSyncSimulationToUrl } = useSimulationUrl()

const simulationConfig = ref<SimulationConfig>(defaultSimulationConfig())

const hasResults = computed(() => analysis.value !== null)

const loadedUrl = ref<string | null>(null)
const fetchedText = ref<string | null>(null)
const shareUrl = ref<string | null>(null)
const initialPastedText = ref('')
const previousSnapshot = ref<RobotsSnapshot | null>(null)

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
  previousSnapshot.value = result ? recordSnapshot(result.finalUrl, result.text) : null
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
}

function onApplyText(text: string) {
  // RobotsInput only reacts to prop changes, so reset first in case the value repeats.
  initialPastedText.value = ''
  initialPastedText.value = text
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

    <RobotsResults
      v-if="hasResults && analysis"
      :analysis="analysis"
      :simulation-config="simulationConfig"
      @update:simulation-config="simulationConfig = $event"
      @apply-text="onApplyText"
    />
  </div>
</template>
