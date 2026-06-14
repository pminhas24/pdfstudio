import type { PDFDocumentProxy } from 'pdfjs-dist'

export type ToolName =
  | 'select'
  | 'text'
  | 'image'
  | 'draw'
  | 'shape'
  | 'highlight'
  | 'signature'

export type ShapeName = 'rect' | 'circle' | 'line' | 'arrow'
export type InteractionMode = 'annotate' | 'form'

export interface EditorState {
  interactionMode: InteractionMode
  activeTool: ToolName
  activeShape: ShapeName
  drawColor: string
  drawWidth: number
  drawOpacity: number
  zoom: number
  currentPage: number
  selectedObjectId: string | null
  selectedPages: number[]
  setInteractionMode: (mode: InteractionMode) => void
  setActiveTool: (tool: ToolName) => void
  setActiveShape: (shape: ShapeName) => void
  setDrawColor: (color: string) => void
  setDrawWidth: (width: number) => void
  setDrawOpacity: (opacity: number) => void
  setZoom: (zoom: number) => void
  setCurrentPage: (page: number) => void
  setSelectedObjectId: (id: string | null) => void
  togglePageSelection: (page: number) => void
  clearPageSelection: () => void
}

export interface PDFState {
  pdfBytes: ArrayBuffer | null
  fileName: string
  pageCount: number
  pdfDocument: PDFDocumentProxy | null
  undoStack: PdfHistoryEntry[]
  redoStack: PdfHistoryEntry[]
  setPdfBytes: (bytes: ArrayBuffer, name: string) => void
  setPageCount: (count: number) => void
  setPdfDocument: (doc: PDFDocumentProxy) => void
  pushHistory: (entry: PdfHistoryEntry) => void
  popUndo: (current: PdfHistoryEntry) => PdfHistoryEntry | undefined
  popRedo: (current: PdfHistoryEntry) => PdfHistoryEntry | undefined
  reset: () => void
}

export interface PdfHistoryEntry {
  pdfBytes: ArrayBuffer
  pageCount: number
  annotations: Record<number, string>
  currentPage: number
}

export interface AnnotationState {
  perPageJson: Record<number, string>
  undoStack: Record<number, string[]>
  redoStack: Record<number, string[]>
  savePageJson: (page: number, json: string) => void
  undo: (page: number) => string | undefined
  redo: (page: number) => string | undefined
  clearPage: (page: number) => void
}

export interface PageRenderInfo {
  pageNum: number
  width: number
  height: number
  scale: number
}

export interface FabricObjectExport {
  type: string
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  angle: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity: number
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
  fontStyle?: string
  underline?: boolean
  rx?: number
  ry?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
  path?: unknown[]
  src?: string
  customType?: string
}

export interface FabricJsonExport {
  objects: FabricObjectExport[]
  version: string
}
