import type { FetchResult } from '../types'

export type FetchDiagnosticSeverity = 'ok' | 'info' | 'warning' | 'error'

export interface FetchDiagnostic {
  severity: FetchDiagnosticSeverity
  title: string
  detail: string
}

/** Google stops processing robots.txt after this many bytes. */
export const GOOGLE_MAX_ROBOTS_BYTES = 500 * 1024

function looksLikeHtml(text: string): boolean {
  const head = text.slice(0, 512).trimStart().toLowerCase()
  return head.startsWith('<!doctype html') || head.startsWith('<html') || head.includes('<head')
}

function formatBytes(bytes: number): string {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${bytes} bytes`
}

function statusDiagnostic(status: number): FetchDiagnostic {
  if (status >= 200 && status < 300) {
    return { severity: 'ok', title: `HTTP ${status}`, detail: 'Crawlers will read and apply this file.' }
  }
  if (status === 429 || status >= 500) {
    return {
      severity: 'error',
      title: `HTTP ${status} — crawlers treat the site as fully blocked`,
      detail: 'Google stops crawling the whole site while robots.txt returns a server error, then falls back to its last cached copy for up to 30 days. Fix the server response.'
    }
  }
  if (status >= 400) {
    return {
      severity: 'warning',
      title: `HTTP ${status} — crawlers assume there are no restrictions`,
      detail: 'A 4xx response means "no robots.txt", so every URL may be crawled. That is fine if intended; otherwise serve the file with HTTP 200.'
    }
  }
  return {
    severity: 'warning',
    title: `HTTP ${status}`,
    detail: 'Unexpected status code for robots.txt. Crawlers expect HTTP 200.'
  }
}

/** Explains how crawlers will treat a fetched robots.txt response. */
export function diagnoseFetch(result: FetchResult, requestedUrl?: string): FetchDiagnostic[] {
  const diagnostics: FetchDiagnostic[] = [statusDiagnostic(result.status)]
  const ok = result.status >= 200 && result.status < 300

  if (result.redirected) {
    let crossHost = false
    let finalPath = ''
    try {
      const final = new URL(result.finalUrl)
      finalPath = final.pathname
      crossHost = requestedUrl ? new URL(requestedUrl).host !== final.host : false
    } catch {
      // Ignore unparsable URLs; the redirect notice below still applies.
    }

    if (finalPath && !finalPath.endsWith('/robots.txt')) {
      diagnostics.push({
        severity: 'error',
        title: 'Redirects away from robots.txt',
        detail: `The request ended at ${result.finalUrl}. Crawlers will try to parse that page as robots.txt, which usually means no rules apply.`
      })
    } else {
      diagnostics.push({
        severity: 'info',
        title: crossHost ? 'Redirects to another host' : 'Redirected',
        detail: `Served from ${result.finalUrl}. Google follows up to 5 redirects; the rules still apply to the original host.`
      })
    }
  }

  if (!ok) {
    return diagnostics
  }

  const type = result.contentType?.split(';')[0]?.trim().toLowerCase() ?? null
  if (looksLikeHtml(result.text)) {
    diagnostics.push({
      severity: 'error',
      title: 'Response is an HTML page',
      detail: 'The server returned HTML (often a soft-404 or SPA fallback) instead of a plain-text robots.txt, so crawlers find no valid rules.'
    })
  } else if (type && type !== 'text/plain') {
    diagnostics.push({
      severity: 'warning',
      title: `Content-Type is ${type}`,
      detail: 'Serve robots.txt as text/plain. Most crawlers still parse it, but some reject other types.'
    })
  }

  const bytes = result.bytes ?? new TextEncoder().encode(result.text).byteLength
  if (bytes > GOOGLE_MAX_ROBOTS_BYTES) {
    diagnostics.push({
      severity: 'error',
      title: `File is ${formatBytes(bytes)} — over Google's 500 KiB limit`,
      detail: 'Google ignores everything after the first 500 KiB. Consolidate rules so the important ones come first.'
    })
  } else if (!result.text.trim()) {
    diagnostics.push({
      severity: 'warning',
      title: 'File is empty',
      detail: 'An empty robots.txt allows crawling of every URL.'
    })
  } else {
    diagnostics.push({ severity: 'ok', title: `Size ${formatBytes(bytes)}`, detail: 'Well under Google\'s 500 KiB limit.' })
  }

  if (result.hasBom) {
    diagnostics.push({
      severity: 'info',
      title: 'Starts with a UTF-8 byte order mark',
      detail: 'Google ignores the BOM, but some crawlers misread the first line. Saving without a BOM is safer.'
    })
  }

  return diagnostics
}
