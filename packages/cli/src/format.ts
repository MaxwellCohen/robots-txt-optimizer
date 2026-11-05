import type { ValidationIssue } from '@robots-txt-optimizer/core'
import type { CliIO } from './io'

export const HELP = `robots-txt-optimizer — validate, test, and optimize robots.txt

Usage:
  robots-txt-optimizer check <file|url> [options]
  robots-txt-optimizer optimize <file|url> [--write] [--ai <preset>]
  robots-txt-optimizer compare <before> <after> [--format text|json]
  robots-txt-optimizer crawlers <file|url> [--format text|json]

<file|url> is a local path, "-" for stdin, or a URL/domain (example.com).

check options:
  --fail-on <level>        error (default), warning, or none
  --expect-allowed <a:p>   Fail unless user-agent <a> may crawl path <p>
                           (repeatable), e.g. --expect-allowed "Googlebot:/blog"
  --expect-blocked <a:p>   Fail unless user-agent <a> is blocked from <p> (repeatable)
  --check-sitemaps         Fetch Sitemap: URLs and fail if robots.txt blocks
                           any URL they list
  --format <format>        text (default), json, or github (workflow annotations)
  --path-label <name>      File name to use in github annotations

optimize options:
  --write                  Overwrite the input file instead of printing
  --ai <preset>            Also apply an AI crawler policy:
                           block-ai-training, block-all-ai, allow-all-ai

Exit codes: 0 success, 1 check failed, 2 usage or input error.
`

export function escapeAnnotation(text: string): string {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

export interface CheckFailure {
  message: string
  line?: number
}

export function printCheckText(
  io: CliIO,
  label: string,
  issues: ValidationIssue[],
  failures: CheckFailure[],
  expectationCount: number,
  sitemapUrlsChecked: number | undefined
) {
  io.stdout(`robots.txt check: ${label}\n`)
  for (const issue of issues) {
    io.stdout(`  ${issue.severity === 'error' ? '✖' : '⚠'} ${issue.line ? `line ${issue.line}: ` : ''}${issue.message}\n`)
  }
  const issueMessages = new Set(issues.map(issue => issue.message))
  for (const failure of failures.filter(f => !issueMessages.has(f.message))) {
    io.stdout(`  ✖ ${failure.message}\n`)
  }
  const extras = [
    expectationCount ? `${expectationCount} expectation(s)` : '',
    sitemapUrlsChecked !== undefined ? `${sitemapUrlsChecked} sitemap URL(s)` : ''
  ].filter(Boolean).join(', ')
  io.stdout(failures.length
    ? `\n✖ ${failures.length} problem(s) failed the check\n`
    : `\n✔ Passed${extras ? ` (${extras})` : ''}${issues.length ? ` with ${issues.length} non-blocking issue(s)` : ''}\n`)
}
