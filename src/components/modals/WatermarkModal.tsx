import { useState } from 'react'
import { Modal } from './Modal'
import { addWatermark } from '../../lib/pageOperations'
import { useDocOperation } from '../../hooks/useDocOperation'

interface Props {
  onClose: () => void
}

export function WatermarkModal({ onClose }: Props) {
  const [text, setText] = useState('CONFIDENTIAL')
  const [opacity, setOpacity] = useState(0.18)
  const { applyOp, busy } = useDocOperation()

  async function handleApply() {
    if (!text.trim()) return
    const ok = await applyOp({
      transform: (bytes) => addWatermark(bytes, { text: text.trim(), opacity }),
      successMessage: 'Watermark added to every page',
    })
    if (ok) onClose()
  }

  return (
    <Modal title="Add Watermark" onClose={onClose}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Text</label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
      />

      <label className="block text-sm font-medium text-slate-700 mb-1">
        Opacity: {Math.round(opacity * 100)}%
      </label>
      <input
        type="range"
        min={0.05}
        max={0.5}
        step={0.01}
        value={opacity}
        onChange={(e) => setOpacity(Number(e.target.value))}
        className="w-full mb-4 accent-sky-600"
      />

      <p className="text-xs text-slate-400 mb-4">
        Drawn diagonally across the center of every page, written into the document
        immediately.
      </p>

      <button
        onClick={handleApply}
        disabled={busy || !text.trim()}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Applying…' : 'Add watermark'}
      </button>
    </Modal>
  )
}
