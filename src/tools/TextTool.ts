import { IText } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'

export function addText(fc: FabricCanvas, x = 100, y = 100): void {
  const text = new IText('Click to edit', {
    left: x,
    top: y,
    fontSize: 16,
    fontFamily: 'Helvetica',
    fill: '#111827',
    editable: true,
  })
  fc.add(text)
  fc.setActiveObject(text)
  text.enterEditing()
  text.selectAll()
  fc.renderAll()
}
