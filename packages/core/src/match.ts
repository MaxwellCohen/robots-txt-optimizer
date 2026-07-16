import { decodePath, parse, type RobotRule, type Rule } from 'robots-linter'
import type { RobotsDocument } from './types'
import { stripComment } from './parse'
import {
  normalizeDirectiveName,
  normalizeUserAgentForMatch,
  textForMatching,
  userAgentMatches
} from './robots-text'

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

function toRegExpPath(path: string): RegExp {
  const target = path
    .replace(/\?/g, '\\?')
    .split('/')
    .map((segment: string) => (segment === '*' ? '.*' : segment))
    .join('/')
  const suffix = target.slice(-1) === '/' ? '.*' : ''
  return new RegExp(`^${target}${suffix}`)
}

function isStarUserAgent(agent: string): boolean {
  return normalizeUserAgentForMatch(agent) === '*'
}

function getApplicableRules(robotRules: RobotRule[], userAgent: string): Rule[] {
  const specificMatches = robotRules.filter(
    rr => !isStarUserAgent(rr.userAgent) && userAgentMatches(rr.userAgent, userAgent)
  )

  const matches = specificMatches.length > 0
    ? specificMatches
    : robotRules.filter(rr => isStarUserAgent(rr.userAgent))

  const rules: Rule[] = []
  for (const rr of matches) {
    rules.push(...rr.rules)
  }
  return rules
}

function matchRules(path: string, rules: Rule[]): { allowed: boolean, rule: Rule | null, ruleIndex: number } {
  if (path === '/robots.txt') {
    return { allowed: true, rule: null, ruleIndex: -1 }
  }

  const decoded = decodePath(path)
  const matches: Array<{ rule: Rule, index: number }> = []

  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index]!
    if (toRegExpPath(rule.path).test(decoded)) {
      matches.push({ rule, index })
    }
  }

  if (matches.length === 0) {
    return { allowed: true, rule: null, ruleIndex: -1 }
  }

  const sorted = matches.sort((a, b) => {
    const al = a.rule.path.split('/').length
    const bl = b.rule.path.split('/').length

    if (al === bl) {
      return a.rule.path.length > b.rule.path.length ? -1 : 1
    }
    return al > bl ? -1 : 1
  })

  const winner = sorted[0]!
  return {
    allowed: winner.rule.type === 'ALLOW',
    rule: winner.rule,
    ruleIndex: winner.index
  }
}

function ruleType(rule: Rule | null): PathMatchResult['matchedRuleType'] {
  if (!rule) {
    return 'none'
  }
  return rule.type === 'ALLOW' ? 'allow' : 'disallow'
}

function parseRobotsRules(robotsTxt: string, doc?: RobotsDocument): RobotRule[] | null {
  const text = doc ? textForMatching(doc) : robotsTxt
  try {
    return parse(text)
  } catch {
    return null
  }
}

function buildRuleLineMap(robotsTxt: string): Map<number, number> {
  const map = new Map<number, number>()
  let ruleIndex = 0
  const lines = robotsTxt.split(/\r?\n/)

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const content = stripComment(lines[i] ?? '')
    if (!content) {
      continue
    }
    const colonIndex = content.indexOf(':')
    if (colonIndex === -1) {
      continue
    }
    const name = normalizeDirectiveName(content.slice(0, colonIndex).trim())
    if (name === 'allow' || name === 'disallow') {
      map.set(ruleIndex, lineNum)
      ruleIndex++
    }
  }

  return map
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

function buildDocumentRuleLineMap(doc: RobotsDocument, userAgent: string): Map<number, number> {
  const map = new Map<number, number>()
  let ruleIndex = 0

  const groups = doc.groups.map(group => ({
    group,
    agents: group.userAgents.length > 0 ? group.userAgents : ['*']
  }))

  const specificGroups = groups.filter(({ agents }) =>
    groupMatchesUserAgent(agents, userAgent, 'specific')
  )
  const applicableGroups = specificGroups.length > 0
    ? specificGroups
    : groups.filter(({ agents }) => groupMatchesUserAgent(agents, userAgent, 'star'))

  for (const { group } of applicableGroups) {
    for (const directive of group.directives) {
      if (directive.type !== 'allow' && directive.type !== 'disallow') {
        continue
      }
      map.set(ruleIndex, directive.line)
      ruleIndex++
    }
  }

  if (map.size === 0) {
    return buildRuleLineMap(textForMatching(doc))
  }

  return map
}

export function checkRobotsPath(
  robotsTxt: string,
  userAgent: string,
  path: string,
  doc?: RobotsDocument
): PathMatchResult {
  const robotRules = parseRobotsRules(robotsTxt, doc)
  if (!robotRules) {
    return DEFAULT_MATCH
  }

  const rules = getApplicableRules(robotRules, userAgent)
  const { allowed, rule, ruleIndex } = matchRules(path, rules)
  const lineMap = doc
    ? buildDocumentRuleLineMap(doc, userAgent)
    : buildRuleLineMap(robotsTxt)

  return {
    allowed,
    matchedPattern: rule?.path ?? '(default allow)',
    matchedRuleType: ruleType(rule),
    matchingLine: ruleIndex >= 0 ? (lineMap.get(ruleIndex) ?? 0) : 0
  }
}
