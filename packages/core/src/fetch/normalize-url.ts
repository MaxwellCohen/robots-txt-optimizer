import { RobotsUrlError } from './errors'

export function normalizeRobotsUrl(input: string): URL {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new RobotsUrlError('URL is required', 'MISSING_URL')
  }

  let parsed: URL
  try {
    if (trimmed.includes('://')) {
      parsed = new URL(trimmed)
    } else {
      parsed = new URL(`https://${trimmed}`)
    }
  } catch {
    throw new RobotsUrlError('Invalid URL', 'INVALID_URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new RobotsUrlError('Only http and https URLs are allowed', 'UNSUPPORTED_PROTOCOL')
  }

  if (parsed.pathname === '/' || !parsed.pathname.endsWith('robots.txt')) {
    parsed.pathname = '/robots.txt'
    parsed.search = ''
    parsed.hash = ''
  }

  return parsed
}
