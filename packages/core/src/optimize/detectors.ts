import type {
  Directive,
  OptimizationSuggestion,
  RobotsDocument,
  UserAgentGroup
} from '../types'
import { DEFAULT_PATHS } from '../paths'
import { compilePathRule, matchCompiledPathRules, type CompiledPathRule } from '../match'
import { pathsFromPattern, probePathsForDirective } from './probing'

function directiveKey(d: Directive): string {
  return `${d.type}:${d.value}`
}

export function groupSignature(group: UserAgentGroup): string {
  const agents = [...group.userAgents].sort().join('|')
  const rules = group.directives.map(directiveKey).join('|')
  return `${agents}::${rules}`
}

function findDuplicateDirectives(doc: RobotsDocument): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []

  for (const [gi, group] of doc.groups.entries()) {
    const seen = new Map<string, number>()

    for (const directive of group.directives) {
      if (directive.type !== 'allow' && directive.type !== 'disallow') {
        continue
      }
      const key = directiveKey(directive)
      if (seen.has(key)) {
        suggestions.push({
          type: 'duplicate_directive',
          message: `Duplicate ${directive.type} rule "${directive.value}" in group for ${group.userAgents.join(', ') || 'unknown agent'}`,
          lines: [directive.line],
          groupIndex: gi
        })
      } else {
        seen.set(key, directive.line)
      }
    }
  }

  return suggestions
}

function findMissingUserAgent(doc: RobotsDocument): OptimizationSuggestion[] {
  return doc.groups.flatMap((group, gi) => {
    if (group.userAgents.length === 0 && group.directives.length > 0) {
      return [{
        type: 'missing_user_agent' as const,
        message: 'Add `User-agent: *` before these directives — rules without a user-agent may be ignored by crawlers',
        lines: [group.startLine],
        groupIndex: gi
      }]
    }
    return []
  })
}

function findEmptyGroups(doc: RobotsDocument): OptimizationSuggestion[] {
  return doc.groups.flatMap((group, gi) => {
    if (group.userAgents.length > 0 && group.directives.length === 0) {
      return [{
        type: 'empty_group' as const,
        message: `Group for ${group.userAgents.join(', ')} has no directives`,
        lines: [group.startLine],
        groupIndex: gi
      }]
    }
    return []
  })
}

function findDuplicateGroups(doc: RobotsDocument): OptimizationSuggestion[] {
  const signatures = new Map<string, number>()
  const suggestions: OptimizationSuggestion[] = []

  for (const [gi, group] of doc.groups.entries()) {
    if (group.userAgents.length === 0) {
      continue
    }
    const sig = groupSignature(group)
    const existing = signatures.get(sig)
    if (existing !== undefined) {
      suggestions.push({
        type: 'duplicate_group',
        message: `Group for ${group.userAgents.join(', ')} duplicates group starting at line ${doc.groups[existing]?.startLine}`,
        lines: [group.startLine],
        groupIndex: gi
      })
    } else {
      signatures.set(sig, gi)
    }
  }

  return suggestions
}

function findRedundantCatchall(doc: RobotsDocument): OptimizationSuggestion[] {
  const catchall = doc.groups.find(g => g.userAgents.some(a => a === '*'))
  if (!catchall) {
    return []
  }

  const specificAgents = new Set(
    doc.groups
      .filter(g => !g.userAgents.includes('*'))
      .flatMap(g => g.userAgents)
  )

  if (specificAgents.size === 0) {
    return []
  }

  return [{
    type: 'redundant_catchall',
    message: `Catch-all User-agent: * group may be redundant — ${specificAgents.size} specific user-agent group(s) already defined`,
    lines: [catchall.startLine],
    groupIndex: doc.groups.indexOf(catchall)
  }]
}

function formatPathDirective(directive: Directive): string {
  const label = directive.type === 'allow' ? 'Allow' : 'Disallow'
  return `${label}: ${directive.value}`
}

function formatUserAgentList(agents: string[]): string {
  return agents.map(agent => `\`${agent}\``).join(', ')
}

function ruleChangesOutcome(
  rules: readonly CompiledPathRule[],
  ruleIndex: number,
  probePaths: readonly string[],
  removed: ReadonlySet<number>
): boolean {
  const withoutRule = new Set(removed).add(ruleIndex)
  for (const path of probePaths) {
    if (
      matchCompiledPathRules(path, rules, removed).allowed
      !== matchCompiledPathRules(path, rules, withoutRule).allowed
    ) {
      return true
    }
  }

  return false
}

function supersedingDirective(
  pathDirectives: Array<{ d: Directive, index: number }>,
  rules: readonly CompiledPathRule[],
  deadRuleIndex: number,
  removed: ReadonlySet<number>
): Directive | null {
  const deadEntry = pathDirectives[deadRuleIndex]!
  let earliest: Directive | null = null
  for (const path of pathsFromPattern(deadEntry.d.value)) {
    const result = matchCompiledPathRules(path, rules, removed)
    if (result.ruleIndex < 0) {
      continue
    }
    const winner = pathDirectives[result.ruleIndex]!.d
    if (earliest === null || winner.line < earliest.line) {
      earliest = winner
    }
  }

  return earliest
}

function findDeadRules(doc: RobotsDocument): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const baseProbePaths = [...DEFAULT_PATHS, '/test-dead-rule-probe/']

  for (const [gi, group] of doc.groups.entries()) {
    const pathDirectives: Array<{ d: Directive, index: number }> = []
    for (const [index, directive] of group.directives.entries()) {
      if (directive.type === 'allow' || directive.type === 'disallow') {
        pathDirectives.push({ d: directive, index })
      }
    }
    const compiled = pathDirectives.map(({ d }) => compilePathRule(
      d.type === 'allow' ? 'allow' : 'disallow',
      d.value
    ))
    const agents = group.userAgents.length > 0 ? group.userAgents : ['*']

    // Rules already slated for removal: exact duplicates (reported separately)
    // and rules found dead so far. Judging each rule against the rules that
    // remain keeps removals safe to apply together; otherwise two rules that
    // cover each other would both look dead and both be removed.
    const removed = new Set<number>()
    const seen = new Set<string>()
    pathDirectives.forEach(({ d }, index) => {
      const key = directiveKey(d)
      if (seen.has(key)) {
        removed.add(index)
      }
      seen.add(key)
    })

    const patterns = pathDirectives.map(({ d }) => d.value)

    for (let ri = 1; ri < pathDirectives.length; ri++) {
      const otherPatterns = patterns.filter((_, index) => index !== ri && !removed.has(index))
      if (removed.has(ri)) {
        continue
      }
      const directive = pathDirectives[ri]!.d
      const probePaths = probePathsForDirective(directive.value, otherPatterns, baseProbePaths)
      if (ruleChangesOutcome(compiled, ri, probePaths, removed)) {
        continue
      }
      removed.add(ri)

      const superseding = supersedingDirective(pathDirectives, compiled, ri, removed)
      const supersededBy = superseding
        ? formatPathDirective(superseding)
        : 'an earlier rule'
      const ruleLabel = directive.type === 'allow' ? 'Allow' : 'Disallow'
      suggestions.push({
        type: 'dead_rule',
        message: `${ruleLabel} "${directive.value}" never changes crawl outcome for ${formatUserAgentList(agents)} (superseded by ${supersededBy})`,
        lines: [directive.line],
        groupIndex: gi,
        userAgents: [...agents]
      })
    }
  }

  return suggestions
}

export function suggestOptimizations(doc: RobotsDocument): OptimizationSuggestion[] {
  return [
    ...findMissingUserAgent(doc),
    ...findEmptyGroups(doc),
    ...findDuplicateDirectives(doc),
    ...findDuplicateGroups(doc),
    ...findDeadRules(doc),
    ...findRedundantCatchall(doc)
  ]
}
