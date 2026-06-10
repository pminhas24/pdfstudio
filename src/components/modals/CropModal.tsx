import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import { renderPage } from '../../lib/pdfLoader'
import { cropPage } from '../../lib/pageOperations'
import { useDocOperation } from '../../hooks/useDocOperation'
import { usePdfStore } from '../../store/pdfStore'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  onClose: () => void
}

interface DragRect {
  x: number
  y: number
  w: number
  h: number
}

// Drag a rectangle over a page preview; the crop box is set on Apply.
// Note: drawn in unrotated page coordinates — cropping pages that have been
// rotated may give unexpected boxes (acceptable limitation for now).
export function CropModal({ onClose }: Props) {
  const pdfDocument = usePdfStore((s) => s.pdfDocument)
  const currentPage = useEditorStore((s) => s.currentPage)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [rect, setRect] = useState<DragRect | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const { applyOp, busy } = useDocOperation()

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return
    let cancelled = false
    async function render() {
      const page = await pdfDocument!.getPage(currentPage)
      const viewport = page.getViewport({ scale: 1 })
      // Fit the preview into ~520px width.
      const scale = Math.min(520 / viewport.width, 640 / viewport.height)
      if (cancelled) return
      setPreviewScale(scale)
      await renderPage(pdfDocument!, currentPage, canvasRef.current!, scale)
    }
    render()
    return () => {
      cancelled = true
    }
  }, [pdfDocument, currentPage])

  function pos(e: React.MouseEvent): { x: number; y: number } {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function onMouseDown(e: React.MouseEvent) {
    dragStart.current = pos(e)
    setRect(null)
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragStart.current) return
    const p = pos(e)
    const s = dragStart.current
    setRect({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    })
  }

  function onMouseUp() {
    dragStart.current = null
  }

  async function handleApply() {
    if (!rect || rect.w < 10 || rect.h < 10) return
    const ok = await applyOp({
      transform: (bytes) =>
        cropPage(bytes, currentPage, {
          x: rect.x / previewScale,
          y: rect.y / previewScale,
          width: rect.w / previewScale,
          height: rect.h / previewScale,
        }),
      successMessage: `Page ${currentPage} cropped`,
    })
    if (ok) onClose()
  }

  return (
    <Modal title={`Crop Page ${currentPage}`} onClose={onClose} wide>
      <p className="text-sm text-slate-500 mb-3">
        Drag a rectangle over the area to keep. Annotations on this page keep their
        positions relative to the full page.
      </p>

      <div
        className="relative inline-block cursor-crosshair select-none mb-4 mx-auto"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <canvas ref={canvasRef} className="border border-slate-200 rounded-lg shadow-sm" />
        {rect && (
          <div
            className="absolute border-2 border-sky-500 bg-sky-400/15 pointer-events-none"
            style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          />
        )}
      </div>

      <button
        onClick={handleApply}
        disabled={!rect || rect.w < 10 || rect.h < 10 || busy}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Cropping…' : 'Apply crop'}
      </button>
    </Modal>
  )
}
