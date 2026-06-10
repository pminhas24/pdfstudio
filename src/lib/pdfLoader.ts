import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PageRenderInfo } from '../types/pdf'

// PDF.js parses documents in a Web Worker so the UI thread stays responsive.
// Vite resolves this URL to the bundled worker asset at build time.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function loadPdfDocument(
  bytes: ArrayBuffer,
): Promise<{ doc: PDFDocumentProxy; pageCount: number }> {
  // PDF.js transfers the buffer to its worker, so hand it a copy —
  // the original bytes are still needed later by pdf-lib for export.
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes.slice(0)) })
  const doc = await loadingTask.promise
  return { doc, pageCount: doc.numPages }
}

export async function renderPage(
  doc: PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<PageRenderInfo> {
  const page = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise
  return { pageNum, width: viewport.width, height: viewport.height, scale }
}

export async function renderPageThumbnail(
  doc: PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
): Promise<void> {
  await renderPage(doc, pageNum, canvas, 0.2)
}
