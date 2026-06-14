import { ActiveSelection, Canvas as FabricCanvas } from 'fabric'
import { useEditorStore } from '../store/editorStore'

// One Fabric canvas per PDF page, keyed by page number. Module-level map
// (not React state) because Fabric instances are imperative objects that
// must survive re-renders and be reachable from the toolbar/export code.
const canvases = new Map<number, FabricCanvas>()

// Pages currently mid-loadFromJSON — their object:added events must not
// be written back to the annotation store or undo history gets polluted
// with one snapshot per restored object.
const loading = new Set<number>()

export function createFabricCanvas(
  pageNum: number,
  canvasEl: HTMLCanvasElement,
  width: number,
  height: number,
  zoom: number,
  onChange: (json: string) => void,
): FabricCanvas {
  const existing = canvases.get(pageNum)
  if (existing) {
    existing.dispose()
  }
  const fc = new FabricCanvas(canvasEl, {
    width,
    height,
    selection: false,
    preserveObjectStacking: true,
  })
  // Object coordinates stay in PDF points regardless of display zoom;
  // the canvas viewport transform handles scaling. This keeps annotation
  // positions stable across zoom changes and lets the exporter use the
  // coordinates directly.
  fc.setZoom(zoom)

  const handler = () => {
    if (loading.has(pageNum)) return
    onChange(JSON.stringify(fc.toJSON()))
  }
  const syncSelection = () => {
    const active = fc.getActiveObject()
    if (!active) {
      useEditorStore.getState().setSelectedObjectId(null)
      return
    }

    if (active instanceof ActiveSelection) {
      const first = active.getObjects()[0]
      fc.discardActiveObject()
      if (first) fc.setActiveObject(first)
      useEditorStore.getState().setSelectedObjectId(first ? String(first.get('id') ?? '') : null)
      fc.requestRenderAll()
      return
    }

    useEditorStore.getState().setSelectedObjectId(String(active.get('id') ?? 'selected'))
  }
  fc.on('object:added', handler)
  fc.on('object:modified', handler)
  fc.on('object:removed', handler)
  fc.on('selection:created', syncSelection)
  fc.on('selection:updated', syncSelection)
  fc.on('selection:cleared', syncSelection)

  canvases.set(pageNum, fc)
  return fc
}

export function getFabricCanvas(pageNum: number): FabricCanvas | undefined {
  return canvases.get(pageNum)
}

export async function loadFabricJson(pageNum: number, json: string): Promise<void> {
  const fc = canvases.get(pageNum)
  if (!fc) return
  loading.add(pageNum)
  try {
    await fc.loadFromJSON(JSON.parse(json))
    fc.discardActiveObject()
    fc.renderAll()
    useEditorStore.getState().setSelectedObjectId(null)
  } finally {
    loading.delete(pageNum)
  }
}

export function disposeFabricCanvas(pageNum: number): void {
  const fc = canvases.get(pageNum)
  if (fc) {
    fc.dispose()
    canvases.delete(pageNum)
  }
}

export function disposeAll(): void {
  canvases.forEach((fc) => fc.dispose())
  canvases.clear()
}
