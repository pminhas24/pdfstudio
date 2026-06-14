import { useEffect, useState } from 'react'
import type { Canvas as FabricCanvas, FabricObject } from 'fabric'
import { useEditorStore } from '../../store/editorStore'
import {
  deleteActiveObject,
  duplicateObject,
  isObjectLocked,
  moveObjectLayer,
  setObjectLocked,
} from '../../lib/fabricObjectActions'

interface Props {
  fabricCanvas: FabricCanvas | null
}

interface ObjProps {
  text: string
  fontSize: number
  fill: string
  stroke: string
  strokeWidth: number
  opacity: number
  left: number
  top: number
  locked: boolean
}

const PRESET_COLORS = [
  '#111827',
  '#ef4444',
  '#0284c7',
  '#16a34a',
  '#f59e0b',
  '#8b5cf6',
  '#fde047',
  '#ffffff',
  'transparent',
]

function getString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function readProps(obj: FabricObject): ObjProps {
  const o = obj as FabricObject & {
    text?: string
    fontSize?: number
    stroke?: unknown
    strokeWidth?: number
  }
  return {
    text: o.text ?? '',
    fontSize: o.fontSize ?? 16,
    fill: getString(o.fill, '#111827'),
    stroke: getString(o.stroke, '#0284c7'),
    strokeWidth: o.strokeWidth ?? 0,
    opacity: o.opacity ?? 1,
    left: Math.round(o.left ?? 0),
    top: Math.round(o.top ?? 0),
    locked: isObjectLocked(obj),
  }
}

function objectKind(obj: FabricObject): 'text' | 'image' | 'path' | 'shape' | 'highlight' {
  const type = obj.type?.toLowerCase()
  if (type === 'i-text' || type === 'itext' || type === 'textbox' || type === 'text') {
    return 'text'
  }
  if (type === 'image') return 'image'
  if (type === 'path') return 'path'
  if (type === 'rect' && (obj.opacity ?? 1) < 0.7 && !obj.stroke) return 'highlight'
  return 'shape'
}

export function PropertiesPanel({ fabricCanvas }: Props) {
  const [selected, setSelected] = useState<FabricObject | null>(null)
  const [props, setProps] = useState<ObjProps | null>(null)
  const activeTool = useEditorStore((s) => s.activeTool)
  const drawColor = useEditorStore((s) => s.drawColor)
  const drawWidth = useEditorStore((s) => s.drawWidth)
  const drawOpacity = useEditorStore((s) => s.drawOpacity)
  const setDrawColor = useEditorStore((s) => s.setDrawColor)
  const setDrawWidth = useEditorStore((s) => s.setDrawWidth)
  const setDrawOpacity = useEditorStore((s) => s.setDrawOpacity)

  useEffect(() => {
    if (!fabricCanvas) {
      setSelected(null)
      setProps(null)
      return
    }

    const sync = () => {
      const obj = fabricCanvas.getActiveObject() ?? null
      setSelected(obj)
      setProps(obj ? readProps(obj) : null)
    }
    const clear = () => {
      setSelected(null)
      setProps(null)
    }

    sync()
    fabricCanvas.on('selection:created', sync)
    fabricCanvas.on('selection:updated', sync)
    fabricCanvas.on('selection:cleared', clear)
    fabricCanvas.on('object:modified', sync)
    fabricCanvas.on('object:scaling', sync)
    fabricCanvas.on('object:moving', sync)
    return () => {
      fabricCanvas.off('selection:created', sync)
      fabricCanvas.off('selection:updated', sync)
      fabricCanvas.off('selection:cleared', clear)
      fabricCanvas.off('object:modified', sync)
      fabricCanvas.off('object:scaling', sync)
      fabricCanvas.off('object:moving', sync)
    }
  }, [fabricCanvas])

  function persist(obj: FabricObject = selected!) {
    if (!fabricCanvas || !obj) return
    obj.setCoords()
    fabricCanvas.requestRenderAll()
    fabricCanvas.fire('object:modified', { target: obj })
    setProps(readProps(obj))
  }

  function apply(updates: Record<string, unknown>) {
    if (!selected || !fabricCanvas) return
    selected.set(updates)
    persist(selected)
  }

  async function duplicateSelected() {
    if (!selected || !fabricCanvas) return
    const clone = await duplicateObject(fabricCanvas, selected)
    if (clone) {
      setSelected(clone)
      setProps(readProps(clone))
    }
  }

  function deleteSelected() {
    if (!fabricCanvas) return
    if (deleteActiveObject(fabricCanvas)) {
      setSelected(null)
      setProps(null)
    }
  }

  function toggleLock() {
    if (!selected) return
    setObjectLocked(selected, !isObjectLocked(selected))
    persist(selected)
  }

  function layer(action: 'forward' | 'backward' | 'front' | 'back') {
    if (!selected || !fabricCanvas) return
    moveObjectLayer(fabricCanvas, selected, action)
  }

  if (!selected || !props) {
    if (activeTool === 'draw') {
      return (
        <div className="w-64 max-w-[85vw] bg-white border-l border-slate-200 p-4 shrink-0 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
            Draw
          </p>
          <ColorControl label="Stroke" value={drawColor} onChange={setDrawColor} />
          <NumberControl
            label="Stroke width"
            value={drawWidth}
            min={1}
            max={40}
            onChange={setDrawWidth}
          />
          <OpacityControl value={drawOpacity} onChange={setDrawOpacity} />
        </div>
      )
    }

    return (
      <div className="w-64 max-w-[85vw] bg-white border-l border-slate-200 p-4 shrink-0 flex-col hidden md:flex">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
          Properties
        </p>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-800">No object selected</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Use Select, then click text, images, drawings, signatures, highlights, or shapes to
            edit style and position.
          </p>
        </div>
        <div className="mt-3 rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-600">Active tool</p>
          <p className="mt-1 text-sm font-bold capitalize text-sky-700">{activeTool}</p>
        </div>
        <div className="mt-3 text-xs leading-relaxed text-slate-500">
          Page actions live in the left sidebar. Document tools are in the top toolbar.
        </div>
      </div>
    )
  }

  const kind = objectKind(selected)
  const isText = kind === 'text'
  const isImage = kind === 'image'
  const isPath = kind === 'path'
  const isHighlight = kind === 'highlight'
  const isShape = kind === 'shape'

  return (
    <div className="w-64 max-w-[85vw] bg-white border-l border-slate-200 p-4 shrink-0 overflow-y-auto">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
        {kind === 'path' ? 'Drawing' : kind.charAt(0).toUpperCase() + kind.slice(1)}
      </p>

      {isText && (
        <>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Text</label>
          <textarea
            value={props.text}
            onChange={(e) => apply({ text: e.target.value })}
            className="w-full min-h-20 border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-3 bg-slate-50 resize-none"
          />
          <NumberControl
            label="Font size"
            value={props.fontSize}
            min={6}
            max={160}
            onChange={(fontSize) => apply({ fontSize })}
          />
          <ColorControl label="Color" value={props.fill} onChange={(fill) => apply({ fill })} />
        </>
      )}

      {isImage && <OpacityControl value={props.opacity} onChange={(opacity) => apply({ opacity })} />}

      {isPath && (
        <>
          <ColorControl
            label="Stroke"
            value={props.stroke}
            onChange={(stroke) => apply({ stroke })}
          />
          <NumberControl
            label="Stroke width"
            value={props.strokeWidth || 1}
            min={1}
            max={40}
            onChange={(strokeWidth) => apply({ strokeWidth })}
          />
          <OpacityControl value={props.opacity} onChange={(opacity) => apply({ opacity })} />
        </>
      )}

      {isShape && (
        <>
          <ColorControl label="Fill" value={props.fill} onChange={(fill) => apply({ fill })} />
          <ColorControl
            label="Border"
            value={props.stroke}
            onChange={(stroke) => apply({ stroke })}
          />
          <NumberControl
            label="Border width"
            value={props.strokeWidth}
            min={0}
            max={40}
            onChange={(strokeWidth) => apply({ strokeWidth })}
          />
          <OpacityControl value={props.opacity} onChange={(opacity) => apply({ opacity })} />
        </>
      )}

      {isHighlight && (
        <>
          <ColorControl label="Color" value={props.fill} onChange={(fill) => apply({ fill })} />
          <OpacityControl value={props.opacity} onChange={(opacity) => apply({ opacity })} />
        </>
      )}

      {!isImage && !isPath && !isShape && !isHighlight && !isText && (
        <OpacityControl value={props.opacity} onChange={(opacity) => apply({ opacity })} />
      )}

      {!isImage && !isPath && !isShape && !isHighlight && !isText ? null : (
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          <div>
            <label className="text-[10px] text-slate-400">X</label>
            <div className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50">
              {props.left}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Y</label>
            <div className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50">
              {props.top}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <button
          onClick={duplicateSelected}
          className="py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
        >
          Duplicate
        </button>
        <button
          onClick={toggleLock}
          className={`py-1.5 border rounded-lg text-xs ${
            props.locked
              ? 'border-amber-300 bg-amber-50 text-amber-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {props.locked ? 'Unlock' : 'Lock'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-4">
        <button
          className="py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
          onClick={() => layer('forward')}
        >
          Forward
        </button>
        <button
          className="py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
          onClick={() => layer('backward')}
        >
          Backward
        </button>
        <button
          className="py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
          onClick={() => layer('front')}
        >
          To front
        </button>
        <button
          className="py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
          onClick={() => layer('back')}
        >
          To back
        </button>
      </div>

      <button
        onClick={deleteSelected}
        className="w-full py-2 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
      >
        Remove
      </button>
    </div>
  )
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            aria-label={`${label} ${c}`}
            onClick={() => onChange(c)}
            style={{
              background:
                c === 'transparent'
                  ? 'linear-gradient(135deg, #fff 0 45%, #ef4444 45% 55%, #fff 55%)'
                  : c,
            }}
            className={`w-5 h-5 rounded-md border transition-all ${
              value === c ? 'ring-2 ring-sky-500 ring-offset-1' : 'border-slate-200'
            }`}
          />
        ))}
      </div>
    </>
  )
}

function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-3 bg-slate-50"
      />
    </>
  )
}

function OpacityControl({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <>
      <label className="block text-xs font-semibold text-slate-600 mb-1">
        Opacity: {Math.round(value * 100)}%
      </label>
      <input
        type="range"
        min={0.05}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mb-3 accent-sky-600"
      />
    </>
  )
}
