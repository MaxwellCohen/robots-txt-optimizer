import { describe, expect, it } from 'vitest'
import { compressTextForUrl, decompressTextFromUrl } from './url-text'

describe('url-text', () => {
  it('round-trips text through gzip and base64', async () => {
    const original = `User-agent: *
Disallow: /private/
Allow: /public/

Sitemap: https://example.com/sitemap.xml`

    const encoded = await compressTextForUrl(original)
    const decoded = await decompressTextFromUrl(encoded)

    expect(decoded).toBe(original)
    expect(encoded).not.toContain('\n')
  })

  it('compresses repetitive content', async () => {
    const original = 'Disallow: /path/\n'.repeat(100)
    const encoded = await compressTextForUrl(original)

    expect(encoded.length).toBeLessThan(original.length)
    expect(await decompressTextFromUrl(encoded)).toBe(original)
  })
})
