import { useState } from 'react'
import { Modal } from './Modal'
import { extractPages } from '../../lib/pageOperations'
import { parsePageRanges } from '../../lib/pageRanges'
import { downloadBytes, exportPdf } from '../../lib/pdfExporter'
import { usePdfStore } from '../../store/pdfStore'
import { useEditorStore } from '../../store/editorStore'
import { useAnnotationStore } from '../../store/annotationStore'
import { useFormStore } from '../../store/formStore'
import { showToast } from '../Toast/Toast'

interface Props {
  mode: 'split' | 'extract'
  onClose: () => void
}

export function SplitExtractModal({ mode, onClose }: Props) {
  const pageCount = usePdfStore((s) => s.pageCount)
  const fileName = usePdfStore((s) => s.fileName)
  const selectedPages = useEditorStore((s) => s.selectedPages)
  const [rangeInput, setRangeInput] = useState(
    mode === 'extract' && selectedPages.length > 0 ? selectedPages.join(', ') : '',
  )
  const [working, setWorking] = useState(false)

  function getPages(): number[] | null {
    try {
      return parsePageRanges(rangeInput, pageCount)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Invalid range', 'error')
      return null
    }
  }

  async function handleDownloadNew() {
    const pages = getPages()
    if (!pages) return
    setWorking(true)
    try {
      const bytes = usePdfStore.getState().pdfBytes
      if (!bytes) return
      const edited = await exportPdf(
        bytes,
        useAnnotationStore.getState().perPageJson,
        useFormStore.getState().values,
      )
      const out = await extractPages(
        edited.buffer.slice(
          edited.byteOffset,
          edited.byteOffset + edited.byteLength,
        ) as ArrayBuffer,
        pages,
      )
      const suffix = mode === 'split' ? 'split' : 'extracted'
      downloadBytes(new Uint8Array(out), fileName.replace(/\.pdf$/i, '') + `-${suffix}.pdf`)
      showToast(`Created PDF with ${pages.length} page${pages.length > 1 ? 's' : ''}`, 'success')
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Export failed', 'error')
    } finally {
      setWorking(false)
    }
  }

  const title = mode === 'split' ? 'Split PDF' : 'Extract pages'

  return (
    <Modal title={title} onClose={onClose}>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {mode === 'split' ? 'Page range for new PDF' : 'Pages to extract'}
      </label>
      <input
        value={rangeInput}
        onChange={(e) => setRangeInput(e.target.value)}
        placeholder={`e.g. 1-3, 5, 8-10  (${pageCount} pages)`}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-sky-400"
      />
      <p className="text-xs text-slate-400 mb-4">
        {mode === 'extract' && selectedPages.length > 0
          ? 'Pre-filled from the pages selected in the sidebar.'
          : 'Ranges are validated before download. The current document is not modified.'}
      </p>

      <button
        onClick={handleDownloadNew}
        disabled={working || !rangeInput.trim()}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {working ? 'Creating...' : `Download ${mode === 'split' ? 'split' : 'extracted'} PDF`}
      </button>
    </Modal>
  )
}
