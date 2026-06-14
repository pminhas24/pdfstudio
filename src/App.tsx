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
import { removePdfMetadata } from './lib/pageOperations'
import { getFabricCanvas, loadFabricJson, disposeAll } from './lib/fabricManager'
import { restorePdfHistory } from './hooks/useDocOperation'
import type { ToolModalName } from './components/ToolsMenu/ToolsMenu'
import type { WorkflowIntent } from './components/PDFUploader/PDFUploader'

interface MetadataResult {
  fileName: string
  originalSize: number
  cleanedSize: number
  cleanedBytes: ArrayBuffer
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function downloadCleanedPdf(bytes: ArrayBuffer, fileName: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.replace(/\.pdf$/i, '') + '-cleaned.pdf'
  a.click()
  URL.revokeObjectURL(url)
}

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
  const [metadataResult, setMetadataResult] = useState<MetadataResult | null>(null)

  const handleWorkflowSelected = useCallback((nextWorkflow: WorkflowIntent | null) => {
    workflowRef.current = nextWorkflow
    setWorkflow(nextWorkflow)
  }, [])

  const handleFileLoaded = useCallback(
    async (bytes: ArrayBuffer, name: string) => {
      setLoading(true)
      try {
        const selectedWorkflow = workflowRef.current
        if (selectedWorkflow?.resultAction === 'removeMetadata') {
          const cleanedBytes = await removePdfMetadata(bytes)
          reset()
          disposeAll()
          useAnnotationStore.setState({ perPageJson: {}, undoStack: {}, redoStack: {} })
          useFormStore.getState().reset()
          setRequestedModal(null)
          setMetadataResult({
            fileName: name,
            originalSize: bytes.byteLength,
            cleanedSize: cleanedBytes.byteLength,
            cleanedBytes,
          })
          return
        }

        setPdfBytes(bytes, name)
        const { doc, pageCount } = await loadPdfDocument(bytes)
        setPdfDocument(doc)
        setPageCount(pageCount)
        useEditorStore.getState().setCurrentPage(1)
        if (selectedWorkflow?.modal) setRequestedModal(selectedWorkflow.modal)
      } catch (e) {
        console.error(e)
        reset()
        setRequestedModal(null)
        setMetadataResult(null)
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
    setMetadataResult(null)
  }

  async function handleOpenMetadataResultInEditor() {
    if (!metadataResult) return
    setLoading(true)
    try {
      const { cleanedBytes, fileName } = metadataResult
      const { doc, pageCount } = await loadPdfDocument(cleanedBytes)
      disposeAll()
      useAnnotationStore.setState({ perPageJson: {}, undoStack: {}, redoStack: {} })
      useFormStore.getState().reset()
      const pdfStore = usePdfStore.getState()
      pdfStore.setPdfBytes(cleanedBytes, fileName)
      pdfStore.setPdfDocument(doc)
      pdfStore.setPageCount(pageCount)
      useEditorStore.getState().setCurrentPage(1)
      useEditorStore.getState().setActiveTool('select')
      useEditorStore.getState().setInteractionMode('annotate')
      setMetadataResult(null)
      handleWorkflowSelected(null)
    } catch (e) {
      console.error(e)
      showToast('Could not open the cleaned PDF in the editor.', 'error')
    } finally {
      setLoading(false)
    }
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
    if (metadataResult) {
      return (
        <>
          <MetadataResultScreen
            result={metadataResult}
            onDownload={() =>
              downloadCleanedPdf(metadataResult.cleanedBytes, metadataResult.fileName)
            }
            onOpenEditor={handleOpenMetadataResultInEditor}
            onStartOver={handleOpenNew}
          />
          <ToastContainer />
        </>
      )
    }

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
    <div className="flex h-screen flex-col bg-slate-100">
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
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
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

function MetadataResultScreen({
  result,
  onDownload,
  onOpenEditor,
  onStartOver,
}: {
  result: MetadataResult
  onDownload: () => void
  onOpenEditor: () => void
  onStartOver: () => void
}) {
  const removed = ['title', 'author', 'subject', 'keywords', 'creator', 'producer']

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">
            Files stay in your browser
          </p>
          <h1 className="mt-1 text-2xl font-bold">Metadata removed</h1>
        </div>

        <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">{result.fileName}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Original file size
              </p>
              <p className="text-lg font-bold">{formatBytes(result.originalSize)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                New file size
              </p>
              <p className="text-lg font-bold">{formatBytes(result.cleanedSize)}</p>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <h2 className="text-sm font-bold text-slate-800">What was removed where possible</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {removed.map((item) => (
              <div
                key={item}
                className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold capitalize text-green-800"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
          This removes common PDF metadata. It may not remove hidden content, annotations,
          attachments, or XMP metadata.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-700"
          >
            Download cleaned PDF
          </button>
          <button
            type="button"
            onClick={onOpenEditor}
            className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Open in editor
          </button>
          <button
            type="button"
            onClick={onStartOver}
            className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Start over / Choose another file
          </button>
        </div>
      </div>
    </div>
  )
}
