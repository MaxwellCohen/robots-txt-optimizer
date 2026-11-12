import { describe, expect, it } from 'vitest'
import { diagnoseFetch } from './diagnose'
import type { FetchResult } from '../types'

const okResult: FetchResult = {
  text: 'User-agent: *\nDisallow:',
  finalUrl: 'https://example.com/robots.txt',
  status: 200,
  contentType: 'text/plain',
  source: 'server',
  bytes: 24
}

describe('diagnoseFetch', () => {
  it('explains 5xx as a full block', () => {
    const [status] = diagnoseFetch({ ...okResult, status: 503 })
    expect(status).toMatchObject({ severity: 'error' })
    expect(status?.title).toContain('fully blocked')
  })

  it('explains 4xx as no restrictions', () => {
    expect(diagnoseFetch({ ...okResult, status: 404 })[0]?.title).toContain('no restrictions')
  })

  it('flags HTML bodies, oversize files, BOMs, and redirects away from robots.txt', () => {
    const titles = (result: FetchResult) => diagnoseFetch(result, 'https://example.com/robots.txt').map(d => d.title)
    expect(titles({ ...okResult, text: '<!DOCTYPE html><html>', contentType: 'text/html' })).toContain('Response is an HTML page')
    expect(titles({ ...okResult, bytes: 600 * 1024 }).some(t => t.includes('500 KiB'))).toBe(true)
    expect(titles({ ...okResult, hasBom: true })).toContain('Starts with a UTF-8 byte order mark')
    expect(titles({ ...okResult, redirected: true, finalUrl: 'https://example.com/' })).toContain('Redirects away from robots.txt')
  })
})
