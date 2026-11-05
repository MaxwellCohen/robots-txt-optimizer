/** Reads a query value that may be repeated or comma-separated. */
export function queryList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value]
  return values
    .filter((item): item is string => typeof item === 'string')
    .flatMap(item => item.split(','))
    .map(item => item.trim())
    .filter(Boolean)
}
