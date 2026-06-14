<script setup lang="ts">
const { loading, error, fetchRobotsTxt } = useRobotsFetch()
const { analysis, analyzing, runAnalysis, debouncedAnalyze } = useRobotsAnalysis()

const hasResults = computed(() => analysis.value !== null)

async function onAnalyzeUrl(url: string) {
  const result = await fetchRobotsTxt(url)
  if (result) {
    runAnalysis(result.text)
  }
}

function onAnalyzeText(text: string) {
  debouncedAnalyze(text)
}

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
      :fetch-error="error?.message ?? null"
      @analyze-url="onAnalyzeUrl"
      @analyze-text="onAnalyzeText"
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
