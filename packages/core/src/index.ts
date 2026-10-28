import { parseRobotsTxt } from './parse'
import { validateRobotsDocument } from './validate'
import { simulatePaths, summarizeDirectives } from './analyze'
import { buildOptimizedText, suggestOptimizations } from './optimize'
import { analyzeCrawlerAccess } from './crawlers'
import type { RobotsAnalysis } from './types'

export function analyzeRobotsTxt(text: string): RobotsAnalysis {
  const document = parseRobotsTxt(text)
  const validation = validateRobotsDocument(document)
  const directiveSummary = summarizeDirectives(document)
  const pathSimulation = simulatePaths(document)
  const suggestions = suggestOptimizations(document)
  const optimizedText = buildOptimizedText(document, suggestions)
  const crawlerAccess = analyzeCrawlerAccess(document)

  return {
    document,
    validation,
    directiveSummary,
    pathSimulation,
    suggestions,
    optimizedText,
    crawlerAccess
  }
}

export * from './types'
export { parseRobotsTxt, serializeRobotsDocument } from './parse'
export { validateRobotsDocument } from './validate'
export { simulatePaths, summarizeDirectives } from './analyze'
export { suggestOptimizations, buildOptimizedText } from './optimize'
export { checkRobotsPath, findApplicableGroups } from './match'
export { DEFAULT_PATHS, DEFAULT_USER_AGENTS, SIMULATION_ORIGIN } from './paths'
export {
  collectUserAgentOptions,
  decodeSimulationConfig,
  defaultSimulationConfig,
  encodeSimulationConfig,
  isDefaultSimulationConfig,
  normalizeSimulationPath,
  parseSimulationPaths,
  SIMULATION_PATH_DELIMITER,
  type SimulationConfig
} from './simulation-config'
export { explainPattern, explainOtherDirective } from './explain-pattern'
export { formatDirectiveSummaryMarkdown } from './format-markdown'
export {
  analyzeCrawlerAccess,
  applyCrawlerPolicy,
  collectUserAgentLines,
  CRAWLER_CATEGORY_LABELS,
  CRAWLER_POLICY_PRESETS,
  crawlerPolicyFromPreset,
  findKnownCrawler,
  KNOWN_CRAWLERS,
  suggestCrawlerToken,
  type CrawlerAccess,
  type CrawlerAccessStatus,
  type CrawlerCategory,
  type CrawlerPolicy,
  type CrawlerPolicyAction,
  type CrawlerPolicyPreset,
  type KnownCrawler
} from './crawlers'
export { collectCrawlabilityIssues, RENDER_RESOURCE_PATHS } from './checks'
export { diffLines, diffStats, type DiffLine, type DiffLineType } from './diff'
export {
  compareRobotsTxt,
  type CompareOptions,
  type CrawlerStatusChange,
  type RobotsComparison,
  type VerdictChange
} from './compare'
export { getRobotsTemplates, type RobotsTemplate } from './templates'
export {
  findBlockedSitemapUrls,
  parseSitemapXml,
  SITEMAP_CHECK_AGENTS,
  type ParsedSitemap,
  type SitemapFetchEntry,
  type SitemapKind,
  type SitemapReport,
  type SitemapUrlConflict
} from './sitemap'
