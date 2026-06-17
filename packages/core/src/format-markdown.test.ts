import { describe, expect, it } from 'vitest'
import { formatDirectiveSummaryMarkdown } from './format-markdown'
import type { DirectiveSummaryRow } from './types'

describe('formatDirectiveSummaryMarkdown', () => {
  it('formats an empty summary', () => {
    expect(formatDirectiveSummaryMarkdown([])).toContain('No user-agent groups found')
  })

  it('formats rows as a GitHub-friendly markdown table', () => {
    const rows: DirectiveSummaryRow[] = [{
      groupIndex: 0,
      userAgents: ['*'],
      allow: [],
      disallow: ['/$', '/about$'],
      other: [],
      startLine: 1
    }]

    const markdown = formatDirectiveSummaryMarkdown(rows)

    expect(markdown).toContain('## Directive summary')
    expect(markdown).toContain('| User-agent | Allow | Disallow | Other |')
    expect(markdown).toContain('`/$`')
    expect(markdown).toContain('homepage')
    expect(markdown).toContain('`/about$`')
    expect(markdown).toContain('<br>')
  })
})
