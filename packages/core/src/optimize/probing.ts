export function pathsFromPattern(pattern: string): string[] {
  if (!pattern) {
    return []
  }

  if (pattern === '/') {
    return ['/', '/robots-dead-rule-probe/']
  }

  if (pattern.endsWith('$')) {
    return [pattern.slice(0, -1) || '/']
  }

  if (pattern.includes('*')) {
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -1)
      return [prefix === '/' ? '/probe' : `${prefix}probe`]
    }
    return [pattern.replace('*', 'probe')]
  }

  if (pattern.endsWith('/')) {
    return [pattern === '/' ? '/probe' : `${pattern}probe`, pattern.slice(0, -1) || '/']
  }

  return [pattern, `${pattern}/probe`]
}

/** Replaces every `*` with `fill` and drops a trailing `$`. */
function concretize(pattern: string, fill: string): string {
  return pattern.replace(/\$$/, '').replace(/\*/g, fill)
}

/** Literal text before the first `*` (or `$`). */
function literalHead(pattern: string): string {
  return pattern.replace(/\$$/, '').split('*')[0]!
}

/** Literal text after the last `*`, or '' when there is no wildcard. */
function literalTail(pattern: string): string {
  const body = pattern.replace(/\$$/, '')
  return body.includes('*') ? body.slice(body.lastIndexOf('*') + 1) : ''
}

/** Two rules can match a common path only if one literal head extends the other. */
function headsOverlap(a: string, b: string): boolean {
  const headA = literalHead(a)
  const headB = literalHead(b)
  return headA.startsWith(headB) || headB.startsWith(headA)
}

/**
 * Paths that exercise `pattern` on its own and where it meets each
 * overlapping rule: e.g. `Allow: /*?q=` next to `Disallow: /a` needs `/a?q=`.
 */
export function probePathsForDirective(
  pattern: string,
  otherPatterns: readonly string[],
  basePaths: readonly string[]
): string[] {
  const probes = new Set<string>([...basePaths, ...pathsFromPattern(pattern)])
  const anchored = pattern.endsWith('$')
  const add = (path: string, extend: boolean) => {
    if (!path.startsWith('/')) {
      path = `/${path}`
    }
    probes.add(path)
    if (extend) {
      probes.add(`${path}x`)
      probes.add(`${path}/x`)
    }
  }

  for (const fill of ['', 'x', 'x/x']) {
    add(concretize(pattern, fill), !anchored)
  }

  for (const other of otherPatterns) {
    if (!other || !headsOverlap(pattern, other)) {
      continue
    }
    const otherAnchored = other.endsWith('$')
    for (const fill of ['', 'x']) {
      const sample = concretize(other, fill)
      add(sample, !otherAnchored)
      if (pattern.includes('*')) {
        // Let this rule's wildcard swallow the other rule's path.
        add(concretize(pattern, sample.replace(/^\//, '')), !anchored)
        add(`${sample}${literalTail(pattern)}`, !anchored)
      }
      if (other.includes('*')) {
        add(concretize(other, concretize(pattern, fill).replace(/^\//, '')), !otherAnchored)
        add(`${concretize(pattern, fill)}${literalTail(other)}`, !otherAnchored)
      }
    }
  }

  return [...probes]
}
