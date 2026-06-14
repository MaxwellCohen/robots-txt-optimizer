import { ParsedRobots } from '@trybyte/robotstxt-parser'
import type {
  Directive,
  OptimizationSuggestion,
  RobotsDocument,
  UserAgentGroup
} from './types'
import { parseRobotsTxt, serializeRobotsDocument } from './parse'
import { DEFAULT_PATHS, SIMULATION_ORIGIN } from './paths'

function directiveKey(d: Directive): string {
  return `${d.type}:${d.value}`
}

function groupSignature(group: UserAgentGroup): string {
  const agents = [...group.userAgents].sort().join('|')
  const rules = group.directives.map(directiveKey).join('|')
  return `${agents}::${rules}`
}

function findDuplicateDirectives(doc: RobotsDocument): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []

  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi]!
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

  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi]!
    if (group.userAgents.length === 0) {
      continue
    }
    const sig = groupSignature(group)
    const existing = signatures.get(sig)
    if (existing !== undefined) {
      suggestions.push({
        type: 'duplicate_group',
        message: `Group for ${group.userAgents.join(', ')} duplicates group starting at line ${doc.groups[existing]!.startLine}`,
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

function buildGroupText(group: UserAgentGroup, directiveLimit?: number): string {
  const lines: string[] = []
  for (const agent of group.userAgents) {
    lines.push(`User-agent: ${agent}`)
  }
  const directives = directiveLimit !== undefined
    ? group.directives.slice(0, directiveLimit)
    : group.directives
  for (const d of directives) {
    const label = d.type === 'allow' ? 'Allow' : d.type === 'disallow' ? 'Disallow' : d.name
    lines.push(`${label}: ${d.value}`)
  }
  return lines.join('\n')
}

function findDeadRules(doc: RobotsDocument): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const probePaths = [...DEFAULT_PATHS, '/test-dead-rule-probe/']

  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi]!
    const pathDirectives = group.directives
      .map((d, index) => ({ d, index }))
      .filter(({ d }) => d.type === 'allow' || d.type === 'disallow')

    for (let ri = 1; ri < pathDirectives.length; ri++) {
      const { d: directive, index: directiveIndex } = pathDirectives[ri]!
      const withoutText = buildGroupText(group, directiveIndex)
      const withText = buildGroupText(group, directiveIndex + 1)

      const agents = group.userAgents.length > 0 ? group.userAgents : ['*']
      let isDead = true

      for (const agent of agents) {
        const withoutParsed = ParsedRobots.parse(withoutText)
        const withParsed = ParsedRobots.parse(withText)

        for (const path of probePaths) {
          const url = `${SIMULATION_ORIGIN}${path}`
          const without = withoutParsed.checkUrl(agent, url).allowed
          const withRule = withParsed.checkUrl(agent, url).allowed
          if (without !== withRule) {
            isDead = false
            break
          }
        }
        if (!isDead) {
          break
        }
      }

      if (isDead) {
        suggestions.push({
          type: 'dead_rule',
          message: `${directive.type === 'allow' ? 'Allow' : 'Disallow'} "${directive.value}" never changes crawl outcome (superseded by earlier rules)`,
          lines: [directive.line],
          groupIndex: gi
        })
      }
    }
  }

  return suggestions
}

export function suggestOptimizations(doc: RobotsDocument): OptimizationSuggestion[] {
  return [
    ...findEmptyGroups(doc),
    ...findDuplicateDirectives(doc),
    ...findDuplicateGroups(doc),
    ...findDeadRules(doc),
    ...findRedundantCatchall(doc)
  ]
}

function removeLinesFromDocument(doc: RobotsDocument, linesToRemove: Set<number>): RobotsDocument {
  const newGroups: UserAgentGroup[] = []

  for (const group of doc.groups) {
    const keptDirectives = group.directives.filter(d => !linesToRemove.has(d.line))
    if (keptDirectives.length === 0 && group.userAgents.length === 0) {
      continue
    }
    if (keptDirectives.length === 0 && group.userAgents.length > 0) {
      continue
    }
    newGroups.push({
      ...group,
      directives: keptDirectives
    })
  }

  return {
    ...doc,
    groups: newGroups
  }
}

function dedupeDirectivesInDocument(doc: RobotsDocument): RobotsDocument {
  const newGroups = doc.groups.map((group) => {
    const seen = new Set<string>()
    const directives = group.directives.filter((d) => {
      if (d.type !== 'allow' && d.type !== 'disallow') {
        return true
      }
      const key = directiveKey(d)
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
    return { ...group, directives }
  })
  return { ...doc, groups: newGroups }
}

function mergeDuplicateGroups(doc: RobotsDocument): RobotsDocument {
  const seen = new Map<string, UserAgentGroup>()
  const merged: UserAgentGroup[] = []

  for (const group of doc.groups) {
    if (group.userAgents.length === 0) {
      merged.push(group)
      continue
    }
    const sig = groupSignature(group)
    if (seen.has(sig)) {
      const existing = seen.get(sig)!
      const combinedAgents = [...new Set([...existing.userAgents, ...group.userAgents])]
      existing.userAgents = combinedAgents
      continue
    }
    const copy = { ...group, userAgents: [...group.userAgents], directives: [...group.directives] }
    seen.set(sig, copy)
    merged.push(copy)
  }

  return { ...doc, groups: merged }
}

export function buildOptimizedText(doc: RobotsDocument, suggestions: OptimizationSuggestion[]): string {
  const linesToRemove = new Set<number>()

  for (const suggestion of suggestions) {
    if (
      suggestion.type === 'duplicate_directive'
      || suggestion.type === 'dead_rule'
      || suggestion.type === 'empty_group'
    ) {
      for (const line of suggestion.lines) {
        linesToRemove.add(line)
      }
    }
  }

  let optimized = removeLinesFromDocument(doc, linesToRemove)
  optimized = dedupeDirectivesInDocument(optimized)

  if (suggestions.some(s => s.type === 'duplicate_group')) {
    optimized = mergeDuplicateGroups(optimized)
  }

  return serializeRobotsDocument(optimized)
}

export function applyOptimizations(doc: RobotsDocument): RobotsDocument {
  const suggestions = suggestOptimizations(doc)
  const text = buildOptimizedText(doc, suggestions)
  return parseRobotsTxt(text)
}
