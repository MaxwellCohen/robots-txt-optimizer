<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { loading, error, fetchRobotsTxt } = useRobotsFetch()
const { analysis, analyzing, runAnalysis, debouncedAnalyze } = useRobotsAnalysis()
const { textFromQuery, decodeTextFromQuery, debouncedSyncTextToUrl } = useRobotsTextUrl()

const hasResults = computed(() => analysis.value !== null)

const loadedUrl = ref<string | null>(null)
const loadedText = ref<string | null>(null)
const initialPastedText = ref('')
const inputTab = ref<'url' | 'paste'>('url')

const urlFromQuery = computed(() => {
  const queryUrl = route.query.url
  return typeof queryUrl === 'string' ? queryUrl : ''
})

async function analyzeUrl(url: string, updateQuery = true) {
  if (updateQuery) {
    await router.replace({ query: { url } })
  }

  const result = await fetchRobotsTxt(url)
  if (result) {
    loadedUrl.value = result.finalUrl
    loadedText.value = result.text
    runAnalysis(result.text)
  } else {
    loadedUrl.value = null
    loadedText.value = null
    runAnalysis('')
  }
}

async function onAnalyzeUrl(url: string) {
  await analyzeUrl(url)
}

function onAnalyzeText(text: string) {
  loadedUrl.value = null
  loadedText.value = null
  debouncedAnalyze(text)
  debouncedSyncTextToUrl(text)
}

function onUpdateLoadedText(text: string) {
  loadedUrl.value = null
  loadedText.value = text
  debouncedAnalyze(text)
  debouncedSyncTextToUrl(text)
}

async function loadTextFromQuery(encoded: string) {
  const text = await decodeTextFromQuery(encoded)
  if (!text) {
    return
  }

  loadedUrl.value = null
  loadedText.value = null
  initialPastedText.value = text
  inputTab.value = 'paste'
  runAnalysis(text)
}

onMounted(async () => {
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
      :initial-tab="inputTab"
      :initial-pasted-text="initialPastedText"
      :loaded-url="loadedUrl"
      :loaded-text="loadedText"
      @analyze-url="onAnalyzeUrl"
      @analyze-text="onAnalyzeText"
      @update-loaded-text="onUpdateLoadedText"
    />

    <template v-if="hasResults && analysis">
      <RobotsValidationReport :validation="analysis.validation" />

      <RobotsDirectiveSummary :rows="analysis.directiveSummary" />

      <RobotsPathSimulation :verdicts="analysis.pathSimulation" />

      <RobotsOptimizationList
        :suggestions="analysis.suggestions"
        :optimized-text="analysis.optimizedText"
      />
    </template>
  </div>
</template>
