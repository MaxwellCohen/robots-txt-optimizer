import type { Directive, DirectiveType, RobotsDocument, UserAgentGroup } from './types'

const DIRECTIVE_MAP: Record<string, DirectiveType> = {
  'allow': 'allow',
  'disallow': 'disallow',
  'crawl-delay': 'crawl-delay',
  'host': 'host'
}

function parseDirectiveName(line: string): { name: string, value: string } | null {
  const colonIndex = line.indexOf(':')
  if (colonIndex === -1) {
    return null
  }
  const name = line.slice(0, colonIndex).trim()
  const value = line.slice(colonIndex + 1).trim()
  return { name, value }
}

export function stripComment(line: string): string {
  const hashIndex = line.indexOf('#')
  if (hashIndex === -1) {
    return line.trim()
  }
  return line.slice(0, hashIndex).trim()
}

export function isUserAgentLineContent(line: string): boolean {
  const content = stripComment(line)
  if (!content) {
    return false
  }
  const parsed = parseDirectiveName(content)
  return parsed !== null && normalizeDirectiveName(parsed.name) === 'useragent'
}

function normalizeDirectiveName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, '')
}

function resolveDirectiveType(name: string): DirectiveType {
  const normalized = normalizeDirectiveName(name)
  if (normalized === 'useragent') {
    return 'unknown'
  }
  if (normalized === 'sitemap') {
    return 'unknown'
  }
  const mapped = DIRECTIVE_MAP[normalized]
  if (mapped) {
    return mapped
  }
  // Common typos accepted by Google parser
  if (normalized === 'disalow' || normalized === 'dissallow') {
    return 'disallow'
  }
  if (normalized === 'crawldelay') {
    return 'crawl-delay'
  }
  return 'unknown'
}

function isUserAgentLine(name: string): boolean {
  return normalizeDirectiveName(name) === 'useragent'
}

function isSitemapLine(name: string): boolean {
  return normalizeDirectiveName(name) === 'sitemap'
}

export function parseRobotsTxt(text: string): RobotsDocument {
  const lines = text.split(/\r?\n/)
  const groups: UserAgentGroup[] = []
  const sitemaps: RobotsDocument['sitemaps'] = []
  let currentGroup: UserAgentGroup | null = null

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const raw = lines[i]!
    const content = stripComment(raw)

    if (!content) {
      continue
    }

    const parsed = parseDirectiveName(content)
    if (!parsed) {
      continue
    }

    const { name, value } = parsed

    if (isUserAgentLine(name)) {
      if (!currentGroup || currentGroup.directives.length > 0) {
        currentGroup = {
          userAgents: [],
          directives: [],
          startLine: lineNum
        }
        groups.push(currentGroup)
      }
      currentGroup.userAgents.push(value)
      continue
    }

    if (isSitemapLine(name)) {
      currentGroup = null
      sitemaps.push({ url: value, line: lineNum })
      continue
    }

    const directive: Directive = {
      type: resolveDirectiveType(name),
      name,
      value,
      line: lineNum,
      raw
    }

    if (!currentGroup) {
      currentGroup = {
        userAgents: [],
        directives: [],
        startLine: lineNum
      }
      groups.push(currentGroup)
    }

    currentGroup.directives.push(directive)
  }

  return {
    groups,
    sitemaps,
    raw: text,
    lines
  }
}

export function serializeRobotsDocument(doc: RobotsDocument): string {
  const output: string[] = []

  for (const group of doc.groups) {
    if (group.userAgents.length === 0 && group.directives.length === 0) {
      continue
    }
    for (const agent of group.userAgents) {
      output.push(`User-agent: ${agent}`)
    }
    for (const directive of group.directives) {
      const label = directive.type === 'unknown'
        ? directive.name
        : directive.type === 'crawl-delay'
          ? 'Crawl-delay'
          : directive.type.charAt(0).toUpperCase() + directive.type.slice(1)
      output.push(`${label}: ${directive.value}`)
    }
    output.push('')
  }

  for (const sitemap of doc.sitemaps) {
    output.push(`Sitemap: ${sitemap.url}`)
  }

  return output.join('\n').trimEnd()
}
