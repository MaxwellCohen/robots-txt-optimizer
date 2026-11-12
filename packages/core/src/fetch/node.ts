import { BlockList, isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { RobotsFetchError, RobotsFetchSecurityError } from './errors'
import { fetchRobotsTxt } from './fetch-robots'
import { normalizeRobotsUrl } from './normalize-url'
import type { FetchResult } from '../types'

const BLOCKED = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 3] // multicast + reserved
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv4')
}
for (const [network, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b::', 96], // NAT64
  ['2002::', 16], // 6to4
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8] // multicast
] as const) {
  BLOCKED.addSubnet(network, prefix, 'ipv6')
}

const IPV4_MAPPED = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i

export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip)
  if (family === 4) {
    return BLOCKED.check(ip, 'ipv4')
  }
  if (family !== 6) {
    return true
  }
  // IPv4-mapped IPv6 (::ffff:a.b.c.d or ::ffff:hhhh:hhhh) is judged as IPv4.
  const dotted = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (dotted) {
    return BLOCKED.check(dotted[1]!, 'ipv4')
  }
  const hex = ip.match(IPV4_MAPPED)
  if (hex) {
    const high = Number.parseInt(hex[1]!, 16)
    const low = Number.parseInt(hex[2]!, 16)
    return BLOCKED.check(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`, 'ipv4')
  }
  return BLOCKED.check(ip, 'ipv6')
}

export async function assertPublicHost(url: URL): Promise<void> {
  // URL.hostname keeps the brackets around IPv6 literals.
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')

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
