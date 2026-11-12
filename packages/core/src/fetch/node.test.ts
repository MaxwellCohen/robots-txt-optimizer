import { describe, expect, it } from 'vitest'
import { assertPublicHost, isPrivateIp } from './node'

describe('isPrivateIp', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '100.64.0.1', '169.254.169.254', '224.0.0.1',
    '::1', '::', 'fd00::1', 'fe90::1', 'febf::1', '64:ff9b::a9fe:a9fe',
    '::ffff:169.254.169.254', '::ffff:a9fe:a9fe', '::ffff:7f00:1', 'not-an-ip'
  ])('blocks %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(true)
  })

  it.each([
    '8.8.8.8', '1.1.1.1', '172.32.0.1', '100.128.0.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'
  ])('allows %s', (ip) => {
    expect(isPrivateIp(ip)).toBe(false)
  })
})

describe('assertPublicHost', () => {
  it('rejects bracketed IPv6 literals for private addresses', async () => {
    await expect(assertPublicHost(new URL('http://[::1]/'))).rejects.toThrow('private IP')
    await expect(assertPublicHost(new URL('http://[::ffff:127.0.0.1]/'))).rejects.toThrow('private IP')
  })
})
