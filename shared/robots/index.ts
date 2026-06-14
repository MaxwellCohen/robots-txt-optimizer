import { parseRobotsTxt } from './parse'
import { validateRobotsDocument } from './validate'
import { simulatePaths, summarizeDirectives } from './analyze'
import { buildOptimizedText, suggestOptimizations } from './optimize'
import type { RobotsAnalysis } from './types'

export function analyzeRobotsTxt(text: string): RobotsAnalysis {
  const document = parseRobotsTxt(text)
  const validation = validateRobotsDocument(document)
  const directiveSummary = summarizeDirectives(document)
  const pathSimulation = simulatePaths(document)
  const suggestions = suggestOptimizations(document)
  const optimizedText = buildOptimizedText(document, suggestions)

  return {
    document,
    validation,
    directiveSummary,
    pathSimulation,
    suggestions,
    optimizedText
  }
}

export * from './types'
export { parseRobotsTxt, serializeRobotsDocument } from './parse'
export { validateRobotsDocument } from './validate'
export { simulatePaths, summarizeDirectives } from './analyze'
export { suggestOptimizations, buildOptimizedText } from './optimize'
export { DEFAULT_PATHS, DEFAULT_USER_AGENTS, SIMULATION_ORIGIN } from './paths'
