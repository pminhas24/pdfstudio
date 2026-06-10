import { describe, it, expect } from 'vitest'
import { flipY, fabricColorToRgb, rebasePath } from '../../lib/pdfExporter'

describe('pdfExporter', () => {
  describe('flipY', () => {
    it('converts top-left Y to bottom-left Y', () => {
      expect(flipY(0, 20, 800)).toBe(780)
    })

    it('converts mid-page Y correctly', () => {
      expect(flipY(400, 20, 800)).toBe(380)
    })

    it('handles scaled objects', () => {
      expect(flipY(100, 50, 800, 2)).toBe(600)
    })
  })

  describe('fabricColorToRgb', () => {
    it('converts hex to 0-1 rgb', () => {
      const result = fabricColorToRgb('#ff0000')
      expect(result.r).toBeCloseTo(1)
      expect(result.g).toBeCloseTo(0)
      expect(result.b).toBeCloseTo(0)
    })

    it('handles shorthand hex', () => {
      const result = fabricColorToRgb('#fff')
      expect(result.r).toBeCloseTo(1)
      expect(result.g).toBeCloseTo(1)
      expect(result.b).toBeCloseTo(1)
    })

    it('returns black for invalid color', () => {
      expect(fabricColorToRgb('not-a-color')).toEqual({ r: 0, g: 0, b: 0 })
      expect(fabricColorToRgb(undefined)).toEqual({ r: 0, g: 0, b: 0 })
    })
  })

  describe('rebasePath', () => {
    it('translates path data to its bounding-box origin', () => {
      const { d, minX, minY } = rebasePath([
        ['M', 100, 50],
        ['L', 130, 80],
      ])
      expect(minX).toBe(100)
      expect(minY).toBe(50)
      expect(d).toBe('M 0.00 0.00 L 30.00 30.00')
    })

    it('handles quadratic curve commands from the pencil brush', () => {
      const { d } = rebasePath([
        ['M', 10, 10],
        ['Q', 10, 10, 20, 30],
      ])
      expect(d).toBe('M 0.00 0.00 Q 0.00 0.00 10.00 20.00')
    })
  })
})
