import { gunzipSync } from 'node:zlib'
import { parseSitemapXml, type SitemapFetchEntry, type SitemapReport } from '../sitemap'
import { createGuardedFetch, SERVER_USER_AGENT } from './node'

export interface FetchSitemapsOptions {
  /** Maximum sitemap files to download, including indexes. */
  maxSitemaps?: number
  /** Maximum page URLs to collect. */
  maxUrls?: number
  /** Maximum bytes per sitemap file (after decompression). */
  maxBytes?: number
  timeoutMs?: number
  fetch?: typeof globalThis.fetch
}

const DEFAULTS = {
  maxSitemaps: 10,
  maxUrls: 5000,
  maxBytes: 10 * 1024 * 1024,
  timeoutMs: 10_000
}

function isGzip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x1F && bytes[1] === 0x8B
}

async function readCapped(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (!reader) {
    return new Uint8Array()
  }
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error(`Sitemap is larger than ${Math.round(maxBytes / 1024 / 1024)} MiB`)
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

/**
 * Downloads sitemaps (following sitemap indexes breadth-first) with SSRF
 * protection and size limits, and collects their page URLs.
 */
export async function secureFetchSitemaps(
  sitemapUrls: readonly string[],
  options: FetchSitemapsOptions = {}
): Promise<SitemapReport> {
  const limits = { ...DEFAULTS, ...options }
  const fetchImpl = createGuardedFetch(options.fetch)
  const queue = [...new Set(sitemapUrls)]
  const visited = new Set<string>()
  const urls = new Set<string>()
  const sitemaps: SitemapFetchEntry[] = []
  let truncated = false

  while (queue.length > 0) {
    if (sitemaps.length >= limits.maxSitemaps || urls.size >= limits.maxUrls) {
      truncated = true
      break
    }
    const url = queue.shift()!
    if (visited.has(url)) {
      continue
    }
    visited.add(url)

    const entry: SitemapFetchEntry = { url, status: null, kind: null, urlCount: 0 }
    sitemaps.push(entry)

    try {
      const response = await fetchImpl(url, {
        headers: { 'Accept': 'application/xml,text/xml,*/*', 'User-Agent': SERVER_USER_AGENT },
        signal: AbortSignal.timeout(limits.timeoutMs)
      })
      entry.status = response.status
      if (!response.ok) {
        await response.body?.cancel()
        entry.error = `HTTP ${response.status}`
        continue
      }

      let bytes = await readCapped(response, limits.maxBytes)
      if (isGzip(bytes)) {
        bytes = gunzipSync(bytes, { maxOutputLength: limits.maxBytes })
      }
      const parsed = parseSitemapXml(new TextDecoder().decode(bytes))
      entry.kind = parsed.kind

      if (parsed.kind === 'invalid') {
        entry.error = 'Not a sitemap: expected <urlset> or <sitemapindex>'
      } else if (parsed.kind === 'sitemapindex') {
        entry.urlCount = parsed.locs.length
        queue.push(...parsed.locs.filter(loc => !visited.has(loc)))
      } else {
        entry.urlCount = parsed.locs.length
        for (const loc of parsed.locs) {
          if (urls.size >= limits.maxUrls) {
            truncated = true
            break
          }
          urls.add(loc)
        }
      }
    } catch (err) {
      entry.error = err instanceof Error
        ? (err.name === 'TimeoutError' ? 'Request timed out' : err.message)
        : 'Failed to fetch sitemap'
    }
  }

  if (queue.some(url => !visited.has(url))) {
    truncated = true
  }

  return { sitemaps, urls: [...urls], truncated }
}
