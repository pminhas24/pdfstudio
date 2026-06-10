import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PDFPage } from './PDFPage'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  doc: PDFDocumentProxy
  pageCount: number
}

// Base render scale: PDF points → screen pixels. 1.5 gives crisp text at
// typical desktop sizes without the memory cost of devicePixelRatio
// multiplication on every page.
export const BASE_SCALE = 1.5

export function PDFCanvas({ doc, pageCount }: Props) {
  const zoom = useEditorStore((s) => s.zoom)
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track which page fills the viewport so the thumbnail sidebar and
  // undo/redo target the right page while scrolling.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { num: number; ratio: number } | null = null
        for (const entry of entries) {
          const num = parseInt(entry.target.id.replace('pdf-page-', ''), 10)
          if (!isNaN(num) && entry.isIntersecting) {
            if (!best || entry.intersectionRatio > best.ratio) {
              best = { num, ratio: entry.intersectionRatio }
            }
          }
        }
        if (best) setCurrentPage(best.num)
      },
      { root: container, threshold: [0.25, 0.5, 0.75] },
    )

    for (let i = 1; i <= pageCount; i++) {
      const el = document.getElementById(`pdf-page-${i}`)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [pageCount, setCurrentPage])

  const scale = zoom * BASE_SCALE

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-slate-200 p-8 flex flex-col items-center"
    >
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
        <PDFPage key={pageNum} doc={doc} pageNum={pageNum} scale={scale} />
      ))}
    </div>
  )
}
