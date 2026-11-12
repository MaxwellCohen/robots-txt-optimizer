import { createError } from 'nuxt/server'
import { analyzeRobotsTxt, simulatePaths } from '@robots-txt-optimizer/core'
import { normalizeSimulationPath } from '@robots-txt-optimizer/core/simulation-config'

const MAX_SIMULATION_CELLS = 2000

/** Thrown when the requested simulation grid is too large; routes map it to HTTP 400. */
export class SimulationLimitError extends Error {}

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
      throw new SimulationLimitError(`Too many user-agent × path combinations (max ${MAX_SIMULATION_CELLS})`)
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

/** buildAnalyzeResponse for route handlers: converts limit errors to HTTP 400. */
export function buildAnalyzeResponseOrHttpError(text: string, options: AnalyzeRequestOptions = {}) {
  try {
    return buildAnalyzeResponse(text, options)
  } catch (err) {
    if (err instanceof SimulationLimitError) {
      throw createError({ statusCode: 400, message: err.message })
    }
    throw err
  }
}
