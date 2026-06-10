import { useEditorStore } from '../../store/editorStore'
import { ToolsMenu } from '../ToolsMenu/ToolsMenu'
import type { ToolName, ShapeName } from '../../types/pdf'

const TOOLS: { name: ToolName; label: string; icon: string }[] = [
  { name: 'select', label: 'Select', icon: '↖' },
  { name: 'text', label: 'Text', icon: 'T' },
  { name: 'image', label: 'Image', icon: '🖼' },
  { name: 'draw', label: 'Draw', icon: '✏️' },
  { name: 'shape', label: 'Shape', icon: '◻' },
  { name: 'signature', label: 'Sign', icon: '✍' },
  { name: 'highlight', label: 'Highlight', icon: '🖍' },
]

const SHAPES: { name: ShapeName; label: string }[] = [
  { name: 'rect', label: '◻ Rectangle' },
  { name: 'circle', label: '◯ Circle' },
  { name: 'line', label: '— Line' },
  { name: 'arrow', label: '→ Arrow' },
]

interface Props {
  onDownload: () => void
  onUndo: () => void
  onRedo: () => void
  onOpenNew?: () => void
  exporting?: boolean
}

export function EditorToolbar({ onDownload, onUndo, onRedo, onOpenNew, exporting }: Props) {
  const { activeTool, setActiveTool, activeShape, setActiveShape, zoom, setZoom } =
    useEditorStore()

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">
      <div className="h-14 flex items-center gap-2 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-1">
          <div className="w-8 h-8 bg-gradient-to-br from-sky-600 to-sky-400 rounded-lg flex items-center justify-center text-white font-black text-sm shadow">
            P
          </div>
          <span className="text-base font-bold text-slate-900 hidden sm:block">
            PDF<span className="text-sky-600">Edit</span>
          </span>
        </div>

        {onOpenNew && (
          <button
            onClick={onOpenNew}
            className="text-xs text-slate-500 hover:text-sky-600 px-2 py-1 rounded hidden sm:block"
          >
            Open new
          </button>
        )}

        <div className="w-px h-7 bg-slate-200" />

        {/* Tools */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TOOLS.map((t) => (
            <button
              key={t.name}
              onClick={() => setActiveTool(t.name)}
              className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors shrink-0 ${
                activeTool === t.name
                  ? 'bg-sky-100 text-sky-700'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <span className="text-base leading-none">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="w-px h-7 bg-slate-200" />

        <ToolsMenu />

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          className="px-3 py-1.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors font-medium shrink-0"
        >
          ↩ Undo
        </button>
        <button
          onClick={onRedo}
          className="px-3 py-1.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors font-medium shrink-0"
        >
          ↪ Redo
        </button>

        {/* Zoom */}
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shrink-0">
          <button
            aria-label="Zoom out"
            onClick={() => setZoom(zoom - 0.25)}
            className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 border-r border-slate-200 text-sm"
          >
            −
          </button>
          <span className="px-2 text-xs font-semibold text-slate-700 min-w-[46px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            aria-label="Zoom in"
            onClick={() => setZoom(zoom + 0.25)}
            className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 border-l border-slate-200 text-sm"
          >
            +
          </button>
        </div>

        <div className="flex-1" />

        {/* Privacy badge */}
        <div className="items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-xs hidden lg:flex shrink-0">
          <span className="text-green-600">🔒</span>
          <span className="text-green-700 font-medium">Stays in your browser</span>
        </div>

        {/* Download */}
        <button
          onClick={onDownload}
          disabled={exporting}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors text-sm shrink-0"
        >
          {exporting ? '⏳ Exporting…' : '⬇ Download PDF'}
        </button>
      </div>

      {/* Shape picker row — shown only when the shape tool is active */}
      {activeTool === 'shape' && (
        <div className="flex items-center gap-1 px-4 pb-2">
          <span className="text-xs text-slate-400 mr-2">Shape:</span>
          {SHAPES.map((s) => (
            <button
              key={s.name}
              onClick={() => setActiveShape(s.name)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeShape === s.name
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
