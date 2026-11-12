/// <reference types="node" />
import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { RobotsFetchError, RobotsFetchSecurityError } from './errors'
import { isPrivateIp } from './ip'

export { isPrivateIp }

export async function assertPublicHost(url: URL): Promise<void> {
  // IPv6 literals come back from URL bracketed.
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
 *
 * Limitation: the check resolves DNS separately from the connection fetch()
 * makes, so a hostile resolver could still answer differently the second time
 * (DNS rebinding). Closing that needs a custom undici dispatcher with a pinned
 * `lookup`, which requires depending on `undici` directly.
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
