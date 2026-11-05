/// <reference types="node" />
import { isIP } from 'node:net'

type IPv4 = readonly [number, number, number, number]

function parseIPv4(ip: string): IPv4 | null {
  const parts = ip.split('.')
  if (parts.length !== 4) {
    return null
  }
  const octets = parts.map(part => (/^\d{1,3}$/.test(part) ? Number(part) : Number.NaN))
  if (octets.some(n => !(n >= 0 && n <= 255))) {
    return null
  }
  return octets as unknown as IPv4
}

/** Parses an IPv6 literal (with optional `::`, embedded IPv4 tail and zone id) into eight 16-bit groups. */
function parseIPv6(ip: string): number[] | null {
  let address = ip.split('%')[0]!
  const embedded = address.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (embedded) {
    const v4 = parseIPv4(embedded[2]!)
    if (!v4) {
      return null
    }
    address = `${embedded[1]}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`
  }

  const halves = address.split('::')
  if (halves.length > 2) {
    return null
  }
  const toGroups = (part: string) => (part ? part.split(':') : [])
  const head = toGroups(halves[0]!)
  const tail = halves.length === 2 ? toGroups(halves[1]!) : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) {
    return null
  }

  const groups = [...head, ...Array.from({ length: halves.length === 2 ? missing : 0 }, () => '0'), ...tail]
  const values = groups.map(group => (/^[0-9a-f]{1,4}$/i.test(group) ? Number.parseInt(group, 16) : Number.NaN))
  return values.length === 8 && values.every(n => !Number.isNaN(n)) ? values : null
}

function isPrivateIPv4([a, b, c]: IPv4): boolean {
  return a === 0 // 0.0.0.0/8 "this network"
    || a === 10
    || (a === 100 && b >= 64 && b <= 127) // 100.64.0.0/10 CGNAT
    || a === 127
    || (a === 169 && b === 254) // link-local
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && (c === 0 || c === 2)) // IETF protocol + TEST-NET-1
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19)) // 198.18.0.0/15 benchmarking
    || (a === 198 && b === 51 && c === 100) // TEST-NET-2
    || (a === 203 && b === 0 && c === 113) // TEST-NET-3
    || a >= 224 // multicast, reserved, broadcast
}

function ipv4FromGroups(high: number, low: number): IPv4 {
  return [high >> 8, high & 0xFF, low >> 8, low & 0xFF]
}

function isPrivateIPv6(g: number[]): boolean {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g as [number, number, number, number, number, number, number, number]
  const upperZero = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0

  if (upperZero && g5 === 0) {
    // ::, ::1, and deprecated IPv4-compatible ::a.b.c.d
    return true
  }
  if (upperZero && g5 === 0xFFFF) {
    // IPv4-mapped ::ffff:a.b.c.d
    return isPrivateIPv4(ipv4FromGroups(g6, g7))
  }
  if (g0 === 0x64 && g1 === 0xFF9B && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    // NAT64 64:ff9b::/96
    return isPrivateIPv4(ipv4FromGroups(g6, g7))
  }
  if (g0 === 0x2002) {
    // 6to4 embeds an IPv4 address in the next 32 bits
    return isPrivateIPv4(ipv4FromGroups(g1, g2))
  }
  return (g0 & 0xFE00) === 0xFC00 // fc00::/7 unique local
    || (g0 & 0xFFC0) === 0xFE80 // fe80::/10 link-local
    || (g0 & 0xFFC0) === 0xFEC0 // fec0::/10 deprecated site-local
    || (g0 & 0xFF00) === 0xFF00 // ff00::/8 multicast
    || (g0 === 0x2001 && g1 === 0x0DB8) // documentation
}

/** True for loopback, private, link-local, multicast, reserved and unparseable addresses. */
export function isPrivateIp(ip: string): boolean {
  const address = ip.replace(/^\[|\]$/g, '')
  const family = isIP(address)
  if (family === 4) {
    const parsed = parseIPv4(address)
    return parsed ? isPrivateIPv4(parsed) : true
  }
  if (family === 6) {
    const parsed = parseIPv6(address)
    return parsed ? isPrivateIPv6(parsed) : true
  }
  return true
}
