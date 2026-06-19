<script setup lang="ts">
import type { RobotsAnalysis, SimulationConfig } from '@robots-txt-optimizer/core'

const RobotsValidationReport = defineAsyncComponent(
  () => import('~/components/robots/ValidationReport.vue')
)
const RobotsDirectiveSummary = defineAsyncComponent(
  () => import('~/components/robots/DirectiveSummary.vue')
)
const RobotsPathSimulation = defineAsyncComponent(
  () => import('~/components/robots/PathSimulation.vue')
)
const RobotsOptimizationList = defineAsyncComponent(
  () => import('~/components/robots/OptimizationList.vue')
)

defineProps<{
  analysis: RobotsAnalysis
  simulationConfig: SimulationConfig
}>()

const emit = defineEmits<{
  'update:simulationConfig': [config: SimulationConfig]
}>()
</script>

<template>
  <RobotsValidationReport :validation="analysis.validation" />

  <RobotsDirectiveSummary :rows="analysis.directiveSummary" />

  <RobotsPathSimulation
    :document="analysis.document"
    :config="simulationConfig"
    @update:config="emit('update:simulationConfig', $event)"
  />

  <RobotsOptimizationList
    :suggestions="analysis.suggestions"
    :optimized-text="analysis.optimizedText"
  />
</template>
