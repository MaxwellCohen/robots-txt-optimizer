import type { FetchError, FetchResult } from '#shared/robots/types'

function isCorsOrNetworkError(err: unknown): boolean {
  if (!(err instanceof TypeError)) {
    return false
  }
  const message = err.message.toLowerCase()
  return message.includes('failed to fetch')
    || message.includes('network')
    || message.includes('cors')
}

function normalizeClientUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const parsed = new URL(trimmed)
    if (parsed.pathname === '/' || !parsed.pathname.endsWith('robots.txt')) {
      parsed.pathname = '/robots.txt'
      parsed.search = ''
      parsed.hash = ''
    }
    return parsed.toString()
  }
  return `https://${trimmed}/robots.txt`
}

async function fetchFromClient(url: string): Promise<FetchResult> {
  const response = await fetch(url, {
    headers: { Accept: 'text/plain,*/*' }
  })
  const text = await response.text()
  return {
    text,
    finalUrl: response.url,
    status: response.status,
    source: 'client'
  }
}

async function fetchFromServer(url: string): Promise<FetchResult> {
  return await $fetch<FetchResult>('/api/robots/fetch', {
    query: { url }
  })
}

export function useRobotsFetch() {
  const loading = ref(false)
  const error = ref<FetchError | null>(null)

  async function fetchRobotsTxt(input: string): Promise<FetchResult | null> {
    loading.value = true
    error.value = null

    const url = normalizeClientUrl(input)

    try {
      const result = await fetchFromClient(url)
      return result
    } catch (clientErr) {
      if (!isCorsOrNetworkError(clientErr)) {
        error.value = {
          message: clientErr instanceof Error ? clientErr.message : 'Failed to fetch robots.txt',
          source: 'client'
        }
        return null
      }

      try {
        return await fetchFromServer(input)
      } catch (serverErr) {
        error.value = {
          message: serverErr instanceof Error ? serverErr.message : 'Failed to fetch robots.txt via server proxy',
          source: 'server'
        }
        return null
      }
    } finally {
      loading.value = false
    }
  }

  return {
    loading: readonly(loading),
    error: readonly(error),
    fetchRobotsTxt
  }
}
