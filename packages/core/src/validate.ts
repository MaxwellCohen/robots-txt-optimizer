import { parse as lintParse } from 'robots-linter'
import { isUserAgentLineContent, normalizeDirectiveName, stripComment } from './parse'
import { textForLint } from './robots-text'
import type { RobotsDocument, ValidationIssue, ValidationResult } from './types'
import { collectCrawlabilityIssues } from './checks'

const NON_RFC_DIRECTIVES = new Set(['crawldelay', 'host', 'contentsignal'])
const MAX_LINE_LENGTH = 4096

function isUnexpectedCharacterError(message: string): boolean {
  return message.includes('Unexpected Character')
}

function isInvalidProductTokenError(message: string): boolean {
  return message.includes('Product token MUST only contains')
}

function isUnexpectedTokenError(message: string): boolean {
  return message.includes('Unexpected Token')
}

function issueFromParseError(err: unknown, doc: RobotsDocument): ValidationIssue | null {
  if (!(err instanceof Error)) {
    return null
  }
  const lineMatch = err.message.match(/line[:\s]+(\d+)/i)
    ?? err.message.match(/at line (\d+)/i)
  const line = lineMatch ? Number(lineMatch[1]) : undefined

  if (
    line !== undefined
    && (
      isUnexpectedCharacterError(err.message)
      || isInvalidProductTokenError(err.message)
      || isUnexpectedTokenError(err.message)
    )
    && isUserAgentLineContent(doc.lines[line - 1] ?? '')
  ) {
    return null
  }

  return {
    severity: 'error',
    message: err.message,
    line
  }
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

  try {
    lintParse(textForLint(doc))
  } catch (err) {
    const issue = issueFromParseError(err, doc)
    if (issue) {
      issues.push(issue)
    } else if (!(err instanceof Error)) {
      issues.push({
        severity: 'error',
        message: 'Failed to parse robots.txt'
      })
    }
  }

  issues.push(...collectDirectiveWarnings(doc))
  issues.push(...collectSemanticIssues(doc))
  issues.push(...collectCrawlabilityIssues(doc))

  const deduped = dedupeIssues(issues)
  const ok = !deduped.some(i => i.severity === 'error')

  return { ok, issues: deduped }
}
