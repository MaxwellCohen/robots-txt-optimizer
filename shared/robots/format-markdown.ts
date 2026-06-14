import type { DirectiveSummaryRow } from './types'
import { explainOtherDirective, explainPattern } from './explain-pattern'

function mdCode(value: string): string {
  return `\`${value.replace(/`/g, '\\`')}\``
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, '<br>')
}

function formatPatternList(
  patterns: string[],
  effect: 'allow' | 'disallow',
  allowPatterns: string[] = []
): string {
  if (patterns.length === 0) {
    return '—'
  }

  return patterns
    .map(pattern => `${mdCode(pattern)} — ${explainPattern(
      pattern,
      effect,
      effect === 'disallow' ? { allowPatterns } : undefined
    )}`)
    .join('<br>')
}

function formatOtherList(items: DirectiveSummaryRow['other']): string {
  if (items.length === 0) {
    return '—'
  }

  return items
    .map(item => `${mdCode(`${item.name}: ${item.value}`)} — ${explainOtherDirective(item.name, item.value)}`)
    .join('<br>')
}

function formatUserAgents(agents: string[]): string {
  if (agents.length === 0) {
    return '—'
  }

  return agents.map(agent => mdCode(agent)).join(', ')
}

export function formatDirectiveSummaryMarkdown(rows: DirectiveSummaryRow[]): string {
  if (rows.length === 0) {
    return '## Directive summary\n\n_No user-agent groups found._'
  }

  const lines = [
    '## Directive summary',
    '',
    '| User-agent | Allow | Disallow | Other |',
    '| --- | --- | --- | --- |'
  ]

  for (const row of rows) {
    lines.push([
      '|',
      escapeTableCell(formatUserAgents(row.userAgents)),
      escapeTableCell(formatPatternList(row.allow, 'allow')),
      escapeTableCell(formatPatternList(row.disallow, 'disallow', row.allow)),
      escapeTableCell(formatOtherList(row.other)),
      '|'
    ].join(' '))
  }

  return lines.join('\n')
}
