import { describe, expect, it } from 'vitest'
import { parseRobotsTxt } from './parse'
import {
  collectUserAgentOptions,
  decodeSimulationConfig,
  defaultSimulationConfig,
  encodeSimulationConfig,
  isDefaultSimulationConfig,
  normalizeSimulationPath
} from './simulation-config'

describe('simulation-config', () => {
  it('normalizes paths to start with /', () => {
    expect(normalizeSimulationPath('admin')).toBe('/admin')
    expect(normalizeSimulationPath('/api/')).toBe('/api/')
    expect(normalizeSimulationPath('  ')).toBe('')
  })

  it('round-trips config through JSON', () => {
    const config = {
      userAgents: ['Googlebot', 'Bingbot'],
      paths: ['/admin', 'search']
    }

    const decoded = decodeSimulationConfig(encodeSimulationConfig(config))
    expect(decoded).toEqual({
      userAgents: ['Googlebot', 'Bingbot'],
      paths: ['/admin', '/search']
    })
  })

  it('rejects invalid config payloads', () => {
    expect(decodeSimulationConfig('{}')).toBeNull()
    expect(decodeSimulationConfig('{"userAgents":[],"paths":["/"]}')).toBeNull()
  })

  it('detects the default simulation config', () => {
    expect(isDefaultSimulationConfig(defaultSimulationConfig())).toBe(true)
    expect(isDefaultSimulationConfig({
      userAgents: ['Googlebot'],
      paths: ['/']
    })).toBe(false)
  })

  it('collects user agents from the document and defaults', () => {
    const doc = parseRobotsTxt(`User-agent: Googlebot
Disallow: /admin

User-agent: CustomBot
Allow: /`)

    expect(collectUserAgentOptions(doc)).toEqual([
      'Bingbot',
      'CustomBot',
      'Googlebot',
      'GPTBot',
      '*'
    ])
  })

  it('includes extra user agents not present in the document', () => {
    const doc = parseRobotsTxt(`User-agent: *
Disallow:`)

    expect(collectUserAgentOptions(doc, ['PerplexityBot', ' PerplexityBot '])).toEqual([
      'Bingbot',
      'Googlebot',
      'GPTBot',
      'PerplexityBot',
      '*'
    ])
  })
})
