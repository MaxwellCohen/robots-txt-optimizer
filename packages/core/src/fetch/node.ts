import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { RobotsFetchError, RobotsFetchSecurityError } from './errors'
import { fetchRobotsTxt } from './fetch-robots'
import { normalizeRobotsUrl } from './normalize-url'
import type { FetchResult } from '../types'

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

export async function assertPublicHost(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase()

  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
  ) {
    throw new RobotsFetchSecurityError(
      'Requests to local hosts are not allowed',
      'LOCAL_HOST'
    )
  }

  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new RobotsFetchSecurityError(
        'Requests to private IP addresses are not allowed',
        'PRIVATE_IP'
      )
    }
    return
  }

  const records = await lookup(hostname, { all: true })
  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new RobotsFetchSecurityError(
        'Hostname resolves to a private IP address',
        'PRIVATE_DNS'
      )
    }
  }
}

const MAX_REDIRECTS = 5

/**
 * fetch() that follows redirects manually, re-checking every hop so a public
 * host cannot redirect the server to a private address.
 */
export function createGuardedFetch(baseFetch: typeof globalThis.fetch = globalThis.fetch): typeof globalThis.fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    let url = new URL(input instanceof Request ? input.url : input.toString())
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await assertPublicHost(url)
      const response = await baseFetch(url.toString(), { ...init, redirect: 'manual' })
      const location = response.headers.get('location')
      if (response.status < 300 || response.status >= 400 || !location) {
        if (hop === 0) {
          return response
        }
        // Response.url/redirected are read-only; expose the final hop explicitly.
        Object.defineProperty(response, 'url', { value: url.toString() })
        Object.defineProperty(response, 'redirected', { value: true })
        return response
      }
      await response.body?.cancel()
      url = new URL(location, url)
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new RobotsFetchSecurityError('Redirect to a non-http(s) URL is not allowed', 'UNSAFE_REDIRECT')
      }
    }
    throw new RobotsFetchError(`More than ${MAX_REDIRECTS} redirects`, 'TOO_MANY_REDIRECTS')
  }) as typeof globalThis.fetch
}

export const SERVER_USER_AGENT = 'robots-txt-optimizer/1.0'

export async function secureFetchRobotsTxt(input: string): Promise<FetchResult> {
  const url = normalizeRobotsUrl(input)
  return await fetchRobotsTxt(url, {
    fetch: createGuardedFetch(),
    userAgent: SERVER_USER_AGENT,
    source: 'server'
  })
}
export { secureFetchSitemaps, type FetchSitemapsOptions } from './sitemap-node'
