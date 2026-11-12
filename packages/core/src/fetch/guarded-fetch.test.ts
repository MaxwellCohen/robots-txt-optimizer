import { beforeEach, describe, expect, it, vi } from 'vitest'

import { RobotsFetchError, RobotsFetchSecurityError } from './errors'
import { assertPublicHost, createGuardedFetch, isPrivateIp } from './guarded-fetch'

const lookupMock = vi.hoisted(() => vi.fn())
vi.mock('node:dns/promises', () => ({ lookup: lookupMock }))

describe('isPrivateIp', () => {
  it.each([
    '0.0.0.0', '0.1.2.3', '10.1.2.3', '100.64.0.1', '100.127.255.254', '127.0.0.1', '169.254.169.254',
    '172.16.0.1', '172.31.255.255', '192.168.1.1', '198.18.0.1', '198.19.255.255', '224.0.0.1', '255.255.255.255',
    '::', '::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:10.0.0.1', '::ffff:a9fe:a9fe',
    'fc00::1', 'fd12:3456::1', 'fe80::1', 'febf::1', 'fec0::1', 'ff02::1', '64:ff9b::7f00:1', '2002:7f00:1::1', 'not-an-ip'
  ])('treats %s as private', (ip) => {
    expect(isPrivateIp(ip)).toBe(true)
  })

  it.each([
    '8.8.8.8', '93.184.215.14', '100.63.255.255', '100.128.0.1', '172.15.0.1', '172.32.0.1', '198.17.0.1', '198.20.0.1',
    '2606:4700:4700::1111', '::ffff:8.8.8.8', '::ffff:808:808', 'fe7f::1', '64:ff9b::808:808'
  ])('treats %s as public', (ip) => {
    expect(isPrivateIp(ip)).toBe(false)
  })

  it('accepts bracketed IPv6 literals', () => {
    expect(isPrivateIp('[::1]')).toBe(true)
  })
})

describe('assertPublicHost', () => {
  beforeEach(() => {
    lookupMock.mockReset()
  })

  it('rejects local hostnames without resolving them', async () => {
    for (const host of ['localhost', 'app.localhost', 'printer.local']) {
      await expect(assertPublicHost(new URL(`http://${host}/`))).rejects.toMatchObject({ code: 'LOCAL_HOST' })
    }
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it('rejects private IP literals, including IPv6 in brackets', async () => {
    await expect(assertPublicHost(new URL('http://10.0.0.1/'))).rejects.toMatchObject({ code: 'PRIVATE_IP' })
    await expect(assertPublicHost(new URL('http://[::1]/'))).rejects.toMatchObject({ code: 'PRIVATE_IP' })
    await expect(assertPublicHost(new URL('http://[::ffff:127.0.0.1]/'))).rejects.toMatchObject({ code: 'PRIVATE_IP' })
  })

  it('accepts public IP literals without resolving them', async () => {
    await expect(assertPublicHost(new URL('http://93.184.215.14/'))).resolves.toBeUndefined()
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it('rejects hostnames that resolve to any private address', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.215.14', family: 4 }, { address: '10.0.0.5', family: 4 }])
    await expect(assertPublicHost(new URL('https://example.com/'))).rejects.toMatchObject({ code: 'PRIVATE_DNS' })
  })

  it('accepts hostnames that resolve only to public addresses', async () => {
    lookupMock.mockResolvedValue([{ address: '93.184.215.14', family: 4 }])
    await expect(assertPublicHost(new URL('https://example.com/'))).resolves.toBeUndefined()
  })
})

describe('createGuardedFetch', () => {
  it('refuses redirects to private addresses', async () => {
    const base = (async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/robots.txt' } })) as typeof fetch
    await expect(createGuardedFetch(base)('https://93.184.215.14/robots.txt')).rejects.toBeInstanceOf(RobotsFetchSecurityError)
  })

  it('reports the final URL after redirects', async () => {
    const base = (async (url: string) => url.endsWith('/old')
      ? new Response(null, { status: 301, headers: { location: '/robots.txt' } })
      : new Response('ok')) as typeof fetch
    const response = await createGuardedFetch(base)('https://93.184.215.14/old')
    expect(response.url).toBe('https://93.184.215.14/robots.txt')
    expect(response.redirected).toBe(true)
  })

  it('returns non-redirect responses untouched', async () => {
    const base = (async () => new Response('ok', { status: 200 })) as typeof fetch
    const response = await createGuardedFetch(base)('https://93.184.215.14/robots.txt')
    expect(response.redirected).toBe(false)
    expect(await response.text()).toBe('ok')
  })

  it('always asks the base fetch not to follow redirects', async () => {
    const base = vi.fn(async () => new Response('ok')) as unknown as typeof fetch
    await createGuardedFetch(base)('https://93.184.215.14/robots.txt', { redirect: 'follow' })
    expect(vi.mocked(base).mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
  })

  it('refuses redirects to non-http(s) URLs', async () => {
    const base = (async () => new Response(null, { status: 302, headers: { location: 'ftp://93.184.215.14/robots.txt' } })) as typeof fetch
    await expect(createGuardedFetch(base)('https://93.184.215.14/robots.txt')).rejects.toMatchObject({ code: 'UNSAFE_REDIRECT' })
  })

  it('gives up after too many redirects', async () => {
    const base = (async () => new Response(null, { status: 302, headers: { location: '/loop' } })) as typeof fetch
    const error = await createGuardedFetch(base)('https://93.184.215.14/robots.txt').catch((err: unknown) => err)
    expect(error).toBeInstanceOf(RobotsFetchError)
    expect(error).toMatchObject({ code: 'TOO_MANY_REDIRECTS' })
  })

  it('re-checks the host on every hop', async () => {
    let calls = 0
    const base = (async () => {
      calls++
      return new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } })
    }) as typeof fetch
    await expect(createGuardedFetch(base)('https://93.184.215.14/')).rejects.toMatchObject({ code: 'PRIVATE_IP' })
    expect(calls).toBe(1)
  })
})
