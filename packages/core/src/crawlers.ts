import { isUserAgentLineContent, stripComment } from './parse'
import { checkRobotsPath, findApplicableGroups } from './match'
import { normalizeUserAgentForMatch } from './robots-text'
import { AI_TRAINING_POLICY_TOKEN, CRAWLER_CATEGORY_LABELS, KNOWN_CRAWLERS } from './crawlers-data'
import type { CrawlerAccess, CrawlerAccessStatus, RobotsDocument } from './types'
import type { CrawlerCategory, KnownCrawler } from './crawlers-data'

export { AI_TRAINING_POLICY_TOKEN, CRAWLER_CATEGORY_LABELS, KNOWN_CRAWLERS }
export type { CrawlerAccess, CrawlerAccessStatus, CrawlerCategory, KnownCrawler }

/** Retired or non-existent tokens people commonly use, with the token that actually works. */
const TOKEN_REPLACEMENTS: Record<string, string> = {
  anthropicai: 'ClaudeBot',
  claudeweb: 'ClaudeBot',
  claude: 'ClaudeBot',
  chatgpt: 'GPTBot (training) or ChatGPT-User (user fetches)',
  openai: 'GPTBot',
  bard: 'Google-Extended',
  gemini: 'Google-Extended',
  googlebard: 'Google-Extended',
  perplexity: 'PerplexityBot',
  facebookbot: 'Meta-ExternalAgent'
}

export interface UserAgentLine {
  agent: string
  line: number
  groupIndex: number
}

export function collectUserAgentLines(doc: RobotsDocument): UserAgentLine[] {
  const result: UserAgentLine[] = []
  doc.groups.forEach((group, groupIndex) => {
    for (let line = group.startLine; line <= doc.lines.length; line++) {
      const raw = doc.lines[line - 1] ?? ''
      const content = stripComment(raw)
      if (!content) {
        continue
      }
      if (!isUserAgentLineContent(raw)) {
        break
      }
      result.push({
        agent: content.slice(content.indexOf(':') + 1).trim(),
        line,
        groupIndex
      })
    }
  })
  return result
}

export function analyzeCrawlerAccess(
  doc: RobotsDocument,
  crawlers: readonly KnownCrawler[] = KNOWN_CRAWLERS
): CrawlerAccess[] {
  return crawlers.map((crawler) => {
    const groups = findApplicableGroups(doc, crawler.token)
    const specific = groups.some(group => group.userAgents.some(agent => agent.trim() !== '*'))
    const root = checkRobotsPath(doc, crawler.token, '/')
    const hasDisallow = groups.some(group =>
      group.directives.some(directive => directive.type === 'disallow' && directive.value !== '')
    )

    let status: CrawlerAccessStatus = 'allowed'
    if (!root.allowed) {
      status = 'blocked'
    } else if (hasDisallow) {
      status = 'partial'
    }

    return {
      crawler,
      status,
      matchedAgents: [...new Set(groups.flatMap(group => group.userAgents.length ? group.userAgents : ['*']))],
      hasSpecificGroup: specific,
      line: root.matchingLine
    }
  })
}

export function findKnownCrawler(token: string): KnownCrawler | undefined {
  const normalized = normalizeUserAgentForMatch(token)
  return KNOWN_CRAWLERS.find(crawler => normalizeUserAgentForMatch(crawler.token) === normalized)
}

function levenshtein(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++) {
      next.push(Math.min(
        (row[j] ?? 0) + 1,
        (next[j - 1] ?? 0) + 1,
        (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1)
      ))
    }
    row = next
  }
  return row[b.length] ?? 0
}

/** Suggests the intended token for a user-agent value that looks like a typo or retired name. */
export function suggestCrawlerToken(agent: string): string | null {
  const value = agent.trim()
  if (!value || value === '*' || findKnownCrawler(value)) {
    return null
  }

  const compact = value.toLowerCase().replace(/[^a-z0-9]/g, '')
  const replacement = TOKEN_REPLACEMENTS[compact]
  if (replacement) {
    return replacement
  }

  if (compact.length < 5) {
    return null
  }

  let best: { token: string, distance: number } | null = null
  for (const crawler of KNOWN_CRAWLERS) {
    const candidate = crawler.token.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (candidate === compact) {
      // Same letters, different separators (e.g. "GPT-Bot"): crawlers match tokens literally.
      return crawler.token
    }
    const distance = levenshtein(compact, candidate)
    if (distance <= 2 && (!best || distance < best.distance)) {
      best = { token: crawler.token, distance }
    }
  }
  return best?.token ?? null
}

export type CrawlerPolicyAction = 'block' | 'allow'

export type CrawlerPolicy = Record<string, CrawlerPolicyAction>

export type CrawlerPolicyPreset = 'block-ai-training' | 'block-all-ai' | 'allow-all-ai'

export const CRAWLER_POLICY_PRESETS: Record<CrawlerPolicyPreset, { label: string, description: string }> = {
  'block-ai-training': {
    label: 'Block AI training, keep AI search',
    description: 'Opt out of model training while staying visible in ChatGPT, Claude, and Perplexity answers'
  },
  'block-all-ai': {
    label: 'Block all AI crawlers',
    description: 'Opt out of AI training, AI search indexing, and user-triggered AI fetches'
  },
  'allow-all-ai': {
    label: 'Allow all AI crawlers',
    description: 'Explicitly allow every AI crawler, even if the catch-all group blocks them'
  }
}

export function crawlerPolicyFromPreset(preset: CrawlerPolicyPreset): CrawlerPolicy {
  const policy: CrawlerPolicy = {}
  for (const crawler of KNOWN_CRAWLERS) {
    if (crawler.category === 'search') {
      continue
    }
    if (preset === 'allow-all-ai') {
      policy[crawler.token] = 'allow'
    } else if (preset === 'block-all-ai' || crawler.category === 'ai-training') {
      policy[crawler.token] = 'block'
    } else {
      policy[crawler.token] = 'allow'
    }
  }
  return policy
}

const POLICY_HEADER = '# AI crawler policy'

/**
 * Rules for an explicitly allowed crawler. A named group replaces the `*`
 * group for that crawler, so it inherits the catch-all's rules except a
 * site-wide block; with nothing left it gets `Allow: /`.
 */
function allowedRules(doc: RobotsDocument): string[] {
  const rules = findApplicableGroups(doc, '*')
    .flatMap(group => group.directives)
    .filter(directive => directive.type === 'allow' || directive.type === 'disallow')
    .filter(directive => !(directive.type === 'disallow' && ['/', '/*', '/*$'].includes(directive.value)))
    .map(directive => `${directive.type === 'allow' ? 'Allow' : 'Disallow'}: ${directive.value}`)
  const unique = [...new Set(rules)]
  return unique.some(rule => rule.startsWith('Disallow:')) ? unique : ['Allow: /']
}

/**
 * Rewrites robots text so each crawler in `policy` gets an explicit group.
 * Existing `User-agent` lines for those crawlers are removed (along with any
 * group left without user-agents), then managed groups are appended: blocked
 * crawlers get `Disallow: /`, allowed ones keep the catch-all's restrictions.
 */
export function applyCrawlerPolicy(doc: RobotsDocument, policy: CrawlerPolicy): string {
  const managed = new Map(
    Object.entries(policy).map(([token, action]) => [normalizeUserAgentForMatch(token), { token, action }])
  )
  if (managed.size === 0) {
    return doc.raw
  }

  const agentLines = collectUserAgentLines(doc)
  const removed = new Set<number>()

  doc.groups.forEach((group, groupIndex) => {
    const lines = agentLines.filter(entry => entry.groupIndex === groupIndex)
    const managedLines = lines.filter(entry => managed.has(normalizeUserAgentForMatch(entry.agent)))
    if (managedLines.length === 0) {
      return
    }
    if (managedLines.length < lines.length) {
      managedLines.forEach(entry => removed.add(entry.line))
      return
    }
    const nextGroup = doc.groups[groupIndex + 1]
    const lastDirectiveLine = group.directives.at(-1)?.line ?? lines.at(-1)?.line ?? group.startLine
    const end = nextGroup ? Math.min(nextGroup.startLine - 1, lastDirectiveLine) : lastDirectiveLine
    for (let line = group.startLine; line <= end; line++) {
      removed.add(line)
    }
  })

  const kept = doc.lines.filter((_, index) => !removed.has(index + 1))
  // Drop a previously generated policy header so re-applying stays idempotent.
  const body = kept
    .filter(line => !line.startsWith(POLICY_HEADER))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()

  const blocked = [...managed.values()].filter(entry => entry.action === 'block').map(entry => entry.token)
  const allowed = [...managed.values()].filter(entry => entry.action === 'allow').map(entry => entry.token)

  const sections: string[] = []
  if (blocked.length) {
    sections.push([...blocked.map(token => `User-agent: ${token}`), 'Disallow: /'].join('\n'))
  }
  if (allowed.length) {
    sections.push([...allowed.map(token => `User-agent: ${token}`), ...allowedRules(doc)].join('\n'))
  }

  const policyText = `${POLICY_HEADER} (generated by Robots.txt Optimizer)\n${sections.join('\n\n')}`

  // Keep Sitemap lines at the end of the file.
  const sitemapPattern = /^\s*sitemap\s*:/i
  const bodyLines = body.split('\n')
  const trailingSitemaps: string[] = []
  for (let last = bodyLines.at(-1); last !== undefined && (sitemapPattern.test(last) || !last.trim()); last = bodyLines.at(-1)) {
    const line = bodyLines.pop() ?? ''
    if (line.trim()) {
      trailingSitemaps.unshift(line)
    }
  }

  const parts = [bodyLines.join('\n').trimEnd(), policyText]
  if (trailingSitemaps.length) {
    parts.push(trailingSitemaps.join('\n'))
  }
  return `${parts.filter(Boolean).join('\n\n')}\n`
}
