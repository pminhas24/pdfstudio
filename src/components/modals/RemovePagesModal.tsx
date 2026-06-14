import { useState } from 'react'
import { Modal } from './Modal'
import { removePages } from '../../lib/pageOperations'
import { parsePageRanges } from '../../lib/pageRanges'
import { remapAfterReorder } from '../../lib/annotationRemap'
import { useDocOperation } from '../../hooks/useDocOperation'
import { usePdfStore } from '../../store/pdfStore'
import { showToast } from '../Toast/Toast'

interface Props {
  onClose: () => void
}

export function RemovePagesModal({ onClose }: Props) {
  const pageCount = usePdfStore((s) => s.pageCount)
  const [rangeInput, setRangeInput] = useState('')
  const { applyOp, busy } = useDocOperation()

  function getPages(): number[] | null {
    try {
      return parsePageRanges(rangeInput, pageCount)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Invalid range', 'error')
      return null
    }
  }

  async function handleRemove() {
    const pages = getPages()
    if (!pages) return
    if (pages.length >= pageCount) {
      showToast('Cannot remove every page', 'error')
      return
    }
    if (!window.confirm(`Remove pages ${rangeInput}?`)) return
    const keep = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
      (page) => !pages.includes(page),
    )
    const ok = await applyOp({
      transform: (bytes) => removePages(bytes, pages),
      remapAnnotations: (map) => remapAfterReorder(map, keep),
      successMessage: `Removed ${pages.length} page${pages.length > 1 ? 's' : ''}`,
    })
    if (ok) onClose()
  }

  return (
    <Modal title="Remove pages" onClose={onClose}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Pages to remove</label>
      <input
        value={rangeInput}
        onChange={(e) => setRangeInput(e.target.value)}
        placeholder={`e.g. 2, 4-6  (${pageCount} pages)`}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-sky-400"
      />
      <button
        onClick={handleRemove}
        disabled={busy || !rangeInput.trim()}
        className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Removing...' : 'Remove pages'}
      </button>
    </Modal>
  )
}
