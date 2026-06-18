import { stripComment } from './parse'
import type { RobotsDocument } from './types'

const USER_AGENT_SEPARATOR_PATTERN = /[\s\u00a0\u2011\u2010\u2012\u2013\u2014-]+/g

export function normalizeDirectiveName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, '')
}

export function normalizeUserAgentForLinter(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '*') {
    return '*'
  }

  const rewritten = trimmed
    .replace(USER_AGENT_SEPARATOR_PATTERN, '_')
    .replace(/[^0-9a-zA-Z_]/g, '')

  return rewritten || 'agent'
}

export function normalizeUserAgentForMatch(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (trimmed === '*') {
    return '*'
  }

  return trimmed
    .replace(USER_AGENT_SEPARATOR_PATTERN, '_')
    .replace(/[^0-9a-z0-9_]/g, '')
}

function rewriteUserAgentLine(line: string): string {
  const commentIndex = line.indexOf('#')
  const comment = commentIndex === -1 ? '' : line.slice(commentIndex)
  const withoutComment = commentIndex === -1 ? line : line.slice(0, commentIndex)
  const content = withoutComment.trim()
  const colonIndex = content.indexOf(':')

  if (colonIndex === -1) {
    return line
  }

  const name = content.slice(0, colonIndex).trim()
  const value = content.slice(colonIndex + 1).trim()
  const leading = withoutComment.slice(0, withoutComment.indexOf(content))
  const rewritten = normalizeUserAgentForLinter(value)

  if (!comment) {
    return `${leading}${name}: ${rewritten}`
  }

  return `${leading}${name}: ${rewritten}  ${comment.trim()}`
}

export function textForLint(doc: RobotsDocument): string {
  const lintableDirectives = new Set(['useragent', 'allow', 'disallow', 'sitemap'])

  return doc.lines.map((line) => {
    const content = stripComment(line)
    if (!content) {
      return line
    }

    const colonIndex = content.indexOf(':')
    if (colonIndex === -1) {
      return line
    }

    const normalized = normalizeDirectiveName(content.slice(0, colonIndex).trim())
    if (normalized === 'useragent') {
      return rewriteUserAgentLine(line)
    }

    if (lintableDirectives.has(normalized)) {
      return line
    }

    return `# ${line}`
  }).join('\n')
}

export function textForMatching(doc: RobotsDocument): string {
  const text = textForLint(doc)
  const hasUserAgent = text.split(/\r?\n/).some((line) => {
    const content = stripComment(line)
    if (!content) {
      return false
    }
    const colonIndex = content.indexOf(':')
    if (colonIndex === -1) {
      return false
    }
    return normalizeDirectiveName(content.slice(0, colonIndex).trim()) === 'useragent'
  })

  const hasPathRules = doc.groups.some(group =>
    group.directives.some(directive => directive.type === 'allow' || directive.type === 'disallow')
  )

  if (!hasUserAgent && hasPathRules) {
    return `User-agent: *\n${text}`
  }

  return text
}

export function userAgentMatches(ruleAgent: string, requestAgent: string): boolean {
  const rule = normalizeUserAgentForMatch(ruleAgent)
  const request = normalizeUserAgentForMatch(requestAgent)

  if (rule === '*') {
    return true
  }

  return request.includes(rule)
}
