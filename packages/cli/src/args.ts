import { parseArgs } from 'node:util'

export const AI_PRESETS = ['block-ai-training', 'block-all-ai', 'allow-all-ai'] as const

export function isAiPreset(value: string): value is (typeof AI_PRESETS)[number] {
  return (AI_PRESETS as readonly string[]).includes(value)
}

export class UsageError extends Error {}

export function parseCliArgs(argv: string[]) {
  return parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      'help': { type: 'boolean', short: 'h' },
      'version': { type: 'boolean', short: 'v' },
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
}

export type CliValues = ReturnType<typeof parseCliArgs>['values']

export function parseExpectation(value: string): { agent: string, path: string } {
  const index = value.indexOf(':')
  if (index <= 0 || index === value.length - 1) {
    throw new UsageError(`Expected "<user-agent>:<path>", got "${value}"`)
  }
  const path = value.slice(index + 1).trim()
  return { agent: value.slice(0, index).trim(), path: path.startsWith('/') ? path : `/${path}` }
}
