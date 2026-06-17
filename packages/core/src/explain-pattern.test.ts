import { describe, expect, it } from 'vitest'
import { explainOtherDirective, explainPattern } from './explain-pattern'

describe('explainPattern', () => {
  it('explains empty disallow as allow-all', () => {
    expect(explainPattern('', 'disallow')).toContain('Allows all URLs')
  })

  it('explains root-only pattern', () => {
    expect(explainPattern('/$', 'disallow')).toContain('homepage')
  })

  it('explains exact path anchor', () => {
    expect(explainPattern('/about$', 'allow')).toContain('exact path')
    expect(explainPattern('/about$', 'allow')).toContain('/about')
  })

  it('explains wildcard directory patterns', () => {
    expect(explainPattern('/_og/d/*', 'disallow')).toContain('/_og/d/')
  })

  it('explains prefix patterns', () => {
    expect(explainPattern('/blog', 'disallow')).toContain('starting with')
  })

  it('explains block-all slash with allow context', () => {
    expect(explainPattern('/', 'disallow')).toContain('Blocks all URLs on the site for this user-agent')
    expect(explainPattern('/', 'disallow', { allowPatterns: ['/about$'] }))
      .toContain('more specific Allow rule')
  })
})

describe('explainOtherDirective', () => {
  it('explains crawl-delay', () => {
    expect(explainOtherDirective('Crawl-delay', '10')).toContain('10 second')
  })
})
