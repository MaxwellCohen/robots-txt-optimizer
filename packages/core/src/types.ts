import type { CrawlerAccess } from './crawlers'

export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  severity: IssueSeverity
  message: string
  line?: number
  column?: number
}

export interface ValidationResult {
  ok: boolean
  issues: ValidationIssue[]
}

export type DirectiveType = 'allow' | 'disallow' | 'crawl-delay' | 'host' | 'unknown'

export interface Directive {
  type: DirectiveType
  name: string
  value: string
  line: number
  raw: string
}

export interface UserAgentGroup {
  userAgents: string[]
  directives: Directive[]
  startLine: number
}

export interface SitemapEntry {
  url: string
  line: number
}

export interface RobotsDocument {
  groups: UserAgentGroup[]
  sitemaps: SitemapEntry[]
  raw: string
  lines: string[]
}

export interface DirectiveSummaryRow {
  groupIndex: number
  userAgents: string[]
  allow: string[]
  disallow: string[]
  other: { name: string, value: string, line: number }[]
  startLine: number
}

export interface PathVerdict {
  userAgent: string
  path: string
  allowed: boolean
  matchedRule: string
  matchedRuleType: 'allow' | 'disallow' | 'none'
  matchingLine: number
}

export type SuggestionType
  = | 'duplicate_directive'
    | 'duplicate_group'
    | 'dead_rule'
    | 'redundant_catchall'
    | 'empty_group'
    | 'missing_user_agent'

export interface OptimizationSuggestion {
  type: SuggestionType
  message: string
  lines: number[]
  groupIndex?: number
  userAgents?: string[]
}

export interface RobotsAnalysis {
  document: RobotsDocument
  validation: ValidationResult
  directiveSummary: DirectiveSummaryRow[]
  pathSimulation: PathVerdict[]
  suggestions: OptimizationSuggestion[]
  optimizedText: string
  crawlerAccess: CrawlerAccess[]
}

export interface FetchResult {
  text: string
  finalUrl: string
  status: number
  contentType: string | null
  source: 'client' | 'server'
  /** True when the request was redirected before reaching `finalUrl`. */
  redirected?: boolean
  /** Response body size in bytes. */
  bytes?: number
  /** True when the body starts with a UTF-8 byte order mark. */
  hasBom?: boolean
}

export interface FetchError {
  message: string
  url: string
  source?: 'client' | 'server'
}
