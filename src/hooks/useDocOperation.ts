import { useCallback, useState } from 'react'
import { usePdfStore } from '../store/pdfStore'
import { useAnnotationStore } from '../store/annotationStore'
import { useEditorStore } from '../store/editorStore'
import { loadPdfDocument } from '../lib/pdfLoader'
import { disposeAll } from '../lib/fabricManager'
import { showToast } from '../components/Toast/Toast'
import type { PdfHistoryEntry } from '../types/pdf'

type PageJsonMap = Record<number, string>

interface DocOperation {
  // Produces the new document bytes from the current ones.
  transform: (bytes: ArrayBuffer) => Promise<ArrayBuffer>
  // Maps the annotation store to the new page structure. Omit to keep as-is.
  remapAnnotations?: (map: PageJsonMap) => PageJsonMap
  successMessage?: string
}

// Runs a structural document operation: new bytes replace the document,
// the PDF.js viewer reloads, and annotations follow their pages. Undo/redo
// history is cleared (it indexes into the old page structure).
export function useDocOperation() {
  const [busy, setBusy] = useState(false)

  const applyOp = useCallback(async (op: DocOperation): Promise<boolean> => {
    const { pdfBytes, fileName } = usePdfStore.getState()
    if (!pdfBytes) return false
    setBusy(true)
    try {
      const newBytes = await op.transform(pdfBytes)
      const { doc, pageCount } = await loadPdfDocument(newBytes)

      // Remap annotations BEFORE swapping the document so remounting pages
      // pick up the right JSON, and drop stale undo/redo history.
      const currentMap = useAnnotationStore.getState().perPageJson
      usePdfStore.getState().pushHistory({
        pdfBytes,
        pageCount: usePdfStore.getState().pageCount,
        annotations: currentMap,
        currentPage: useEditorStore.getState().currentPage,
      })
      useAnnotationStore.setState({
        perPageJson: op.remapAnnotations ? op.remapAnnotations(currentMap) : currentMap,
        undoStack: {},
        redoStack: {},
      })

      disposeAll()
      const pdfStore = usePdfStore.getState()
      pdfStore.setPdfBytes(newBytes, fileName)
      pdfStore.setPdfDocument(doc)
      pdfStore.setPageCount(pageCount)

      const editor = useEditorStore.getState()
      if (editor.currentPage > pageCount) editor.setCurrentPage(pageCount)
      editor.clearPageSelection()

      if (op.successMessage) showToast(op.successMessage, 'success')
      return true
    } catch (e) {
      console.error(e)
      showToast(e instanceof Error ? e.message : 'Operation failed', 'error')
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  return { applyOp, busy }
}

export async function restorePdfHistory(entry: PdfHistoryEntry): Promise<void> {
  const { fileName } = usePdfStore.getState()
  const { doc, pageCount } = await loadPdfDocument(entry.pdfBytes)
  disposeAll()
  useAnnotationStore.setState({
    perPageJson: entry.annotations,
    undoStack: {},
    redoStack: {},
  })
  const pdfStore = usePdfStore.getState()
  pdfStore.setPdfBytes(entry.pdfBytes, fileName)
  pdfStore.setPdfDocument(doc)
  pdfStore.setPageCount(pageCount)
  const editor = useEditorStore.getState()
  editor.setCurrentPage(Math.min(entry.currentPage, pageCount))
  editor.clearPageSelection()
}
