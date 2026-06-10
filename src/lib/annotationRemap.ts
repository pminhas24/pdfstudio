import type { FabricObjectExport } from '../types/pdf'

// Structural page operations change page numbering and orientation; the
// annotation store (keyed by page number, coords in view points) must be
// remapped to follow.

type PageJsonMap = Record<number, string>

// Deleting page n: drop its annotations, shift higher pages down by one.
export function remapAfterDelete(map: PageJsonMap, deletedPage: number): PageJsonMap {
  const out: PageJsonMap = {}
  for (const [key, json] of Object.entries(map)) {
    const page = Number(key)
    if (page < deletedPage) out[page] = json
    else if (page > deletedPage) out[page - 1] = json
  }
  return out
}

// order[i] = original 1-based page number now at position i+1.
export function remapAfterReorder(map: PageJsonMap, order: number[]): PageJsonMap {
  const out: PageJsonMap = {}
  order.forEach((originalPage, i) => {
    const json = map[originalPage]
    if (json !== undefined) out[i + 1] = json
  })
  return out
}

// Rotating a page 90° clockwise rotates the rendered view. Each object gets
// the same rigid transform the page content received: its origin point
// (left/top) moves to (oldViewHeight − top, left) and the object itself
// turns 90° about that origin.
export function remapAfterRotate(json: string, oldViewHeight: number): string {
  const parsed = JSON.parse(json) as { objects?: FabricObjectExport[] }
  for (const obj of parsed.objects ?? []) {
    const { left, top } = obj
    obj.left = oldViewHeight - top
    obj.top = left
    obj.angle = ((obj.angle ?? 0) + 90) % 360
  }
  return JSON.stringify(parsed)
}
