import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeRobotsTxt, buildOptimizedText, compareRobotsTxt, parseRobotsTxt, simulatePaths } from './index'

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
  it('keeps user-agents that share rules on one summary row', () => {
    const text = `User-agent: Googlebot
User-agent: Bingbot
Disallow: /admin`

    const result = analyzeRobotsTxt(text)

    expect(result.directiveSummary).toHaveLength(1)
    expect(result.directiveSummary[0]?.userAgents).toEqual(['Googlebot', 'Bingbot'])
    expect(result.directiveSummary[0]?.disallow).toEqual(['/admin'])
  })

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

  it('does not apply User-agent: * Allow rules when a specific group matches', () => {
    const text = `User-agent: *
Allow: /noodles
Allow: /leaderboard/likes$
Disallow: /

User-agent: GPTBot
Disallow: /`

    const result = analyzeRobotsTxt(text)
    const verdicts = simulatePaths(
      result.document,
      ['GPTBot', '*'],
      ['/noodles', '/leaderboard/likes']
    )

    expect(verdicts.filter(v => v.userAgent === 'GPTBot').every(v => !v.allowed)).toBe(true)
    expect(verdicts.filter(v => v.userAgent === '*').every(v => v.allowed)).toBe(true)
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

  it('reports an exact duplicate once, as a duplicate rather than a dead rule', () => {
    const text = `User-agent: *
Allow: /blog/post-1
Allow: /blog/post-1`

    const result = analyzeRobotsTxt(text)

    expect(result.suggestions.map(s => `${s.type}:${s.lines.join(',')}`)).toEqual(['duplicate_directive:3'])
  })

  it('never removes every copy of a rule that is repeated', () => {
    const text = `User-agent: *
Disallow: /a
Disallow: /b
Disallow: /b
Disallow: /c
Disallow: /c*`

    const result = analyzeRobotsTxt(text)

    expect(result.optimizedText.match(/Disallow: \/b$/gm)).toHaveLength(1)
    expect(result.optimizedText.match(/Disallow: \/c\*?$/gm)).toHaveLength(1)
    expect(compareRobotsTxt(text, result.optimizedText).verdictChanges).toEqual([])
  })

  it('applies only the selected suggestions', () => {
    const text = `User-agent: *
Disallow: /a
Disallow: /a
Disallow: /a
Disallow: /b
Disallow: /b

User-agent: X
Disallow: /q

User-agent: X
Disallow: /q`
    const doc = parseRobotsTxt(text)
    const suggestions = analyzeRobotsTxt(text).suggestions
    const pick = (type: string, line: number) => suggestions.filter(s => s.type === type && s.lines.includes(line))

    expect(buildOptimizedText(doc, pick('duplicate_directive', 3)))
      .toBe(text.replace('Disallow: /a\nDisallow: /a\nDisallow: /a', 'Disallow: /a\nDisallow: /a'))
    expect(buildOptimizedText(doc, [])).toBe(text)
    expect(buildOptimizedText(doc, pick('duplicate_group', 11)))
      .toMatch(/User-agent: X\nDisallow: \/q$/)
    expect(buildOptimizedText(doc, pick('duplicate_group', 11)).match(/User-agent: X/g)).toHaveLength(1)
    expect(buildOptimizedText(doc, pick('duplicate_group', 11))).toContain('Disallow: /a\nDisallow: /a\nDisallow: /a')
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

  it('analyzes a Google-sized robots.txt quickly', () => {
    const text = loadFixture('google-robots.txt')
    const expected = JSON.parse(loadFixture('google-dead-rules.json')) as Array<{
      lines: number[]
      userAgents: string[]
      message: string
    }>

    const start = performance.now()
    const result = analyzeRobotsTxt(text)
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(500)
    expect(result.suggestions.filter(suggestion => suggestion.type === 'dead_rule').map(suggestion => ({
      lines: suggestion.lines,
      userAgents: suggestion.userAgents,
      message: suggestion.message
    }))).toEqual(expected)
  })
})

describe('optimizedText safety', () => {
  it('never changes a crawl verdict (randomized)', () => {
    const patterns = ['/', '/a', '/a/', '/a*', '/a$', '/a/b', '/*.js$', '/b', '/b*', '/a/b/c', '/*?q=', '/*/b', '/a*b', '/*b$', '/ab', '']
    const paths = ['/', '/a', '/a/', '/ab', '/a/b', '/a/b/c', '/x.js', '/a/x.js', '/b', '/bc', '/?q=1', '/a?q=1', '/a/b?q=1', '/xb', '/x/b', '/axb', '/a.js']
    let seed = 7
    const random = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed % n
    }

    for (let i = 0; i < 1500; i++) {
      const lines = ['User-agent: *']
      for (let k = 0; k < 2 + random(7); k++) {
        lines.push(`${random(2) ? 'Allow' : 'Disallow'}: ${patterns[random(patterns.length)]}`)
      }
      const text = lines.join('\n')
      const { verdictChanges } = compareRobotsTxt(text, analyzeRobotsTxt(text).optimizedText, { paths })
      expect(verdictChanges, text).toEqual([])
    }
  })
})
