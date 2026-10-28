import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import {
  analyzeRobotsTxt,
  compareRobotsTxt,
  diffLines,
  findBlockedSitemapUrls,
  getRobotsTemplates,
  parseRobotsTxt,
  parseSitemapXml
} from './index'
import { diagnoseFetch } from './fetch/diagnose'
import { createGuardedFetch } from './fetch/node'
import { RobotsFetchSecurityError } from './fetch/errors'
import { secureFetchSitemaps } from './fetch/sitemap-node'
import type { FetchResult } from './types'

const okResult: FetchResult = {
  text: 'User-agent: *\nDisallow:',
  finalUrl: 'https://example.com/robots.txt',
  status: 200,
  contentType: 'text/plain',
  source: 'server',
  bytes: 24
}

describe('diagnoseFetch', () => {
  it('explains 5xx as a full block', () => {
    const [status] = diagnoseFetch({ ...okResult, status: 503 })
    expect(status).toMatchObject({ severity: 'error' })
    expect(status!.title).toContain('fully blocked')
  })

  it('explains 4xx as no restrictions', () => {
    expect(diagnoseFetch({ ...okResult, status: 404 })[0]!.title).toContain('no restrictions')
  })

  it('flags HTML bodies, oversize files, BOMs, and redirects away from robots.txt', () => {
    const titles = (result: FetchResult) => diagnoseFetch(result, 'https://example.com/robots.txt').map(d => d.title)
    expect(titles({ ...okResult, text: '<!DOCTYPE html><html>', contentType: 'text/html' })).toContain('Response is an HTML page')
    expect(titles({ ...okResult, bytes: 600 * 1024 }).some(t => t.includes('500 KiB'))).toBe(true)
    expect(titles({ ...okResult, hasBom: true })).toContain('Starts with a UTF-8 byte order mark')
    expect(titles({ ...okResult, redirected: true, finalUrl: 'https://example.com/' })).toContain('Redirects away from robots.txt')
  })
})

describe('createGuardedFetch', () => {
  it('refuses redirects to private addresses', async () => {
    const base = (async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/robots.txt' } })) as typeof fetch
    await expect(createGuardedFetch(base)('https://93.184.215.14/robots.txt')).rejects.toBeInstanceOf(RobotsFetchSecurityError)
  })

  it('reports the final URL after redirects', async () => {
    const base = (async (url: string) => url.endsWith('/old')
      ? new Response(null, { status: 301, headers: { location: '/robots.txt' } })
      : new Response('ok')) as typeof fetch
    const response = await createGuardedFetch(base)('https://93.184.215.14/old')
    expect(response.url).toBe('https://93.184.215.14/robots.txt')
    expect(response.redirected).toBe(true)
  })
})

describe('sitemaps', () => {
  const urlset = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc><![CDATA[https://example.com/admin/page]]></loc></url>
  <url><loc>https://example.com/search?q=a&amp;b=1</loc></url>
</urlset>`

  it('parses urlsets and indexes', () => {
    expect(parseSitemapXml(urlset)).toEqual({
      kind: 'urlset',
      locs: ['https://example.com/', 'https://example.com/admin/page', 'https://example.com/search?q=a&b=1']
    })
    expect(parseSitemapXml('<sitemapindex><sitemap><loc>https://example.com/a.xml</loc></sitemap></sitemapindex>').kind).toBe('sitemapindex')
    expect(parseSitemapXml('<html></html>').kind).toBe('invalid')
  })

  it('finds sitemap URLs blocked by robots.txt', () => {
    const doc = parseRobotsTxt('User-agent: *\nDisallow: /admin\n\nUser-agent: Bingbot\nDisallow: /search')
    const conflicts = findBlockedSitemapUrls(doc, parseSitemapXml(urlset).locs)
    expect(conflicts.map(c => `${c.userAgent} ${c.path} L${c.line}`)).toEqual([
      'Googlebot /admin/page L2',
      'Bingbot /search?q=a&b=1 L5'
    ])
  })

  it('follows sitemap indexes and gunzips', async () => {
    const files: Record<string, BodyInit> = {
      'https://93.184.215.14/index.xml': '<sitemapindex><sitemap><loc>https://93.184.215.14/a.xml.gz</loc></sitemap><sitemap><loc>https://93.184.215.14/missing.xml</loc></sitemap></sitemapindex>',
      'https://93.184.215.14/a.xml.gz': gzipSync(urlset)
    }
    const fakeFetch = (async (url: string) => files[url]
      ? new Response(files[url])
      : new Response('nope', { status: 404 })) as typeof fetch

    const report = await secureFetchSitemaps(['https://93.184.215.14/index.xml'], { fetch: fakeFetch })
    expect(report.urls).toHaveLength(3)
    expect(report.truncated).toBe(false)
    expect(report.sitemaps.map(s => [s.kind, s.urlCount, s.error])).toEqual([
      ['sitemapindex', 2, undefined],
      ['urlset', 3, undefined],
      [null, 0, 'HTTP 404']
    ])
  })
})

describe('diffLines', () => {
  it('marks added and removed lines with line numbers', () => {
    expect(diffLines('a\nb\nc', 'a\nc\nd')).toEqual([
      { type: 'same', text: 'a', oldLine: 1, newLine: 1 },
      { type: 'remove', text: 'b', oldLine: 2 },
      { type: 'same', text: 'c', oldLine: 3, newLine: 2 },
      { type: 'add', text: 'd', newLine: 3 }
    ])
  })
})

describe('compareRobotsTxt', () => {
  it('reports verdict and crawler changes', () => {
    const result = compareRobotsTxt(
      'User-agent: *\nDisallow: /admin',
      'User-agent: *\nDisallow: /admin\nDisallow: /blog\n\nUser-agent: GPTBot\nDisallow: /'
    )
    expect(result.verdictChanges).toContainEqual(expect.objectContaining({ userAgent: 'Googlebot', path: '/blog', before: true, after: false }))
    expect(result.verdictChanges).toContainEqual(expect.objectContaining({ userAgent: 'GPTBot', path: '/', after: false }))
    expect(result.crawlerChanges.find(c => c.crawler.token === 'GPTBot')).toMatchObject({ before: 'partial', after: 'blocked' })
  })
})

describe('getRobotsTemplates', () => {
  it('ships templates that validate without errors', () => {
    for (const template of getRobotsTemplates()) {
      const { validation } = analyzeRobotsTxt(template.text)
      const unexpected = validation.issues.filter(issue =>
        issue.severity === 'error' || (template.id !== 'staging' && issue.message.includes('blocked'))
      )
      expect(unexpected, template.id).toEqual([])
    }
  })
})
