import { ParsedRobots } from '@trybyte/robotstxt-parser'
import type {
  DirectiveSummaryRow,
  PathVerdict,
  RobotsDocument
} from './types'
import { DEFAULT_PATHS, DEFAULT_USER_AGENTS, SIMULATION_ORIGIN } from './paths'

export function summarizeDirectives(doc: RobotsDocument): DirectiveSummaryRow[] {
  return doc.groups.map((group, groupIndex) => {
    const allow: string[] = []
    const disallow: string[] = []
    const other: DirectiveSummaryRow['other'] = []

    for (const directive of group.directives) {
      if (directive.type === 'allow') {
        allow.push(directive.value)
      } else if (directive.type === 'disallow') {
        disallow.push(directive.value)
      } else {
        other.push({
          name: directive.name,
          value: directive.value,
          line: directive.line
        })
      }
    }

    return {
      groupIndex,
      userAgents: [...group.userAgents],
      allow,
      disallow,
      other,
      startLine: group.startLine
    }
  })
}

export function simulatePaths(
  doc: RobotsDocument,
  userAgents: readonly string[] = DEFAULT_USER_AGENTS,
  paths: readonly string[] = DEFAULT_PATHS
): PathVerdict[] {
  const parsed = ParsedRobots.parse(doc.raw)
  const verdicts: PathVerdict[] = []

  for (const userAgent of userAgents) {
    const urls = paths.map(path => `${SIMULATION_ORIGIN}${path}`)
    const results = parsed.checkUrls(userAgent, urls)

    for (let i = 0; i < paths.length; i++) {
      const result = results[i]!
      const path = paths[i]!
      verdicts.push({
        userAgent,
        path,
        allowed: result.allowed,
        matchedRule: result.matchedPattern || '(default allow)',
        matchedRuleType: result.matchedRuleType,
        matchingLine: result.matchingLine
      })
    }
  }

  return verdicts
}
