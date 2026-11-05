import { describe, expect, it } from 'vitest'
import { parseRobotsTxt } from './parse'
import { findBlockedSitemapUrls, parseSitemapXml } from './sitemap'

const urlset = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://example.com/</loc></url>
<url><loc><![CDATA[https://example.com/admin/page]]></loc></url>
<url><loc>https://example.com/search?q=a&amp;b=1</loc></url>
</urlset>`

describe('sitemaps', () => {
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

  it('ignores <loc> inside XML comments', () => {
    const xml = '<urlset><!-- <url><loc>https://example.com/old</loc></url> --><url><loc>https://example.com/new</loc></url></urlset>'
    expect(parseSitemapXml(xml).locs).toEqual(['https://example.com/new'])
  })

  it('does not treat markup inside CDATA as elements, and keeps comment markers in CDATA locs', () => {
    const xml = '<urlset><x><![CDATA[<loc>https://example.com/fake</loc>]]></x><url><loc><![CDATA[https://example.com/a<!--b-->]]></loc></url></urlset>'
    expect(parseSitemapXml(xml).locs).toEqual(['https://example.com/a<!--b-->'])
  })

  it('ignores a commented-out root element', () => {
    expect(parseSitemapXml('<!-- <urlset> --><html></html>').kind).toBe('invalid')
  })
})
