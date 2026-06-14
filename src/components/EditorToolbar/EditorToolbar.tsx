import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditorStore } from '../../store/editorStore'
import { ToolsMenu } from '../ToolsMenu/ToolsMenu'
import type { ToolModalName } from '../ToolsMenu/ToolsMenu'
import type { ToolName, ShapeName } from '../../types/pdf'

const PRIMARY_TOOLS: { name: ToolName; label: string; icon: string }[] = [
  { name: 'select', label: 'Select', icon: 'SEL' },
  { name: 'text', label: 'Text', icon: 'T' },
  { name: 'image', label: 'Image', icon: 'IMG' },
  { name: 'draw', label: 'Draw', icon: 'PEN' },
]

const MORE_TOOLS: { name: ToolName; label: string; icon: string }[] = [
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
  const [moreOpen, setMoreOpen] = useState(false)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const [morePosition, setMorePosition] = useState({ top: 0, left: 0 })

  function activateTool(tool: ToolName) {
    setInteractionMode('annotate')
    setActiveTool(tool)
    setMoreOpen(false)
  }

  useEffect(() => {
    if (!moreOpen) return

    function updatePosition() {
      const rect = moreButtonRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuWidth = 176
      const margin = 8
      setMorePosition({
        top: rect.bottom + margin,
        left: Math.min(
          Math.max(margin, rect.left),
          Math.max(margin, window.innerWidth - menuWidth - margin),
        ),
      })
    }

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (moreButtonRef.current?.contains(target) || moreMenuRef.current?.contains(target)) return
      setMoreOpen(false)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }

    updatePosition()
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [moreOpen])

  return (
    <div className="sticky top-0 z-40 shrink-0 border-b border-slate-300 bg-white/95 shadow-lg backdrop-blur">
      <div className="flex min-h-[72px] items-center gap-2 overflow-hidden px-3 py-2.5 lg:gap-3 lg:px-4">
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
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
            className="hidden shrink-0 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-sky-700 sm:block"
          >
            Open new
          </button>
        )}

        <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setInteractionMode('annotate')}
            className={`px-3 py-2 text-sm font-semibold transition-colors ${
              interactionMode === 'annotate'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setInteractionMode('form')
              setActiveTool('select')
            }}
            className={`border-l border-slate-200 px-3 py-2 text-sm font-semibold transition-colors ${
              interactionMode === 'form'
                ? 'bg-sky-600 text-white'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            Forms
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-1.5 py-1 no-scrollbar">
          {PRIMARY_TOOLS.map((tool) => (
            <button
              key={tool.name}
              onClick={() => activateTool(tool.name)}
              aria-pressed={interactionMode === 'annotate' && activeTool === tool.name}
              className={`flex min-w-14 shrink-0 flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors lg:min-w-16 ${
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
          {MORE_TOOLS.map((tool) => (
            <button
              key={tool.name}
              onClick={() => activateTool(tool.name)}
              aria-pressed={interactionMode === 'annotate' && activeTool === tool.name}
              className={`hidden min-w-14 shrink-0 flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors xl:flex ${
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
          <button
            ref={moreButtonRef}
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            className="flex min-w-14 shrink-0 flex-col items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 xl:hidden"
          >
            <span className="text-xs leading-none">...</span>
            More
          </button>
        </div>

        <ToolsMenu
          requestedModal={requestedModal}
          onRequestedModalOpened={onRequestedModalOpened}
        />

        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-1">
          <button
            onClick={onUndo}
            className="shrink-0 rounded-md bg-slate-100 px-2.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            Undo
          </button>
          <button
            onClick={onRedo}
            className="shrink-0 rounded-md bg-slate-100 px-2.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
          >
            Redo
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => setZoom(zoom - 0.25)}
            className="rounded-md px-2.5 py-2 text-base font-semibold text-slate-600 hover:bg-slate-100"
          >
            -
          </button>
          <span className="min-w-[54px] px-2 text-center text-sm font-semibold text-slate-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            aria-label="Zoom in"
            onClick={() => setZoom(zoom + 0.25)}
            className="rounded-md px-2.5 py-2 text-base font-semibold text-slate-600 hover:bg-slate-100"
          >
            +
          </button>
          {pageCount ? (
            <div className="hidden shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 lg:block">
              Page {currentPage} of {pageCount}
            </div>
          ) : null}
        </div>

        <div
          className="hidden shrink-0 items-center rounded-full border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 2xl:flex"
          title="Files stay in your browser"
        >
          Local only
        </div>

        <button
          onClick={onDownload}
          disabled={exporting}
          className="shrink-0 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-900/15 transition-colors hover:bg-sky-700 disabled:opacity-60 lg:px-5"
        >
          {exporting ? 'Exporting...' : 'Download PDF'}
        </button>
      </div>

      {moreOpen &&
        createPortal(
          <div
            ref={moreMenuRef}
            className="fixed z-[1000] w-44 rounded-lg border border-slate-200 bg-white py-1.5 shadow-2xl"
            style={{ top: morePosition.top, left: morePosition.left }}
          >
            {MORE_TOOLS.map((tool) => (
              <button
                key={tool.name}
                type="button"
                onClick={() => activateTool(tool.name)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold ${
                  interactionMode === 'annotate' && activeTool === tool.name
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="w-8 rounded bg-slate-100 px-1.5 py-0.5 text-center text-[10px] font-bold text-slate-500">
                  {tool.icon}
                </span>
                {tool.label}
              </button>
            ))}
          </div>,
          document.body,
        )}

      {workflowLabel && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-2 text-sm font-medium text-slate-600">
          Workflow: {workflowLabel} / Upload PDF / {fileName || 'Open document'}
        </div>
      )}

      <div className="border-t border-slate-100 bg-white px-5 py-2 text-sm font-semibold text-slate-700">
        Current mode:{' '}
        <span className="text-sky-700">
          {interactionMode === 'form' ? 'Forms' : 'Edit'}
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
