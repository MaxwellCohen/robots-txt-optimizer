import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeRobotsTxt, simulatePaths } from './index'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8')
}

describe('validateRobotsDocument', () => {
  it('validates a well-formed robots.txt', () => {
    const result = analyzeRobotsTxt(loadFixture('sample.txt'))

    expect(result.validation.ok).toBe(true)
    expect(result.directiveSummary).toHaveLength(2)
    expect(result.pathSimulation.length).toBeGreaterThan(0)
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
})
