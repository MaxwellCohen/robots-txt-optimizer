import { describe, expect, it } from 'vitest'
import {
  analyzeCrawlerAccess,
  applyCrawlerPolicy,
  crawlerPolicyFromPreset,
  suggestCrawlerToken
} from './crawlers'
import { collectCrawlabilityIssues } from './checks'
import { checkRobotsPath } from './match'
import { parseRobotsTxt } from './parse'

function statusOf(text: string, token: string) {
  return analyzeCrawlerAccess(parseRobotsTxt(text)).find(entry => entry.crawler.token === token)!
}

describe('analyzeCrawlerAccess', () => {
  it('reports blocked, partial, and allowed crawlers', () => {
    const text = `User-agent: *
Disallow: /admin

User-agent: GPTBot
Disallow: /`

    expect(statusOf(text, 'GPTBot').status).toBe('blocked')
    expect(statusOf(text, 'GPTBot').hasSpecificGroup).toBe(true)
    expect(statusOf(text, 'Googlebot').status).toBe('partial')
    expect(statusOf(text, 'Googlebot').matchedAgents).toEqual(['*'])
    expect(statusOf('User-agent: *\nDisallow:', 'ClaudeBot').status).toBe('allowed')
  })
})

describe('suggestCrawlerToken', () => {
  it('flags typos and retired tokens', () => {
    expect(suggestCrawlerToken('GPTbto')).toBe('GPTBot')
    expect(suggestCrawlerToken('anthropic-ai')).toBe('ClaudeBot')
    expect(suggestCrawlerToken('Bard')).toBe('Google-Extended')
    expect(suggestCrawlerToken('GPT-Bot')).toBe('GPTBot')
  })

  it('ignores known and unrelated tokens', () => {
    expect(suggestCrawlerToken('GPTBot')).toBeNull()
    expect(suggestCrawlerToken('gptbot')).toBeNull()
    expect(suggestCrawlerToken('*')).toBeNull()
    expect(suggestCrawlerToken('MyInternalMonitor')).toBeNull()
  })
})

describe('applyCrawlerPolicy', () => {
  const original = `User-agent: *
Disallow: /admin

User-agent: GPTBot
User-agent: Googlebot
Disallow: /private

User-agent: CCBot
Disallow: /tmp

Sitemap: https://example.com/sitemap.xml`

  it('blocks training bots, keeps search bots, and leaves sitemaps last', () => {
    const doc = parseRobotsTxt(original)
    const text = applyCrawlerPolicy(doc, crawlerPolicyFromPreset('block-ai-training'))

    expect(text).not.toMatch(/User-agent: CCBot\nDisallow: \/tmp/)
    expect(text).toContain('User-agent: Googlebot\nDisallow: /private')
    expect(text.trimEnd().endsWith('Sitemap: https://example.com/sitemap.xml')).toBe(true)

    expect(checkRobotsPath(text, 'GPTBot', '/').allowed).toBe(false)
    expect(checkRobotsPath(text, 'CCBot', '/').allowed).toBe(false)
    expect(checkRobotsPath(text, 'OAI-SearchBot', '/').allowed).toBe(true)
    // Allowed AI bots keep the catch-all's restrictions.
    expect(checkRobotsPath(text, 'OAI-SearchBot', '/admin').allowed).toBe(false)
    expect(checkRobotsPath(text, 'Googlebot', '/private').allowed).toBe(false)
    expect(checkRobotsPath(text, 'Googlebot', '/admin').allowed).toBe(true)
  })

  it('is idempotent', () => {
    const policy = crawlerPolicyFromPreset('block-all-ai')
    const once = applyCrawlerPolicy(parseRobotsTxt(original), policy)
    const twice = applyCrawlerPolicy(parseRobotsTxt(once), policy)
    expect(twice).toBe(once)
  })

  it('lifts a site-wide catch-all block for allowed crawlers but keeps other rules', () => {
    const doc = parseRobotsTxt('User-agent: *\nDisallow: /\nDisallow: /tmp')
    const text = applyCrawlerPolicy(doc, { 'OAI-SearchBot': 'allow', 'Bingbot': 'allow' })
    expect(checkRobotsPath(text, 'OAI-SearchBot', '/page').allowed).toBe(true)
    expect(checkRobotsPath(text, 'OAI-SearchBot', '/tmp').allowed).toBe(false)
    expect(checkRobotsPath(text, 'Googlebot', '/page').allowed).toBe(false)
  })
})

describe('collectCrawlabilityIssues', () => {
  it('warns when CSS or JavaScript is blocked', () => {
    const issues = collectCrawlabilityIssues(parseRobotsTxt('User-agent: *\nDisallow: /_next/\nDisallow: /*.css$'))
    expect(issues.map(issue => issue.line).sort()).toEqual([2, 3])
    expect(issues[0]?.message).toContain('CSS/JavaScript')
  })

  it('warns when the whole site is blocked', () => {
    const issues = collectCrawlabilityIssues(parseRobotsTxt('User-agent: *\nDisallow: /\n\nSitemap: https://example.com/sitemap.xml'))
    expect(issues).toHaveLength(1)
    expect(issues[0]?.message).toContain('staging')
  })

  it('flags misspelled crawler tokens with their line', () => {
    const issues = collectCrawlabilityIssues(parseRobotsTxt('User-agent: *\nDisallow: /x\n\nUser-agent: ClaudBot\nDisallow: /'))
    expect(issues).toEqual([expect.objectContaining({ line: 4, message: expect.stringContaining('ClaudeBot') })])
  })
})
