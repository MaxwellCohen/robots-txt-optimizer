import { describe, expect, it } from 'vitest'
import { RobotsUrlError } from './errors'
import { normalizeRobotsUrl } from './normalize-url'
import { isSuccessfulRobotsFetch, isTextResponse, validateFetchResult } from './validate-response'
import type { FetchResult } from '../types'

describe('normalizeRobotsUrl', () => {
  it('appends /robots.txt to bare domains', () => {
    const url = normalizeRobotsUrl('example.com')
    expect(url.toString()).toBe('https://example.com/robots.txt')
  })

  it('normalizes site roots to /robots.txt', () => {
    const url = normalizeRobotsUrl('https://example.com/')
    expect(url.pathname).toBe('/robots.txt')
    expect(url.search).toBe('')
    expect(url.hash).toBe('')
  })

  it('preserves explicit robots.txt paths', () => {
    const url = normalizeRobotsUrl('https://example.com/custom/robots.txt')
    expect(url.pathname).toBe('/custom/robots.txt')
  })

  it('throws for empty input', () => {
    expect(() => normalizeRobotsUrl('')).toThrow(RobotsUrlError)
  })

  it('throws for invalid URLs', () => {
    expect(() => normalizeRobotsUrl('not a url!!!')).toThrow(RobotsUrlError)
  })

  it('throws for unsupported protocols', () => {
    expect(() => normalizeRobotsUrl('ftp://example.com')).toThrow(RobotsUrlError)
  })
})

describe('validateFetchResult', () => {
  const base: FetchResult = {
    text: 'User-agent: *\nDisallow:',
    finalUrl: 'https://example.com/robots.txt',
    status: 200,
    contentType: 'text/plain',
    source: 'client'
  }

  it('returns null for 404', () => {
    expect(validateFetchResult({ ...base, status: 404 })).toBeNull()
  })

  it('returns null for non-2xx responses', () => {
    expect(validateFetchResult({ ...base, status: 500 })).toBeNull()
  })

  it('returns null for non-text content types', () => {
    expect(validateFetchResult({ ...base, contentType: 'application/json' })).toBeNull()
  })

  it('accepts successful text responses', () => {
    expect(validateFetchResult(base)).toEqual(base)
  })
})

describe('isTextResponse', () => {
  it('treats missing content type as text', () => {
    expect(isTextResponse(null)).toBe(true)
  })

  it('accepts text/plain and text/*', () => {
    expect(isTextResponse('text/plain; charset=utf-8')).toBe(true)
    expect(isTextResponse('text/html')).toBe(true)
  })

  it('rejects non-text types', () => {
    expect(isTextResponse('application/json')).toBe(false)
  })
})

describe('isSuccessfulRobotsFetch', () => {
  it('requires 2xx and text content', () => {
    expect(isSuccessfulRobotsFetch(200, 'text/plain')).toBe(true)
    expect(isSuccessfulRobotsFetch(301, 'text/plain')).toBe(false)
    expect(isSuccessfulRobotsFetch(200, 'application/json')).toBe(false)
  })
})
