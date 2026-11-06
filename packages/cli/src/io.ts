import { readFile, writeFile } from 'node:fs/promises'
import { fetchRobotsTxt, normalizeRobotsUrl } from '@robots-txt-optimizer/core/fetch'
import pkg from '../package.json' with { type: 'json' }
import { UsageError } from './args'

export const USER_AGENT = `robots-txt-optimizer-cli/${pkg.version}`

export interface CliIO {
  stdout: (text: string) => void
  stderr: (text: string) => void
  readFile: (path: string) => Promise<string>
  readStdin: () => Promise<string>
  writeFile: (path: string, text: string) => Promise<void>
  fetch: typeof globalThis.fetch
}

async function readStdin(): Promise<string> {
  process.stdin.setEncoding('utf8')
  let text = ''
  for await (const chunk of process.stdin) {
    text += String(chunk)
  }
  return text
}

export const defaultIO: CliIO = {
  stdout: text => process.stdout.write(text),
  stderr: text => process.stderr.write(text),
  readFile: path => readFile(path, 'utf8'),
  readStdin,
  writeFile: (path, text) => writeFile(path, text, 'utf8'),
  fetch: globalThis.fetch
}

export interface LoadedInput {
  text: string
  label: string
  /** Local file path, if the input was a file. */
  file?: string
  fetchStatus?: number
}

/**
 * Only consulted after the file read failed with ENOENT, so a real file always wins.
 * ".txt" is not a TLD: a missing "foo.txt" is a mistyped path, not a domain.
 */
function looksLikeUrl(input: string): boolean {
  if (/^https?:\/\//i.test(input)) {
    return true
  }
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/.*)?$/i.test(input) && !/\.txt$/i.test(input)
}

function isNotFound(err: unknown): boolean {
  return err instanceof Error && 'code' in err && err.code === 'ENOENT'
}

export async function loadInput(input: string, io: CliIO): Promise<LoadedInput> {
  if (input === '-') {
    return { text: await io.readStdin(), label: 'stdin' }
  }

  try {
    return { text: await io.readFile(input), label: input, file: input }
  } catch (err) {
    const missing = isNotFound(err)
    if (!missing || !looksLikeUrl(input)) {
      throw new UsageError(missing ? `File not found: ${input}` : `Cannot read ${input}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const url = normalizeRobotsUrl(input)
  const result = await fetchRobotsTxt(url, { fetch: io.fetch, userAgent: USER_AGENT, source: 'server' })
  return { text: result.status >= 200 && result.status < 300 ? result.text : '', label: result.finalUrl, fetchStatus: result.status }
}
