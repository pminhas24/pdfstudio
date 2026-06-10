import { PDFDocument } from 'pdf-lib'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPage } from './pdfLoader'
import { getFabricCanvas } from './fabricManager'

// Raster-based operations: these re-render pages through PDF.js, so they
// are inherently lossy — the trade-off that makes them possible without a
// server. Each caller's UI says so explicitly.

async function renderToCanvas(
  doc: PDFDocumentProxy,
  pageNum: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  await renderPage(doc, pageNum, canvas, scale)
  return canvas
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      type,
      quality,
    )
  })
}

export type CompressPreset = 'high' | 'medium' | 'low'

const PRESETS: Record<CompressPreset, { scale: number; quality: number }> = {
  high: { scale: 2, quality: 0.8 }, // larger file, near-original look
  medium: { scale: 1.5, quality: 0.6 },
  low: { scale: 1, quality: 0.4 }, // smallest file, visibly soft
}

// Rebuilds the document as one JPEG per page. Text becomes unselectable —
// this is rasterization, the only honest client-side compression.
export async function compressPdf(
  doc: PDFDocumentProxy,
  originalBytes: ArrayBuffer,
  preset: CompressPreset,
  onProgress?: (done: number, total: number) => void,
): Promise<ArrayBuffer> {
  const { scale, quality } = PRESETS[preset]
  const src = await PDFDocument.load(originalBytes)
  const out = await PDFDocument.create()

  for (let i = 1; i <= doc.numPages; i++) {
    const canvas = await renderToCanvas(doc, i, scale)
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
    const jpg = await out.embedJpg(await blob.arrayBuffer())
    // Keep the original page size in points so the document's physical
    // dimensions don't change.
    const { width, height } = src.getPage(i - 1).getSize()
    const page = out.addPage([width, height])
    page.drawImage(jpg, { x: 0, y: 0, width, height })
    onProgress?.(i, doc.numPages)
  }

  const bytes = await out.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

// Permanent redaction: composites the page render with its annotation
// overlay (the black boxes the user drew) into a single image and replaces
// the page with it. The original content stream — including covered text —
// is destroyed.
export async function flattenPage(
  doc: PDFDocumentProxy,
  originalBytes: ArrayBuffer,
  pageNum: number,
  viewScale: number,
): Promise<ArrayBuffer> {
  const EXPORT_SCALE = 2
  const pageCanvas = await renderToCanvas(doc, pageNum, EXPORT_SCALE)

  const fc = getFabricCanvas(pageNum)
  if (fc) {
    // The Fabric canvas's pixel size is pageSize × viewScale; multiply up
    // to the export resolution and composite on top of the page render.
    const overlay = fc.toCanvasElement(EXPORT_SCALE / viewScale)
    pageCanvas.getContext('2d')!.drawImage(overlay, 0, 0)
  }

  const blob = await canvasToBlob(pageCanvas, 'image/png')
  const png = await blob.arrayBuffer()

  const pdfDoc = await PDFDocument.load(originalBytes)
  const { width, height } = pdfDoc.getPage(pageNum - 1).getSize()
  const embedded = await pdfDoc.embedPng(png)
  pdfDoc.removePage(pageNum - 1)
  const newPage = pdfDoc.insertPage(pageNum - 1, [width, height])
  newPage.drawImage(embedded, { x: 0, y: 0, width, height })

  const bytes = await pdfDoc.save()
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export async function exportPagesAsImages(
  doc: PDFDocumentProxy,
  pageNums: number[],
  baseName: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  for (let i = 0; i < pageNums.length; i++) {
    const canvas = await renderToCanvas(doc, pageNums[i], 2)
    const blob = await canvasToBlob(canvas, 'image/png')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName.replace(/\.pdf$/i, '')}-page-${pageNums[i]}.png`
    a.click()
    URL.revokeObjectURL(url)
    onProgress?.(i + 1, pageNums.length)
  }
}
