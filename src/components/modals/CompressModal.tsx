import { useState } from 'react'
import { Modal } from './Modal'
import { optimizePdf } from '../../lib/pageOperations'
import { useDocOperation } from '../../hooks/useDocOperation'
import { usePdfStore } from '../../store/pdfStore'

interface Props {
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function CompressModal({ onClose }: Props) {
  const originalBytes = usePdfStore((s) => s.pdfBytes)
  const { applyOp, busy } = useDocOperation()
  const [result, setResult] = useState<{
    original: number
    compressed: number
    savedPercent: number
  } | null>(null)

  async function handleCompress() {
    if (!originalBytes) return
    let compressedSize = originalBytes.byteLength
    const ok = await applyOp({
      transform: async (bytes) => {
        const out = await optimizePdf(bytes)
        compressedSize = out.byteLength
        return out
      },
      successMessage: 'PDF optimized',
    })
    if (!ok) return
    const savedPercent =
      originalBytes.byteLength > 0
        ? Math.max(0, (1 - compressedSize / originalBytes.byteLength) * 100)
        : 0
    setResult({
      original: originalBytes.byteLength,
      compressed: compressedSize,
      savedPercent,
    })
  }

  return (
    <Modal title="Compress PDF" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-4">
        Files stay in your browser. This safely rebuilds the PDF and removes document metadata
        where possible. It does not rasterize pages or fake image compression.
      </p>

      <button
        onClick={handleCompress}
        disabled={busy || !originalBytes}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Optimizing...' : 'Optimize PDF'}
      </button>

      {result && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <div>Original: {formatBytes(result.original)}</div>
          <div>Optimized: {formatBytes(result.compressed)}</div>
          <div>Saved: {result.savedPercent.toFixed(1)}%</div>
          {result.savedPercent < 2 && (
            <p className="mt-2 text-slate-500">This PDF may already be optimized.</p>
          )}
        </div>
      )}
    </Modal>
  )
}
