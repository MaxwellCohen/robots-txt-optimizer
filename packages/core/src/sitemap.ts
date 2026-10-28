import { checkRobotsPath } from './match'
import type { RobotsDocument } from './types'

export type SitemapKind = 'urlset' | 'sitemapindex' | 'invalid'

export interface ParsedSitemap {
  kind: SitemapKind
  /** `<loc>` values: page URLs for a urlset, child sitemap URLs for an index. */
  locs: string[]
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\''
}

function decodeXmlText(value: string): string {
  const cdata = value.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/)
  const text = cdata ? cdata[1]! : value
  return text
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => ENTITIES[name]!)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
    .trim()
}

/** Extracts `<loc>` entries from a sitemap or sitemap index (namespace prefixes allowed). */
export function parseSitemapXml(xml: string): ParsedSitemap {
  const root = xml.match(/<(?:[\w-]+:)?(urlset|sitemapindex)[\s>]/i)
  if (!root) {
    return { kind: 'invalid', locs: [] }
  }

  const locs: string[] = []
  const locPattern = /<(?:[\w-]+:)?loc>([\s\S]*?)<\/(?:[\w-]+:)?loc>/gi
  for (const match of xml.matchAll(locPattern)) {
    const loc = decodeXmlText(match[1]!)
    if (loc) {
      locs.push(loc)
    }
  }

  return { kind: root[1]!.toLowerCase() as SitemapKind, locs }
}

export interface SitemapUrlConflict {
  url: string
  path: string
  userAgent: string
  matchedRule: string
  line: number
}

export const SITEMAP_CHECK_AGENTS = ['Googlebot', 'Bingbot'] as const

function pathOf(url: string): string | null {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname}${parsed.search}`
  } catch {
    return null
  }
}

/** Sitemap URLs that robots.txt blocks — crawlers are told to index pages they may not fetch. */
export function findBlockedSitemapUrls(
  doc: RobotsDocument,
  urls: readonly string[],
  userAgents: readonly string[] = SITEMAP_CHECK_AGENTS
): SitemapUrlConflict[] {
  const conflicts: SitemapUrlConflict[] = []
  for (const url of urls) {
    const path = pathOf(url)
    if (!path) {
      continue
    }
    for (const userAgent of userAgents) {
      const result = checkRobotsPath(doc.raw, userAgent, path, doc)
      if (!result.allowed) {
        conflicts.push({
          url,
          path,
          userAgent,
          matchedRule: result.matchedPattern,
          line: result.matchingLine
        })
      }
    }
  }
  return conflicts
}

export interface SitemapFetchEntry {
  url: string
  status: number | null
  kind: SitemapKind | null
  urlCount: number
  error?: string
}

export interface SitemapReport {
  sitemaps: SitemapFetchEntry[]
  /** Page URLs collected from all urlsets (deduplicated, capped). */
  urls: string[]
  /** True when limits stopped collection early. */
  truncated: boolean
}
