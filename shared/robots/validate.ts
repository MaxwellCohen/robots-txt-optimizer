import { parse as lintParse } from 'robots-linter'
import {
  parseRobotsTxt as googleParse,
  RobotsParsingReporter,
  RobotsTagName
} from '@trybyte/robotstxt-parser'
import type { RobotsDocument, ValidationIssue, ValidationResult } from './types'

function issueFromParseError(err: unknown): ValidationIssue | null {
  if (!(err instanceof Error)) {
    return null
  }
  const lineMatch = err.message.match(/line[:\s]+(\d+)/i)
    ?? err.message.match(/at line (\d+)/i)
  const line = lineMatch ? Number(lineMatch[1]) : undefined
  return {
    severity: 'error',
    message: err.message,
    line
  }
}

function collectReporterIssues(reporter: RobotsParsingReporter): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (const result of reporter.parseResults()) {
    const { lineNum, tagName, isTypo, metadata } = result

    if (metadata.isLineTooLong) {
      issues.push({
        severity: 'warning',
        message: 'Line exceeds maximum recommended length',
        line: lineNum
      })
    }

    if (metadata.isMissingColonSeparator) {
      issues.push({
        severity: 'error',
        message: 'Missing colon separator between directive and value',
        line: lineNum
      })
    }

    if (tagName === RobotsTagName.Unknown && metadata.hasDirective) {
      issues.push({
        severity: 'warning',
        message: 'Unrecognized or unparseable directive',
        line: lineNum
      })
    }

    if (isTypo) {
      issues.push({
        severity: 'warning',
        message: 'Directive appears to be a typo (accepted by crawlers but non-standard)',
        line: lineNum
      })
    }

    if (tagName === RobotsTagName.Unused) {
      issues.push({
        severity: 'warning',
        message: 'Directive is recognized but not part of RFC 9309 (may be ignored by crawlers)',
        line: lineNum
      })
    }
  }

  return issues
}

function collectSemanticIssues(doc: RobotsDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi]!

    if (group.userAgents.length === 0) {
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
    lintParse(doc.raw)
  } catch (err) {
    const issue = issueFromParseError(err)
    if (issue) {
      issues.push(issue)
    } else {
      issues.push({
        severity: 'error',
        message: 'Failed to parse robots.txt'
      })
    }
  }

  const reporter = new RobotsParsingReporter()
  googleParse(doc.raw, reporter)
  issues.push(...collectReporterIssues(reporter))
  issues.push(...collectSemanticIssues(doc))

  const deduped = dedupeIssues(issues)
  const ok = !deduped.some(i => i.severity === 'error')

  return { ok, issues: deduped }
}
