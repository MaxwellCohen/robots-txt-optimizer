import type { FetchResult } from '../types'

export function isTextResponse(contentType: string | null): boolean {
  if (!contentType) {
    return true
  }
  const type = contentType.split(';')[0]?.trim().toLowerCase() ?? ''
  return type === 'text/plain' || type.startsWith('text/')
}

export function isSuccessfulRobotsFetch(status: number, contentType: string | null): boolean {
  return status >= 200 && status < 300 && isTextResponse(contentType)
}

export function validateFetchResult(result: FetchResult): FetchResult | null {
  if (result.status === 404) {
    return null
  }

  if (!isSuccessfulRobotsFetch(result.status, result.contentType)) {
    return null
  }

  return result
}
