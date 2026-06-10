import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageThumbnail } from '../../lib/pdfLoader'
import { useEditorStore } from '../../store/editorStore'
import { useAnnotationStore } from '../../store/annotationStore'
import { useDocOperation } from '../../hooks/useDocOperation'
import { deletePage, rotatePage, reorderPages } from '../../lib/pageOperations'
import {
  remapAfterDelete,
  remapAfterReorder,
  remapAfterRotate,
} from '../../lib/annotationRemap'

interface Props {
  doc: PDFDocumentProxy
  pageCount: number
}

interface ThumbProps {
  doc: PDFDocumentProxy
  pageNum: number
  onRotate: (page: number) => void
  onDelete: (page: number) => void
  onDragStart: (page: number) => void
  onDropOn: (page: number) => void
  busy: boolean
}

function Thumbnail({
  doc,
  pageNum,
  onRotate,
  onDelete,
  onDragStart,
  onDropOn,
  busy,
}: ThumbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isActive = useEditorStore((s) => s.currentPage === pageNum)
  const isSelected = useEditorStore((s) => s.selectedPages.includes(pageNum))
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const togglePageSelection = useEditorStore((s) => s.togglePageSelection)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (canvasRef.current) renderPageThumbnail(doc, pageNum, canvasRef.current)
  }, [doc, pageNum])

  function scrollToPage() {
    setCurrentPage(pageNum)
    document
      .getElementById(`pdf-page-${pageNum}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      draggable={!busy}
      onDragStart={() => onDragStart(pageNum)}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        onDropOn(pageNum)
      }}
      className={`group relative w-full rounded-lg p-1 transition-all cursor-pointer ${
        isActive ? 'ring-2 ring-sky-600 bg-sky-50' : 'hover:ring-1 hover:ring-sky-300 bg-white'
      } ${dragOver ? 'ring-2 ring-sky-400 bg-sky-100' : ''}`}
    >
      <canvas
        ref={canvasRef}
        onClick={scrollToPage}
        className="w-full rounded border border-slate-100"
      />

      {/* Selection checkbox for extract/split */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => togglePageSelection(pageNum)}
        onClick={(e) => e.stopPropagation()}
        className={`absolute top-1.5 left-1.5 accent-sky-600 ${
          isSelected ? '' : 'opacity-0 group-hover:opacity-100'
        } transition-opacity`}
        title="Select page"
      />

      {/* Per-page actions */}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            onRotate(pageNum)
          }}
          className="w-6 h-6 bg-white/95 border border-slate-200 rounded-md text-xs text-slate-600 hover:text-sky-600 hover:border-sky-300 shadow-sm"
          title="Rotate 90° clockwise"
        >
          ↻
        </button>
        <button
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(pageNum)
          }}
          className="w-6 h-6 bg-white/95 border border-slate-200 rounded-md text-xs text-slate-600 hover:text-red-600 hover:border-red-300 shadow-sm"
          title="Delete page"
        >
          ✕
        </button>
      </div>

      <p
        className={`text-xs text-center mt-1 font-medium ${
          isActive ? 'text-sky-600' : 'text-slate-400'
        }`}
      >
        {pageNum}
      </p>
    </div>
  )
}

export function PageThumbnailSidebar({ doc, pageCount }: Props) {
  const { applyOp, busy } = useDocOperation()
  const dragSource = useRef<number | null>(null)

  async function handleRotate(pageNum: number) {
    // Capture the current view height (points) BEFORE rotating so existing
    // annotations can be transformed into the new orientation.
    const page = await doc.getPage(pageNum)
    const oldViewHeight = page.getViewport({ scale: 1 }).height

    await applyOp({
      transform: (bytes) => rotatePage(bytes, pageNum),
      remapAnnotations: (map) => {
        if (!map[pageNum]) return map
        return { ...map, [pageNum]: remapAfterRotate(map[pageNum], oldViewHeight) }
      },
    })
  }

  async function handleDelete(pageNum: number) {
    const hasAnnotations = !!useAnnotationStore.getState().perPageJson[pageNum]
    const message = hasAnnotations
      ? `Delete page ${pageNum}? Its annotations will be deleted too.`
      : `Delete page ${pageNum}?`
    if (!window.confirm(message)) return

    await applyOp({
      transform: (bytes) => deletePage(bytes, pageNum),
      remapAnnotations: (map) => remapAfterDelete(map, pageNum),
      successMessage: `Page ${pageNum} deleted`,
    })
  }

  function handleDragStart(pageNum: number) {
    dragSource.current = pageNum
  }

  async function handleDropOn(targetPage: number) {
    const source = dragSource.current
    dragSource.current = null
    if (source === null || source === targetPage) return

    // Move `source` to the position of `targetPage`, shifting the rest.
    const order = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
      (p) => p !== source,
    )
    order.splice(order.indexOf(targetPage) + (source < targetPage ? 1 : 0), 0, source)

    await applyOp({
      transform: (bytes) => reorderPages(bytes, order),
      remapAnnotations: (map) => remapAfterReorder(map, order),
      successMessage: 'Pages reordered',
    })
  }

  return (
    <div className="w-28 bg-white border-r border-slate-200 overflow-y-auto flex flex-col gap-2 p-2 shrink-0">
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center mb-1">
        Pages
      </p>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <Thumbnail
          key={n}
          doc={doc}
          pageNum={n}
          onRotate={handleRotate}
          onDelete={handleDelete}
          onDragStart={handleDragStart}
          onDropOn={handleDropOn}
          busy={busy}
        />
      ))}
      <p className="text-[9px] text-slate-300 text-center mt-1 leading-tight">
        Drag to reorder · hover for actions
      </p>
    </div>
  )
}
