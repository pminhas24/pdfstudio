import { useState } from 'react'
import { Modal } from './Modal'
import { exportPagesAsImages } from '../../lib/rasterOps'
import { parsePageRanges } from '../../lib/pageRanges'
import { usePdfStore } from '../../store/pdfStore'
import { useEditorStore } from '../../store/editorStore'
import { showToast } from '../Toast/Toast'

interface Props {
  onClose: () => void
}

export function ExportImagesModal({ onClose }: Props) {
  const pdfDocument = usePdfStore((s) => s.pdfDocument)
  const pageCount = usePdfStore((s) => s.pageCount)
  const fileName = usePdfStore((s) => s.fileName)
  const currentPage = useEditorStore((s) => s.currentPage)
  const [scope, setScope] = useState<'current' | 'all' | 'range'>('current')
  const [rangeInput, setRangeInput] = useState('')
  const [progress, setProgress] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  async function handleExport() {
    if (!pdfDocument) return
    let pages: number[]
    if (scope === 'current') pages = [currentPage]
    else if (scope === 'all') pages = Array.from({ length: pageCount }, (_, i) => i + 1)
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
      await exportPagesAsImages(pdfDocument, pages, fileName, (done, total) =>
        setProgress(`Exporting ${done} of ${total}…`),
      )
      showToast(`${pages.length} PNG${pages.length > 1 ? 's' : ''} downloaded`, 'success')
      onClose()
    } catch (e) {
      showToast('Export failed', 'error')
    } finally {
      setWorking(false)
      setProgress(null)
    }
  }

  return (
    <Modal title="Export Pages as Images" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-3">
        Each page downloads as a separate PNG at 2× resolution. Annotations are not
        included (use Download PDF for that).
      </p>

      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="radio"
            checked={scope === 'current'}
            onChange={() => setScope('current')}
            className="accent-sky-600"
          />
          Current page ({currentPage})
        </label>
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
          Range:
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

      {progress && <p className="text-sm text-sky-600 mb-3">{progress}</p>}

      <button
        onClick={handleExport}
        disabled={working || (scope === 'range' && !rangeInput.trim())}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {working ? 'Exporting…' : 'Export'}
      </button>
    </Modal>
  )
}
