import { useState } from 'react'
import { Modal } from './Modal'
import { extractPages } from '../../lib/pageOperations'
import { parsePageRanges } from '../../lib/pageRanges'
import { downloadBytes } from '../../lib/pdfExporter'
import { useDocOperation } from '../../hooks/useDocOperation'
import { usePdfStore } from '../../store/pdfStore'
import { useEditorStore } from '../../store/editorStore'
import { remapAfterReorder } from '../../lib/annotationRemap'
import { showToast } from '../Toast/Toast'

interface Props {
  onClose: () => void
}

export function SplitExtractModal({ onClose }: Props) {
  const pageCount = usePdfStore((s) => s.pageCount)
  const fileName = usePdfStore((s) => s.fileName)
  const selectedPages = useEditorStore((s) => s.selectedPages)
  const [rangeInput, setRangeInput] = useState(
    selectedPages.length > 0 ? selectedPages.join(', ') : '',
  )
  const [working, setWorking] = useState(false)
  const { applyOp, busy } = useDocOperation()

  function getPages(): number[] | null {
    try {
      return parsePageRanges(rangeInput, pageCount)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Invalid range', 'error')
      return null
    }
  }

  // Extract → download a new PDF, current document untouched. Annotations
  // are not included (they only burn in via the main Download button).
  async function handleDownloadNew() {
    const pages = getPages()
    if (!pages) return
    setWorking(true)
    try {
      const bytes = usePdfStore.getState().pdfBytes!
      const out = await extractPages(bytes, pages)
      downloadBytes(new Uint8Array(out), fileName.replace(/\.pdf$/i, '') + '-extracted.pdf')
      showToast(`Extracted ${pages.length} page${pages.length > 1 ? 's' : ''}`, 'success')
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Extract failed', 'error')
    } finally {
      setWorking(false)
    }
  }

  // Replace → the current document becomes only these pages.
  async function handleReplace() {
    const pages = getPages()
    if (!pages) return
    if (!window.confirm(`Keep only pages ${rangeInput}? Other pages will be removed.`)) return
    const ok = await applyOp({
      transform: (bytes) => extractPages(bytes, pages),
      remapAnnotations: (map) => remapAfterReorder(map, pages),
      successMessage: `Document now has ${pages.length} page${pages.length > 1 ? 's' : ''}`,
    })
    if (ok) onClose()
  }

  return (
    <Modal title="Split / Extract Pages" onClose={onClose}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        Pages to extract
      </label>
      <input
        value={rangeInput}
        onChange={(e) => setRangeInput(e.target.value)}
        placeholder={`e.g. 1-3, 5  (document has ${pageCount} pages)`}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-sky-400"
      />
      <p className="text-xs text-slate-400 mb-4">
        {selectedPages.length > 0
          ? 'Pre-filled from the pages you selected in the sidebar.'
          : 'Tip: select pages with the sidebar checkboxes to pre-fill this.'}
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={handleDownloadNew}
          disabled={working || busy || !rangeInput.trim()}
          className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
        >
          {working ? 'Extracting…' : 'Download as new PDF'}
        </button>
        <button
          onClick={handleReplace}
          disabled={working || busy || !rangeInput.trim()}
          className="w-full py-2.5 border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 rounded-lg text-sm font-semibold"
        >
          Keep only these pages (replace document)
        </button>
      </div>
    </Modal>
  )
}
