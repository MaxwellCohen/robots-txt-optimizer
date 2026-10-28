export type DiffLineType = 'same' | 'add' | 'remove'

export interface DiffLine {
  type: DiffLineType
  text: string
  /** 1-based line in the original text (same/remove). */
  oldLine?: number
  /** 1-based line in the new text (same/add). */
  newLine?: number
}

/** Above this many cells the LCS table is skipped in favor of a plain replace. */
const MAX_LCS_CELLS = 4_000_000

function splitLines(text: string): string[] {
  return text === '' ? [] : text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')
}

/** Line-based diff (longest common subsequence) between two texts. */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before)
  const b = splitLines(after)

  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) {
    start++
  }
  let endA = a.length
  let endB = b.length
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--
    endB--
  }

  const result: DiffLine[] = []
  for (let i = 0; i < start; i++) {
    result.push({ type: 'same', text: a[i]!, oldLine: i + 1, newLine: i + 1 })
  }

  const midA = a.slice(start, endA)
  const midB = b.slice(start, endB)
  const n = midA.length
  const m = midB.length

  if (n * m > MAX_LCS_CELLS) {
    midA.forEach((text, i) => result.push({ type: 'remove', text, oldLine: start + i + 1 }))
    midB.forEach((text, j) => result.push({ type: 'add', text, newLine: start + j + 1 }))
  } else {
    // lcs[i][j] = LCS length of midA[i:] and midB[j:]
    const width = m + 1
    const lcs = new Uint32Array((n + 1) * width)
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lcs[i * width + j] = midA[i] === midB[j]
          ? lcs[(i + 1) * width + j + 1]! + 1
          : Math.max(lcs[(i + 1) * width + j]!, lcs[i * width + j + 1]!)
      }
    }
    let i = 0
    let j = 0
    while (i < n || j < m) {
      if (i < n && j < m && midA[i] === midB[j]) {
        result.push({ type: 'same', text: midA[i]!, oldLine: start + i + 1, newLine: start + j + 1 })
        i++
        j++
      } else if (j < m && (i === n || lcs[i * width + j + 1]! >= lcs[(i + 1) * width + j]!)) {
        result.push({ type: 'add', text: midB[j]!, newLine: start + j + 1 })
        j++
      } else {
        result.push({ type: 'remove', text: midA[i]!, oldLine: start + i + 1 })
        i++
      }
    }
  }

  for (let k = 0; k < a.length - endA; k++) {
    result.push({ type: 'same', text: a[endA + k]!, oldLine: endA + k + 1, newLine: endB + k + 1 })
  }

  return result
}

export function diffStats(lines: readonly DiffLine[]): { added: number, removed: number } {
  return {
    added: lines.filter(line => line.type === 'add').length,
    removed: lines.filter(line => line.type === 'remove').length
  }
}
