import { analyzeRobotsTxt, simulatePaths } from '@robots-txt-optimizer/core'
import { normalizeSimulationPath } from '@robots-txt-optimizer/core/simulation-config'
import { createError } from 'nuxt/server'

export const MAX_ANALYZE_TEXT_BYTES = 2 * 1024 * 1024
const MAX_SIMULATION_CELLS = 2000

export interface AnalyzeRequestOptions {
  userAgents?: string[]
  paths?: string[]
}

/** Public JSON shape for the analyze API (omits the internal parsed document). */
export function buildAnalyzeResponse(text: string, options: AnalyzeRequestOptions = {}) {
  const { document, ...analysis } = analyzeRobotsTxt(text)

  const userAgents = options.userAgents?.length ? options.userAgents : null
  const paths = options.paths?.length ? options.paths.map(normalizeSimulationPath).filter(Boolean) : null
  if (userAgents || paths) {
    const agents = userAgents ?? [...new Set(analysis.pathSimulation.map(v => v.userAgent))]
    const checked = paths ?? [...new Set(analysis.pathSimulation.map(v => v.path))]
    if (agents.length * checked.length > MAX_SIMULATION_CELLS) {
      throw createError({ statusCode: 400, message: `Too many user-agent × path combinations (max ${MAX_SIMULATION_CELLS})` })
    }
    analysis.pathSimulation = simulatePaths(document, agents, checked)
  }

  return {
    ...analysis,
    crawlerAccess: analysis.crawlerAccess.map(entry => ({
      token: entry.crawler.token,
      operator: entry.crawler.operator,
      category: entry.crawler.category,
      status: entry.status,
      matchedAgents: entry.matchedAgents,
      hasSpecificGroup: entry.hasSpecificGroup,
      line: entry.line
    })),
    sitemaps: document.sitemaps
  }
}
