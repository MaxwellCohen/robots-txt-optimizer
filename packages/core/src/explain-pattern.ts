export type RuleEffect = 'allow' | 'disallow'

export interface ExplainPatternOptions {
  allowPatterns?: string[]
}

export function explainPattern(
  pattern: string,
  effect: RuleEffect,
  options?: ExplainPatternOptions
): string {
  const action = effect === 'allow' ? 'Allows' : 'Blocks'

  if (!pattern) {
    return effect === 'disallow'
      ? 'Allows all URLs (empty Disallow value)'
      : 'Matches no paths (empty Allow value)'
  }

  if (pattern === '/') {
    if (effect === 'disallow') {
      const hasAllows = (options?.allowPatterns?.length ?? 0) > 0
      return hasAllows
        ? 'Blocks all URLs for this user-agent unless a more specific Allow rule applies'
        : 'Blocks all URLs on the site for this user-agent'
    }
    return `${action} all URLs on the site`
  }

  if (pattern.endsWith('$')) {
    const base = pattern.slice(0, -1)

    if (base === '/' || pattern === '/$') {
      return `${action} only the homepage (exact \`/\`)`
    }

    return `${action} only the exact path \`${base}\` (not subpaths)`
  }

  if (pattern.includes('*')) {
    if (pattern.endsWith('/*')) {
      const directory = pattern.slice(0, -1)
      return `${action} any path under \`${directory}\``
    }

    return `${action} paths matching the wildcard pattern \`${pattern}\``
  }

  if (pattern.endsWith('/')) {
    return `${action} paths under \`${pattern}\` and its subpaths`
  }

  return `${action} paths starting with \`${pattern}\``
}

export function explainOtherDirective(name: string, value: string): string {
  const normalized = name.toLowerCase().replace(/[\s_-]+/g, '')

  if (normalized === 'crawldelay') {
    return `Asks crawlers to wait ${value} second(s) between requests (non-standard; often ignored)`
  }

  if (normalized === 'host') {
    return `Preferred mirror host: ${value} (non-standard; Yandex-specific)`
  }

  if (normalized === 'contentsignal') {
    return `Content usage preferences: ${value} (non-standard; Content Signals / Cloudflare)`
  }

  return `Non-standard directive`
}
