import { FabricImage, IText } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'

export async function addSignatureFromDataUrl(
  fc: FabricCanvas,
  dataUrl: string,
): Promise<void> {
  const img = await FabricImage.fromURL(dataUrl)
  const maxW = (fc.width ?? 600) * 0.4
  if ((img.width ?? 0) > maxW) img.scale(maxW / img.width!)
  // Default placement near the bottom-left, where signatures usually go.
  img.set({
    left: 60,
    top: (fc.height ?? 800) - img.getScaledHeight() - 40,
  })
  fc.add(img)
  fc.setActiveObject(img)
  fc.renderAll()
}

export function addTypedSignature(fc: FabricCanvas, text: string): void {
  const sig = new IText(text, {
    left: 60,
    top: (fc.height ?? 800) - 80,
    fontSize: 28,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fill: '#1e3a8a',
  })
  fc.add(sig)
  fc.setActiveObject(sig)
  fc.renderAll()
}
