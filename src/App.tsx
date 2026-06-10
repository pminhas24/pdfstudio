import { useCallback, useEffect, useState } from 'react'
import { PDFUploader } from './components/PDFUploader/PDFUploader'
import { PDFCanvas } from './components/PDFCanvas/PDFCanvas'
import { EditorToolbar } from './components/EditorToolbar/EditorToolbar'
import { PageThumbnailSidebar } from './components/PageThumbnailSidebar/PageThumbnailSidebar'
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel'
import { ToastContainer, showToast } from './components/Toast/Toast'
import { usePdfStore } from './store/pdfStore'
import { useAnnotationStore } from './store/annotationStore'
import { useEditorStore } from './store/editorStore'
import { useFormStore } from './store/formStore'
import { loadPdfDocument } from './lib/pdfLoader'
import { exportPdf, downloadBytes } from './lib/pdfExporter'
import { getFabricCanvas, loadFabricJson, disposeAll } from './lib/fabricManager'

export default function App() {
  const {
    pdfDocument,
    pageCount,
    pdfBytes,
    fileName,
    setPdfBytes,
    setPageCount,
    setPdfDocument,
    reset,
  } = usePdfStore()
  const currentPage = useEditorStore((s) => s.currentPage)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [showThumbs, setShowThumbs] = useState(false)
  const [showProps, setShowProps] = useState(false)

  const handleFileLoaded = useCallback(
    async (bytes: ArrayBuffer, name: string) => {
      setLoading(true)
      try {
        setPdfBytes(bytes, name)
        const { doc, pageCount } = await loadPdfDocument(bytes)
        setPdfDocument(doc)
        setPageCount(pageCount)
        useEditorStore.getState().setCurrentPage(1)
      } catch (e) {
        console.error(e)
        reset()
        showToast(
          'Could not open this PDF. It may be corrupted or password-protected.',
          'error',
        )
      } finally {
        setLoading(false)
      }
    },
    [setPdfBytes, setPdfDocument, setPageCount, reset],
  )

  const handleUndo = useCallback(async () => {
    const page = useEditorStore.getState().currentPage
    const json = useAnnotationStore.getState().undo(page)
    if (json !== undefined) await loadFabricJson(page, json)
  }, [])

  const handleRedo = useCallback(async () => {
    const page = useEditorStore.getState().currentPage
    const json = useAnnotationStore.getState().redo(page)
    if (json !== undefined) await loadFabricJson(page, json)
  }, [])

  async function handleDownload() {
    if (!pdfBytes) return
    setExporting(true)
    try {
      const bytes = await exportPdf(
        pdfBytes,
        useAnnotationStore.getState().perPageJson,
        useFormStore.getState().values,
      )
      downloadBytes(bytes, fileName)
      showToast('PDF downloaded successfully!', 'success')
    } catch (e) {
      console.error(e)
      showToast('Export failed. Please try again.', 'error')
    } finally {
      setExporting(false)
    }
  }

  function handleOpenNew() {
    disposeAll()
    reset()
    useAnnotationStore.setState({ perPageJson: {}, undoStack: {}, redoStack: {} })
    useFormStore.getState().reset()
    useEditorStore.getState().setActiveTool('select')
    useEditorStore.getState().setCurrentPage(1)
    useEditorStore.getState().setZoom(1)
  }

  // Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) — skipped while typing in a field,
  // where the browser's own text undo should win.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault()
        handleRedo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
        <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Loading your PDF…</p>
      </div>
    )
  }

  if (!pdfDocument) {
    return (
      <>
        <PDFUploader onFileLoaded={handleFileLoaded} />
        <ToastContainer />
      </>
    )
  }

  const activeFabricCanvas = getFabricCanvas(currentPage) ?? null

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      <EditorToolbar
        onDownload={handleDownload}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenNew={handleOpenNew}
        exporting={exporting}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <div className={`${showThumbs ? 'flex' : 'hidden'} md:flex`}>
          <PageThumbnailSidebar doc={pdfDocument} pageCount={pageCount} />
        </div>

        <PDFCanvas doc={pdfDocument} pageCount={pageCount} />

        <div className={`${showProps ? 'flex' : 'hidden'} md:flex`}>
          <PropertiesPanel fabricCanvas={activeFabricCanvas} />
        </div>

        {/* Mobile-only sidebar toggles */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between md:hidden pointer-events-none">
          <button
            onClick={() => setShowThumbs((v) => !v)}
            className="pointer-events-auto bg-white shadow-lg border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700"
          >
            📄 Pages
          </button>
          <button
            onClick={() => setShowProps((v) => !v)}
            className="pointer-events-auto bg-white shadow-lg border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700"
          >
            ⚙️ Properties
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}
