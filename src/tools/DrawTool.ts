import { PencilBrush } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'

export function enableDrawMode(fc: FabricCanvas, color = '#0284c7', width = 3): void {
  fc.isDrawingMode = true
  fc.freeDrawingBrush = new PencilBrush(fc)
  fc.freeDrawingBrush.color = color
  fc.freeDrawingBrush.width = width
}

export function disableDrawMode(fc: FabricCanvas): void {
  fc.isDrawingMode = false
}
