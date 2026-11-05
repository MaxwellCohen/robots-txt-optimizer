import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseRobotsTxt } from './index'

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
