import { useState } from 'react'
import { Modal } from './Modal'
import { ocrPage } from '../../lib/ocr'
import { usePdfStore } from '../../store/pdfStore'
import { useEditorStore } from '../../store/editorStore'
import { showToast } from '../Toast/Toast'

interface Props {
  onClose: () => void
}

export function OcrModal({ onClose }: Props) {
  const pdfDocument = usePdfStore((s) => s.pdfDocument)
  const currentPage = useEditorStore((s) => s.currentPage)
  const [text, setText] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [working, setWorking] = useState(false)

  async function handleRun() {
    if (!pdfDocument) return
    setWorking(true)
    setText(null)
    try {
      const result = await ocrPage(pdfDocument, currentPage, setProgress)
      setText(result.trim() || '(No text recognized on this page)')
    } catch (e) {
      console.error(e)
      showToast('OCR failed — check your internet connection (the OCR engine downloads on first use)', 'error')
    } finally {
      setWorking(false)
      setProgress(0)
    }
  }

  async function handleCopy() {
    if (!text) return
    await navigator.clipboard.writeText(text)
    showToast('Text copied to clipboard', 'success')
  }

  return (
    <Modal title={`OCR — Page ${currentPage}`} onClose={onClose} wide>
      <p className="text-sm text-slate-500 mb-3">
        Recognizes text in scanned pages. The OCR engine (~5&nbsp;MB) downloads from a CDN
        on first use — your PDF itself never leaves the browser.
      </p>

      {!text && (
        <button
          onClick={handleRun}
          disabled={working}
          className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold mb-3"
        >
          {working
            ? progress > 0
              ? `Recognizing… ${Math.round(progress * 100)}%`
              : 'Loading OCR engine…'
            : `Recognize text on page ${currentPage}`}
        </button>
      )}

      {working && (
        <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
          <div
            className="bg-sky-500 h-2 transition-all"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      )}

      {text && (
        <>
          <textarea
            readOnly
            value={text}
            className="w-full h-64 border border-slate-200 rounded-lg p-3 text-sm font-mono text-slate-800 mb-3 resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold"
            >
              📋 Copy text
            </button>
            <button
              onClick={handleRun}
              className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold"
            >
              Run again
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
