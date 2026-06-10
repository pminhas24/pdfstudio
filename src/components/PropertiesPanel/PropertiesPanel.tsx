import { useEffect, useState } from 'react'
import type { Canvas as FabricCanvas, FabricObject } from 'fabric'

interface Props {
  fabricCanvas: FabricCanvas | null
}

interface ObjProps {
  fontSize: number
  fontFamily: string
  fill: string
  fontWeight: string
  fontStyle: string
  underline: boolean
  opacity: number
  left: number
  top: number
}

const PRESET_COLORS = [
  '#111827',
  '#ef4444',
  '#0284c7',
  '#16a34a',
  '#f59e0b',
  '#8b5cf6',
  '#ffffff',
]
const FONTS = ['Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Arial']

function readProps(obj: FabricObject): ObjProps {
  const o = obj as FabricObject & Partial<ObjProps>
  return {
    fontSize: o.fontSize ?? 16,
    fontFamily: o.fontFamily ?? 'Helvetica',
    fill: typeof o.fill === 'string' ? o.fill : '#111827',
    fontWeight: String(o.fontWeight ?? 'normal'),
    fontStyle: o.fontStyle ?? 'normal',
    underline: o.underline ?? false,
    opacity: o.opacity ?? 1,
    left: Math.round(o.left ?? 0),
    top: Math.round(o.top ?? 0),
  }
}

export function PropertiesPanel({ fabricCanvas }: Props) {
  const [selected, setSelected] = useState<FabricObject | null>(null)
  const [props, setProps] = useState<ObjProps | null>(null)

  useEffect(() => {
    if (!fabricCanvas) {
      setSelected(null)
      setProps(null)
      return
    }

    const onSelect = () => {
      const obj = fabricCanvas.getActiveObject() ?? null
      setSelected(obj)
      setProps(obj ? readProps(obj) : null)
    }
    const onDeselect = () => {
      setSelected(null)
      setProps(null)
    }

    onSelect() // pick up an already-active selection when the page changes

    fabricCanvas.on('selection:created', onSelect)
    fabricCanvas.on('selection:updated', onSelect)
    fabricCanvas.on('selection:cleared', onDeselect)
    fabricCanvas.on('object:modified', onSelect) // refresh X/Y after moves
    return () => {
      fabricCanvas.off('selection:created', onSelect)
      fabricCanvas.off('selection:updated', onSelect)
      fabricCanvas.off('selection:cleared', onDeselect)
      fabricCanvas.off('object:modified', onSelect)
    }
  }, [fabricCanvas])

  function apply(updates: Partial<ObjProps>) {
    if (!selected || !fabricCanvas || !props) return
    selected.set(updates)
    fabricCanvas.renderAll()
    // set() alone doesn't emit object:modified, so persist explicitly
    fabricCanvas.fire('object:modified', { target: selected })
    setProps({ ...props, ...updates })
  }

  function deleteSelected() {
    if (!selected || !fabricCanvas) return
    fabricCanvas.remove(selected)
    fabricCanvas.discardActiveObject()
    fabricCanvas.renderAll()
    setSelected(null)
    setProps(null)
  }

  if (!selected || !props) {
    return (
      <div className="w-48 bg-white border-l border-slate-200 p-4 shrink-0 flex-col items-center justify-center hidden md:flex">
        <p className="text-slate-400 text-xs text-center leading-relaxed">
          Select an object on the page to edit its properties
        </p>
      </div>
    )
  }

  const isText = selected.type === 'i-text' || selected.type === 'textbox'

  return (
    <div className="w-48 bg-white border-l border-slate-200 p-4 shrink-0 overflow-y-auto">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
        Properties
      </p>

      {isText && (
        <>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Font</label>
          <select
            value={props.fontFamily}
            onChange={(e) => apply({ fontFamily: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-3 bg-slate-50"
          >
            {FONTS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>

          <label className="block text-xs font-semibold text-slate-600 mb-1">Size</label>
          <div className="flex gap-1 mb-3">
            <input
              type="number"
              min={6}
              max={120}
              value={props.fontSize}
              onChange={(e) => apply({ fontSize: Number(e.target.value) })}
              className="flex-1 w-0 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50"
            />
            <button
              onClick={() => apply({ fontSize: Math.max(6, props.fontSize - 1) })}
              className="px-2 border border-slate-200 rounded-lg text-xs hover:bg-slate-100"
            >
              −
            </button>
            <button
              onClick={() => apply({ fontSize: props.fontSize + 1 })}
              className="px-2 border border-slate-200 rounded-lg text-xs hover:bg-slate-100"
            >
              +
            </button>
          </div>

          <label className="block text-xs font-semibold text-slate-600 mb-1">Style</label>
          <div className="flex gap-1 mb-3">
            <button
              onClick={() =>
                apply({ fontWeight: props.fontWeight === 'bold' ? 'normal' : 'bold' })
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs font-black border transition-colors ${
                props.fontWeight === 'bold'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              B
            </button>
            <button
              onClick={() =>
                apply({ fontStyle: props.fontStyle === 'italic' ? 'normal' : 'italic' })
              }
              className={`px-2.5 py-1.5 rounded-lg text-xs italic border transition-colors ${
                props.fontStyle === 'italic'
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              I
            </button>
            <button
              onClick={() => apply({ underline: !props.underline })}
              className={`px-2.5 py-1.5 rounded-lg text-xs underline border transition-colors ${
                props.underline
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              U
            </button>
          </div>
        </>
      )}

      <label className="block text-xs font-semibold text-slate-600 mb-1">Color</label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            aria-label={`Color ${c}`}
            onClick={() => apply({ fill: c })}
            style={{ background: c }}
            className={`w-5 h-5 rounded-md border transition-all ${
              props.fill === c ? 'ring-2 ring-sky-500 ring-offset-1' : 'border-slate-200'
            }`}
          />
        ))}
      </div>

      <label className="block text-xs font-semibold text-slate-600 mb-1">
        Opacity: {Math.round(props.opacity * 100)}%
      </label>
      <input
        type="range"
        min={0.1}
        max={1}
        step={0.05}
        value={props.opacity}
        onChange={(e) => apply({ opacity: Number(e.target.value) })}
        className="w-full mb-3 accent-sky-600"
      />

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

      <button
        onClick={deleteSelected}
        className="w-full py-2 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
      >
        🗑 Remove
      </button>
    </div>
  )
}
