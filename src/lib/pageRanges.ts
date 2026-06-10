// Parses user page-range input like "1-3, 5, 8-9" into [1,2,3,5,8,9].
// Out-of-bounds and malformed parts are rejected with a descriptive error.
export function parsePageRanges(input: string, pageCount: number): number[] {
  const pages = new Set<number>()
  const parts = input.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) throw new Error('Enter at least one page or range')

  for (const part of parts) {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/) ?? part.match(/^(\d+)$/)
    if (!m) throw new Error(`Invalid range: "${part}"`)
    const start = parseInt(m[1], 10)
    const end = m[2] ? parseInt(m[2], 10) : start
    if (start < 1 || end > pageCount || start > end) {
      throw new Error(`Range "${part}" is out of bounds (1–${pageCount})`)
    }
    for (let p = start; p <= end; p++) pages.add(p)
  }
  return [...pages].sort((a, b) => a - b)
}
