import { useEditorStore } from '../../store/editorStore'
import { ToolsMenu } from '../ToolsMenu/ToolsMenu'
import type { ToolModalName } from '../ToolsMenu/ToolsMenu'
import type { ToolName, ShapeName } from '../../types/pdf'

const TOOLS: { name: ToolName; label: string; icon: string }[] = [
  { name: 'select', label: 'Select', icon: 'SEL' },
  { name: 'text', label: 'Text', icon: 'T' },
  { name: 'image', label: 'Image', icon: 'IMG' },
  { name: 'draw', label: 'Draw', icon: 'PEN' },
  { name: 'shape', label: 'Shape', icon: 'BOX' },
  { name: 'signature', label: 'Sign', icon: 'SIG' },
  { name: 'highlight', label: 'Highlight', icon: 'HL' },
]

const SHAPES: { name: ShapeName; label: string }[] = [
  { name: 'rect', label: 'Rectangle' },
  { name: 'circle', label: 'Circle' },
  { name: 'line', label: 'Line' },
  { name: 'arrow', label: 'Arrow' },
]

interface Props {
  onDownload: () => void
  onUndo: () => void
  onRedo: () => void
  onOpenNew?: () => void
  exporting?: boolean
  pageCount?: number
  fileName?: string
  workflowLabel?: string | null
  requestedModal?: ToolModalName | null
  onRequestedModalOpened?: () => void
}

export function EditorToolbar({
  onDownload,
  onUndo,
  onRedo,
  onOpenNew,
  exporting,
  pageCount,
  fileName,
  workflowLabel,
  requestedModal,
  onRequestedModalOpened,
}: Props) {
  const {
    interactionMode,
    setInteractionMode,
    activeTool,
    setActiveTool,
    activeShape,
    setActiveShape,
    zoom,
    setZoom,
    currentPage,
  } = useEditorStore()

  function activateTool(tool: ToolName) {
    setInteractionMode('annotate')
    setActiveTool(tool)
  }

  return (
    <div className="sticky top-0 z-40 shrink-0 border-b border-slate-300 bg-white/95 shadow-lg backdrop-blur">
      <div className="flex min-h-20 items-center gap-3 overflow-x-auto px-4 py-3 sm:px-5">
        <div className="flex shrink-0 items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-base font-black text-white shadow-sm">
            P
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="text-base font-bold leading-tight text-slate-900">PDF Studio</p>
            {fileName && (
              <p className="max-w-44 truncate text-xs font-medium text-slate-500">
                {fileName}
              </p>
            )}
          </div>
        </div>

        {onOpenNew && (
          <button
            onClick={onOpenNew}
            className="hidden shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-sky-700 sm:block"
          >
            Open new
          </button>
        )}

        <div className="h-10 w-px shrink-0 bg-slate-200" />

        <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setInteractionMode('annotate')}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
              interactionMode === 'annotate'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            Annotation/Edit Mode
          </button>
          <button
            type="button"
            onClick={() => {
              setInteractionMode('form')
              setActiveTool('select')
            }}
            className={`border-l border-slate-200 px-4 py-2.5 text-sm font-semibold transition-colors ${
              interactionMode === 'form'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            Form Fill Mode
          </button>
        </div>

        <div className="h-10 w-px shrink-0 bg-slate-200" />

        <div className="flex shrink-0 gap-1.5">
          {TOOLS.map((tool) => (
            <button
              key={tool.name}
              onClick={() => activateTool(tool.name)}
              aria-pressed={interactionMode === 'annotate' && activeTool === tool.name}
              className={`flex min-w-16 flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                interactionMode === 'annotate' && activeTool === tool.name
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
              title={tool.label}
            >
              <span className="text-xs leading-none">{tool.icon}</span>
              {tool.label}
            </button>
          ))}
        </div>

        <div className="h-10 w-px shrink-0 bg-slate-200" />

        <ToolsMenu
          requestedModal={requestedModal}
          onRequestedModalOpened={onRequestedModalOpened}
        />

        <div className="h-10 w-px shrink-0 bg-slate-200" />

        <button
          onClick={onUndo}
          className="shrink-0 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
        >
          Undo
        </button>
        <button
          onClick={onRedo}
          className="shrink-0 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
        >
          Redo
        </button>

        <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-slate-200">
          <button
            aria-label="Zoom out"
            onClick={() => setZoom(zoom - 0.25)}
            className="border-r border-slate-200 px-3 py-2.5 text-base font-semibold text-slate-600 hover:bg-slate-100"
          >
            -
          </button>
          <span className="min-w-[54px] px-2 text-center text-sm font-semibold text-slate-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            aria-label="Zoom in"
            onClick={() => setZoom(zoom + 0.25)}
            className="border-l border-slate-200 px-3 py-2.5 text-base font-semibold text-slate-600 hover:bg-slate-100"
          >
            +
          </button>
        </div>

        {pageCount ? (
          <div className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Page {currentPage} of {pageCount}
          </div>
        ) : null}

        <div className="min-w-2 flex-1" />

        <div className="hidden shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 lg:flex">
          Files stay in your browser
        </div>

        <button
          onClick={onDownload}
          disabled={exporting}
          className="sticky right-0 z-10 shrink-0 rounded-lg bg-sky-600 px-6 py-3 text-base font-bold text-white shadow-md shadow-sky-900/15 transition-colors hover:bg-sky-700 disabled:opacity-60"
        >
          {exporting ? 'Exporting...' : 'Download PDF'}
        </button>
      </div>

      {workflowLabel && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-sm font-medium text-slate-600">
          Workflow: {workflowLabel} / Upload PDF / {fileName || 'Open document'}
        </div>
      )}

      <div className="border-t border-slate-100 bg-white px-5 py-2 text-sm font-semibold text-slate-700">
        Current mode:{' '}
        <span className="text-sky-700">
          {interactionMode === 'form' ? 'Form Fill Mode' : 'Annotation/Edit Mode'}
        </span>
      </div>

      {activeTool === 'shape' && (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 px-5 py-2">
          <span className="mr-2 shrink-0 text-sm font-semibold text-slate-500">Shape</span>
          {SHAPES.map((shape) => (
            <button
              key={shape.name}
              onClick={() => setActiveShape(shape.name)}
              className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                activeShape === shape.name
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {shape.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
