import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PDFPage } from './PDFPage'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  doc: PDFDocumentProxy
  pageCount: number
}

// Base render scale maps PDF points to screen pixels. 1.5 keeps text crisp
// at typical desktop sizes without making every page overly expensive.
export const BASE_SCALE = 1.5
const PAGE_GAP = 56
const PAGE_BUFFER = 2

interface PageMetric {
  width: number
  height: number
}

export function PDFCanvas({ doc, pageCount }: Props) {
  const zoom = useEditorStore((s) => s.zoom)
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pageMetrics, setPageMetrics] = useState<PageMetric[]>([])
  const [viewport, setViewport] = useState({ scrollTop: 0, height: 1 })

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

  const scale = zoom * BASE_SCALE
  const metrics =
    pageMetrics.length === pageCount
      ? pageMetrics
      : Array.from({ length: pageCount }, () => ({ width: 612, height: 792 }))

  const layout = useMemo(() => {
    let cursor = 0
    const offsets = metrics.map((metric) => {
      const top = cursor
      const height = metric.height * scale
      cursor += height + PAGE_GAP
      return { top, height, width: metric.width * scale }
    })
    return {
      offsets,
      totalHeight: Math.max(0, cursor - PAGE_GAP + 32),
    }
  }, [metrics, scale])

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
    const center = viewport.scrollTop + viewport.height / 2
    let current = 1
    let bestDistance = Infinity
    layout.offsets.forEach((page, index) => {
      const pageCenter = page.top + page.height / 2
      const distance = Math.abs(pageCenter - center)
      if (distance < bestDistance) {
        bestDistance = distance
        current = index + 1
      }
    })
    if (useEditorStore.getState().currentPage !== current) {
      setCurrentPage(current)
    }
  }, [layout.offsets, setCurrentPage, viewport])

  useEffect(() => {
    function onScrollToPage(event: Event) {
      const pageNum = (event as CustomEvent<{ pageNum: number }>).detail?.pageNum
      if (!pageNum) return
      const page = layout.offsets[pageNum - 1]
      const container = containerRef.current
      if (!page || !container) return
      container.scrollTo({
        top: Math.max(0, page.top - 24),
        behavior: 'smooth',
      })
    }

    window.addEventListener('pdfstudio:scroll-to-page', onScrollToPage)
    return () => window.removeEventListener('pdfstudio:scroll-to-page', onScrollToPage)
  }, [layout.offsets])

  const visibleRange = useMemo(() => {
    const startY = Math.max(0, viewport.scrollTop - viewport.height)
    const endY = viewport.scrollTop + viewport.height * 2
    let start = 0
    let end = pageCount - 1

    for (let i = 0; i < layout.offsets.length; i++) {
      const page = layout.offsets[i]
      if (page.top + page.height >= startY) {
        start = Math.max(0, i - PAGE_BUFFER)
        break
      }
    }
    for (let i = start; i < layout.offsets.length; i++) {
      const page = layout.offsets[i]
      if (page.top > endY) {
        end = Math.min(pageCount - 1, i + PAGE_BUFFER)
        break
      }
    }
    return { start, end }
  }, [layout.offsets, pageCount, viewport])

  const visiblePages = []
  for (let index = visibleRange.start; index <= visibleRange.end; index++) {
    visiblePages.push(index + 1)
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-1 flex-col items-center overflow-auto bg-slate-200 px-3 py-6 sm:px-6 lg:p-8"
    >
      <div className="relative w-full" style={{ height: layout.totalHeight }}>
        {visiblePages.map((pageNum) => {
          const page = layout.offsets[pageNum - 1]
          return (
            <div
              key={pageNum}
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: page.top }}
            >
              <PDFPage
                doc={doc}
                pageNum={pageNum}
                scale={scale}
                pageCount={pageCount}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
