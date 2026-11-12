import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { analyzeRobotsTxt, simulatePaths } from './index'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8')
}

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
