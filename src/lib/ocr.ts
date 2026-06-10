import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPage } from './pdfLoader'

// OCR via tesseract.js, dynamically imported (the engine plus the English
// language model are several MB and fetched from a CDN on first use — the
// PDF itself still never leaves the browser; only the model is downloaded).
export async function ocrPage(
  doc: PDFDocumentProxy,
  pageNum: number,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const canvas = document.createElement('canvas')
  await renderPage(doc, pageNum, canvas, 2)

  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress)
    },
  })
  try {
    const { data } = await worker.recognize(canvas)
    return data.text
  } finally {
    await worker.terminate()
  }
}
