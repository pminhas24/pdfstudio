import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageThumbnail } from '../../lib/pdfLoader'
import { useEditorStore } from '../../store/editorStore'
import { useAnnotationStore } from '../../store/annotationStore'
import { useDocOperation } from '../../hooks/useDocOperation'
import { deletePage, duplicatePage, rotatePage, reorderPages } from '../../lib/pageOperations'
import {
  remapAfterDelete,
  remapAfterDuplicate,
  remapAfterReorder,
  remapAfterRotate,
  remapAfterRotateCounterClockwise,
} from '../../lib/annotationRemap'

interface Props {
  doc: PDFDocumentProxy
  pageCount: number
}

interface PageMetric {
  width: number
  height: number
}

interface ThumbProps {
  doc: PDFDocumentProxy
  pageNum: number
  pageCount: number
  onRotateClockwise: (page: number) => void
  onRotateCounterClockwise: (page: number) => void
  onDelete: (page: number) => void
  onDuplicate: (page: number) => void
  onMoveUp: (page: number) => void
  onMoveDown: (page: number) => void
  onDragStart: (page: number) => void
  onDropOn: (page: number) => void
  busy: boolean
}

function Thumbnail({
  doc,
  pageNum,
  pageCount,
  onRotateClockwise,
  onRotateCounterClockwise,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
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
    window.dispatchEvent(
      new CustomEvent('pdfstudio:scroll-to-page', { detail: { pageNum } }),
    )
  }

  return (
    <div
      draggable={!busy}
      onClick={scrollToPage}
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
      className={`group relative w-full rounded-lg border p-1 transition-all cursor-pointer ${
        isActive
          ? 'ring-2 ring-sky-600 border-sky-300 bg-sky-50'
          : 'border-transparent hover:ring-1 hover:ring-sky-300 bg-white'
      } ${dragOver ? 'ring-2 ring-sky-400 bg-sky-100' : ''}`}
    >
      <canvas ref={canvasRef} className="w-full rounded border border-slate-100" />

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

      <div className="absolute top-1.5 right-1.5 grid grid-cols-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            onRotateCounterClockwise(pageNum)
          }}
          className="w-6 h-6 bg-white/95 border border-slate-200 rounded-md text-xs text-slate-600 hover:text-sky-600 hover:border-sky-300 shadow-sm"
          title="Rotate counterclockwise"
        >
          CCW
        </button>
        <button
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            onRotateClockwise(pageNum)
          }}
          className="w-6 h-6 bg-white/95 border border-slate-200 rounded-md text-xs text-slate-600 hover:text-sky-600 hover:border-sky-300 shadow-sm"
          title="Rotate clockwise"
        >
          CW
        </button>
        {pageNum > 1 && (
          <button
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp(pageNum)
            }}
            className="w-6 h-6 bg-white/95 border border-slate-200 rounded-md text-xs text-slate-600 hover:text-sky-600 hover:border-sky-300 shadow-sm"
            title="Move page up"
          >
            Up
          </button>
        )}
        {pageNum < pageCount && (
          <button
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown(pageNum)
            }}
            className="w-6 h-6 bg-white/95 border border-slate-200 rounded-md text-xs text-slate-600 hover:text-sky-600 hover:border-sky-300 shadow-sm"
            title="Move page down"
          >
            Dn
          </button>
        )}
        <button
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate(pageNum)
          }}
          className="w-6 h-6 bg-white/95 border border-slate-200 rounded-md text-xs text-slate-600 hover:text-sky-600 hover:border-sky-300 shadow-sm"
          title="Duplicate page"
        >
          +
        </button>
        {pageCount > 1 && (
          <button
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(pageNum)
            }}
            className="w-6 h-6 bg-white/95 border border-slate-200 rounded-md text-xs text-slate-600 hover:text-red-600 hover:border-red-300 shadow-sm"
            title="Delete page"
          >
            x
          </button>
        )}
      </div>

      <p
        className={`text-xs text-center mt-1 font-semibold ${
          isActive ? 'text-sky-700' : 'text-slate-400'
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
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageMetrics, setPageMetrics] = useState<PageMetric[]>([])
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 1 })
  const currentPage = useEditorStore((s) => s.currentPage)

  useEffect(() => {
    let cancelled = false

    async function loadMetrics() {
      const next: PageMetric[] = []
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await doc.getPage(pageNum)
        const viewport = page.getViewport({ scale: 1 })
        next.push({ width: viewport.width, height: viewport.height })
      }
      if (!cancelled) setPageMetrics(next)
    }

    loadMetrics()
    return () => {
      cancelled = true
    }
  }, [doc, pageCount])

  const metrics =
    pageMetrics.length === pageCount
      ? pageMetrics
      : Array.from({ length: pageCount }, () => ({ width: 612, height: 792 }))

  const layout = useMemo(() => {
    const thumbWidth = 120
    let cursor = 0
    const offsets = metrics.map((metric) => {
      const aspect = metric.width > 0 ? metric.height / metric.width : 1.3
      const height = thumbWidth * aspect + 34
      const top = cursor
      cursor += height + 8
      return { top, height }
    })
    return { offsets, totalHeight: cursor }
  }, [metrics])

  const updateViewport = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    setViewport({
      scrollTop: container.scrollTop,
      height: container.clientHeight || 1,
    })
  }, [])

  useEffect(() => {
    updateViewport()
    const container = containerRef.current
    if (!container) return
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateViewport)
    }
    const resizeObserver = new ResizeObserver(updateViewport)
    container.addEventListener('scroll', onScroll, { passive: true })
    resizeObserver.observe(container)
    return () => {
      cancelAnimationFrame(frame)
      container.removeEventListener('scroll', onScroll)
      resizeObserver.disconnect()
    }
  }, [updateViewport])

  useEffect(() => {
    const container = containerRef.current
    const page = layout.offsets[currentPage - 1]
    if (!container || !page) return
    const visibleTop = container.scrollTop
    const visibleBottom = visibleTop + container.clientHeight
    if (page.top >= visibleTop && page.top + page.height <= visibleBottom) return
    container.scrollTo({ top: Math.max(0, page.top - 24) })
  }, [currentPage, layout.offsets])

  const visibleRange = useMemo(() => {
    const startY = Math.max(0, viewport.scrollTop - viewport.height)
    const endY = viewport.scrollTop + viewport.height * 2
    let start = 0
    let end = pageCount - 1
    for (let i = 0; i < layout.offsets.length; i++) {
      const page = layout.offsets[i]
      if (page.top + page.height >= startY) {
        start = Math.max(0, i - 3)
        break
      }
    }
    for (let i = start; i < layout.offsets.length; i++) {
      const page = layout.offsets[i]
      if (page.top > endY) {
        end = Math.min(pageCount - 1, i + 3)
        break
      }
    }
    return { start, end }
  }, [layout.offsets, pageCount, viewport])

  const visiblePages = []
  for (let index = visibleRange.start; index <= visibleRange.end; index++) {
    visiblePages.push(index + 1)
  }

  async function handleRotateClockwise(pageNum: number) {
    const page = await doc.getPage(pageNum)
    const oldViewHeight = page.getViewport({ scale: 1 }).height

    await applyOp({
      transform: (bytes) => rotatePage(bytes, pageNum),
      remapAnnotations: (map) => {
        if (!map[pageNum]) return map
        return { ...map, [pageNum]: remapAfterRotate(map[pageNum], oldViewHeight) }
      },
      successMessage: `Page ${pageNum} rotated`,
    })
  }

  async function handleRotateCounterClockwise(pageNum: number) {
    const page = await doc.getPage(pageNum)
    const oldViewWidth = page.getViewport({ scale: 1 }).width

    await applyOp({
      transform: (bytes) => rotatePage(bytes, pageNum, -90),
      remapAnnotations: (map) => {
        if (!map[pageNum]) return map
        return {
          ...map,
          [pageNum]: remapAfterRotateCounterClockwise(map[pageNum], oldViewWidth),
        }
      },
      successMessage: `Page ${pageNum} rotated`,
    })
  }

  async function handleDelete(pageNum: number) {
    if (pageCount <= 1) return
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

  async function handleDuplicate(pageNum: number) {
    const ok = await applyOp({
      transform: (bytes) => duplicatePage(bytes, pageNum),
      remapAnnotations: (map) => remapAfterDuplicate(map, pageNum),
      successMessage: `Page ${pageNum} duplicated`,
    })
    if (!ok) return
    useEditorStore.getState().setCurrentPage(pageNum + 1)
    requestAnimationFrame(() => {
      document
        .getElementById(`pdf-page-${pageNum + 1}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function movePage(pageNum: number, direction: -1 | 1) {
    const target = pageNum + direction
    if (target < 1 || target > pageCount) return
    const order = Array.from({ length: pageCount }, (_, i) => i + 1)
    const sourceIndex = pageNum - 1
    const targetIndex = target - 1
    ;[order[sourceIndex], order[targetIndex]] = [order[targetIndex], order[sourceIndex]]

    const ok = await applyOp({
      transform: (bytes) => reorderPages(bytes, order),
      remapAnnotations: (map) => remapAfterReorder(map, order),
      successMessage: `Page ${pageNum} moved ${direction < 0 ? 'up' : 'down'}`,
    })
    if (!ok) return
    useEditorStore.getState().setCurrentPage(target)
    requestAnimationFrame(() => {
      document
        .getElementById(`pdf-page-${target}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleDragStart(pageNum: number) {
    dragSource.current = pageNum
  }

  async function handleDropOn(targetPage: number) {
    const source = dragSource.current
    dragSource.current = null
    if (source === null || source === targetPage) return

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
    <div
      ref={containerRef}
      className="w-36 max-w-[82vw] bg-white border-r border-slate-200 overflow-y-auto flex flex-col gap-2 p-2 shrink-0"
    >
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider text-center mb-1">
        Pages
      </p>
      {busy && (
        <p className="rounded-md bg-sky-50 px-2 py-1 text-center text-[10px] font-semibold text-sky-700">
          Updating pages...
        </p>
      )}
      <div className="relative shrink-0" style={{ height: layout.totalHeight }}>
        {visiblePages.map((n) => (
          <div
            key={`${doc.fingerprints?.[0] ?? 'doc'}-${n}`}
            className="absolute left-0 right-0"
            style={{ top: layout.offsets[n - 1]?.top ?? 0 }}
          >
            <Thumbnail
              doc={doc}
              pageNum={n}
              pageCount={pageCount}
              onRotateClockwise={handleRotateClockwise}
              onRotateCounterClockwise={handleRotateCounterClockwise}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onMoveUp={(page) => movePage(page, -1)}
              onMoveDown={(page) => movePage(page, 1)}
              onDragStart={handleDragStart}
              onDropOn={handleDropOn}
              busy={busy}
            />
          </div>
        ))}
      </div>
      <p className="text-[9px] text-slate-300 text-center mt-1 leading-tight">
        Click to jump. Drag or use arrows to reorder.
      </p>
    </div>
  )
}
