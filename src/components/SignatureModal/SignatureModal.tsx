import { useRef, useState, useEffect } from 'react'
import type { Canvas as FabricCanvas } from 'fabric'
import { addSignatureFromDataUrl, addTypedSignature } from '../../tools/SignatureTool'

type Tab = 'draw' | 'type' | 'upload'

interface Props {
  fabricCanvas: FabricCanvas
  onClose: () => void
}

export function SignatureModal({ fabricCanvas, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('draw')
  const [typedText, setTypedText] = useState('')
  const drawCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const hasInk = useRef(false)

  useEffect(() => {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1e3a8a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const src = 'touches' in e ? e.touches[0] : e
      // The canvas's CSS size can differ from its pixel size; map into
      // pixel coordinates so strokes land under the cursor.
      return {
        x: ((src.clientX - rect.left) / rect.width) * canvas.width,
        y: ((src.clientY - rect.top) / rect.height) * canvas.height,
      }
    }

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      isDrawing.current = true
      hasInk.current = true
      const pos = getPos(e)
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return
      e.preventDefault()
      const pos = getPos(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    const end = () => {
      isDrawing.current = false
    }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', draw)
    window.addEventListener('mouseup', end)
    canvas.addEventListener('touchstart', start, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', end)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', draw)
      window.removeEventListener('mouseup', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', end)
    }
  }, [tab])

  function clearDrawCanvas() {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    hasInk.current = false
  }

  async function applyDrawn() {
    const canvas = drawCanvasRef.current
    if (!canvas || !hasInk.current) return
    await addSignatureFromDataUrl(fabricCanvas, canvas.toDataURL('image/png'))
    onClose()
  }

  function applyTyped() {
    if (!typedText.trim()) return
    addTypedSignature(fabricCanvas, typedText.trim())
    onClose()
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      await addSignatureFromDataUrl(fabricCanvas, reader.result as string)
      onClose()
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">Add Signature</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
          {(['draw', 'type', 'upload'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'draw' && (
          <div>
            <canvas
              ref={drawCanvasRef}
              width={400}
              height={160}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-crosshair touch-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={clearDrawCanvas}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Clear
              </button>
              <button
                onClick={applyDrawn}
                className="flex-1 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700"
              >
                Use Signature
              </button>
            </div>
          </div>
        )}

        {tab === 'type' && (
          <div>
            <input
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Type your name"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-2xl italic font-serif text-blue-900 mb-3 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            <button
              onClick={applyTyped}
              className="w-full py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700"
            >
              Use Signature
            </button>
          </div>
        )}

        {tab === 'upload' && (
          <div className="text-center py-6">
            <p className="text-slate-500 text-sm mb-4">Upload a PNG or JPG of your signature</p>
            <label className="cursor-pointer bg-sky-600 hover:bg-sky-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm">
              Choose Image
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
