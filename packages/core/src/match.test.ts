import { describe, expect, it } from 'vitest'
import { checkRobotsPath } from './match'

function allowed(robots: string, path: string, agent = 'Googlebot'): boolean {
  return checkRobotsPath(robots, agent, path).allowed
}

describe('checkRobotsPath (RFC 9309 matching)', () => {
  it('supports * wildcards inside a path segment', () => {
    const robots = 'User-agent: *\nDisallow: /a*b'
    expect(allowed(robots, '/axxb')).toBe(false)
    expect(allowed(robots, '/axx/yyb')).toBe(false)
    expect(allowed(robots, '/axx')).toBe(true)
  })

  it('anchors patterns ending in $ to the end of the path', () => {
    const robots = 'User-agent: *\nDisallow: /*.js$'
    expect(allowed(robots, '/app.js')).toBe(false)
    expect(allowed(robots, '/app.js?v=1')).toBe(true)
    expect(allowed(robots, '/app.json')).toBe(true)
  })

  it('treats regex metacharacters literally', () => {
    const robots = 'User-agent: *\nDisallow: /search?q=a+b'
    expect(allowed(robots, '/search?q=a+b')).toBe(false)
    expect(allowed(robots, '/search?q=aab')).toBe(true)
  })

  it('picks the longest matching pattern', () => {
    const robots = 'User-agent: *\nDisallow: /\nAllow: /p'
    expect(allowed(robots, '/page')).toBe(true)
    expect(allowed(robots, '/other')).toBe(false)

    const deeper = 'User-agent: *\nAllow: /books/content?*zoom=1\nDisallow: /books/'
    expect(allowed(deeper, '/books/content?id=1&zoom=1')).toBe(true)
  })

  it('prefers allow when allow and disallow are equally specific', () => {
    const robots = 'User-agent: *\nDisallow: /x\nAllow: /x'
    expect(allowed(robots, '/x')).toBe(true)
  })

  it('treats an empty Disallow as matching nothing', () => {
    const robots = 'User-agent: *\nDisallow:'
    expect(allowed(robots, '/anything')).toBe(true)
  })
})

describe('checkRobotsPath group handling', () => {
  it('applies shared rules to every user-agent in a group', () => {
    const robots = 'User-agent: GPTBot\nUser-agent: ClaudeBot\nDisallow: /'
    expect(allowed(robots, '/', 'GPTBot')).toBe(false)
    expect(allowed(robots, '/', 'ClaudeBot')).toBe(false)
    expect(allowed(robots, '/', 'Googlebot')).toBe(true)
  })

  it('combines rules from separate groups for the same user-agent', () => {
    const robots = 'User-agent: Googlebot\nDisallow: /a\n\nUser-agent: Googlebot\nDisallow: /b'
    expect(allowed(robots, '/a')).toBe(false)
    expect(allowed(robots, '/b')).toBe(false)
  })

  it('reports the line of the winning rule', () => {
    const result = checkRobotsPath('User-agent: *\nDisallow: /\nAllow: /blog', 'Googlebot', '/blog/x')
    expect(result).toMatchObject({ allowed: true, matchedPattern: '/blog', matchingLine: 3 })
  })

  it('keeps percent-encoded wildcards, anchors and slashes literal', () => {
    const robots = 'User-agent: *\nDisallow: /a%2Ab\nDisallow: /c%24\nDisallow: /d%2fe'
    expect(allowed(robots, '/aXb')).toBe(true)
    expect(allowed(robots, '/a%2ab')).toBe(false)
    expect(allowed(robots, '/c%24/more')).toBe(false)
    expect(allowed(robots, '/d/e')).toBe(true)
    expect(allowed(robots, '/d%2Fe')).toBe(false)
  })

  it('matches non-ASCII and unreserved characters against their percent-encoded form', () => {
    expect(allowed('User-agent: *\nDisallow: /caf%c3%a9', '/café')).toBe(false)
    expect(allowed('User-agent: *\nDisallow: /café', '/caf%C3%A9')).toBe(false)
    expect(allowed('User-agent: *\nDisallow: /%7Euser', '/~user')).toBe(false)
  })

  it('does not rewrite literal u+XXXXXX sequences', () => {
    expect(allowed('User-agent: *\nDisallow: /u+414243', '/ABC')).toBe(true)
    expect(allowed('User-agent: *\nDisallow: /u+414243', '/u+414243')).toBe(false)
  })
})
