import type {
  DirectiveSummaryRow,
  PathVerdict,
  RobotsDocument
} from './types'
import { DEFAULT_PATHS, DEFAULT_USER_AGENTS } from './paths'
import { checkRobotsPath } from './match'

export function summarizeDirectives(doc: RobotsDocument): DirectiveSummaryRow[] {
  return doc.groups.flatMap((group, groupIndex) => {
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

    const row = {
      groupIndex,
      allow,
      disallow,
      other,
      startLine: group.startLine
    }

    if (group.userAgents.length === 0) {
      return [{ ...row, userAgents: [] }]
    }

    return group.userAgents.map(agent => ({
      ...row,
      userAgents: [agent]
    }))
  })
}

export function simulatePaths(
  doc: RobotsDocument,
  userAgents: readonly string[] = DEFAULT_USER_AGENTS,
  paths: readonly string[] = DEFAULT_PATHS
): PathVerdict[] {
  const verdicts: PathVerdict[] = []

  for (const userAgent of userAgents) {
    for (const path of paths) {
      const result = checkRobotsPath(doc.raw, userAgent, path, doc)
      verdicts.push({
        userAgent,
        path,
        allowed: result.allowed,
        matchedRule: result.matchedPattern,
        matchedRuleType: result.matchedRuleType,
        matchingLine: result.matchingLine
      })
    }
  }

  return verdicts
}
