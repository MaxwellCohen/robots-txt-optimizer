import { fetchRobotsTxt } from './fetch-robots'
import { createGuardedFetch, SERVER_USER_AGENT } from './guarded-fetch'
import { normalizeRobotsUrl } from './normalize-url'
import type { FetchResult } from '../types'

export { assertPublicHost, createGuardedFetch, isPrivateIp, SERVER_USER_AGENT } from './guarded-fetch'
export { secureFetchSitemaps, type FetchSitemapsOptions } from './sitemap-node'

export async function secureFetchRobotsTxt(input: string): Promise<FetchResult> {
  const url = normalizeRobotsUrl(input)
  return await fetchRobotsTxt(url, {
    fetch: createGuardedFetch(),
    userAgent: SERVER_USER_AGENT,
    source: 'server'
  })
}
