import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'

const MAX_BODY_BYTES = 512 * 1024
const FETCH_TIMEOUT_MS = 10_000

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip === '0.0.0.0') {
    return true
  }

  if (isIP(ip) === 6) {
    const normalized = ip.toLowerCase()
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true
    }
    if (normalized.startsWith('fe80')) {
      return true
    }
    return false
  }

  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) {
    return true
  }

  const a = parts[0]!
  const b = parts[1]!
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true

  return false
}

export function normalizeRobotsUrl(input: string): URL {
  const trimmed = input.trim()
  if (!trimmed) {
    throw createError({ statusCode: 400, message: 'URL is required' })
  }

  let parsed: URL
  try {
    parsed = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(`https://${trimmed}`)
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid URL' })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw createError({ statusCode: 400, message: 'Only http and https URLs are allowed' })
  }

  if (parsed.pathname === '/' || !parsed.pathname.endsWith('robots.txt')) {
    parsed.pathname = '/robots.txt'
    parsed.search = ''
    parsed.hash = ''
  }

  return parsed
}

export async function assertPublicHost(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase()

  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
  ) {
    throw createError({ statusCode: 403, message: 'Requests to local hosts are not allowed' })
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw createError({ statusCode: 403, message: 'Requests to private IP addresses are not allowed' })
    }
    return
  }

  const records = await lookup(hostname, { all: true })
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw createError({ statusCode: 403, message: 'Hostname resolves to a private IP address' })
    }
  }
}

export async function fetchRobotsFromUrl(url: URL): Promise<{ text: string, finalUrl: string, status: number }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'Accept': 'text/plain,*/*',
        'User-Agent': 'robots-txt-optimizer/1.0'
      },
      redirect: 'follow'
    })

    const contentLength = Number(response.headers.get('content-length') || 0)
    if (contentLength > MAX_BODY_BYTES) {
      throw createError({ statusCode: 413, message: 'robots.txt response is too large' })
    }

    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_BODY_BYTES) {
      throw createError({ statusCode: 413, message: 'robots.txt response is too large' })
    }

    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer)

    return {
      text,
      finalUrl: response.url,
      status: response.status
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw createError({ statusCode: 504, message: 'Request timed out' })
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
