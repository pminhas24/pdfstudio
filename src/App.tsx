import { useCallback, useEffect, useRef, useState } from 'react'
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
import { restorePdfHistory } from './hooks/useDocOperation'
import type { ToolModalName } from './components/ToolsMenu/ToolsMenu'
import type { WorkflowIntent } from './components/PDFUploader/PDFUploader'

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
  const [workflow, setWorkflow] = useState<WorkflowIntent | null>(null)
  const workflowRef = useRef<WorkflowIntent | null>(null)
  const [requestedModal, setRequestedModal] = useState<ToolModalName | null>(null)

  const handleWorkflowSelected = useCallback((nextWorkflow: WorkflowIntent | null) => {
    workflowRef.current = nextWorkflow
    setWorkflow(nextWorkflow)
  }, [])

  const handleFileLoaded = useCallback(
    async (bytes: ArrayBuffer, name: string) => {
      setLoading(true)
      try {
        setPdfBytes(bytes, name)
        const { doc, pageCount } = await loadPdfDocument(bytes)
        setPdfDocument(doc)
        setPageCount(pageCount)
        useEditorStore.getState().setCurrentPage(1)
        const selectedWorkflow = workflowRef.current
        if (selectedWorkflow?.modal) setRequestedModal(selectedWorkflow.modal)
      } catch (e) {
        console.error(e)
        reset()
        setRequestedModal(null)
        handleWorkflowSelected(null)
        showToast(
          'Could not open this PDF. It may be corrupted, encrypted, or unsupported.',
          'error',
        )
      } finally {
        setLoading(false)
      }
    },
    [setPdfBytes, setPdfDocument, setPageCount, reset, handleWorkflowSelected],
  )

  const handleUndo = useCallback(async () => {
    const page = useEditorStore.getState().currentPage
    const json = useAnnotationStore.getState().undo(page)
    if (json !== undefined) {
      await loadFabricJson(page, json)
      return
    }

    const pdfStore = usePdfStore.getState()
    if (!pdfStore.pdfBytes) return
    const entry = pdfStore.popUndo({
      pdfBytes: pdfStore.pdfBytes,
      pageCount: pdfStore.pageCount,
      annotations: useAnnotationStore.getState().perPageJson,
      currentPage: useEditorStore.getState().currentPage,
    })
    if (entry) await restorePdfHistory(entry)
  }, [])

  const handleRedo = useCallback(async () => {
    const page = useEditorStore.getState().currentPage
    const json = useAnnotationStore.getState().redo(page)
    if (json !== undefined) {
      await loadFabricJson(page, json)
      return
    }

    const pdfStore = usePdfStore.getState()
    if (!pdfStore.pdfBytes) return
    const entry = pdfStore.popRedo({
      pdfBytes: pdfStore.pdfBytes,
      pageCount: pdfStore.pageCount,
      annotations: useAnnotationStore.getState().perPageJson,
      currentPage: useEditorStore.getState().currentPage,
    })
    if (entry) await restorePdfHistory(entry)
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
      showToast('PDF downloaded successfully.', 'success')
    } catch (e) {
      console.error(e)
      showToast(
        e instanceof Error
          ? e.message
          : 'Export failed. Please try again or use a smaller PDF.',
        'error',
      )
    } finally {
      setExporting(false)
    }
  }

  function handleOpenNew() {
    disposeAll()
    reset()
    useAnnotationStore.setState({ perPageJson: {}, undoStack: {}, redoStack: {} })
    useFormStore.getState().reset()
    useEditorStore.getState().setInteractionMode('annotate')
    useEditorStore.getState().setActiveTool('select')
    useEditorStore.getState().setCurrentPage(1)
    useEditorStore.getState().setZoom(1)
    handleWorkflowSelected(null)
    setRequestedModal(null)
  }

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
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-100 px-6 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
        <p className="font-semibold text-slate-700">Loading your PDF...</p>
        <p className="max-w-sm text-sm text-slate-500">
          Large files can take a moment to render. Files stay in your browser.
        </p>
        {workflow && (
          <p className="text-xs font-semibold text-slate-600">
            Workflow: {workflow.label} / Upload PDF
          </p>
        )}
        <ToastContainer />
      </div>
    )
  }

  if (!pdfDocument) {
    return (
      <>
        <PDFUploader
          onFileLoaded={handleFileLoaded}
          onWorkflowSelected={handleWorkflowSelected}
        />
        <ToastContainer />
      </>
    )
  }

  const activeFabricCanvas = getFabricCanvas(currentPage) ?? null

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <EditorToolbar
        onDownload={handleDownload}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenNew={handleOpenNew}
        exporting={exporting}
        pageCount={pageCount}
        fileName={fileName}
        workflowLabel={workflow?.label ?? null}
        requestedModal={requestedModal}
        onRequestedModalOpened={() => setRequestedModal(null)}
      />
      <div className="relative flex flex-1 overflow-hidden">
        <div className={`${showThumbs ? 'flex' : 'hidden'} md:flex`}>
          <PageThumbnailSidebar doc={pdfDocument} pageCount={pageCount} />
        </div>

        <PDFCanvas doc={pdfDocument} pageCount={pageCount} />

        <div className={`${showProps ? 'flex' : 'hidden'} md:flex`}>
          <PropertiesPanel fabricCanvas={activeFabricCanvas} />
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex justify-between md:hidden">
          <button
            onClick={() => setShowThumbs((value) => !value)}
            className="pointer-events-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg"
          >
            Pages
          </button>
          <button
            onClick={() => setShowProps((value) => !value)}
            className="pointer-events-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg"
          >
            Properties
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  )
}
