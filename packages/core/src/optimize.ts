import type {
  Directive,
  OptimizationSuggestion,
  RobotsDocument,
  UserAgentGroup
} from './types'
import { isUserAgentLineContent, parseRobotsTxt } from './parse'
import { DEFAULT_PATHS } from './paths'
import { compilePathRule, matchCompiledPathRules, type CompiledPathRule } from './match'

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

/** Replaces every `*` with `fill` and drops a trailing `$`. */
function concretize(pattern: string, fill: string): string {
  return pattern.replace(/\$$/, '').replace(/\*/g, fill)
}

/** Literal text before the first `*` (or `$`). */
function literalHead(pattern: string): string {
  return pattern.replace(/\$$/, '').split('*')[0]!
}

/** Literal text after the last `*`, or '' when there is no wildcard. */
function literalTail(pattern: string): string {
  const body = pattern.replace(/\$$/, '')
  return body.includes('*') ? body.slice(body.lastIndexOf('*') + 1) : ''
}

/** Two rules can match a common path only if one literal head extends the other. */
function headsOverlap(a: string, b: string): boolean {
  const headA = literalHead(a)
  const headB = literalHead(b)
  return headA.startsWith(headB) || headB.startsWith(headA)
}

/**
 * Paths that exercise `pattern` on its own and where it meets each
 * overlapping rule: e.g. `Allow: /*?q=` next to `Disallow: /a` needs `/a?q=`.
 */
function probePathsForDirective(
  pattern: string,
  otherPatterns: readonly string[],
  basePaths: readonly string[]
): string[] {
  const probes = new Set<string>([...basePaths, ...pathsFromPattern(pattern)])
  const anchored = pattern.endsWith('$')
  const add = (path: string, extend: boolean) => {
    if (!path.startsWith('/')) {
      path = `/${path}`
    }
    probes.add(path)
    if (extend) {
      probes.add(`${path}x`)
      probes.add(`${path}/x`)
    }
  }

  for (const fill of ['', 'x', 'x/x']) {
    add(concretize(pattern, fill), !anchored)
  }

  for (const other of otherPatterns) {
    if (!other || !headsOverlap(pattern, other)) {
      continue
    }
    const otherAnchored = other.endsWith('$')
    for (const fill of ['', 'x']) {
      const sample = concretize(other, fill)
      add(sample, !otherAnchored)
      if (pattern.includes('*')) {
        // Let this rule's wildcard swallow the other rule's path.
        add(concretize(pattern, sample.replace(/^\//, '')), !anchored)
        add(`${sample}${literalTail(pattern)}`, !anchored)
      }
      if (other.includes('*')) {
        add(concretize(other, concretize(pattern, fill).replace(/^\//, '')), !otherAnchored)
        add(`${concretize(pattern, fill)}${literalTail(other)}`, !otherAnchored)
      }
    }
  }

  return [...probes]
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

  for (let gi = 0; gi < doc.groups.length; gi++) {
    const group = doc.groups[gi]!
    const pathDirectives: Array<{ d: Directive, index: number }> = []
    for (let index = 0; index < group.directives.length; index++) {
      const directive = group.directives[index]!
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

function removeLinesFromDocument(doc: RobotsDocument, linesToRemove: Set<number>): RobotsDocument {
  const newGroups: UserAgentGroup[] = []

  for (const group of doc.groups) {
    const keptDirectives = group.directives.filter(d => !linesToRemove.has(d.line))
    // Drop groups emptied by removals, or explicitly removed empty groups;
    // keep groups that were already empty unless that removal was selected.
    if (
      keptDirectives.length === 0
      && (group.directives.length > 0 || linesToRemove.has(group.startLine))
    ) {
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

function addMissingUserAgents(doc: RobotsDocument, startLines: ReadonlySet<number>): RobotsDocument {
  return {
    ...doc,
    groups: doc.groups.map(group => (
      group.userAgents.length === 0 && group.directives.length > 0 && startLines.has(group.startLine)
        ? { ...group, userAgents: ['*'] }
        : group
    ))
  }
}

/** Merges each group starting at one of `startLines` into the earlier group with identical rules. */
function mergeDuplicateGroups(doc: RobotsDocument, startLines: ReadonlySet<number>): RobotsDocument {
  const seen = new Map<string, UserAgentGroup>()
  const merged: UserAgentGroup[] = []

  for (const group of doc.groups) {
    if (group.userAgents.length === 0) {
      merged.push(group)
      continue
    }
    const sig = groupSignature(group)
    const existing = seen.get(sig)
    if (existing && startLines.has(group.startLine)) {
      existing.userAgents = [...new Set([...existing.userAgents, ...group.userAgents])]
      continue
    }
    const copy = { ...group, userAgents: [...group.userAgents], directives: [...group.directives] }
    if (!existing) {
      seen.set(sig, copy)
    }
    merged.push(copy)
  }

  return { ...doc, groups: merged }
}

function getGroupEndLine(doc: RobotsDocument, groupIndex: number): number {
  const nextGroup = doc.groups[groupIndex + 1]
  if (nextGroup) {
    return nextGroup.startLine - 1
  }
  if (doc.sitemaps.length > 0) {
    return doc.sitemaps[0]!.line - 1
  }
  return doc.lines.length
}

function computeRemovedLines(doc: RobotsDocument, optimized: RobotsDocument): Set<number> {
  const removed = new Set<number>()
  const keptDirectiveLines = new Set(
    optimized.groups.flatMap(group => group.directives.map(directive => directive.line))
  )
  const keptSitemapLines = new Set(optimized.sitemaps.map(sitemap => sitemap.line))
  const keptGroupStartLines = new Set(optimized.groups.map(group => group.startLine))

  for (const group of doc.groups) {
    for (const directive of group.directives) {
      if (!keptDirectiveLines.has(directive.line)) {
        removed.add(directive.line)
      }
    }
  }

  for (const sitemap of doc.sitemaps) {
    if (!keptSitemapLines.has(sitemap.line)) {
      removed.add(sitemap.line)
    }
  }

  for (let groupIndex = 0; groupIndex < doc.groups.length; groupIndex++) {
    const group = doc.groups[groupIndex]!
    if (keptGroupStartLines.has(group.startLine)) {
      continue
    }
    for (let line = group.startLine; line <= getGroupEndLine(doc, groupIndex); line++) {
      removed.add(line)
    }
  }

  return removed
}

function computeInsertions(
  doc: RobotsDocument,
  optimized: RobotsDocument
): Map<number, string[]> {
  const insertions = new Map<number, string[]>()

  for (const optimizedGroup of optimized.groups) {
    const originalGroup = doc.groups.find(group => group.startLine === optimizedGroup.startLine)
    if (!originalGroup) {
      continue
    }

    if (originalGroup.userAgents.length === 0 && optimizedGroup.userAgents.length > 0) {
      insertions.set(
        optimizedGroup.startLine,
        optimizedGroup.userAgents.map(agent => `User-agent: ${agent}`)
      )
      continue
    }

    const extraAgents = optimizedGroup.userAgents.filter(
      agent => !originalGroup.userAgents.includes(agent)
    )
    if (extraAgents.length === 0) {
      continue
    }

    const groupIndex = doc.groups.indexOf(originalGroup)
    let lastUserAgentLine = originalGroup.startLine
    for (let line = originalGroup.startLine; line <= getGroupEndLine(doc, groupIndex); line++) {
      if (isUserAgentLineContent(doc.lines[line - 1]!)) {
        lastUserAgentLine = line
      } else {
        break
      }
    }

    insertions.set(
      lastUserAgentLine + 1,
      extraAgents.map(agent => `User-agent: ${agent}`)
    )
  }

  return insertions
}

function formatOptimizedFromOriginal(doc: RobotsDocument, optimized: RobotsDocument): string {
  const removed = computeRemovedLines(doc, optimized)
  const insertions = computeInsertions(doc, optimized)
  const output: string[] = []

  for (let index = 0; index < doc.lines.length; index++) {
    const lineNum = index + 1
    const toInsert = insertions.get(lineNum)
    if (toInsert) {
      output.push(...toInsert)
    }
    if (!removed.has(lineNum)) {
      output.push(doc.lines[index]!)
    }
  }

  return output.join('\n').trimEnd()
}

/** Applies exactly the given suggestions; unlisted ones leave the file unchanged. */
export function buildOptimizedText(doc: RobotsDocument, suggestions: OptimizationSuggestion[]): string {
  const linesToRemove = new Set<number>()
  const missingUserAgentGroups = new Set<number>()
  const duplicateGroups = new Set<number>()

  for (const suggestion of suggestions) {
    if (
      suggestion.type === 'duplicate_directive'
      || suggestion.type === 'dead_rule'
      || suggestion.type === 'empty_group'
    ) {
      suggestion.lines.forEach(line => linesToRemove.add(line))
    } else if (suggestion.type === 'missing_user_agent') {
      suggestion.lines.forEach(line => missingUserAgentGroups.add(line))
    } else if (suggestion.type === 'duplicate_group') {
      suggestion.lines.forEach(line => duplicateGroups.add(line))
    }
  }

  let optimized = removeLinesFromDocument(doc, linesToRemove)

  if (missingUserAgentGroups.size > 0) {
    optimized = addMissingUserAgents(optimized, missingUserAgentGroups)
  }

  if (duplicateGroups.size > 0) {
    optimized = mergeDuplicateGroups(optimized, duplicateGroups)
  }

  return formatOptimizedFromOriginal(doc, optimized)
}

export function applyOptimizations(doc: RobotsDocument): RobotsDocument {
  const suggestions = suggestOptimizations(doc)
  const text = buildOptimizedText(doc, suggestions)
  return parseRobotsTxt(text)
}
