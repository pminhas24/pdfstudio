import { describe, it, expect } from 'vitest'
import {
  remapAfterDelete,
  remapAfterReorder,
  remapAfterRotate,
} from '../../lib/annotationRemap'

describe('annotationRemap', () => {
  describe('remapAfterDelete', () => {
    it('drops the deleted page and shifts higher pages down', () => {
      const map = { 1: 'a', 2: 'b', 3: 'c' }
      expect(remapAfterDelete(map, 2)).toEqual({ 1: 'a', 2: 'c' })
    })

    it('keeps lower pages untouched', () => {
      const map = { 1: 'a', 3: 'c' }
      expect(remapAfterDelete(map, 3)).toEqual({ 1: 'a' })
    })
  })

  describe('remapAfterReorder', () => {
    it('permutes page keys to follow their pages', () => {
      const map = { 1: 'a', 2: 'b', 3: 'c' }
      // New order: original page 3 first, then 1, then 2
      expect(remapAfterReorder(map, [3, 1, 2])).toEqual({ 1: 'c', 2: 'a', 3: 'b' })
    })

    it('drops nothing when some pages have no annotations', () => {
      const map = { 2: 'b' }
      expect(remapAfterReorder(map, [2, 1])).toEqual({ 1: 'b' })
    })
  })

  describe('remapAfterRotate', () => {
    it('moves the object origin and adds 90° to its angle', () => {
      const json = JSON.stringify({
        objects: [{ type: 'Rect', left: 100, top: 30, width: 50, height: 20, angle: 0 }],
      })
      const out = JSON.parse(remapAfterRotate(json, 792))
      expect(out.objects[0].left).toBe(792 - 30)
      expect(out.objects[0].top).toBe(100)
      expect(out.objects[0].angle).toBe(90)
    })

    it('wraps angle past 360', () => {
      const json = JSON.stringify({
        objects: [{ type: 'Rect', left: 0, top: 0, width: 1, height: 1, angle: 300 }],
      })
      const out = JSON.parse(remapAfterRotate(json, 100))
      expect(out.objects[0].angle).toBe(30)
    })
  })
})
