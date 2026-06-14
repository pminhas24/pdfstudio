import { useState } from 'react'
import { Modal } from './Modal'
import { addWatermark, type WatermarkPosition } from '../../lib/pageOperations'
import { useDocOperation } from '../../hooks/useDocOperation'

interface Props {
  onClose: () => void
}

export function WatermarkModal({ onClose }: Props) {
  const [text, setText] = useState('CONFIDENTIAL')
  const [fontSize, setFontSize] = useState(50)
  const [opacity, setOpacity] = useState(0.18)
  const [rotation, setRotation] = useState(45)
  const [position, setPosition] = useState<WatermarkPosition>('center')
  const { applyOp, busy } = useDocOperation()

  async function handleApply() {
    if (!text.trim()) return
    const ok = await applyOp({
      transform: (bytes) =>
        addWatermark(bytes, { text: text.trim(), fontSize, opacity, rotation, position }),
      successMessage: 'Watermark added to every page',
    })
    if (ok) onClose()
  }

  return (
    <Modal title="Watermark" onClose={onClose}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Text</label>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
      />

      <label className="block text-sm font-medium text-slate-700 mb-1">Font size</label>
      <input
        type="number"
        min={8}
        max={160}
        value={fontSize}
        onChange={(e) => setFontSize(Number(e.target.value))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
      />

      <label className="block text-sm font-medium text-slate-700 mb-1">
        Opacity: {Math.round(opacity * 100)}%
      </label>
      <input
        type="range"
        min={0.05}
        max={0.8}
        step={0.01}
        value={opacity}
        onChange={(e) => setOpacity(Number(e.target.value))}
        className="w-full mb-4 accent-sky-600"
      />

      <label className="block text-sm font-medium text-slate-700 mb-1">Rotation angle</label>
      <input
        type="number"
        min={-180}
        max={180}
        value={rotation}
        onChange={(e) => setRotation(Number(e.target.value))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
      />

      <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
      <select
        value={position}
        onChange={(e) => setPosition(e.target.value as WatermarkPosition)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 bg-white"
      >
        <option value="center">Center</option>
        <option value="top">Top</option>
        <option value="bottom">Bottom</option>
      </select>

      <button
        onClick={handleApply}
        disabled={busy || !text.trim()}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Applying...' : 'Add watermark'}
      </button>
    </Modal>
  )
}
