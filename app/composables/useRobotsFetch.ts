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

function isTextResponse(contentType: string | null): boolean {
  if (!contentType) {
    return true
  }
  const type = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return type === 'text/plain' || type.startsWith('text/')
}

function isSuccessfulRobotsFetch(status: number, contentType: string | null): boolean {
  return status >= 200 && status < 300 && isTextResponse(contentType)
}

async function fetchFromClient(url: string): Promise<FetchResult> {
  const response = await fetch(url, {
    headers: { Accept: 'text/plain,*/*' }
  })
  const contentType = response.headers.get('content-type')
  const text = await response.text()
  return {
    text,
    finalUrl: response.url,
    status: response.status,
    contentType,
    source: 'client'
  }
}

function validateFetchResult(result: FetchResult): FetchResult | null {
  if (result.status === 404) {
    return null
  }

  if (!isSuccessfulRobotsFetch(result.status, result.contentType)) {
    return null
  }

  return result
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
      const validated = validateFetchResult(result)
      if (!validated && result.status !== 404) {
        error.value = {
          message: `Failed to fetch robots.txt (HTTP ${result.status})`,
          source: 'client'
        }
      }
      return validated
    } catch (clientErr) {
      if (!isCorsOrNetworkError(clientErr)) {
        error.value = {
          message: clientErr instanceof Error ? clientErr.message : 'Failed to fetch robots.txt',
          source: 'client'
        }
        return null
      }

      try {
        const result = await fetchFromServer(input)
        const validated = validateFetchResult(result)
        if (!validated && result.status !== 404) {
          error.value = {
            message: `Failed to fetch robots.txt (HTTP ${result.status})`,
            source: 'server'
          }
        }
        return validated
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
