import { readFile, writeFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import {
  analyzeRobotsTxt,
  applyCrawlerPolicy,
  checkRobotsPath,
  compareRobotsTxt,
  CRAWLER_CATEGORY_LABELS,
  crawlerPolicyFromPreset,
  findBlockedSitemapUrls,
  parseRobotsTxt,
  type CrawlerPolicyPreset,
  type ValidationIssue
} from '@robots-txt-optimizer/core'
import { diagnoseFetch, fetchRobotsTxt, normalizeRobotsUrl } from '@robots-txt-optimizer/core/fetch'
import { secureFetchSitemaps } from '@robots-txt-optimizer/core/node'

export interface CliIO {
  stdout: (text: string) => void
  stderr: (text: string) => void
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, text: string) => Promise<void>
  fetch: typeof globalThis.fetch
}

export const defaultIO: CliIO = {
  stdout: text => process.stdout.write(text),
  stderr: text => process.stderr.write(text),
  readFile: path => readFile(path, 'utf8'),
  writeFile: (path, text) => writeFile(path, text, 'utf8'),
  fetch: globalThis.fetch
}

const HELP = `robots-txt-optimizer — validate, test, and optimize robots.txt

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

const AI_PRESETS = ['block-ai-training', 'block-all-ai', 'allow-all-ai'] as const

class UsageError extends Error {}

interface LoadedInput {
  text: string
  label: string
  /** Local file path, if the input was a file. */
  file?: string
  fetchStatus?: number
}

function looksLikeUrl(input: string): boolean {
  if (/^https?:\/\//i.test(input)) {
    return true
  }
  // Bare domains (example.com), but not file names such as robots.txt.
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(input) && !/\.txt$/i.test(input)
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

async function loadInput(input: string, io: CliIO): Promise<LoadedInput> {
  if (input === '-') {
    return { text: await readStdin(), label: 'stdin' }
  }

  try {
    return { text: await io.readFile(input), label: input, file: input }
  } catch (err) {
    const missing = (err as NodeJS.ErrnoException).code === 'ENOENT'
    if (!missing || !looksLikeUrl(input)) {
      throw new UsageError(missing ? `File not found: ${input}` : `Cannot read ${input}: ${(err as Error).message}`)
    }
  }

  const url = normalizeRobotsUrl(input)
  const result = await fetchRobotsTxt(url, { fetch: io.fetch, userAgent: 'robots-txt-optimizer-cli/1.0', source: 'server' })
  return { text: result.status >= 200 && result.status < 300 ? result.text : '', label: result.finalUrl, fetchStatus: result.status }
}

function parseExpectation(value: string): { agent: string, path: string } {
  const index = value.indexOf(':')
  if (index <= 0 || index === value.length - 1) {
    throw new UsageError(`Expected "<user-agent>:<path>", got "${value}"`)
  }
  const path = value.slice(index + 1).trim()
  return { agent: value.slice(0, index).trim(), path: path.startsWith('/') ? path : `/${path}` }
}

function escapeAnnotation(text: string): string {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

interface CheckFailure {
  message: string
  line?: number
}

async function runCheck(input: LoadedInput, values: Record<string, unknown>, io: CliIO): Promise<number> {
  const failOn = (values['fail-on'] as string | undefined) ?? 'error'
  if (!['error', 'warning', 'none'].includes(failOn)) {
    throw new UsageError(`--fail-on must be error, warning, or none (got "${failOn}")`)
  }
  const format = (values.format as string | undefined) ?? 'text'
  if (!['text', 'json', 'github'].includes(format)) {
    throw new UsageError(`--format must be text, json, or github (got "${format}")`)
  }

  const analysis = analyzeRobotsTxt(input.text)
  const doc = analysis.document
  const issues = analysis.validation.issues
  const failures: CheckFailure[] = []

  const diagnostics = input.fetchStatus !== undefined
    ? diagnoseFetch({ text: input.text, status: input.fetchStatus, finalUrl: input.label, contentType: null, source: 'server' })
        .filter(d => d.severity === 'error' || d.severity === 'warning')
    : []
  for (const diagnostic of diagnostics) {
    if (diagnostic.severity === 'error') {
      failures.push({ message: `${diagnostic.title}: ${diagnostic.detail}` })
    }
  }

  const failingIssues = issues.filter(issue =>
    failOn === 'warning' || (failOn === 'error' && issue.severity === 'error')
  )
  failures.push(...failingIssues.map(issue => ({ message: issue.message, line: issue.line })))

  const expectations = [
    ...((values['expect-allowed'] as string[] | undefined) ?? []).map(v => ({ ...parseExpectation(v), allowed: true })),
    ...((values['expect-blocked'] as string[] | undefined) ?? []).map(v => ({ ...parseExpectation(v), allowed: false }))
  ]
  const expectationResults = expectations.map((expectation) => {
    const result = checkRobotsPath(doc.raw, expectation.agent, expectation.path, doc)
    return { ...expectation, actual: result.allowed, line: result.matchingLine, rule: result.matchedPattern }
  })
  for (const result of expectationResults) {
    if (result.actual !== result.allowed) {
      failures.push({
        message: `Expected ${result.agent} to be ${result.allowed ? 'allowed' : 'blocked'} on ${result.path}, but it is ${result.actual ? 'allowed' : 'blocked'}${result.line ? ` (line ${result.line}: ${result.rule})` : ''}`,
        line: result.line || undefined
      })
    }
  }

  let sitemapSummary: { checked: number, blocked: ReturnType<typeof findBlockedSitemapUrls>, errors: string[] } | null = null
  if (values['check-sitemaps']) {
    const urls = doc.sitemaps.map(sitemap => sitemap.url).filter(url => /^https?:\/\//i.test(url))
    if (urls.length === 0) {
      failures.push({ message: '--check-sitemaps: no absolute Sitemap: URLs found' })
    } else {
      const report = await secureFetchSitemaps(urls, { fetch: io.fetch, allowPrivateHosts: true })
      const blocked = findBlockedSitemapUrls(doc, report.urls)
      const errors = report.sitemaps.filter(s => s.error).map(s => `${s.url}: ${s.error}`)
      sitemapSummary = { checked: report.urls.length, blocked, errors }
      for (const conflict of blocked) {
        failures.push({ message: `Sitemap URL ${conflict.url} is blocked for ${conflict.userAgent} by line ${conflict.line} (${conflict.matchedRule})`, line: conflict.line })
      }
      for (const error of errors) {
        failures.push({ message: `Sitemap could not be read — ${error}` })
      }
    }
  }

  const ok = failures.length === 0

  if (format === 'json') {
    io.stdout(`${JSON.stringify({
      ok,
      source: input.label,
      issues,
      diagnostics,
      expectations: expectationResults,
      sitemaps: sitemapSummary,
      failures
    }, null, 2)}\n`)
    return ok ? 0 : 1
  }

  if (format === 'github') {
    const file = (values['path-label'] as string | undefined) ?? input.file ?? 'robots.txt'
    const annotate = (level: 'error' | 'warning' | 'notice', message: string, line?: number) =>
      io.stdout(`::${level} file=${file}${line ? `,line=${line}` : ''},title=robots.txt::${escapeAnnotation(message)}\n`)
    const failingSet = new Set(failingIssues)
    for (const issue of issues) {
      annotate(failingSet.has(issue) ? 'error' : issue.severity === 'error' ? 'error' : 'warning', issue.message, issue.line)
    }
    for (const failure of failures.filter(f => !issues.some(issue => issue.message === f.message))) {
      annotate('error', failure.message, failure.line)
    }
  }

  printCheckText(io, input.label, issues, failures, expectationResults.length, sitemapSummary?.checked)
  return ok ? 0 : 1
}

function printCheckText(
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

async function runOptimize(input: LoadedInput, values: Record<string, unknown>, io: CliIO): Promise<number> {
  const preset = values.ai as string | undefined
  if (preset && !AI_PRESETS.includes(preset as CrawlerPolicyPreset)) {
    throw new UsageError(`--ai must be one of ${AI_PRESETS.join(', ')}`)
  }

  let text = analyzeRobotsTxt(input.text).optimizedText
  if (preset) {
    text = applyCrawlerPolicy(parseRobotsTxt(text), crawlerPolicyFromPreset(preset as CrawlerPolicyPreset))
  }
  text = `${text.trimEnd()}\n`

  if (values.write) {
    if (!input.file) {
      throw new UsageError('--write requires a local file input')
    }
    await io.writeFile(input.file, text)
    io.stderr(`Wrote ${input.file}\n`)
  } else {
    io.stdout(text)
  }
  return 0
}

async function runCompare(before: LoadedInput, after: LoadedInput, values: Record<string, unknown>, io: CliIO): Promise<number> {
  const comparison = compareRobotsTxt(before.text, after.text)
  if (values.format === 'json') {
    io.stdout(`${JSON.stringify({
      before: before.label,
      after: after.label,
      verdictChanges: comparison.verdictChanges,
      crawlerChanges: comparison.crawlerChanges.map(c => ({ token: c.crawler.token, before: c.before, after: c.after })),
      diff: comparison.diff.filter(line => line.type !== 'same')
    }, null, 2)}\n`)
    return 0
  }

  io.stdout(`Comparing ${before.label} → ${after.label}\n\n`)
  for (const line of comparison.diff.filter(l => l.type !== 'same')) {
    io.stdout(`${line.type === 'add' ? '+' : '-'} ${line.text}\n`)
  }
  if (comparison.crawlerChanges.length) {
    io.stdout('\nCrawler access changes:\n')
    for (const change of comparison.crawlerChanges) {
      io.stdout(`  ${change.crawler.token}: ${change.before} → ${change.after}\n`)
    }
  }
  io.stdout(`\n${comparison.verdictChanges.length} crawl verdict change(s)\n`)
  for (const change of comparison.verdictChanges.slice(0, 50)) {
    io.stdout(`  ${change.userAgent} ${change.path}: ${change.before ? 'allowed' : 'blocked'} → ${change.after ? 'allowed' : 'blocked'}\n`)
  }
  if (comparison.verdictChanges.length > 50) {
    io.stdout(`  … ${comparison.verdictChanges.length - 50} more (use --format json)\n`)
  }
  return 0
}

function runCrawlers(input: LoadedInput, values: Record<string, unknown>, io: CliIO): number {
  const access = analyzeRobotsTxt(input.text).crawlerAccess
  if (values.format === 'json') {
    io.stdout(`${JSON.stringify(access.map(entry => ({
      token: entry.crawler.token,
      operator: entry.crawler.operator,
      category: entry.crawler.category,
      status: entry.status,
      line: entry.line
    })), null, 2)}\n`)
    return 0
  }
  let category = ''
  for (const entry of access) {
    if (entry.crawler.category !== category) {
      category = entry.crawler.category
      io.stdout(`\n${CRAWLER_CATEGORY_LABELS[entry.crawler.category]}\n`)
    }
    io.stdout(`  ${entry.crawler.token.padEnd(20)} ${entry.status}\n`)
  }
  return 0
}

export async function run(argv: string[], io: CliIO = defaultIO): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        'help': { type: 'boolean', short: 'h' },
        'fail-on': { type: 'string' },
        'expect-allowed': { type: 'string', multiple: true },
        'expect-blocked': { type: 'string', multiple: true },
        'check-sitemaps': { type: 'boolean' },
        'format': { type: 'string' },
        'path-label': { type: 'string' },
        'write': { type: 'boolean' },
        'ai': { type: 'string' }
      }
    })

    const [command, ...args] = positionals
    if (values.help || !command) {
      io.stdout(HELP)
      return command || values.help ? 0 : 2
    }

    switch (command) {
      case 'check':
      case 'optimize':
      case 'crawlers': {
        if (args.length !== 1) {
          throw new UsageError(`${command} takes exactly one <file|url>`)
        }
        const input = await loadInput(args[0]!, io)
        if (command === 'check') return await runCheck(input, values, io)
        if (command === 'optimize') return await runOptimize(input, values, io)
        return runCrawlers(input, values, io)
      }
      case 'compare': {
        if (args.length !== 2) {
          throw new UsageError('compare takes <before> <after>')
        }
        const [before, after] = await Promise.all(args.map(arg => loadInput(arg, io)))
        return await runCompare(before!, after!, values, io)
      }
      default:
        throw new UsageError(`Unknown command "${command}". Run with --help for usage.`)
    }
  } catch (err) {
    io.stderr(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
    return 2
  }
}
