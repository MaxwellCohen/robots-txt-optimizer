import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { secureFetchSitemaps } from './sitemap-node'

const urlset = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/admin/page</loc></url>
  <url><loc>https://example.com/search?q=a&amp;b=1</loc></url>
</urlset>`

function fetchFrom(files: Record<string, string | Uint8Array>): typeof fetch {
  return (async (url: string) => {
    const body = files[url]
    return body === undefined
      ? new Response('nope', { status: 404 })
      : new Response(body as string)
  }) as typeof fetch
}

describe('secureFetchSitemaps', () => {
  it('follows sitemap indexes and gunzips', async () => {
    const files: Record<string, string | Uint8Array> = {
      'https://93.184.215.14/index.xml': '<sitemapindex><sitemap><loc>https://93.184.215.14/a.xml.gz</loc></sitemap><sitemap><loc>https://93.184.215.14/missing.xml</loc></sitemap></sitemapindex>',
      'https://93.184.215.14/a.xml.gz': gzipSync(urlset)
    }
    const fakeFetch = fetchFrom(files)

    const report = await secureFetchSitemaps(['https://93.184.215.14/index.xml'], { fetch: fakeFetch })
    expect(report.urls).toHaveLength(3)
    expect(report.truncated).toBe(false)
    expect(report.sitemaps.map(s => [s.kind, s.urlCount, s.error])).toEqual([
      ['sitemapindex', 2, undefined],
      ['urlset', 3, undefined],
      [null, 0, 'HTTP 404']
    ])
  })

  it('reports sitemaps larger than the byte limit', async () => {
    const fakeFetch = fetchFrom({ 'https://93.184.215.14/big.xml': `<urlset>${'<url><loc>https://example.com/x</loc></url>'.repeat(100)}</urlset>` })
    const report = await secureFetchSitemaps(['https://93.184.215.14/big.xml'], { fetch: fakeFetch, maxBytes: 200 })
    expect(report.sitemaps[0]?.error).toMatch(/larger than/)
  })

  it('reports gzip bombs that exceed the limit after decompression', async () => {
    const fakeFetch = fetchFrom({ 'https://93.184.215.14/bomb.xml.gz': gzipSync(`<urlset>${' '.repeat(5000)}</urlset>`) })
    const report = await secureFetchSitemaps(['https://93.184.215.14/bomb.xml.gz'], { fetch: fakeFetch, maxBytes: 1000 })
    expect(report.sitemaps[0]?.error).toBeTruthy()
    expect(report.urls).toEqual([])
  })

  it('refuses private hosts unless allowPrivateHosts is set', async () => {
    const fakeFetch = fetchFrom({ 'http://127.0.0.1/s.xml': urlset })
    const blocked = await secureFetchSitemaps(['http://127.0.0.1/s.xml'], { fetch: fakeFetch })
    expect(blocked.sitemaps[0]?.error).toMatch(/private/i)
    const allowed = await secureFetchSitemaps(['http://127.0.0.1/s.xml'], { fetch: fakeFetch, allowPrivateHosts: true })
    expect(allowed.urls).toHaveLength(3)
  })

  it('stops at maxSitemaps and marks the report truncated', async () => {
    const fakeFetch = fetchFrom({
      'https://93.184.215.14/index.xml': '<sitemapindex><sitemap><loc>https://93.184.215.14/a.xml</loc></sitemap><sitemap><loc>https://93.184.215.14/b.xml</loc></sitemap></sitemapindex>',
      'https://93.184.215.14/a.xml': urlset,
      'https://93.184.215.14/b.xml': urlset
    })
    const report = await secureFetchSitemaps(['https://93.184.215.14/index.xml'], { fetch: fakeFetch, maxSitemaps: 2 })
    expect(report.truncated).toBe(true)
    expect(report.sitemaps).toHaveLength(2)
  })
})
