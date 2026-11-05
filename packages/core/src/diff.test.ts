import { describe, expect, it } from 'vitest'
import { diffLines } from './diff'

describe('diffLines', () => {
  it('marks added and removed lines with line numbers', () => {
    expect(diffLines('a\nb\nc', 'a\nc\nd')).toEqual([
      { type: 'same', text: 'a', oldLine: 1, newLine: 1 },
      { type: 'remove', text: 'b', oldLine: 2 },
      { type: 'same', text: 'c', oldLine: 3, newLine: 2 },
      { type: 'add', text: 'd', newLine: 3 }
    ])
  })
})
