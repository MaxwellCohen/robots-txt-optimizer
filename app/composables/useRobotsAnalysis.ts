import { useDebounceFn } from '@vueuse/core'
import { analyzeRobotsTxt } from '#shared/robots'
import type { RobotsAnalysis } from '#shared/robots/types'

export function useRobotsAnalysis() {
  const robotsText = ref('')
  const analysis = ref<RobotsAnalysis | null>(null)
  const analyzing = ref(false)

  function runAnalysis(text: string) {
    if (!text.trim()) {
      analysis.value = null
      return
    }

    analyzing.value = true
    try {
      robotsText.value = text
      analysis.value = analyzeRobotsTxt(text)
    } finally {
      analyzing.value = false
    }
  }

  const debouncedAnalyze = useDebounceFn((text: string) => {
    runAnalysis(text)
  }, 400)

  return {
    robotsText,
    analysis,
    analyzing: readonly(analyzing),
    runAnalysis,
    debouncedAnalyze
  }
}
