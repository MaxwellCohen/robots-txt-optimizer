import { useDebounceFn } from '@vueuse/core'
import type { RobotsAnalysis } from '@robots-txt-optimizer/core'

export function useRobotsAnalysis() {
  const robotsText = ref('')
  const analysis = ref<RobotsAnalysis | null>(null)
  const analyzing = ref(false)

  async function runAnalysis(text: string) {
    if (!text.trim()) {
      analysis.value = null
      return
    }

    analyzing.value = true
    try {
      const { analyzeRobotsTxt } = await import('@robots-txt-optimizer/core')
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
