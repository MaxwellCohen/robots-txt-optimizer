<script setup lang="ts">
import type { RobotsAnalysis, SimulationConfig } from '@robots-txt-optimizer/core'

defineProps<{
  analysis: RobotsAnalysis
  simulationConfig: SimulationConfig
}>()

const emit = defineEmits<{
  'update:simulationConfig': [config: SimulationConfig]
  'applyText': [text: string]
}>()
</script>

<template>
  <RobotsValidationReport :validation="analysis.validation" />

  <RobotsAiCrawlers
    :document="analysis.document"
    :access="analysis.crawlerAccess"
    @apply-text="emit('applyText', $event)"
  />

  <RobotsDirectiveSummary :rows="analysis.directiveSummary" />

  <RobotsPathSimulation
    :document="analysis.document"
    :config="simulationConfig"
    @update:config="emit('update:simulationConfig', $event)"
  />

  <RobotsSitemapCheck :document="analysis.document" />

  <RobotsOptimizationList
    :document="analysis.document"
    :suggestions="analysis.suggestions"
    @apply-text="emit('applyText', $event)"
  />
</template>
