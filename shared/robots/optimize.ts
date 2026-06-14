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

interface GroupTextBuild {
  text: string
  lineToDirective: Map<number, Directive>
}

function buildGroupTextForAgent(
  group: UserAgentGroup,
  agent: string,
  excludeDirectiveIndex?: number
): GroupTextBuild {
  const lines: string[] = [`User-agent: ${agent}`]
  const lineToDirective = new Map<number, Directive>()
  let lineNum = 1

  for (let i = 0; i < group.directives.length; i++) {
    if (i === excludeDirectiveIndex) {
      continue
    }
    const d = group.directives[i]!
    if (d.type !== 'allow' && d.type !== 'disallow') {
      continue
    }
    lineNum++
    const label = d.type === 'allow' ? 'Allow' : 'Disallow'
    lines.push(`${label}: ${d.value}`)
    lineToDirective.set(lineNum, d)
  }

  return { text: lines.join('\n'), lineToDirective }
}

function pathsFromPattern(pattern: string): string[] {
  if (!pattern) {
    return []
  }

  if (pattern === '/') {
    return ['/', '/robots-dead-rule-probe/']
  }

  if (pattern.endsWith('$')) {
    return [pattern.slice(0, -1) || '/']
  }

  if (pattern.includes('*')) {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -1)
      return [prefix === '/' ? '/probe' : `${prefix}probe`]
    }
    return [pattern.replace('*', 'probe')]
  }

  if (pattern.endsWith('/')) {
    return [pattern === '/' ? '/probe' : `${pattern}probe`, pattern.slice(0, -1) || '/']
  }

  return [pattern, `${pattern}/probe`]
}

function probePathsForDirective(pattern: string, basePaths: readonly string[]): string[] {
  return [...new Set([...basePaths, ...pathsFromPattern(pattern)])]
}

function formatPathDirective(directive: Directive): string {
  const label = directive.type === 'allow' ? 'Allow' : 'Disallow'
  return `${label}: ${directive.value}`
}

function formatUserAgentList(agents: string[]): string {
  return agents.map(agent => `\`${agent}\``).join(', ')
}

function isRuleDeadForAgent(
  group: UserAgentGroup,
  agent: string,
  directiveIndex: number,
  probePaths: readonly string[]
): boolean {
  const { text: withoutText } = buildGroupTextForAgent(group, agent, directiveIndex)
  const { text: withText } = buildGroupTextForAgent(group, agent)
  const withoutParsed = ParsedRobots.parse(withoutText)
  const withParsed = ParsedRobots.parse(withText)

  for (const path of probePaths) {
    const url = `${SIMULATION_ORIGIN}${path}`
    if (withoutParsed.checkUrl(agent, url).allowed !== withParsed.checkUrl(agent, url).allowed) {
      return false
    }
  }

  return true
}

function findSupersedingDirective(
  group: UserAgentGroup,
  pathDirectives: Array<{ d: Directive, index: number }>,
  deadRuleIndex: number,
  agent: string,
  _probePaths: readonly string[]
): Directive | null {
  if (deadRuleIndex <= 0) {
    return null
  }

  const deadEntry = pathDirectives[deadRuleIndex]!
  for (let j = 0; j < deadRuleIndex; j++) {
    if (directiveKey(pathDirectives[j]!.d) === directiveKey(deadEntry.d)) {
      return pathDirectives[j]!.d
    }
  }

  const { text: withoutDeadText, lineToDirective } = buildGroupTextForAgent(
    group,
    agent,
    deadEntry.index
  )
  const withoutParsed = ParsedRobots.parse(withoutDeadText)
  const relevantPaths = pathsFromPattern(deadEntry.d.value)

  let earliest: Directive | null = null

  for (const path of relevantPaths) {
    const url = `${SIMULATION_ORIGIN}${path}`
    const result = withoutParsed.checkUrl(agent, url)
    if (result.matchingLine === undefined || result.matchingLine === null) {
      continue
    }
    const winner = lineToDirective.get(result.matchingLine)
    if (winner && (earliest === null || winner.line < earliest.line)) {
      earliest = winner
    }
  }

  return earliest
}

function findDeadRules(doc: RobotsDocument): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = []
  const baseProbePaths = [...DEFAULT_PATHS, '/test-dead-rule-probe/']

  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi]!
    const pathDirectives = group.directives
      .map((d, index) => ({ d, index }))
      .filter(({ d }) => d.type === 'allow' || d.type === 'disallow')

    const agents = group.userAgents.length > 0 ? group.userAgents : ['*']

    for (let ri = 1; ri < pathDirectives.length; ri++) {
      const { d: directive, index: directiveIndex } = pathDirectives[ri]!
      const probePaths = probePathsForDirective(directive.value, baseProbePaths)
      const deadBySuperseder = new Map<string, { agents: string[], supersededBy: string }>()

      for (const agent of agents) {
        if (!isRuleDeadForAgent(group, agent, directiveIndex, probePaths)) {
          continue
        }

        const superseding = findSupersedingDirective(
          group,
          pathDirectives,
          ri,
          agent,
          probePaths
        )
        const supersededBy = superseding
          ? formatPathDirective(superseding)
          : 'an earlier rule'
        const key = supersededBy
        const existing = deadBySuperseder.get(key)
        if (existing) {
          existing.agents.push(agent)
        } else {
          deadBySuperseder.set(key, { agents: [agent], supersededBy })
        }
      }

      for (const { agents: deadAgents, supersededBy } of deadBySuperseder.values()) {
        const ruleLabel = directive.type === 'allow' ? 'Allow' : 'Disallow'
        suggestions.push({
          type: 'dead_rule',
          message: `${ruleLabel} "${directive.value}" never changes crawl outcome for ${formatUserAgentList(deadAgents)} (superseded by ${supersededBy})`,
          lines: [directive.line],
          groupIndex: gi,
          userAgents: deadAgents
        })
      }
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

function addMissingUserAgents(doc: RobotsDocument): RobotsDocument {
  return {
    ...doc,
    groups: doc.groups.map(group => (
      group.userAgents.length === 0 && group.directives.length > 0
        ? { ...group, userAgents: ['*'] }
        : group
    ))
  }
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

  if (suggestions.some(s => s.type === 'missing_user_agent')) {
    optimized = addMissingUserAgents(optimized)
  }

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
