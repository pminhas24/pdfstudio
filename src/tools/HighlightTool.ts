import { Rect } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'

export function addHighlight(fc: FabricCanvas, color = '#fde047', x = 80, y = 80): void {
  const rect = new Rect({
    left: x,
    top: y,
    width: 200,
    height: 20,
    fill: color,
    opacity: 0.4,
    strokeWidth: 0,
  })
  fc.add(rect)
  fc.setActiveObject(rect)
  fc.renderAll()
}
