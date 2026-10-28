import { analyzeCrawlerAccess, type CrawlerAccessStatus, type KnownCrawler } from './crawlers'
import { diffLines, type DiffLine } from './diff'
import { checkRobotsPath } from './match'
import { pathsFromPattern } from './optimize'
import { parseRobotsTxt } from './parse'
import { DEFAULT_PATHS, DEFAULT_USER_AGENTS } from './paths'
import type { RobotsDocument } from './types'

export interface VerdictChange {
  userAgent: string
  path: string
  before: boolean
  after: boolean
  beforeRule: string
  afterRule: string
  beforeLine: number
  afterLine: number
}

export interface CrawlerStatusChange {
  crawler: KnownCrawler
  before: CrawlerAccessStatus
  after: CrawlerAccessStatus
}

export interface RobotsComparison {
  diff: DiffLine[]
  verdictChanges: VerdictChange[]
  crawlerChanges: CrawlerStatusChange[]
  checkedUserAgents: string[]
  checkedPaths: string[]
}

export interface CompareOptions {
  userAgents?: readonly string[]
  paths?: readonly string[]
}

function namedAgents(doc: RobotsDocument): string[] {
  return doc.groups.flatMap(group => group.userAgents).filter(agent => agent.trim())
}

function probePaths(doc: RobotsDocument): string[] {
  return doc.groups.flatMap(group => group.directives)
    .filter(directive => directive.type === 'allow' || directive.type === 'disallow')
    .flatMap(directive => pathsFromPattern(directive.value))
}

/** Compares two robots.txt files: text diff plus which crawl verdicts changed. */
export function compareRobotsTxt(
  beforeText: string,
  afterText: string,
  options: CompareOptions = {}
): RobotsComparison {
  const before = parseRobotsTxt(beforeText)
  const after = parseRobotsTxt(afterText)

  const userAgents = [...new Set([
    ...(options.userAgents ?? DEFAULT_USER_AGENTS),
    ...namedAgents(before),
    ...namedAgents(after)
  ])]
  const paths = [...new Set([
    ...(options.paths ?? DEFAULT_PATHS),
    ...probePaths(before),
    ...probePaths(after)
  ])]

  const verdictChanges: VerdictChange[] = []
  for (const userAgent of userAgents) {
    for (const path of paths) {
      const a = checkRobotsPath(beforeText, userAgent, path, before)
      const b = checkRobotsPath(afterText, userAgent, path, after)
      if (a.allowed !== b.allowed) {
        verdictChanges.push({
          userAgent,
          path,
          before: a.allowed,
          after: b.allowed,
          beforeRule: a.matchedPattern,
          afterRule: b.matchedPattern,
          beforeLine: a.matchingLine,
          afterLine: b.matchingLine
        })
      }
    }
  }

  const beforeAccess = analyzeCrawlerAccess(before)
  const afterAccess = analyzeCrawlerAccess(after)
  const crawlerChanges = beforeAccess.flatMap((entry, index) => {
    const next = afterAccess[index]!
    return entry.status === next.status
      ? []
      : [{ crawler: entry.crawler, before: entry.status, after: next.status }]
  })

  return {
    diff: diffLines(beforeText, afterText),
    verdictChanges,
    crawlerChanges,
    checkedUserAgents: userAgents,
    checkedPaths: paths
  }
}
