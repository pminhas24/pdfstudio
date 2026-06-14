import { useState } from 'react'
import { Modal } from './Modal'
import { rotatePages } from '../../lib/pageOperations'
import { parsePageRanges } from '../../lib/pageRanges'
import { remapAfterRotate } from '../../lib/annotationRemap'
import { useDocOperation } from '../../hooks/useDocOperation'
import { usePdfStore } from '../../store/pdfStore'
import { useEditorStore } from '../../store/editorStore'
import { showToast } from '../Toast/Toast'

interface Props {
  onClose: () => void
}

export function RotatePdfModal({ onClose }: Props) {
  const pdfDocument = usePdfStore((s) => s.pdfDocument)
  const pageCount = usePdfStore((s) => s.pageCount)
  const selectedPages = useEditorStore((s) => s.selectedPages)
  const [scope, setScope] = useState<'all' | 'range'>(
    selectedPages.length > 0 ? 'range' : 'all',
  )
  const [rangeInput, setRangeInput] = useState(selectedPages.join(', '))
  const { applyOp, busy } = useDocOperation()

  function getPages(): number[] | null {
    if (scope === 'all') return Array.from({ length: pageCount }, (_, i) => i + 1)
    try {
      return parsePageRanges(rangeInput, pageCount)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Invalid range', 'error')
      return null
    }
  }

  async function handleRotate() {
    if (!pdfDocument) return
    const pages = getPages()
    if (!pages) return
    const heights: Record<number, number> = {}
    for (const pageNum of pages) {
      const page = await pdfDocument.getPage(pageNum)
      heights[pageNum] = page.getViewport({ scale: 1 }).height
    }
    const ok = await applyOp({
      transform: (bytes) => rotatePages(bytes, pages, 90),
      remapAnnotations: (map) => {
        const out = { ...map }
        for (const pageNum of pages) {
          if (out[pageNum]) out[pageNum] = remapAfterRotate(out[pageNum], heights[pageNum])
        }
        return out
      },
      successMessage: `Rotated ${pages.length} page${pages.length > 1 ? 's' : ''}`,
    })
    if (ok) onClose()
  }

  return (
    <Modal title="Rotate PDF" onClose={onClose}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Scope</label>
      <select
        value={scope}
        onChange={(e) => setScope(e.target.value as 'all' | 'range')}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 bg-white"
      >
        <option value="all">All pages</option>
        <option value="range">Selected page range</option>
      </select>

      {scope === 'range' && (
        <>
          <label className="block text-sm font-medium text-slate-700 mb-1">Pages</label>
          <input
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            placeholder={`e.g. 1-3, 5  (${pageCount} pages)`}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </>
      )}

      <button
        onClick={handleRotate}
        disabled={busy || (scope === 'range' && !rangeInput.trim())}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Rotating...' : 'Rotate clockwise'}
      </button>
    </Modal>
  )
}
