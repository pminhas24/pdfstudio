import { Rect, Ellipse, Line, Path } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'
import type { ShapeName } from '../types/pdf'

const DEFAULTS = {
  stroke: '#0284c7',
  strokeWidth: 2,
  fill: 'transparent',
}

export function addShape(fc: FabricCanvas, shape: ShapeName, x = 80, y = 80): void {
  let obj

  switch (shape) {
    case 'rect':
      obj = new Rect({ ...DEFAULTS, left: x, top: y, width: 120, height: 80 })
      break
    case 'circle':
      obj = new Ellipse({ ...DEFAULTS, left: x, top: y, rx: 60, ry: 40 })
      break
    case 'line':
      obj = new Line([x, y, x + 150, y], { ...DEFAULTS })
      break
    case 'arrow':
      // Single stroked path (shaft + two head strokes) so the arrow moves,
      // scales, and exports as one object.
      obj = new Path('M 0 8 L 130 8 M 118 0 L 130 8 L 118 16', {
        ...DEFAULTS,
        left: x,
        top: y,
      })
      break
  }

  if (obj) {
    fc.add(obj)
    fc.setActiveObject(obj)
    fc.renderAll()
  }
}
