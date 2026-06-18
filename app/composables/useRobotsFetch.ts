import {
  fetchRobotsTxt,
  normalizeRobotsUrl,
  validateFetchResult
} from '@robots-txt-optimizer/core/fetch'
import type { FetchError, FetchResult } from '@robots-txt-optimizer/core'

export interface RobotsFetchOptions {
  /** Try browser fetch first; fall back to /api/robots/fetch on CORS/network errors. Default: true */
  tryClientFirst?: boolean
}

function isCorsOrNetworkError(err: unknown): boolean {
  if (!(err instanceof TypeError)) {
    return false
  }
  const message = err.message.toLowerCase()
  return message.includes('failed to fetch')
    || message.includes('network')
    || message.includes('cors')
}

async function fetchFromServer(input: string): Promise<FetchResult> {
  return await $fetch<FetchResult>('/api/robots/fetch', {
    query: { url: input }
  })
}

export function useRobotsFetch() {
  const config = useRuntimeConfig()
  const loading = ref(false)
  const error = ref<FetchError | null>(null)

  async function fetchRobotsTxtFromInput(
    input: string,
    options: RobotsFetchOptions = {}
  ): Promise<FetchResult | null> {
    loading.value = true
    error.value = null

    const url = normalizeRobotsUrl(input)
    const tryClientFirst = options.tryClientFirst
      ?? config.public.robotsFetchClientFirst !== false

    async function finish(
      result: FetchResult,
      source: FetchResult['source']
    ): Promise<FetchResult | null> {
      const validated = validateFetchResult(result)
      if (!validated && result.status !== 404) {
        error.value = {
          message: `Failed to fetch robots.txt (HTTP ${result.status})`,
          url: url.toString(),
          source
        }
      }
      return validated
    }

    try {
      if (tryClientFirst) {
        try {
          const result = await fetchRobotsTxt(url, { source: 'client' })
          return await finish(result, 'client')
        } catch (clientErr) {
          if (!isCorsOrNetworkError(clientErr)) {
            error.value = {
              message: clientErr instanceof Error ? clientErr.message : 'Failed to fetch robots.txt',
              url: url.toString(),
              source: 'client'
            }
            return null
          }
        }
      }

      const result = await fetchFromServer(input)
      return await finish(result, 'server')
    } catch (serverErr) {
      error.value = {
        message: serverErr instanceof Error ? serverErr.message : 'Failed to fetch robots.txt via server proxy',
        url: url.toString(),
        source: 'server'
      }
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    fetchRobotsTxt: fetchRobotsTxtFromInput
  }
}
