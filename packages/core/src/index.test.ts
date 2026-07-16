import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeRobotsTxt, parseRobotsTxt, simulatePaths } from './index'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8')
}

describe('parseRobotsTxt', () => {
  it('parses user-agent groups and sitemaps', () => {
    const doc = parseRobotsTxt(loadFixture('sample.txt'))

    expect(doc.groups).toHaveLength(2)
    expect(doc.groups[0]?.userAgents).toEqual(['*'])
    expect(doc.groups[1]?.userAgents).toEqual(['Googlebot'])
    expect(doc.sitemaps).toHaveLength(1)
    expect(doc.sitemaps[0]?.url).toBe('https://example.com/sitemap.xml')
  })
})

describe('analyzeRobotsTxt', () => {
  it('validates a well-formed robots.txt', () => {
    const result = analyzeRobotsTxt(loadFixture('sample.txt'))

    expect(result.validation.ok).toBe(true)
    expect(result.directiveSummary).toHaveLength(2)
    expect(result.pathSimulation.length).toBeGreaterThan(0)
  })

  it('detects duplicate directives', () => {
    const result = analyzeRobotsTxt(loadFixture('sample.txt'))

    expect(result.suggestions.some(s => s.type === 'duplicate_directive')).toBe(true)
  })

  it('reports validation errors for malformed content', () => {
    const result = analyzeRobotsTxt(loadFixture('invalid.txt'))

    expect(result.validation.ok).toBe(false)
    expect(result.validation.issues.some(i => i.severity === 'error')).toBe(true)
  })

  it('ignores unexpected characters on user-agent lines', () => {
    const text = `User-agent: *
Disallow: /

User-agent: Botâtest
Disallow: /admin`

    const result = analyzeRobotsTxt(text)

    expect(result.validation.ok).toBe(true)
    expect(result.validation.issues.some(i => i.severity === 'error')).toBe(false)
    expect(result.validation.issues.some(i => i.message.includes('Unexpected Character'))).toBe(false)
    expect(result.validation.issues.some(i => i.message.includes('Failed to parse'))).toBe(false)
  })

  it('accepts unicode hyphens in user-agent names', () => {
    const text = `User-agent: Perplexity\u2011User
Disallow: /`

    const result = analyzeRobotsTxt(text)

    expect(result.validation.ok).toBe(true)
    expect(result.validation.issues.some(i => i.severity === 'error')).toBe(false)
  })

  it('accepts spaces in user-agent names', () => {
    const text = `User-agent: Perplexity User
Disallow: /`

    const result = analyzeRobotsTxt(text)

    expect(result.validation.ok).toBe(true)
    expect(result.validation.issues.some(i => i.severity === 'error')).toBe(false)
    expect(result.document.groups[0]?.userAgents).toEqual(['Perplexity User'])

    const verdict = simulatePaths(result.document, ['Perplexity User'], ['/'])[0]
    expect(verdict?.allowed).toBe(false)
  })

  it('still reports unexpected characters on non-user-agent lines', () => {
    const text = `User-agent: *
Disallow: /adminâ/`

    const result = analyzeRobotsTxt(text)

    expect(result.validation.ok).toBe(false)
    expect(result.validation.issues.some(i => i.message.includes('Unexpected Character'))).toBe(true)
  })

  it('simulates longest-match allow over disallow', () => {
    const text = `User-agent: *
Disallow: /blog/
Allow: /blog/post-1`

    const result = analyzeRobotsTxt(text)
    const blogPost = result.pathSimulation.find(
      v => v.userAgent === '*' && v.path === '/blog/post-1'
    )

    expect(blogPost?.allowed).toBe(true)
  })

  it('produces optimized text without duplicate rules', () => {
    const result = analyzeRobotsTxt(loadFixture('sample.txt'))

    expect(result.optimizedText).not.toContain('Disallow: /admin/\nDisallow: /admin/')
    expect(result.optimizedText).toContain('Disallow: /admin/')
  })

  it('preserves comments in optimized text', () => {
    const text = `# Site-wide rules
User-agent: *
Disallow: /private/  # keep private paths blocked
Allow: /public/

# Google-specific
User-agent: Googlebot
Disallow: /admin/
Disallow: /admin/  # duplicate`

    const result = analyzeRobotsTxt(text)

    expect(result.optimizedText).toContain('# Site-wide rules')
    expect(result.optimizedText).toContain('# keep private paths blocked')
    expect(result.optimizedText).toContain('# Google-specific')
    expect(result.optimizedText).not.toContain('Disallow: /admin/\nDisallow: /admin/')
  })

  it('suggests User-agent: * when directives lack a user-agent', () => {
    const text = `Disallow: /private/
Allow: /public/`

    const result = analyzeRobotsTxt(text)

    expect(result.validation.issues.some(
      i => i.message === 'Group has directives but no User-agent'
    )).toBe(true)
    expect(result.suggestions.some(s => s.type === 'missing_user_agent')).toBe(true)
    expect(result.optimizedText).toMatch(/^User-agent: \*/)
  })

  it('does not flag a more specific allow after disallow / as dead', () => {
    const text = `User-agent: *
Disallow: /
Allow: /about$`

    const result = analyzeRobotsTxt(text)

    expect(result.suggestions.some(s => s.type === 'dead_rule')).toBe(false)
  })

  it('names the superseding rule for genuinely dead rules', () => {
    const text = `User-agent: *
Disallow: /
Disallow: /admin`

    const result = analyzeRobotsTxt(text)
    const dead = result.suggestions.find(s => s.type === 'dead_rule')

    expect(dead?.message).toContain('superseded by Disallow: /')
    expect(dead?.message).toContain('`*`')
    expect(dead?.userAgents).toEqual(['*'])
  })

  it('reports dead rules separately per user-agent group', () => {
    const text = `User-agent: Googlebot
Disallow: /
Disallow: /admin

User-agent: *
Disallow: /
Allow: /about$`

    const result = analyzeRobotsTxt(text)
    const deadRules = result.suggestions.filter(s => s.type === 'dead_rule')

    expect(deadRules.some(
      s => s.message.includes('/admin') && s.userAgents?.includes('Googlebot')
    )).toBe(true)
    expect(deadRules.some(s => s.message.includes('/about$'))).toBe(false)
  })

  it('groups dead rules for user-agents sharing the same outcome', () => {
    const text = `User-agent: Googlebot
User-agent: Bingbot
Disallow: /
Disallow: /admin`

    const result = analyzeRobotsTxt(text)
    const dead = result.suggestions.find(s => s.type === 'dead_rule')

    expect(dead?.userAgents).toEqual(['Googlebot', 'Bingbot'])
    expect(dead?.message).toContain('Googlebot')
    expect(dead?.message).toContain('Bingbot')
  })

  it('names the earliest matching rule when a duplicate allow is dead', () => {
    const text = `User-agent: *
Allow: /blog/post-1
Allow: /blog/post-1`

    const result = analyzeRobotsTxt(text)
    const dead = result.suggestions.find(
      s => s.type === 'dead_rule' && s.message.includes('/blog/post-1')
    )

    expect(dead?.message).toContain('superseded by Allow: /blog/post-1')
  })

  it('names non-RFC directives in validation warnings', () => {
    const text = `User-agent: *
Crawl-delay: 10
Disallow: /private/`

    const result = analyzeRobotsTxt(text)

    expect(result.validation.issues).toContainEqual({
      severity: 'warning',
      message: 'Directive "Crawl-delay" is recognized but not part of RFC 9309 (may be ignored by crawlers)',
      line: 2
    })
  })

  it('recognizes Content-Signal as a known non-RFC directive', () => {
    const text = `User-agent: *
Content-Signal: search=yes, ai-train=no
Allow: /`

    const result = analyzeRobotsTxt(text)

    expect(result.validation.issues).not.toContainEqual({
      severity: 'warning',
      message: 'Unrecognized or unparseable directive',
      line: 2
    })
    expect(result.validation.issues).toContainEqual({
      severity: 'warning',
      message: 'Directive "Content-Signal" is recognized but not part of RFC 9309 (may be ignored by crawlers)',
      line: 2
    })
  })

  it('removes redundant disallow rules after allow-list catch-all', () => {
    const text = `User-agent: *
Allow: /$
Allow: /about$
Allow: /accessibility$
Allow: /blog
Allow: /brand$
Allow: /pds$
Allow: /privacy$
Allow: /translation-status$
Allow: /recharging$
Allow: /_og/d/*
Allow: /opensearch.xml$
Disallow: /
Disallow: /search
Disallow: /settings
Disallow: /compare
Disallow: /auth/
Disallow: /package-code/
Disallow: /code/
Disallow: /package-docs/
Disallow: /docs/
Disallow: /package-changelog/
Disallow: /changelog/
Disallow: /api/
Disallow: /opensearch.xml
Disallow: /_v/

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /`

    const result = analyzeRobotsTxt(text)
    const deadRules = result.suggestions.filter(s => s.type === 'dead_rule')

    expect(deadRules.every(s => s.userAgents?.includes('*'))).toBe(true)
    expect(deadRules.every(s => s.message.startsWith('Disallow'))).toBe(true)
    expect(result.optimizedText).not.toContain('Disallow: /search')
    expect(result.optimizedText).not.toContain('Disallow: /api/')
    expect(result.optimizedText).toContain('Allow: /about$')
    expect(result.optimizedText).toContain('Disallow: /')
    expect(result.optimizedText).toContain('User-agent: GPTBot')
    expect(result.optimizedText).toContain('User-agent: ChatGPT-User')
  })
})
