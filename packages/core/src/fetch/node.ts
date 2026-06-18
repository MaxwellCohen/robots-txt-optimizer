import { isIP } from 'node:net'
import { lookup } from 'node:dns/promises'
import { RobotsFetchSecurityError } from './errors'
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

export interface SecureFetchRobotsTxtOptions {
  userAgent?: string
}

export async function secureFetchRobotsTxt(
  input: string,
  options: SecureFetchRobotsTxtOptions = {}
): Promise<FetchResult> {
  const url = normalizeRobotsUrl(input)
  await assertPublicHost(url)
  return await fetchRobotsTxt(url, {
    userAgent: options.userAgent ?? 'robots-txt-optimizer/1.0',
    source: 'server'
  })
}
