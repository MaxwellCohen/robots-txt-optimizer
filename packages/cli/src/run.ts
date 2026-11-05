import {
  analyzeRobotsTxt,
  applyCrawlerPolicy,
  checkRobotsPath,
  compareRobotsTxt,
  CRAWLER_CATEGORY_LABELS,
  crawlerPolicyFromPreset,
  findBlockedSitemapUrls,
  parseRobotsTxt
} from '@robots-txt-optimizer/core'
import { diagnoseFetch } from '@robots-txt-optimizer/core/fetch'
import { secureFetchSitemaps } from '@robots-txt-optimizer/core/node'
import { AI_PRESETS, isAiPreset, parseCliArgs, parseExpectation, UsageError, type CliValues } from './args'
import { escapeAnnotation, HELP, printCheckText, type CheckFailure } from './format'
import { defaultIO, loadInput, type CliIO, type LoadedInput } from './io'

export { defaultIO, type CliIO } from './io'

async function runCheck(input: LoadedInput, values: CliValues, io: CliIO): Promise<number> {
  const failOn = values['fail-on'] ?? 'error'
  if (!['error', 'warning', 'none'].includes(failOn)) {
    throw new UsageError(`--fail-on must be error, warning, or none (got "${failOn}")`)
  }
  const format = values.format ?? 'text'
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
    ...(values['expect-allowed'] ?? []).map(v => ({ ...parseExpectation(v), allowed: true })),
    ...(values['expect-blocked'] ?? []).map(v => ({ ...parseExpectation(v), allowed: false }))
  ]
  const expectationResults = expectations.map((expectation) => {
    const result = checkRobotsPath(doc, expectation.agent, expectation.path)
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
    const file = values['path-label'] ?? input.file ?? 'robots.txt'
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

async function runOptimize(input: LoadedInput, values: CliValues, io: CliIO): Promise<number> {
  const preset = values.ai
  if (preset !== undefined && !isAiPreset(preset)) {
    throw new UsageError(`--ai must be one of ${AI_PRESETS.join(', ')}`)
  }

  let text = analyzeRobotsTxt(input.text).optimizedText
  if (preset) {
    text = applyCrawlerPolicy(parseRobotsTxt(text), crawlerPolicyFromPreset(preset))
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

async function runCompare(before: LoadedInput, after: LoadedInput, values: CliValues, io: CliIO): Promise<number> {
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

function runCrawlers(input: LoadedInput, values: CliValues, io: CliIO): number {
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
    const { values, positionals } = parseCliArgs(argv)

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
