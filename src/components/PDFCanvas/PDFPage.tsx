import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { Canvas as FabricCanvas, TPointerEventInfo, TPointerEvent } from 'fabric'
import { renderPage } from '../../lib/pdfLoader'
import {
  createFabricCanvas,
  loadFabricJson,
  disposeFabricCanvas,
} from '../../lib/fabricManager'
import { useAnnotationStore } from '../../store/annotationStore'
import { useEditorStore } from '../../store/editorStore'
import { addText } from '../../tools/TextTool'
import { addImageFromFile } from '../../tools/ImageTool'
import { enableDrawMode, disableDrawMode } from '../../tools/DrawTool'
import { addShape } from '../../tools/ShapeTool'
import { addHighlight } from '../../tools/HighlightTool'
import { SignatureModal } from '../SignatureModal/SignatureModal'
import { FormLayer } from './FormLayer'

interface Props {
  doc: PDFDocumentProxy
  pageNum: number
  scale: number
}

export function PDFPage({ doc, pageNum, scale }: Props) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const fabricElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const [ready, setReady] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)

  const savePageJson = useAnnotationStore((s) => s.savePageJson)
  const activeTool = useEditorStore((s) => s.activeTool)
  const activeShape = useEditorStore((s) => s.activeShape)
  const setActiveTool = useEditorStore((s) => s.setActiveTool)

  // Render the PDF page and (re)create the Fabric overlay. Re-runs on zoom
  // change: object coordinates are zoom-independent (scene units = PDF
  // points via fc.setZoom), so annotations restore at the correct spot.
  useEffect(() => {
    if (!pdfCanvasRef.current || !fabricElRef.current) return
    let cancelled = false

    async function init() {
      const info = await renderPage(doc, pageNum, pdfCanvasRef.current!, scale)
      if (cancelled) return

      const fc = createFabricCanvas(
        pageNum,
        fabricElRef.current!,
        info.width,
        info.height,
        scale,
        (json) => savePageJson(pageNum, json),
      )
      fabricRef.current = fc

      const existing = useAnnotationStore.getState().perPageJson[pageNum]
      if (existing) await loadFabricJson(pageNum, existing)
      if (!cancelled) setReady(true)
    }

    init()
    return () => {
      cancelled = true
      setReady(false)
      fabricRef.current = null
      disposeFabricCanvas(pageNum)
    }
  }, [doc, pageNum, scale, savePageJson])

  // React to the active tool. Click-to-place tools (text/shape/highlight)
  // listen for the next click on this page; draw toggles Fabric's free
  // drawing mode; image/signature open their pickers immediately but only
  // on the page currently in view, so a 50-page document doesn't open 50
  // file dialogs.
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !ready) return

    disableDrawMode(fc)

    if (activeTool === 'draw') {
      enableDrawMode(fc)
      return () => disableDrawMode(fc)
    }

    if (['text', 'shape', 'highlight'].includes(activeTool)) {
      const handler = (e: TPointerEventInfo<TPointerEvent>) => {
        if (fc.getActiveObject()) return // clicking an existing object = select, not place
        const p = fc.getScenePoint(e.e)
        if (activeTool === 'text') addText(fc, p.x, p.y)
        else if (activeTool === 'shape') addShape(fc, activeShape, p.x, p.y)
        else if (activeTool === 'highlight') addHighlight(fc, '#fde047', p.x, p.y)
        setActiveTool('select') // one placement per click, then back to select
      }
      fc.on('mouse:down', handler)
      return () => {
        fc.off('mouse:down', handler)
      }
    }

    const isCurrent = useEditorStore.getState().currentPage === pageNum

    if (activeTool === 'image' && isCurrent) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/png,image/jpeg'
      input.onchange = () => {
        const file = input.files?.[0]
        if (file) addImageFromFile(fc, file)
      }
      input.click()
      setActiveTool('select')
    }

    if (activeTool === 'signature' && isCurrent) {
      setShowSignatureModal(true)
      setActiveTool('select')
    }
  }, [activeTool, activeShape, ready, pageNum, setActiveTool])

  return (
    <div id={`pdf-page-${pageNum}`} className="relative shadow-lg rounded-sm mb-8">
      {/* PDF.js raster of the original page */}
      <canvas ref={pdfCanvasRef} className="block rounded-sm bg-white" />

      {/* Fabric.js annotation overlay — Fabric wraps this element in its
          own container div, which the absolute wrapper positions on top */}
      <div className="absolute inset-0">
        <canvas ref={fabricElRef} />
      </div>

      {/* Interactive AcroForm fields, above the Fabric overlay so they
          stay typeable; the layer itself lets clicks pass through */}
      <FormLayer doc={doc} pageNum={pageNum} scale={scale} />

      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-600/90 text-white text-xs rounded-full px-3 py-0.5 whitespace-nowrap select-none">
        Page {pageNum}
      </div>

      {showSignatureModal && fabricRef.current && (
        <SignatureModal
          fabricCanvas={fabricRef.current}
          onClose={() => setShowSignatureModal(false)}
        />
      )}
    </div>
  )
}
