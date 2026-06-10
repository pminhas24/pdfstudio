import { describe, it, expect } from 'vitest'
import { parsePageRanges } from '../../lib/pageRanges'

describe('parsePageRanges', () => {
  it('parses single pages and ranges', () => {
    expect(parsePageRanges('1-3, 5', 10)).toEqual([1, 2, 3, 5])
  })

  it('deduplicates overlapping ranges', () => {
    expect(parsePageRanges('1-3, 2-4', 10)).toEqual([1, 2, 3, 4])
  })

  it('rejects out-of-bounds pages', () => {
    expect(() => parsePageRanges('5-12', 10)).toThrow(/out of bounds/)
  })

  it('rejects malformed input', () => {
    expect(() => parsePageRanges('abc', 10)).toThrow(/Invalid range/)
    expect(() => parsePageRanges('', 10)).toThrow(/at least one/)
  })

  it('rejects reversed ranges', () => {
    expect(() => parsePageRanges('5-2', 10)).toThrow(/out of bounds/)
  })
})
