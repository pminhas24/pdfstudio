import { describe, it, expect, vi } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: vi.fn(() =>
        Promise.resolve({
          getViewport: vi.fn(() => ({ width: 612, height: 792 })),
          render: vi.fn(() => ({ promise: Promise.resolve() })),
        }),
      ),
    }),
  })),
  GlobalWorkerOptions: { workerSrc: '' },
}))

import { loadPdfDocument, renderPage } from '../../lib/pdfLoader'

describe('pdfLoader', () => {
  it('loadPdfDocument returns page count', async () => {
    const bytes = new ArrayBuffer(8)
    const { doc, pageCount } = await loadPdfDocument(bytes)
    expect(pageCount).toBe(3)
    expect(doc).toBeDefined()
  })

  it('renderPage returns dimensions and scale', async () => {
    const bytes = new ArrayBuffer(8)
    const { doc } = await loadPdfDocument(bytes)
    const canvas = document.createElement('canvas')
    await expect(renderPage(doc, 1, canvas, 1.5)).resolves.toMatchObject({
      width: 612,
      height: 792,
      scale: 1.5,
    })
  })
})
