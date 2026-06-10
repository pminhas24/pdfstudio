import { create } from 'zustand'
import type { PDFState } from '../types/pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export const usePdfStore = create<PDFState>((set) => ({
  pdfBytes: null,
  fileName: '',
  pageCount: 0,
  pdfDocument: null,
  setPdfBytes: (bytes: ArrayBuffer, name: string) =>
    set({ pdfBytes: bytes, fileName: name }),
  setPageCount: (count: number) => set({ pageCount: count }),
  setPdfDocument: (doc: PDFDocumentProxy) => set({ pdfDocument: doc }),
  reset: () =>
    set({ pdfBytes: null, fileName: '', pageCount: 0, pdfDocument: null }),
}))
