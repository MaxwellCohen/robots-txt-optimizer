import { decodePath } from 'robots-linter'
import type { Directive, RobotsDocument, UserAgentGroup } from './types'
import { parseRobotsTxt } from './parse'
import { normalizeUserAgentForMatch, userAgentMatches } from './robots-text'

export interface PathMatchResult {
  allowed: boolean
  matchedPattern: string
  matchedRuleType: 'allow' | 'disallow' | 'none'
  matchingLine: number
}

const DEFAULT_MATCH: PathMatchResult = {
  allowed: true,
  matchedPattern: '(default allow)',
  matchedRuleType: 'none',
  matchingLine: 0
}

/**
 * Compiles an RFC 9309 path pattern: `*` matches any sequence of characters
 * and a trailing `$` anchors the match to the end of the URL path.
 */
function toRegExpPath(path: string): RegExp {
  if (!path) {
    // An empty Allow/Disallow value matches nothing.
    return /(?!)/
  }
  const anchored = path.endsWith('$')
  const body = anchored ? path.slice(0, -1) : path
  const source = body
    .split('*')
    .map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${source}${anchored ? '$' : ''}`)
}

function isStarUserAgent(agent: string): boolean {
  return normalizeUserAgentForMatch(agent) === '*'
}

export interface CompiledPathRule {
  type: 'ALLOW' | 'DISALLOW'
  path: string
  regex: RegExp
}

export function compilePathRule(type: 'allow' | 'disallow', path: string): CompiledPathRule {
  const decoded = safeDecodePath(path)
  return {
    type: type === 'allow' ? 'ALLOW' : 'DISALLOW',
    path: decoded,
    regex: toRegExpPath(decoded)
  }
}

function safeDecodePath(path: string): string {
  try {
    return decodePath(path)
  } catch {
    return path
  }
}

export function matchCompiledPathRules(
  path: string,
  rules: readonly CompiledPathRule[],
  exclude: number | ReadonlySet<number> = -1
): { allowed: boolean, ruleIndex: number } {
  if (path === '/robots.txt') {
    return { allowed: true, ruleIndex: -1 }
  }

  const decoded = safeDecodePath(path)
  const matches: Array<{ rule: CompiledPathRule, index: number }> = []

  for (let index = 0; index < rules.length; index++) {
    if (typeof exclude === 'number' ? index === exclude : exclude.has(index)) {
      continue
    }
    const rule = rules[index]!
    if (rule.regex.test(decoded)) {
      matches.push({ rule, index })
    }
  }

  if (matches.length === 0) {
    return { allowed: true, ruleIndex: -1 }
  }

  const winner = matches.sort(bySpecificity)[0]!
  return {
    allowed: winner.rule.type === 'ALLOW',
    ruleIndex: winner.index
  }
}

/**
 * RFC 9309: the most specific (longest) matching pattern wins; when an allow
 * and a disallow pattern are equally specific, allow wins.
 */
function bySpecificity(
  a: { rule: { path: string, type: 'ALLOW' | 'DISALLOW' } },
  b: { rule: { path: string, type: 'ALLOW' | 'DISALLOW' } }
): number {
  if (a.rule.path.length !== b.rule.path.length) {
    return b.rule.path.length - a.rule.path.length
  }
  if (a.rule.type !== b.rule.type) {
    return a.rule.type === 'ALLOW' ? -1 : 1
  }
  return 0
}

function groupMatchesUserAgent(
  groupAgents: string[],
  userAgent: string,
  mode: 'specific' | 'star'
): boolean {
  if (mode === 'star') {
    return groupAgents.some(agent => isStarUserAgent(agent))
  }

  return groupAgents.some(
    agent => !isStarUserAgent(agent) && userAgentMatches(agent, userAgent)
  )
}

/**
 * Groups that apply to `userAgent`: every group naming it, or the `*` groups
 * when none do. Rules from all applicable groups are combined (RFC 9309).
 * Groups with rules but no User-agent line are treated as `*`.
 */
/** Policy tokens (e.g. `__usage_ai-training`) are never matched by `User-agent: *`. */
function isPolicyToken(userAgent: string): boolean {
  return normalizeUserAgentForMatch(userAgent) === normalizeUserAgentForMatch('__usage_ai-training')
}

export function findApplicableGroups(doc: RobotsDocument, userAgent: string): UserAgentGroup[] {
  const groups = doc.groups.map(group => ({
    group,
    agents: group.userAgents.length > 0 ? group.userAgents : ['*']
  }))

  const specificGroups = groups.filter(({ agents }) =>
    groupMatchesUserAgent(agents, userAgent, 'specific')
  )
  const applicable = specificGroups.length > 0
    ? specificGroups
    : isPolicyToken(userAgent)
      ? []
      : groups.filter(({ agents }) => groupMatchesUserAgent(agents, userAgent, 'star'))

  return applicable.map(({ group }) => group)
}

export function checkRobotsPath(
  robotsTxt: string,
  userAgent: string,
  path: string,
  doc: RobotsDocument = parseRobotsTxt(robotsTxt)
): PathMatchResult {
  const directives: Directive[] = findApplicableGroups(doc, userAgent).flatMap(group =>
    group.directives.filter(directive => directive.type === 'allow' || directive.type === 'disallow')
  )
  const compiled = directives.map(directive =>
    compilePathRule(directive.type === 'allow' ? 'allow' : 'disallow', directive.value)
  )
  const { allowed, ruleIndex } = matchCompiledPathRules(path, compiled)
  const winner = ruleIndex >= 0 ? directives[ruleIndex]! : null

  if (!winner) {
    return { ...DEFAULT_MATCH }
  }

  return {
    allowed,
    matchedPattern: winner.value,
    matchedRuleType: winner.type === 'allow' ? 'allow' : 'disallow',
    matchingLine: winner.line
  }
}
