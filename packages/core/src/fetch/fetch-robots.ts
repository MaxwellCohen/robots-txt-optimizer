import { RobotsFetchError } from './errors'
import type { FetchResult } from '../types'

const DEFAULT_MAX_BYTES = 512 * 1024
const DEFAULT_TIMEOUT_MS = 10_000

export interface FetchRobotsTxtOptions {
  fetch?: typeof globalThis.fetch
  signal?: AbortSignal
  maxBytes?: number
  timeoutMs?: number
  userAgent?: string
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
        Accept: 'text/plain,*/*',
        ...(options.userAgent ? { 'User-Agent': options.userAgent } : {})
      },
      redirect: 'follow'
    })

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > maxBytes) {
      throw new RobotsFetchError('robots.txt response is too large', 'TOO_LARGE')
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > maxBytes) {
      throw new RobotsFetchError('robots.txt response is too large', 'TOO_LARGE')
    }

    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)

    return {
      text,
      finalUrl: response.url,
      status: response.status,
      contentType: response.headers.get('content-type'),
      source
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
