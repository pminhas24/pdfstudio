import { useState } from 'react'
import { Modal } from './Modal'
import { compressPdf, type CompressPreset } from '../../lib/rasterOps'
import { useDocOperation } from '../../hooks/useDocOperation'
import { usePdfStore } from '../../store/pdfStore'

interface Props {
  onClose: () => void
}

const PRESET_LABELS: { value: CompressPreset; label: string; hint: string }[] = [
  { value: 'high', label: 'High quality', hint: 'Smaller file, near-original look' },
  { value: 'medium', label: 'Balanced', hint: 'Good quality, much smaller' },
  { value: 'low', label: 'Maximum compression', hint: 'Smallest file, visibly softer' },
]

export function CompressModal({ onClose }: Props) {
  const [preset, setPreset] = useState<CompressPreset>('medium')
  const [progress, setProgress] = useState<string | null>(null)
  const { applyOp, busy } = useDocOperation()
  const pdfDocument = usePdfStore((s) => s.pdfDocument)

  async function handleCompress() {
    if (!pdfDocument) return
    if (
      !window.confirm(
        'Compression rebuilds every page as an image. Text will no longer be selectable, and existing annotations should be downloaded first. Continue?',
      )
    )
      return
    const ok = await applyOp({
      transform: (bytes) =>
        compressPdf(pdfDocument, bytes, preset, (done, total) =>
          setProgress(`Compressing page ${done} of ${total}…`),
        ),
      successMessage: 'PDF compressed',
    })
    setProgress(null)
    if (ok) onClose()
  }

  return (
    <Modal title="Compress PDF" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-4">
        Pages are re-rendered as JPEG images — the only compression possible without a
        server. ⚠️ Text becomes unselectable.
      </p>

      <div className="space-y-2 mb-4">
        {PRESET_LABELS.map((p) => (
          <label
            key={p.value}
            className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
              preset === p.value ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-sky-300'
            }`}
          >
            <input
              type="radio"
              checked={preset === p.value}
              onChange={() => setPreset(p.value)}
              className="mt-0.5 accent-sky-600"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">{p.label}</span>
              <span className="block text-xs text-slate-500">{p.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {progress && <p className="text-sm text-sky-600 mb-3">{progress}</p>}

      <button
        onClick={handleCompress}
        disabled={busy}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Compressing…' : 'Compress'}
      </button>
    </Modal>
  )
}
