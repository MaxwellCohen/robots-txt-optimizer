import { normalizeDirectiveName, stripComment } from './parse'
import type { RobotsDocument, ValidationIssue, ValidationResult } from './types'
import { collectCrawlabilityIssues } from './checks'

const NON_RFC_DIRECTIVES = new Set(['crawldelay', 'host', 'contentsignal'])
const MAX_LINE_LENGTH = 4096

const PRODUCT_TOKEN = /^[0-9a-zA-Z_-]+$/

/** Native RFC 9309 syntax checks. */
function collectSyntaxIssues(doc: RobotsDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  let seenUserAgent = false

  for (const [i, raw] of doc.lines.entries()) {
    const lineNum = i + 1
    const content = stripComment(raw)
    if (!content) {
      continue
    }

    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(content)) {
      issues.push({ severity: 'error', message: 'Unexpected control character', line: lineNum })
      continue
    }

    const colonIndex = content.indexOf(':')
    if (colonIndex === -1) {
      continue
    }
    const normalized = normalizeDirectiveName(content.slice(0, colonIndex))
    const value = content.slice(colonIndex + 1).trim()

    if (normalized === 'useragent') {
      seenUserAgent = true
      if (value !== '*' && value && !PRODUCT_TOKEN.test(value)) {
        issues.push({
          severity: 'warning',
          message: 'Product token should only contain letters, digits, "_" and "-"',
          line: lineNum
        })
      }
      continue
    }

    if (normalized !== 'allow' && normalized !== 'disallow') {
      continue
    }
    const nonAscii = [...value].find(ch => ch.charCodeAt(0) > 0x7E)
    if (nonAscii) {
      issues.push({
        severity: 'warning',
        message: `Non-ASCII character "${nonAscii}" in path (valid UTF-8 per RFC 9309; percent-encode it for older crawlers)`,
        line: lineNum
      })
    }
    if (!seenUserAgent) {
      issues.push({
        severity: 'error',
        message: `${normalized === 'allow' ? 'Allow' : 'Disallow'} rule must follow a User-agent line`,
        line: lineNum
      })
    }
  }

  return issues
}

function collectDirectiveWarnings(doc: RobotsDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const [i, raw] of doc.lines.entries()) {
    const lineNum = i + 1
    const content = stripComment(raw)

    if (!content) {
      continue
    }

    if (raw.length > MAX_LINE_LENGTH) {
      issues.push({
        severity: 'warning',
        message: 'Line exceeds maximum recommended length',
        line: lineNum
      })
    }

    const colonIndex = content.indexOf(':')
    if (colonIndex === -1) {
      issues.push({
        severity: 'error',
        message: 'Missing colon separator between directive and value',
        line: lineNum
      })
      continue
    }

    const name = content.slice(0, colonIndex).trim()
    const normalized = normalizeDirectiveName(name)

    if (normalized === 'disalow' || normalized === 'dissallow') {
      issues.push({
        severity: 'warning',
        message: 'Directive appears to be a typo (accepted by crawlers but non-standard)',
        line: lineNum
      })
    }

    if (normalized === 'useragent' || normalized === 'sitemap' || normalized === 'allow' || normalized === 'disallow') {
      continue
    }

    if (NON_RFC_DIRECTIVES.has(normalized)) {
      issues.push({
        severity: 'warning',
        message: `Directive "${name}" is recognized but not part of RFC 9309 (may be ignored by crawlers)`,
        line: lineNum
      })
      continue
    }

    issues.push({
      severity: 'warning',
      message: 'Unrecognized or unparseable directive',
      line: lineNum
    })
  }

  return issues
}

function collectSemanticIssues(doc: RobotsDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const group of doc.groups) {
    if (group.userAgents.length === 0 && group.directives.length > 0) {
      issues.push({
        severity: 'warning',
        message: 'Group has directives but no User-agent',
        line: group.startLine
      })
    }

    for (const agent of group.userAgents) {
      if (!agent.trim()) {
        issues.push({
          severity: 'warning',
          message: 'Empty User-agent value',
          line: group.startLine
        })
      }
    }

    const pathDirectives = group.directives.filter(d => d.type === 'allow' || d.type === 'disallow')
    if (group.userAgents.length > 0 && pathDirectives.length === 0) {
      issues.push({
        severity: 'warning',
        message: `User-agent group (${group.userAgents.join(', ')}) has no Allow or Disallow rules`,
        line: group.startLine
      })
    }

    for (const directive of group.directives) {
      if (directive.type === 'disallow' && directive.value === '') {
        issues.push({
          severity: 'warning',
          message: 'Empty Disallow value allows all URLs for this user-agent',
          line: directive.line
        })
      }
    }
  }

  for (const sitemap of doc.sitemaps) {
    if (!sitemap.url) {
      issues.push({
        severity: 'warning',
        message: 'Empty Sitemap URL',
        line: sitemap.line
      })
    } else {
      try {
        const parsed = new URL(sitemap.url)
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          issues.push({
            severity: 'warning',
            message: 'Sitemap URL should use http or https',
            line: sitemap.line
          })
        }
      } catch {
        issues.push({
          severity: 'warning',
          message: 'Sitemap URL is not a valid absolute URL',
          line: sitemap.line
        })
      }
    }
  }

  return issues
}

function dedupeIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>()
  return issues.filter((issue) => {
    const key = `${issue.severity}:${issue.line}:${issue.message}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export function validateRobotsDocument(doc: RobotsDocument): ValidationResult {
  const issues: ValidationIssue[] = []

  issues.push(...collectSyntaxIssues(doc))
  issues.push(...collectDirectiveWarnings(doc))
  issues.push(...collectSemanticIssues(doc))
  issues.push(...collectCrawlabilityIssues(doc))

  const deduped = dedupeIssues(issues)
  const ok = !deduped.some(i => i.severity === 'error')

  return { ok, issues: deduped }
}
