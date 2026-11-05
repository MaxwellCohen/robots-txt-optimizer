import { describe, expect, it } from 'vitest'
import { RobotsFetchError } from './errors'
import { fetchRobotsTxt } from './fetch-robots'

const url = new URL('https://example.com/robots.txt')

function streamOf(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0
  return new ReadableStream({
    pull(controller) {
      const chunk = chunks[index++]
      if (chunk) {
        controller.enqueue(chunk)
      } else {
        controller.close()
      }
    }
  })
}

describe('fetchRobotsTxt', () => {
  it('returns text, status and metadata', async () => {
    const body = new Uint8Array([0xEF, 0xBB, 0xBF, ...new TextEncoder().encode('User-agent: *')])
    const fetchImpl = (async () => new Response(body, { headers: { 'content-type': 'text/plain' } })) as typeof fetch
    const result = await fetchRobotsTxt(url, { fetch: fetchImpl, source: 'server' })
    expect(result).toMatchObject({ text: 'User-agent: *', status: 200, contentType: 'text/plain', source: 'server', bytes: 16, hasBom: true })
  })

  it('rejects when content-length exceeds the cap', async () => {
    const fetchImpl = (async () => new Response('x', { headers: { 'content-length': '5000' } })) as typeof fetch
    await expect(fetchRobotsTxt(url, { fetch: fetchImpl, maxBytes: 1000 })).rejects.toMatchObject({ code: 'TOO_LARGE' })
  })

  it('stops reading a stream without content-length once the cap is exceeded', async () => {
    const chunk = new Uint8Array(1000)
    let pulled = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++
        controller.enqueue(chunk)
      }
    })
    const fetchImpl = (async () => new Response(body)) as typeof fetch
    const error = await fetchRobotsTxt(url, { fetch: fetchImpl, maxBytes: 2500 }).catch((err: unknown) => err)
    expect(error).toBeInstanceOf(RobotsFetchError)
    expect(error).toMatchObject({ code: 'TOO_LARGE' })
    expect(pulled).toBeLessThan(10)
  })

  it('accepts bodies exactly at the cap', async () => {
    const fetchImpl = (async () => new Response(streamOf([new Uint8Array(500).fill(97), new Uint8Array(500).fill(98)]))) as typeof fetch
    const result = await fetchRobotsTxt(url, { fetch: fetchImpl, maxBytes: 1000 })
    expect(result.bytes).toBe(1000)
  })

  it('maps its own timeout abort to TIMEOUT', async () => {
    const fetchImpl = ((_url: string, init?: RequestInit) => new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    })) as typeof fetch
    await expect(fetchRobotsTxt(url, { fetch: fetchImpl, timeoutMs: 10 })).rejects.toMatchObject({ code: 'TIMEOUT' })
  })

  it('maps TimeoutError to TIMEOUT', async () => {
    const fetchImpl = (async () => {
      throw new DOMException('timed out', 'TimeoutError')
    }) as typeof fetch
    await expect(fetchRobotsTxt(url, { fetch: fetchImpl })).rejects.toMatchObject({ code: 'TIMEOUT' })
  })

  it('times out while the body is still streaming', async () => {
    const body = new ReadableStream<Uint8Array>({ pull: () => new Promise(() => {}) })
    const fetchImpl = (async () => new Response(body)) as typeof fetch
    const error = await Promise.race([
      fetchRobotsTxt(url, { fetch: fetchImpl, timeoutMs: 20 }).catch((err: unknown) => err),
      new Promise(resolve => setTimeout(() => resolve('hung'), 1000))
    ])
    expect(error).toMatchObject({ code: 'TIMEOUT' })
  })

  it('rethrows unrelated errors', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('network down')
    }) as typeof fetch
    await expect(fetchRobotsTxt(url, { fetch: fetchImpl })).rejects.toThrow('network down')
  })
})
