import { describe, expect, it } from 'vitest'
import { compareRobotsTxt, samplePathForPattern } from './compare'

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

describe('samplePathForPattern', () => {
  it('builds readable paths from wildcard patterns', () => {
    expect(samplePathForPattern('/*/*/data.json')).toBe('/x/x/data.json')
    expect(samplePathForPattern('*/tarball/')).toBe('/x/tarball/')
    expect(samplePathForPattern('/*.pdf$')).toBe('/x.pdf')
    expect(samplePathForPattern('')).toBeNull()
  })
})
