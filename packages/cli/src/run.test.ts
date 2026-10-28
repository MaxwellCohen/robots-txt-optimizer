import { describe, expect, it } from 'vitest'
import { run, type CliIO } from './run'

function createIO(files: Record<string, string>, responses: Record<string, string> = {}) {
  let stdout = ''
  let stderr = ''
  const written: Record<string, string> = {}
  const io: CliIO = {
    stdout: (text) => { stdout += text },
    stderr: (text) => { stderr += text },
    readFile: async (path) => {
      if (path in files) return files[path]!
      throw Object.assign(new Error('missing'), { code: 'ENOENT' })
    },
    writeFile: async (path, text) => { written[path] = text },
    fetch: (async (url: string) => url in responses
      ? new Response(responses[url])
      : new Response('not found', { status: 404 })) as typeof fetch
  }
  return { io, out: () => stdout, err: () => stderr, written }
}

const robots = `User-agent: *
Disallow: /admin
Disallow: /admin

Sitemap: https://example.com/sitemap.xml
`

describe('check', () => {
  it('passes a valid file and reports non-blocking warnings', async () => {
    const { io, out } = createIO({ 'robots.txt': robots })
    expect(await run(['check', 'robots.txt'], io)).toBe(0)
    expect(out()).toContain('✔ Passed')
  })

  it('fails on warnings with --fail-on warning', async () => {
    const { io } = createIO({ 'robots.txt': 'User-agent: *\nDisallow: /_next/\n' })
    expect(await run(['check', 'robots.txt', '--fail-on', 'warning'], io)).toBe(1)
  })

  it('enforces path expectations', async () => {
    const { io, out } = createIO({ 'robots.txt': robots })
    expect(await run(['check', 'robots.txt', '--expect-allowed', 'Googlebot:/blog', '--expect-blocked', 'Googlebot:/admin/x'], io)).toBe(0)

    const failing = createIO({ 'robots.txt': robots })
    expect(await run(['check', 'robots.txt', '--expect-allowed', 'Googlebot:/admin'], failing.io)).toBe(1)
    expect(failing.out()).toContain('Expected Googlebot to be allowed on /admin, but it is blocked (line 2: /admin)')
    expect(out()).toContain('2 expectation(s)')
  })

  it('emits GitHub annotations', async () => {
    const { io, out } = createIO({ 'public/robots.txt': 'User-agent: *\nDisallow: /\n' })
    await run(['check', 'public/robots.txt', '--format', 'github'], io)
    expect(out()).toMatch(/^::warning file=public\/robots.txt,line=2,title=robots.txt::All crawlers are blocked/m)
  })

  it('fails when sitemap URLs are blocked', async () => {
    const { io, out } = createIO({ 'robots.txt': robots }, {
      'https://example.com/sitemap.xml': '<urlset><url><loc>https://example.com/admin/page</loc></url><url><loc>https://example.com/</loc></url></urlset>'
    })
    expect(await run(['check', 'robots.txt', '--check-sitemaps'], io)).toBe(1)
    expect(out()).toContain('Sitemap URL https://example.com/admin/page is blocked for Googlebot')
  })

  it('fetches URLs and outputs JSON', async () => {
    const { io, out } = createIO({}, { 'https://example.com/robots.txt': robots })
    expect(await run(['check', 'example.com', '--format', 'json'], io)).toBe(0)
    expect(JSON.parse(out())).toMatchObject({ ok: true, source: 'https://example.com/robots.txt' })
  })

  it('fails when the server returns a 5xx', async () => {
    const { io } = createIO({})
    io.fetch = (async () => new Response('down', { status: 503 })) as typeof fetch
    expect(await run(['check', 'example.com'], io)).toBe(1)
  })

  it('returns 2 for usage errors', async () => {
    const { io, err } = createIO({})
    expect(await run(['check', 'missing.txt'], io)).toBe(2)
    expect(err()).toContain('File not found')
    expect(await run(['frobnicate'], io)).toBe(2)
  })
})

describe('optimize', () => {
  it('writes the optimized file with an AI policy', async () => {
    const { io, written } = createIO({ 'robots.txt': robots })
    expect(await run(['optimize', 'robots.txt', '--write', '--ai', 'block-ai-training'], io)).toBe(0)
    expect(written['robots.txt']).toMatch(/^User-agent: \*\nDisallow: \/admin\n\n# AI crawler policy/)
    expect(written['robots.txt']).toContain('User-agent: GPTBot')
    expect(written['robots.txt']!.trimEnd().endsWith('Sitemap: https://example.com/sitemap.xml')).toBe(true)
  })
})

describe('compare', () => {
  it('lists verdict changes', async () => {
    const { io, out } = createIO({ 'a.txt': 'User-agent: *\nDisallow: /a', 'b.txt': 'User-agent: *\nDisallow: /b' })
    expect(await run(['compare', 'a.txt', 'b.txt'], io)).toBe(0)
    expect(out()).toContain('- Disallow: /a')
    expect(out()).toContain('Googlebot /b: allowed → blocked')
  })
})
