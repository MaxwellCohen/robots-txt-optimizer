import type {
  OptimizationSuggestion,
  RobotsDocument,
  UserAgentGroup
} from '../types'
import { isUserAgentLineContent } from '../parse'
import { groupSignature } from './detectors'

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

  for (const [groupIndex, group] of doc.groups.entries()) {
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

  for (const [index, line] of doc.lines.entries()) {
    const lineNum = index + 1
    const toInsert = insertions.get(lineNum)
    if (toInsert) {
      output.push(...toInsert)
    }
    if (!removed.has(lineNum)) {
      output.push(line)
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
