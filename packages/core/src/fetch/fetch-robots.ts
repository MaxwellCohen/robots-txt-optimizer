import { RobotsFetchError } from './errors'
import type { FetchResult } from '../types'
import { readCapped } from './read-capped'

// Above Google's 500 KiB processing limit so oversized files can still be diagnosed.
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 10_000

export interface FetchRobotsTxtOptions {
  fetch?: typeof globalThis.fetch
  signal?: AbortSignal
  maxBytes?: number
  timeoutMs?: number
  userAgent?: string
  accept?: string
  source?: FetchResult['source']
}

export async function fetchRobotsTxt(
  url: URL,
  options: FetchRobotsTxtOptions = {}
): Promise<FetchResult> {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const source = options.source ?? 'client'

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  const onAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onAbort, { once: true })

  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: options.accept ?? 'text/plain,*/*',
        ...(options.userAgent ? { 'User-Agent': options.userAgent } : {})
      },
      redirect: 'follow'
    })

    const tooLarge = () => new RobotsFetchError('robots.txt response is too large', 'TOO_LARGE')
    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > maxBytes) {
      await response.body?.cancel()
      throw tooLarge()
    }

    const bytes = await readCapped(response, maxBytes, tooLarge)
    const hasBom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const finalUrl = response.url || url.toString()

    return {
      text,
      finalUrl,
      status: response.status,
      contentType: response.headers.get('content-type'),
      source,
      redirected: response.redirected || finalUrl !== url.toString(),
      bytes: bytes.byteLength,
      hasBom
    }
  } catch (err) {
    if (err instanceof RobotsFetchError) {
      throw err
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new RobotsFetchError('Request timed out', 'TIMEOUT')
    }
    throw err
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', onAbort)
  }
}
