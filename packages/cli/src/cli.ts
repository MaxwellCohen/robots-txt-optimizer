import { run } from './run'

process.exitCode = await run(process.argv.slice(2)).catch((err: unknown) => {
  process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`)
  return 2
})
