import { FabricImage } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'

export function addImageFromFile(fc: FabricCanvas, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = async () => {
      try {
        const img = await FabricImage.fromURL(reader.result as string)
        // Cap inserted images to half the page width so a photo from a
        // phone camera doesn't cover the whole document.
        const maxW = (fc.width ?? 600) * 0.5
        if ((img.width ?? 0) > maxW) {
          img.scale(maxW / img.width!)
        }
        img.set({ left: 50, top: 50 })
        fc.add(img)
        fc.setActiveObject(img)
        fc.renderAll()
        resolve()
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsDataURL(file)
  })
}
