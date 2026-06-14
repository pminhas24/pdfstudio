import { useState } from 'react'
import { Modal } from './Modal'
import { extractSelectableText } from '../../lib/rasterOps'
import { usePdfStore } from '../../store/pdfStore'
import { showToast } from '../Toast/Toast'

interface Props {
  onClose: () => void
}

export function PdfToTextModal({ onClose }: Props) {
  const pdfDocument = usePdfStore((s) => s.pdfDocument)
  const pageCount = usePdfStore((s) => s.pageCount)
  const fileName = usePdfStore((s) => s.fileName)
  const [progress, setProgress] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  async function handleExtract() {
    if (!pdfDocument) return
    setWorking(true)
    try {
      const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
      const text = await extractSelectableText(pdfDocument, pages, (done, total) =>
        setProgress(`Extracting ${done} of ${total}...`),
      )
      if (!text.trim()) {
        showToast('No selectable text found. OCR is not implemented yet.', 'error')
        return
      }
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace(/\.pdf$/i, '') + '.txt'
      a.click()
      URL.revokeObjectURL(url)
      showToast('Text downloaded', 'success')
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Text extraction failed', 'error')
    } finally {
      setWorking(false)
      setProgress(null)
    }
  }

  return (
    <Modal title="PDF to Text" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-4">
        Extracts selectable text with PDF.js. Scanned pages require OCR, which is not implemented
        yet.
      </p>

      {progress && <p className="text-sm text-sky-600 mb-3">{progress}</p>}

      <button
        onClick={handleExtract}
        disabled={working}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {working ? 'Extracting...' : 'Download text'}
      </button>
    </Modal>
  )
}
