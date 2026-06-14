import { useState } from 'react'
import { Modal } from './Modal'
import { exportPagesAsImages } from '../../lib/rasterOps'
import { parsePageRanges } from '../../lib/pageRanges'
import { loadPdfDocument } from '../../lib/pdfLoader'
import { exportPdf } from '../../lib/pdfExporter'
import { usePdfStore } from '../../store/pdfStore'
import { useAnnotationStore } from '../../store/annotationStore'
import { useFormStore } from '../../store/formStore'
import { showToast } from '../Toast/Toast'

interface Props {
  format: 'jpg' | 'png'
  onClose: () => void
}

export function PdfToImageModal({ format, onClose }: Props) {
  const pageCount = usePdfStore((s) => s.pageCount)
  const fileName = usePdfStore((s) => s.fileName)
  const [scope, setScope] = useState<'all' | 'range'>('all')
  const [rangeInput, setRangeInput] = useState('')
  const [quality, setQuality] = useState(0.9)
  const [progress, setProgress] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  async function handleExport() {
    let pages: number[]
    if (scope === 'all') pages = Array.from({ length: pageCount }, (_, i) => i + 1)
    else {
      try {
        pages = parsePageRanges(rangeInput, pageCount)
      } catch (e) {
        showToast(e instanceof Error ? e.message : 'Invalid range', 'error')
        return
      }
    }

    setWorking(true)
    try {
      const bytes = usePdfStore.getState().pdfBytes
      if (!bytes) return
      const edited = await exportPdf(
        bytes,
        useAnnotationStore.getState().perPageJson,
        useFormStore.getState().values,
      )
      const editedBuffer = edited.buffer.slice(
        edited.byteOffset,
        edited.byteOffset + edited.byteLength,
      ) as ArrayBuffer
      const { doc } = await loadPdfDocument(editedBuffer)
      await exportPagesAsImages(doc, pages, fileName, format, quality, (done, total) =>
        setProgress(`Exporting ${done} of ${total}...`),
      )
      showToast(
        `${pages.length} ${format.toUpperCase()} image${pages.length > 1 ? 's' : ''} downloaded`,
        'success',
      )
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Image export failed', 'error')
    } finally {
      setWorking(false)
      setProgress(null)
    }
  }

  return (
    <Modal title={`PDF to ${format.toUpperCase()}`} onClose={onClose}>
      <p className="text-sm text-slate-500 mb-3">
        Files stay in your browser. Multiple pages download one by one because ZIP support is not
        installed.
      </p>

      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            checked={scope === 'all'}
            onChange={() => setScope('all')}
            className="accent-sky-600"
          />
          All {pageCount} pages
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            checked={scope === 'range'}
            onChange={() => setScope('range')}
            className="accent-sky-600"
          />
          Range
          <input
            value={rangeInput}
            onChange={(e) => {
              setRangeInput(e.target.value)
              setScope('range')
            }}
            placeholder="e.g. 1-3, 5"
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-sm"
          />
        </label>
      </div>

      {format === 'jpg' && (
        <>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Quality: {Math.round(quality * 100)}%
          </label>
          <input
            type="range"
            min={0.35}
            max={1}
            step={0.05}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full mb-4 accent-sky-600"
          />
        </>
      )}

      {progress && <p className="text-sm text-sky-600 mb-3">{progress}</p>}

      <button
        onClick={handleExport}
        disabled={working || (scope === 'range' && !rangeInput.trim())}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {working ? 'Exporting...' : `Download ${format.toUpperCase()}`}
      </button>
    </Modal>
  )
}
