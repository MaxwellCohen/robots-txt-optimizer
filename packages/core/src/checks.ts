import { collectUserAgentLines, findKnownCrawler, suggestCrawlerToken } from './crawlers'
import { checkRobotsPath } from './match'
import type { RobotsDocument, ValidationIssue } from './types'

/** Asset paths used by common frameworks and CMSs that crawlers need to render pages. */
export const RENDER_RESOURCE_PATHS = [
  '/assets/app.js',
  '/assets/style.css',
  '/static/js/main.js',
  '/static/css/main.css',
  '/js/app.js',
  '/css/site.css',
  '/_next/static/chunks/main.js',
  '/_nuxt/entry.js',
  '/build/app.js',
  '/dist/app.js',
  '/wp-includes/js/jquery/jquery.min.js',
  '/wp-content/themes/theme/style.css',
  '/wp-content/plugins/plugin/script.js',
  '/cdn/shop/t/1/assets/theme.js'
] as const

const RENDER_CHECK_AGENTS = ['Googlebot', 'Bingbot'] as const

function crawlerTokenIssues(doc: RobotsDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const { agent, line } of collectUserAgentLines(doc)) {
    const suggestion = suggestCrawlerToken(agent)
    if (suggestion) {
      issues.push({
        severity: 'warning',
        message: `User-agent "${agent}" is not a recognized crawler token — did you mean ${suggestion}?`,
        line
      })
    }
  }
  return issues
}

function siteBlockIssues(doc: RobotsDocument): ValidationIssue[] {
  const root = checkRobotsPath(doc.raw, '*', '/', doc)
  const google = checkRobotsPath(doc.raw, 'Googlebot', '/', doc)
  const issues: ValidationIssue[] = []

  if (!root.allowed) {
    issues.push({
      severity: 'warning',
      message: doc.sitemaps.length > 0
        ? 'All crawlers are blocked from the entire site, yet a sitemap is listed — this often means a staging robots.txt shipped to production'
        : 'All crawlers are blocked from the entire site (User-agent: * / Disallow: /) — make sure this is not a staging file on production',
      line: root.matchingLine || undefined
    })
  } else if (!google.allowed) {
    issues.push({
      severity: 'warning',
      message: 'Googlebot is blocked from the entire site — pages will drop out of Google Search',
      line: google.matchingLine || undefined
    })
  }

  return issues
}

function renderResourceIssues(doc: RobotsDocument): ValidationIssue[] {
  const byLine = new Map<number, { pattern: string, paths: Set<string>, agents: Set<string> }>()

  for (const agent of RENDER_CHECK_AGENTS) {
    if (!checkRobotsPath(doc.raw, agent, '/', doc).allowed) {
      // The whole site is blocked; siteBlockIssues already reports it.
      continue
    }
    for (const path of RENDER_RESOURCE_PATHS) {
      const result = checkRobotsPath(doc.raw, agent, path, doc)
      if (result.allowed || result.matchingLine === 0) {
        continue
      }
      const entry = byLine.get(result.matchingLine) ?? {
        pattern: result.matchedPattern,
        paths: new Set<string>(),
        agents: new Set<string>()
      }
      entry.paths.add(path)
      entry.agents.add(agent)
      byLine.set(result.matchingLine, entry)
    }
  }

  return [...byLine.entries()].map(([line, entry]) => ({
    severity: 'warning' as const,
    message: `Disallow "${entry.pattern}" blocks CSS/JavaScript that ${[...entry.agents].join(' and ')} need${entry.agents.size === 1 ? 's' : ''} to render pages (e.g. ${[...entry.paths][0]})`,
    line
  }))
}

function controlTokenIssues(doc: RobotsDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const { agent, line } of collectUserAgentLines(doc)) {
    const crawler = findKnownCrawler(agent)
    if (crawler?.token === 'Google-Extended') {
      const google = checkRobotsPath(doc.raw, 'Googlebot', '/', doc)
      if (!google.allowed) {
        issues.push({
          severity: 'warning',
          message: 'Google-Extended only controls AI use of content; it is Googlebot that is blocking Google Search here',
          line
        })
      }
    }
  }
  return issues
}

/** Crawlability checks beyond syntax: risky blocks and crawler token mistakes. */
export function collectCrawlabilityIssues(doc: RobotsDocument): ValidationIssue[] {
  return [
    ...siteBlockIssues(doc),
    ...renderResourceIssues(doc),
    ...crawlerTokenIssues(doc),
    ...controlTokenIssues(doc)
  ]
}
