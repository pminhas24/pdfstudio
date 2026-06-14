import { useState } from 'react'
import { Modal } from './Modal'
import { addPageNumbers, type PageNumberPosition } from '../../lib/pageOperations'
import { useDocOperation } from '../../hooks/useDocOperation'

interface Props {
  onClose: () => void
}

export function PageNumbersModal({ onClose }: Props) {
  const [position, setPosition] = useState<PageNumberPosition>('bottom-center')
  const [startAt, setStartAt] = useState(1)
  const [fontSize, setFontSize] = useState(11)
  const { applyOp, busy } = useDocOperation()

  async function handleApply() {
    const ok = await applyOp({
      transform: (bytes) => addPageNumbers(bytes, { position, startAt, fontSize }),
      successMessage: 'Page numbers added',
    })
    if (ok) onClose()
  }

  return (
    <Modal title="Page numbers" onClose={onClose}>
      <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
      <select
        value={position}
        onChange={(e) => setPosition(e.target.value as PageNumberPosition)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 bg-white"
      >
        <option value="bottom-center">Bottom center</option>
        <option value="bottom-left">Bottom left</option>
        <option value="bottom-right">Bottom right</option>
      </select>

      <label className="block text-sm font-medium text-slate-700 mb-1">Starting number</label>
      <input
        type="number"
        min={0}
        value={startAt}
        onChange={(e) => setStartAt(Number(e.target.value))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
      />

      <label className="block text-sm font-medium text-slate-700 mb-1">Font size</label>
      <input
        type="number"
        min={6}
        max={72}
        value={fontSize}
        onChange={(e) => setFontSize(Number(e.target.value))}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4"
      />

      <button
        onClick={handleApply}
        disabled={busy}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Adding...' : 'Add page numbers'}
      </button>
    </Modal>
  )
}
