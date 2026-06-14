import { create } from 'zustand'
import type { PDFState } from '../types/pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export const usePdfStore = create<PDFState>((set) => ({
  pdfBytes: null,
  fileName: '',
  pageCount: 0,
  pdfDocument: null,
  undoStack: [],
  redoStack: [],
  setPdfBytes: (bytes: ArrayBuffer, name: string) =>
    set({ pdfBytes: bytes, fileName: name }),
  setPageCount: (count: number) => set({ pageCount: count }),
  setPdfDocument: (doc: PDFDocumentProxy) => set({ pdfDocument: doc }),
  pushHistory: (entry) =>
    set((s) => ({ undoStack: [...s.undoStack, entry].slice(-25), redoStack: [] })),
  popUndo: (current) => {
    let entry: ReturnType<PDFState['popUndo']>
    set((s) => {
      entry = s.undoStack[s.undoStack.length - 1]
      if (!entry) return s
      return {
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, current].slice(-25),
      }
    })
    return entry
  },
  popRedo: (current) => {
    let entry: ReturnType<PDFState['popRedo']>
    set((s) => {
      entry = s.redoStack[s.redoStack.length - 1]
      if (!entry) return s
      return {
        undoStack: [...s.undoStack, current].slice(-25),
        redoStack: s.redoStack.slice(0, -1),
      }
    })
    return entry
  },
  reset: () =>
    set({
      pdfBytes: null,
      fileName: '',
      pageCount: 0,
      pdfDocument: null,
      undoStack: [],
      redoStack: [],
    }),
}))
