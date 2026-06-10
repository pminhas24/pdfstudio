# PDF Editor Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully client-side, browser-based PDF editor with annotation tools (text, image, draw, shapes, highlight, signature), undo/redo, and PDF export — no server, no signup, no watermarks.

**Architecture:** PDF.js renders each PDF page to a `<canvas>` element; a Fabric.js canvas is overlaid on top per page for interactive annotations. Zustand manages active tool state, PDF metadata, and per-page Fabric JSON snapshots (undo/redo stack). On Download, pdf-lib reads each page's Fabric JSON and burns annotations into the original PDF bytes, then triggers a browser file download.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS 3, Fabric.js 6, pdfjs-dist 4, pdf-lib 1.17, Zustand 4, react-dropzone 14, Vitest, @testing-library/react 14

---

## File Map

```
pdfeditor/
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/
│   │   └── pdf.ts                         # All shared TS interfaces
│   ├── store/
│   │   ├── editorStore.ts                 # Active tool, zoom, currentPage
│   │   ├── pdfStore.ts                    # PDF bytes, pageCount, fileName
│   │   └── annotationStore.ts             # Per-page Fabric JSON + undo/redo stacks
│   ├── lib/
│   │   ├── pdfLoader.ts                   # PDF.js: load + render pages to canvas
│   │   ├── fabricManager.ts               # Fabric canvas lifecycle per page
│   │   └── pdfExporter.ts                 # pdf-lib: Fabric JSON → PDF bytes → download
│   ├── components/
│   │   ├── PDFUploader/
│   │   │   └── PDFUploader.tsx            # Drag-and-drop landing screen
│   │   ├── EditorToolbar/
│   │   │   └── EditorToolbar.tsx          # Tool buttons, undo/redo, zoom, download
│   │   ├── PageThumbnailSidebar/
│   │   │   └── PageThumbnailSidebar.tsx   # Scrollable page list, click to jump
│   │   ├── PDFCanvas/
│   │   │   ├── PDFCanvas.tsx              # Maps pages 1..n → <PDFPage>
│   │   │   └── PDFPage.tsx                # Single page: PDF.js canvas + Fabric overlay
│   │   ├── PropertiesPanel/
│   │   │   └── PropertiesPanel.tsx        # Right sidebar: font/color/opacity/delete
│   │   ├── SignatureModal/
│   │   │   └── SignatureModal.tsx          # Draw / type / upload signature
│   │   └── Toast/
│   │       └── Toast.tsx                  # Non-blocking error/info notifications
│   └── tools/
│       ├── TextTool.ts                    # Add Fabric IText to canvas
│       ├── ImageTool.ts                   # Add Fabric Image from file input
│       ├── DrawTool.ts                    # Toggle Fabric freeDrawingMode
│       ├── ShapeTool.ts                   # Rect, circle, line, arrow factories
│       ├── HighlightTool.ts               # Semi-transparent Fabric Rect
│       └── SignatureTool.ts               # Convert signature canvas PNG → Fabric Image
└── src/__tests__/
    ├── store/
    │   ├── editorStore.test.ts
    │   ├── pdfStore.test.ts
    │   └── annotationStore.test.ts
    ├── lib/
    │   ├── pdfLoader.test.ts
    │   └── pdfExporter.test.ts
    └── components/
        ├── PDFUploader.test.tsx
        └── EditorToolbar.test.tsx
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd C:/Users/sarda/OneDrive/Desktop/Projects/pdfeditor
npm create vite@latest . -- --template react-ts
```

When prompted "Current directory is not empty. Remove existing files and continue?" — choose **Yes**.

- [ ] **Step 2: Install all dependencies**

```bash
npm install fabric pdfjs-dist pdf-lib zustand react-dropzone
npm install -D tailwindcss@3 postcss autoprefixer @testing-library/react @testing-library/jest-dom @testing-library/user-event vitest jsdom @vitejs/plugin-react
```

- [ ] **Step 3: Init Tailwind**

```bash
npx tailwindcss init -p
```

- [ ] **Step 4: Configure tailwind.config.ts**

Replace the generated file with:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          600: '#0284c7',
          700: '#0369a1',
        },
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 5: Configure vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
})
```

- [ ] **Step 6: Create test setup file**

Create `src/__tests__/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Configure PDF.js worker in vite.config.ts**

PDF.js requires its worker to be served separately. Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
})
```

- [ ] **Step 8: Update index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="referrer" content="no-referrer" />
    <title>PDFEdit — Free Online PDF Editor</title>
    <meta name="description" content="Edit PDFs for free in your browser. No signup, no watermarks. Your file stays private." />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 9: Update src/main.tsx**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 10: Create src/index.css with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 11: Create placeholder App.tsx**

```typescript
export default function App() {
  return <div className="h-screen bg-slate-100 flex items-center justify-center">
    <p className="text-slate-500">PDF Editor loading...</p>
  </div>
}
```

- [ ] **Step 12: Add scripts to package.json**

Ensure these scripts exist in package.json:

```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "test": "vitest",
  "test:run": "vitest run",
  "preview": "vite preview"
}
```

- [ ] **Step 13: Verify dev server starts**

```bash
npm run dev
```

Expected: Server starts at `http://localhost:5173`. Open it — should show "PDF Editor loading..." on a grey background.

- [ ] **Step 14: Add .gitignore entries**

Append to `.gitignore`:

```
.superpowers/
dist/
node_modules/
```

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite+React+TS+Tailwind project with all deps"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `src/types/pdf.ts`

- [ ] **Step 1: Create types file**

Create `src/types/pdf.ts`:

```typescript
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { Canvas as FabricCanvas, Object as FabricObject } from 'fabric'

export type ToolName =
  | 'select'
  | 'text'
  | 'image'
  | 'draw'
  | 'shape'
  | 'highlight'
  | 'signature'

export type ShapeName = 'rect' | 'circle' | 'line' | 'arrow'

export interface EditorState {
  activeTool: ToolName
  activeShape: ShapeName
  zoom: number
  currentPage: number
  selectedObjectId: string | null
  setActiveTool: (tool: ToolName) => void
  setActiveShape: (shape: ShapeName) => void
  setZoom: (zoom: number) => void
  setCurrentPage: (page: number) => void
  setSelectedObjectId: (id: string | null) => void
}

export interface PDFState {
  pdfBytes: ArrayBuffer | null
  fileName: string
  pageCount: number
  pdfDocument: PDFDocumentProxy | null
  setPdfBytes: (bytes: ArrayBuffer, name: string) => void
  setPageCount: (count: number) => void
  setPdfDocument: (doc: PDFDocumentProxy) => void
  reset: () => void
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types/pdf.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: Zustand Stores

**Files:**
- Create: `src/store/editorStore.ts`, `src/store/pdfStore.ts`, `src/store/annotationStore.ts`
- Test: `src/__tests__/store/editorStore.test.ts`, `src/__tests__/store/pdfStore.test.ts`, `src/__tests__/store/annotationStore.test.ts`

- [ ] **Step 1: Write failing tests for editorStore**

Create `src/__tests__/store/editorStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '../../store/editorStore'

describe('editorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      activeTool: 'select',
      activeShape: 'rect',
      zoom: 1,
      currentPage: 1,
      selectedObjectId: null,
    })
  })

  it('sets active tool', () => {
    useEditorStore.getState().setActiveTool('text')
    expect(useEditorStore.getState().activeTool).toBe('text')
  })

  it('sets zoom clamped between 0.25 and 4', () => {
    useEditorStore.getState().setZoom(10)
    expect(useEditorStore.getState().zoom).toBe(4)
    useEditorStore.getState().setZoom(0.1)
    expect(useEditorStore.getState().zoom).toBe(0.25)
  })

  it('sets currentPage', () => {
    useEditorStore.getState().setCurrentPage(3)
    expect(useEditorStore.getState().currentPage).toBe(3)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run src/__tests__/store/editorStore.test.ts
```

Expected: FAIL — `useEditorStore` not found.

- [ ] **Step 3: Implement editorStore**

Create `src/store/editorStore.ts`:

```typescript
import { create } from 'zustand'
import type { EditorState, ToolName, ShapeName } from '../types/pdf'

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  activeShape: 'rect',
  zoom: 1,
  currentPage: 1,
  selectedObjectId: null,
  setActiveTool: (tool: ToolName) => set({ activeTool: tool }),
  setActiveShape: (shape: ShapeName) => set({ activeShape: shape }),
  setZoom: (zoom: number) => set({ zoom: Math.min(4, Math.max(0.25, zoom)) }),
  setCurrentPage: (page: number) => set({ currentPage: page }),
  setSelectedObjectId: (id: string | null) => set({ selectedObjectId: id }),
}))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --run src/__tests__/store/editorStore.test.ts
```

Expected: PASS

- [ ] **Step 5: Write failing tests for annotationStore**

Create `src/__tests__/store/annotationStore.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useAnnotationStore } from '../../store/annotationStore'

const JSON_A = '{"objects":[],"version":"6.0.0"}'
const JSON_B = '{"objects":[{"type":"rect"}],"version":"6.0.0"}'
const JSON_C = '{"objects":[{"type":"rect"},{"type":"text"}],"version":"6.0.0"}'

describe('annotationStore', () => {
  beforeEach(() => {
    useAnnotationStore.setState({ perPageJson: {}, undoStack: {}, redoStack: {} })
  })

  it('saves page json', () => {
    useAnnotationStore.getState().savePageJson(1, JSON_A)
    expect(useAnnotationStore.getState().perPageJson[1]).toBe(JSON_A)
  })

  it('undo restores previous json and pushes to redoStack', () => {
    useAnnotationStore.getState().savePageJson(1, JSON_A)
    useAnnotationStore.getState().savePageJson(1, JSON_B)
    const restored = useAnnotationStore.getState().undo(1)
    expect(restored).toBe(JSON_A)
    expect(useAnnotationStore.getState().perPageJson[1]).toBe(JSON_A)
    expect(useAnnotationStore.getState().redoStack[1]).toHaveLength(1)
  })

  it('redo restores next json', () => {
    useAnnotationStore.getState().savePageJson(1, JSON_A)
    useAnnotationStore.getState().savePageJson(1, JSON_B)
    useAnnotationStore.getState().undo(1)
    const restored = useAnnotationStore.getState().redo(1)
    expect(restored).toBe(JSON_B)
  })

  it('returns undefined when undo stack is empty', () => {
    const result = useAnnotationStore.getState().undo(1)
    expect(result).toBeUndefined()
  })

  it('caps undo stack at 50 entries', () => {
    for (let i = 0; i < 55; i++) {
      useAnnotationStore.getState().savePageJson(1, `{"v":${i}}`)
    }
    expect(useAnnotationStore.getState().undoStack[1].length).toBeLessThanOrEqual(50)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

```bash
npm run test -- --run src/__tests__/store/annotationStore.test.ts
```

Expected: FAIL

- [ ] **Step 7: Implement annotationStore**

Create `src/store/annotationStore.ts`:

```typescript
import { create } from 'zustand'
import type { AnnotationState } from '../types/pdf'

const MAX_UNDO = 50

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  perPageJson: {},
  undoStack: {},
  redoStack: {},

  savePageJson: (page: number, json: string) => {
    const { perPageJson, undoStack } = get()
    const previous = perPageJson[page]
    const stack = undoStack[page] ?? []
    const newStack = previous
      ? [...stack, previous].slice(-MAX_UNDO)
      : stack
    set({
      perPageJson: { ...perPageJson, [page]: json },
      undoStack: { ...undoStack, [page]: newStack },
      redoStack: { ...get().redoStack, [page]: [] },
    })
  },

  undo: (page: number) => {
    const { perPageJson, undoStack, redoStack } = get()
    const stack = undoStack[page] ?? []
    if (stack.length === 0) return undefined
    const previous = stack[stack.length - 1]
    const current = perPageJson[page]
    const rStack = redoStack[page] ?? []
    set({
      perPageJson: { ...perPageJson, [page]: previous },
      undoStack: { ...undoStack, [page]: stack.slice(0, -1) },
      redoStack: { ...redoStack, [page]: current ? [...rStack, current] : rStack },
    })
    return previous
  },

  redo: (page: number) => {
    const { perPageJson, undoStack, redoStack } = get()
    const rStack = redoStack[page] ?? []
    if (rStack.length === 0) return undefined
    const next = rStack[rStack.length - 1]
    const current = perPageJson[page]
    const stack = undoStack[page] ?? []
    set({
      perPageJson: { ...perPageJson, [page]: next },
      undoStack: { ...undoStack, [page]: current ? [...stack, current] : stack },
      redoStack: { ...redoStack, [page]: rStack.slice(0, -1) },
    })
    return next
  },

  clearPage: (page: number) => {
    const { perPageJson, undoStack, redoStack } = get()
    const { [page]: _p, ...restJson } = perPageJson
    const { [page]: _u, ...restUndo } = undoStack
    const { [page]: _r, ...restRedo } = redoStack
    set({ perPageJson: restJson, undoStack: restUndo, redoStack: restRedo })
  },
}))
```

- [ ] **Step 8: Create pdfStore**

No complex logic to test — just setters. Create `src/store/pdfStore.ts`:

```typescript
import { create } from 'zustand'
import type { PDFState } from '../types/pdf'
import type { PDFDocumentProxy } from 'pdfjs-dist'

export const usePdfStore = create<PDFState>((set) => ({
  pdfBytes: null,
  fileName: '',
  pageCount: 0,
  pdfDocument: null,
  setPdfBytes: (bytes: ArrayBuffer, name: string) =>
    set({ pdfBytes: bytes, fileName: name }),
  setPageCount: (count: number) => set({ pageCount: count }),
  setPdfDocument: (doc: PDFDocumentProxy) => set({ pdfDocument: doc }),
  reset: () => set({ pdfBytes: null, fileName: '', pageCount: 0, pdfDocument: null }),
}))
```

- [ ] **Step 9: Run all store tests**

```bash
npm run test -- --run src/__tests__/store/
```

Expected: All PASS

- [ ] **Step 10: Commit**

```bash
git add src/store/ src/__tests__/store/
git commit -m "feat: Zustand stores — editor, pdf, annotation with undo/redo"
```

---

## Task 4: pdfLoader Library

**Files:**
- Create: `src/lib/pdfLoader.ts`
- Test: `src/__tests__/lib/pdfLoader.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/lib/pdfLoader.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: vi.fn((n: number) => Promise.resolve({
        getViewport: vi.fn(() => ({ width: 612, height: 792 })),
        render: vi.fn(() => ({ promise: Promise.resolve() })),
      })),
    }),
  })),
  GlobalWorkerOptions: { workerSrc: '' },
}))

import { loadPdfDocument, renderPage } from '../../lib/pdfLoader'

describe('pdfLoader', () => {
  it('loadPdfDocument returns page count', async () => {
    const bytes = new ArrayBuffer(8)
    const { doc, pageCount } = await loadPdfDocument(bytes)
    expect(pageCount).toBe(3)
    expect(doc).toBeDefined()
  })

  it('renderPage calls render on the page', async () => {
    const bytes = new ArrayBuffer(8)
    const { doc } = await loadPdfDocument(bytes)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    await expect(renderPage(doc, 1, canvas, 1.5)).resolves.toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
      scale: 1.5,
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run src/__tests__/lib/pdfLoader.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement pdfLoader**

Create `src/lib/pdfLoader.ts`:

```typescript
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PageRenderInfo } from '../types/pdf'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function loadPdfDocument(
  bytes: ArrayBuffer,
): Promise<{ doc: PDFDocumentProxy; pageCount: number }> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) })
  const doc = await loadingTask.promise
  return { doc, pageCount: doc.numPages }
}

export async function renderPage(
  doc: PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<PageRenderInfo> {
  const page = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport }).promise
  return { pageNum, width: viewport.width, height: viewport.height, scale }
}

export async function renderPageThumbnail(
  doc: PDFDocumentProxy,
  pageNum: number,
  canvas: HTMLCanvasElement,
): Promise<void> {
  await renderPage(doc, pageNum, canvas, 0.2)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --run src/__tests__/lib/pdfLoader.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdfLoader.ts src/__tests__/lib/pdfLoader.test.ts
git commit -m "feat: pdfLoader — load and render PDF pages via PDF.js"
```

---

## Task 5: fabricManager Library

**Files:**
- Create: `src/lib/fabricManager.ts`

This module manages Fabric canvas instances keyed by page number. It is not unit tested directly because Fabric requires a real DOM canvas — it will be exercised through component integration.

- [ ] **Step 1: Implement fabricManager**

Create `src/lib/fabricManager.ts`:

```typescript
import { Canvas as FabricCanvas } from 'fabric'

const canvases = new Map<number, FabricCanvas>()

export function createFabricCanvas(
  pageNum: number,
  canvasEl: HTMLCanvasElement,
  width: number,
  height: number,
  onChange: (json: string) => void,
): FabricCanvas {
  const existing = canvases.get(pageNum)
  if (existing) {
    existing.dispose()
  }
  const fc = new FabricCanvas(canvasEl, {
    width,
    height,
    selection: true,
    preserveObjectStacking: true,
  })

  const handler = () => onChange(JSON.stringify(fc.toJSON(['customType'])))
  fc.on('object:added', handler)
  fc.on('object:modified', handler)
  fc.on('object:removed', handler)

  canvases.set(pageNum, fc)
  return fc
}

export function getFabricCanvas(pageNum: number): FabricCanvas | undefined {
  return canvases.get(pageNum)
}

export function loadFabricJson(pageNum: number, json: string): void {
  const fc = canvases.get(pageNum)
  if (!fc) return
  fc.loadFromJSON(JSON.parse(json), () => fc.renderAll())
}

export function disposeFabricCanvas(pageNum: number): void {
  const fc = canvases.get(pageNum)
  if (fc) {
    fc.dispose()
    canvases.delete(pageNum)
  }
}

export function disposeAll(): void {
  canvases.forEach((fc) => fc.dispose())
  canvases.clear()
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/fabricManager.ts
git commit -m "feat: fabricManager — Fabric canvas lifecycle per page"
```

---

## Task 6: PDFUploader Component

**Files:**
- Create: `src/components/PDFUploader/PDFUploader.tsx`
- Test: `src/__tests__/components/PDFUploader.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/components/PDFUploader.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PDFUploader } from '../../components/PDFUploader/PDFUploader'

describe('PDFUploader', () => {
  it('renders the upload prompt', () => {
    render(<PDFUploader onFileLoaded={vi.fn()} />)
    expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument()
  })

  it('calls onFileLoaded with ArrayBuffer when a PDF file is selected', async () => {
    const onFileLoaded = vi.fn()
    render(<PDFUploader onFileLoaded={onFileLoaded} />)
    const input = screen.getByTestId('file-input')
    const file = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' })
    await userEvent.upload(input, file)
    await new Promise((r) => setTimeout(r, 100))
    expect(onFileLoaded).toHaveBeenCalledWith(expect.any(ArrayBuffer), 'test.pdf')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run src/__tests__/components/PDFUploader.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement PDFUploader**

Create `src/components/PDFUploader/PDFUploader.tsx`:

```typescript
import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'

interface Props {
  onFileLoaded: (bytes: ArrayBuffer, name: string) => void
}

export function PDFUploader({ onFileLoaded }: Props) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        onFileLoaded(reader.result as ArrayBuffer, file.name)
      }
      reader.readAsArrayBuffer(file)
    },
    [onFileLoaded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  })

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-gradient-to-br from-sky-600 to-sky-400 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md">
          P
        </div>
        <span className="text-2xl font-bold text-slate-900">
          PDF<span className="text-sky-600">Edit</span>
        </span>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-sky-500 bg-sky-50'
            : 'border-slate-300 bg-white hover:border-sky-400 hover:bg-sky-50'
        }`}
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="text-5xl mb-4">📄</div>
        <p className="text-xl font-semibold text-slate-800 mb-2">
          {isDragActive ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
        </p>
        <p className="text-slate-500 mb-6">or click to browse files</p>
        <button className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-8 py-3 rounded-xl shadow transition-colors">
          Choose PDF
        </button>
      </div>

      {/* Privacy badge */}
      <div className="mt-6 flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
        <span className="text-green-600 text-sm">🔒</span>
        <span className="text-green-700 text-sm font-medium">
          Your file stays in your browser — nothing is uploaded
        </span>
      </div>

      {/* Feature list */}
      <div className="mt-8 grid grid-cols-2 gap-3 max-w-md text-sm text-slate-600">
        {[
          '✏️ Add text & annotations',
          '🖼 Insert images',
          '✍ Draw & sign',
          '🔷 Add shapes',
          '🖍 Highlight text',
          '📋 Fill forms',
        ].map((f) => (
          <div key={f} className="flex items-center gap-2">
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --run src/__tests__/components/PDFUploader.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PDFUploader/ src/__tests__/components/PDFUploader.test.tsx
git commit -m "feat: PDFUploader — drag-and-drop with privacy badge"
```

---

## Task 7: PDFPage + PDFCanvas Components

**Files:**
- Create: `src/components/PDFCanvas/PDFPage.tsx`, `src/components/PDFCanvas/PDFCanvas.tsx`

These components use Fabric and PDF.js canvas APIs that require a real browser — integration tested via the running app rather than unit tests.

- [ ] **Step 1: Implement PDFPage**

Create `src/components/PDFCanvas/PDFPage.tsx`:

```typescript
import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { Canvas as FabricCanvas } from 'fabric'
import { renderPage } from '../../lib/pdfLoader'
import { createFabricCanvas, loadFabricJson } from '../../lib/fabricManager'
import { useAnnotationStore } from '../../store/annotationStore'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  doc: PDFDocumentProxy
  pageNum: number
  scale: number
  isVisible: boolean
}

export function PDFPage({ doc, pageNum, scale, isVisible }: Props) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const { savePageJson, perPageJson } = useAnnotationStore()
  const currentPage = useEditorStore((s) => s.currentPage)

  useEffect(() => {
    if (!pdfCanvasRef.current || !fabricCanvasRef.current) return
    let cancelled = false

    async function init() {
      const info = await renderPage(doc, pageNum, pdfCanvasRef.current!, scale)
      if (cancelled) return

      const fc = createFabricCanvas(
        pageNum,
        fabricCanvasRef.current!,
        info.width,
        info.height,
        (json) => savePageJson(pageNum, json),
      )
      fabricRef.current = fc

      const existing = perPageJson[pageNum]
      if (existing) loadFabricJson(pageNum, existing)
    }

    init()
    return () => { cancelled = true }
  }, [doc, pageNum, scale])

  // Sync zoom: when scale changes, re-render the PDF canvas
  useEffect(() => {
    if (!pdfCanvasRef.current) return
    renderPage(doc, pageNum, pdfCanvasRef.current, scale)
  }, [scale])

  const isCurrentPage = currentPage === pageNum

  return (
    <div
      id={`pdf-page-${pageNum}`}
      className={`relative bg-white rounded-lg shadow-md mx-auto mb-6 ${
        isCurrentPage ? 'ring-2 ring-sky-400' : ''
      }`}
      style={{ width: 'fit-content' }}
    >
      {/* PDF.js renders here */}
      <canvas ref={pdfCanvasRef} className="block rounded-lg" />

      {/* Fabric.js overlay — sits on top, intercepts pointer events */}
      <canvas
        ref={fabricCanvasRef}
        className="absolute inset-0 rounded-lg"
        style={{ touchAction: 'none' }}
      />

      {/* Page badge */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-slate-500 text-white text-xs rounded-full px-3 py-1 whitespace-nowrap">
        Page {pageNum}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implement PDFCanvas**

Create `src/components/PDFCanvas/PDFCanvas.tsx`:

```typescript
import { useEffect } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PDFPage } from './PDFPage'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  doc: PDFDocumentProxy
  pageCount: number
}

export function PDFCanvas({ doc, pageCount }: Props) {
  const { zoom, setCurrentPage } = useEditorStore()

  // Observe scroll to update currentPage indicator
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) {
          const id = visible.target.id // "pdf-page-N"
          const num = parseInt(id.replace('pdf-page-', ''), 10)
          if (!isNaN(num)) setCurrentPage(num)
        }
      },
      { threshold: 0.5 },
    )

    for (let i = 1; i <= pageCount; i++) {
      const el = document.getElementById(`pdf-page-${i}`)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [pageCount, setCurrentPage])

  const scale = zoom * window.devicePixelRatio * 1.5

  return (
    <div className="flex-1 overflow-y-auto bg-slate-200 p-8 flex flex-col items-center">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => (
        <PDFPage
          key={pageNum}
          doc={doc}
          pageNum={pageNum}
          scale={scale}
          isVisible={true}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser (manual)**

Wire up `App.tsx` temporarily:

```typescript
// Temporary — will be replaced in Task 13
import { useState } from 'react'
import { PDFUploader } from './components/PDFUploader/PDFUploader'
import { PDFCanvas } from './components/PDFCanvas/PDFCanvas'
import { usePdfStore } from './store/pdfStore'
import { loadPdfDocument } from './lib/pdfLoader'

export default function App() {
  const { pdfDocument, pageCount, setPdfBytes, setPageCount, setPdfDocument } = usePdfStore()

  async function handleFileLoaded(bytes: ArrayBuffer, name: string) {
    setPdfBytes(bytes, name)
    const { doc, pageCount } = await loadPdfDocument(bytes)
    setPdfDocument(doc)
    setPageCount(pageCount)
  }

  if (!pdfDocument) return <PDFUploader onFileLoaded={handleFileLoaded} />
  return <PDFCanvas doc={pdfDocument} pageCount={pageCount} />
}
```

Run `npm run dev`, upload a PDF, and verify pages render with a white canvas overlay on top.

- [ ] **Step 4: Commit**

```bash
git add src/components/PDFCanvas/ src/App.tsx
git commit -m "feat: PDFPage + PDFCanvas — PDF.js render with Fabric overlay"
```

---

## Task 8: PageThumbnailSidebar + EditorToolbar

**Files:**
- Create: `src/components/PageThumbnailSidebar/PageThumbnailSidebar.tsx`
- Create: `src/components/EditorToolbar/EditorToolbar.tsx`
- Test: `src/__tests__/components/EditorToolbar.test.tsx`

- [ ] **Step 1: Implement PageThumbnailSidebar**

Create `src/components/PageThumbnailSidebar/PageThumbnailSidebar.tsx`:

```typescript
import { useEffect, useRef } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderPageThumbnail } from '../../lib/pdfLoader'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  doc: PDFDocumentProxy
  pageCount: number
}

function Thumbnail({ doc, pageNum }: { doc: PDFDocumentProxy; pageNum: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const currentPage = useEditorStore((s) => s.currentPage)
  const setCurrentPage = useEditorStore((s) => s.setCurrentPage)
  const isActive = currentPage === pageNum

  useEffect(() => {
    if (canvasRef.current) renderPageThumbnail(doc, pageNum, canvasRef.current)
  }, [doc, pageNum])

  function scrollToPage() {
    setCurrentPage(pageNum)
    document.getElementById(`pdf-page-${pageNum}`)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <button
      onClick={scrollToPage}
      className={`w-full rounded-lg p-1 transition-all ${
        isActive
          ? 'ring-2 ring-sky-600 bg-sky-50'
          : 'hover:ring-1 hover:ring-sky-300 bg-white'
      }`}
    >
      <canvas ref={canvasRef} className="w-full rounded" />
      <p className={`text-xs text-center mt-1 font-medium ${isActive ? 'text-sky-600' : 'text-slate-400'}`}>
        {pageNum}
      </p>
    </button>
  )
}

export function PageThumbnailSidebar({ doc, pageCount }: Props) {
  return (
    <div className="w-28 bg-white border-r border-slate-200 overflow-y-auto flex flex-col gap-2 p-2 shrink-0">
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide text-center mb-1">
        Pages
      </p>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <Thumbnail key={n} doc={doc} pageNum={n} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Write failing test for EditorToolbar**

Create `src/__tests__/components/EditorToolbar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { EditorToolbar } from '../../components/EditorToolbar/EditorToolbar'
import { useEditorStore } from '../../store/editorStore'

describe('EditorToolbar', () => {
  it('renders all tool buttons', () => {
    render(<EditorToolbar onDownload={vi.fn()} onUndo={vi.fn()} onRedo={vi.fn()} />)
    expect(screen.getByText('Text')).toBeInTheDocument()
    expect(screen.getByText('Draw')).toBeInTheDocument()
    expect(screen.getByText('Highlight')).toBeInTheDocument()
  })

  it('clicking Text sets activeTool to text', async () => {
    render(<EditorToolbar onDownload={vi.fn()} onUndo={vi.fn()} onRedo={vi.fn()} />)
    await userEvent.click(screen.getByText('Text'))
    expect(useEditorStore.getState().activeTool).toBe('text')
  })

  it('clicking zoom in increases zoom', async () => {
    useEditorStore.setState({ zoom: 1 })
    render(<EditorToolbar onDownload={vi.fn()} onUndo={vi.fn()} onRedo={vi.fn()} />)
    await userEvent.click(screen.getByLabelText('Zoom in'))
    expect(useEditorStore.getState().zoom).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm run test -- --run src/__tests__/components/EditorToolbar.test.tsx
```

Expected: FAIL

- [ ] **Step 4: Implement EditorToolbar**

Create `src/components/EditorToolbar/EditorToolbar.tsx`:

```typescript
import { useEditorStore } from '../../store/editorStore'
import type { ToolName } from '../../types/pdf'

const TOOLS: { name: ToolName; label: string; icon: string }[] = [
  { name: 'select', label: 'Select', icon: '↖' },
  { name: 'text', label: 'Text', icon: 'T' },
  { name: 'image', label: 'Image', icon: '🖼' },
  { name: 'draw', label: 'Draw', icon: '✏️' },
  { name: 'shape', label: 'Shape', icon: '◻' },
  { name: 'signature', label: 'Sign', icon: '✍' },
  { name: 'highlight', label: 'Highlight', icon: '🖍' },
]

interface Props {
  onDownload: () => void
  onUndo: () => void
  onRedo: () => void
}

export function EditorToolbar({ onDownload, onUndo, onRedo }: Props) {
  const { activeTool, setActiveTool, zoom, setZoom } = useEditorStore()

  return (
    <div className="h-14 bg-white border-b border-slate-200 shadow-sm flex items-center gap-2 px-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-3">
        <div className="w-8 h-8 bg-gradient-to-br from-sky-600 to-sky-400 rounded-lg flex items-center justify-center text-white font-black text-sm shadow">
          P
        </div>
        <span className="text-base font-bold text-slate-900 hidden sm:block">
          PDF<span className="text-sky-600">Edit</span>
        </span>
      </div>

      <div className="w-px h-7 bg-slate-200" />

      {/* Tools */}
      <div className="flex gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.name}
            onClick={() => setActiveTool(t.name)}
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

      {/* Undo / Redo */}
      <button onClick={onUndo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors font-medium">
        ↩ Undo
      </button>
      <button onClick={onRedo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors font-medium">
        ↪ Redo
      </button>

      {/* Zoom */}
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
        <button
          aria-label="Zoom out"
          onClick={() => setZoom(zoom - 0.1)}
          className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 border-r border-slate-200 text-sm"
        >
          −
        </button>
        <span className="px-3 text-xs font-semibold text-slate-700 min-w-[46px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          aria-label="Zoom in"
          onClick={() => setZoom(zoom + 0.1)}
          className="px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 border-l border-slate-200 text-sm"
        >
          +
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Privacy badge */}
      <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-full px-3 py-1.5 text-xs hidden md:flex">
        <span className="text-green-600">🔒</span>
        <span className="text-green-700 font-medium">Stays in your browser</span>
      </div>

      {/* Download */}
      <button
        onClick={onDownload}
        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors text-sm"
      >
        ⬇ Download PDF
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm run test -- --run src/__tests__/components/EditorToolbar.test.tsx
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/PageThumbnailSidebar/ src/components/EditorToolbar/ src/__tests__/components/EditorToolbar.test.tsx
git commit -m "feat: PageThumbnailSidebar and EditorToolbar components"
```

---

## Task 9: Annotation Tools

**Files:**
- Create: `src/tools/TextTool.ts`, `src/tools/ImageTool.ts`, `src/tools/DrawTool.ts`, `src/tools/ShapeTool.ts`, `src/tools/HighlightTool.ts`

These tools receive a Fabric canvas and add objects to it. They are pure functions — no component state.

- [ ] **Step 1: Implement TextTool**

Create `src/tools/TextTool.ts`:

```typescript
import { IText } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'

export function addText(fc: FabricCanvas, x = 100, y = 100): void {
  const text = new IText('Click to edit', {
    left: x,
    top: y,
    fontSize: 16,
    fontFamily: 'Helvetica',
    fill: '#111827',
    editable: true,
    // @ts-ignore — custom property for export identification
    customType: 'text',
  })
  fc.add(text)
  fc.setActiveObject(text)
  text.enterEditing()
  fc.renderAll()
}
```

- [ ] **Step 2: Implement ImageTool**

Create `src/tools/ImageTool.ts`:

```typescript
import { FabricImage } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'

export function addImageFromFile(fc: FabricCanvas, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const img = await FabricImage.fromURL(reader.result as string)
        const maxW = fc.width! * 0.5
        if (img.width! > maxW) {
          img.scale(maxW / img.width!)
        }
        img.set({ left: 50, top: 50 })
        // @ts-ignore
        img.customType = 'image'
        fc.add(img)
        fc.setActiveObject(img)
        fc.renderAll()
        resolve()
      } catch (e) {
        reject(e)
      }
    }
    reader.readAsDataURL(file)
  })
}
```

- [ ] **Step 3: Implement DrawTool**

Create `src/tools/DrawTool.ts`:

```typescript
import type { Canvas as FabricCanvas } from 'fabric'
import { PencilBrush } from 'fabric'

export function enableDrawMode(fc: FabricCanvas, color = '#0284c7', width = 3): void {
  fc.isDrawingMode = true
  fc.freeDrawingBrush = new PencilBrush(fc)
  fc.freeDrawingBrush.color = color
  fc.freeDrawingBrush.width = width
}

export function disableDrawMode(fc: FabricCanvas): void {
  fc.isDrawingMode = false
}
```

- [ ] **Step 4: Implement ShapeTool**

Create `src/tools/ShapeTool.ts`:

```typescript
import { Rect, Ellipse, Line, Path, Triangle } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'
import type { ShapeName } from '../types/pdf'

const DEFAULTS = {
  stroke: '#0284c7',
  strokeWidth: 2,
  fill: 'transparent',
  selectable: true,
}

export function addShape(fc: FabricCanvas, shape: ShapeName, x = 80, y = 80): void {
  let obj

  switch (shape) {
    case 'rect':
      obj = new Rect({ ...DEFAULTS, left: x, top: y, width: 120, height: 80 })
      break
    case 'circle':
      obj = new Ellipse({ ...DEFAULTS, left: x, top: y, rx: 60, ry: 40 })
      break
    case 'line':
      obj = new Line([x, y, x + 150, y], { ...DEFAULTS })
      break
    case 'arrow': {
      // Arrow = line + triangle arrowhead
      const line = new Line([x, y + 5, x + 130, y + 5], { ...DEFAULTS })
      const head = new Triangle({
        left: x + 128,
        top: y - 3,
        width: 16,
        height: 16,
        fill: '#0284c7',
        angle: 90,
        selectable: false,
      })
      fc.add(line, head)
      // @ts-ignore
      line.customType = 'arrow'
      fc.setActiveObject(line)
      fc.renderAll()
      return
    }
  }

  if (obj) {
    // @ts-ignore
    obj.customType = shape
    fc.add(obj)
    fc.setActiveObject(obj)
    fc.renderAll()
  }
}
```

- [ ] **Step 5: Implement HighlightTool**

Create `src/tools/HighlightTool.ts`:

```typescript
import { Rect } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'

export function addHighlight(fc: FabricCanvas, color = '#fde047', x = 80, y = 80): void {
  const rect = new Rect({
    left: x,
    top: y,
    width: 200,
    height: 20,
    fill: color,
    opacity: 0.4,
    strokeWidth: 0,
    selectable: true,
    // @ts-ignore
    customType: 'highlight',
  })
  fc.add(rect)
  fc.setActiveObject(rect)
  fc.renderAll()
}
```

- [ ] **Step 6: Wire tools to PDFPage**

Update `src/components/PDFCanvas/PDFPage.tsx` — add a `useEffect` that reacts to `activeTool` and calls the appropriate tool function. Add inside the component after the existing `useEffect`s:

```typescript
// Add these imports at the top of PDFPage.tsx:
import { addText } from '../../tools/TextTool'
import { addImageFromFile } from '../../tools/ImageTool'
import { enableDrawMode, disableDrawMode } from '../../tools/DrawTool'
import { addShape } from '../../tools/ShapeTool'
import { addHighlight } from '../../tools/HighlightTool'

// Add inside the PDFPage component, after the existing useEffects:
const activeTool = useEditorStore((s) => s.activeTool)
const activeShape = useEditorStore((s) => s.activeShape)

useEffect(() => {
  const fc = fabricRef.current
  if (!fc) return

  disableDrawMode(fc)
  fc.isDrawingMode = false

  if (activeTool === 'draw') {
    enableDrawMode(fc)
    return
  }

  if (activeTool === 'select') {
    fc.selection = true
    return
  }

  // For click-to-place tools, listen for a single canvas click
  if (['text', 'shape', 'highlight'].includes(activeTool)) {
    const handler = (e: { pointer?: { x: number; y: number } }) => {
      const x = e.pointer?.x ?? 100
      const y = e.pointer?.y ?? 100
      if (activeTool === 'text') addText(fc, x, y)
      else if (activeTool === 'shape') addShape(fc, activeShape, x, y)
      else if (activeTool === 'highlight') addHighlight(fc, '#fde047', x, y)
    }
    fc.once('mouse:down', handler)
    return () => { fc.off('mouse:down', handler) }
  }

  if (activeTool === 'image') {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) addImageFromFile(fc, file)
    }
    input.click()
  }
}, [activeTool, activeShape, fabricRef.current])
```

- [ ] **Step 7: Manual test**

Run `npm run dev`, upload a PDF, click Text, click on the PDF page — a text box should appear. Repeat for Draw, Shape (rect), Highlight.

- [ ] **Step 8: Commit**

```bash
git add src/tools/ src/components/PDFCanvas/PDFPage.tsx
git commit -m "feat: annotation tools — text, image, draw, shape, highlight"
```

---

## Task 10: SignatureModal + SignatureTool

**Files:**
- Create: `src/components/SignatureModal/SignatureModal.tsx`, `src/tools/SignatureTool.ts`

- [ ] **Step 1: Implement SignatureTool**

Create `src/tools/SignatureTool.ts`:

```typescript
import { FabricImage, IText } from 'fabric'
import type { Canvas as FabricCanvas } from 'fabric'

export async function addSignatureFromDataUrl(fc: FabricCanvas, dataUrl: string): Promise<void> {
  const img = await FabricImage.fromURL(dataUrl)
  const maxW = fc.width! * 0.4
  if (img.width! > maxW) img.scale(maxW / img.width!)
  img.set({ left: 60, top: fc.height! - (img.height! * img.scaleY!) - 40 })
  // @ts-ignore
  img.customType = 'signature'
  fc.add(img)
  fc.setActiveObject(img)
  fc.renderAll()
}

export function addTypedSignature(fc: FabricCanvas, text: string): void {
  const sig = new IText(text, {
    left: 60,
    top: fc.height! - 80,
    fontSize: 28,
    fontFamily: 'Georgia, serif',
    fontStyle: 'italic',
    fill: '#1e3a8a',
    // @ts-ignore
    customType: 'signature',
  })
  fc.add(sig)
  fc.setActiveObject(sig)
  fc.renderAll()
}
```

- [ ] **Step 2: Implement SignatureModal**

Create `src/components/SignatureModal/SignatureModal.tsx`:

```typescript
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
      return { x: src.clientX - rect.left, y: src.clientY - rect.top }
    }

    const start = (e: MouseEvent | TouchEvent) => {
      isDrawing.current = true
      const pos = getPos(e)
      ctx.beginPath()
      ctx.moveTo(pos.x, pos.y)
    }
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return
      const pos = getPos(e)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
    const end = () => { isDrawing.current = false }

    canvas.addEventListener('mousedown', start)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', end)
    canvas.addEventListener('touchstart', start)
    canvas.addEventListener('touchmove', draw)
    canvas.addEventListener('touchend', end)

    return () => {
      canvas.removeEventListener('mousedown', start)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', end)
      canvas.removeEventListener('touchstart', start)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', end)
    }
  }, [tab])

  function clearDrawCanvas() {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
  }

  async function applyDrawn() {
    const canvas = drawCanvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    await addSignatureFromDataUrl(fabricCanvas, dataUrl)
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-900">Add Signature</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">✕</button>
        </div>

        {/* Tabs */}
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
              className="w-full border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-crosshair"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={clearDrawCanvas} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                Clear
              </button>
              <button onClick={applyDrawn} className="flex-1 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700">
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
            <button onClick={applyTyped} className="w-full py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700">
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
```

- [ ] **Step 3: Wire SignatureModal to PDFPage**

In `PDFPage.tsx`, add:

```typescript
// At top of file, add import:
import { useState } from 'react'
import { SignatureModal } from '../SignatureModal/SignatureModal'

// Inside component, add state:
const [showSignatureModal, setShowSignatureModal] = useState(false)

// Add to the activeTool useEffect, inside the switch:
if (activeTool === 'signature') {
  setShowSignatureModal(true)
}

// Add to JSX return, inside the outer div, after the fabric canvas:
{showSignatureModal && fabricRef.current && (
  <SignatureModal
    fabricCanvas={fabricRef.current}
    onClose={() => setShowSignatureModal(false)}
  />
)}
```

- [ ] **Step 4: Manual test**

Click Sign tool → modal opens → draw a signature → click "Use Signature" → signature appears on the PDF page.

- [ ] **Step 5: Commit**

```bash
git add src/tools/SignatureTool.ts src/components/SignatureModal/ src/components/PDFCanvas/PDFPage.tsx
git commit -m "feat: SignatureModal — draw, type, or upload signatures"
```

---

## Task 11: PropertiesPanel

**Files:**
- Create: `src/components/PropertiesPanel/PropertiesPanel.tsx`

- [ ] **Step 1: Implement PropertiesPanel**

Create `src/components/PropertiesPanel/PropertiesPanel.tsx`:

```typescript
import { useEffect, useState } from 'react'
import type { Canvas as FabricCanvas, Object as FabricObject } from 'fabric'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  fabricCanvas: FabricCanvas | null
}

interface ObjProps {
  fontSize?: number
  fontFamily?: string
  fill?: string
  fontWeight?: string
  fontStyle?: string
  underline?: boolean
  opacity?: number
  left?: number
  top?: number
}

const PRESET_COLORS = ['#111827', '#ef4444', '#0284c7', '#16a34a', '#f59e0b', '#8b5cf6', '#ffffff']
const FONTS = ['Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Arial']

export function PropertiesPanel({ fabricCanvas }: Props) {
  const setSelectedObjectId = useEditorStore((s) => s.setSelectedObjectId)
  const [selected, setSelected] = useState<FabricObject | null>(null)
  const [props, setProps] = useState<ObjProps>({})

  useEffect(() => {
    if (!fabricCanvas) return

    const onSelect = () => {
      const obj = fabricCanvas.getActiveObject()
      setSelected(obj ?? null)
      if (obj) {
        setProps({
          fontSize: (obj as any).fontSize ?? 16,
          fontFamily: (obj as any).fontFamily ?? 'Helvetica',
          fill: (obj as any).fill ?? '#111827',
          fontWeight: (obj as any).fontWeight ?? 'normal',
          fontStyle: (obj as any).fontStyle ?? 'normal',
          underline: (obj as any).underline ?? false,
          opacity: obj.opacity ?? 1,
          left: Math.round(obj.left ?? 0),
          top: Math.round(obj.top ?? 0),
        })
        setSelectedObjectId(obj.get('id') as string ?? null)
      }
    }

    const onDeselect = () => {
      setSelected(null)
      setSelectedObjectId(null)
    }

    fabricCanvas.on('selection:created', onSelect)
    fabricCanvas.on('selection:updated', onSelect)
    fabricCanvas.on('selection:cleared', onDeselect)
    return () => {
      fabricCanvas.off('selection:created', onSelect)
      fabricCanvas.off('selection:updated', onSelect)
      fabricCanvas.off('selection:cleared', onDeselect)
    }
  }, [fabricCanvas])

  function apply(updates: Partial<ObjProps>) {
    if (!selected || !fabricCanvas) return
    selected.set(updates as any)
    fabricCanvas.renderAll()
    setProps((p) => ({ ...p, ...updates }))
  }

  function deleteSelected() {
    if (!selected || !fabricCanvas) return
    fabricCanvas.remove(selected)
    fabricCanvas.renderAll()
    setSelected(null)
  }

  if (!selected) {
    return (
      <div className="w-48 bg-white border-l border-slate-200 p-4 shrink-0 flex flex-col items-center justify-center">
        <p className="text-slate-400 text-xs text-center">Select an object to edit its properties</p>
      </div>
    )
  }

  const isText = (selected as any).type === 'i-text' || (selected as any).type === 'text'

  return (
    <div className="w-48 bg-white border-l border-slate-200 p-4 shrink-0 overflow-y-auto">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Properties</p>

      {isText && (
        <>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Font</label>
          <select
            value={props.fontFamily}
            onChange={(e) => apply({ fontFamily: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs mb-3 bg-slate-50"
          >
            {FONTS.map((f) => <option key={f}>{f}</option>)}
          </select>

          <label className="block text-xs font-semibold text-slate-600 mb-1">Size</label>
          <div className="flex gap-1 mb-3">
            <input
              type="number"
              value={props.fontSize}
              onChange={(e) => apply({ fontSize: Number(e.target.value) })}
              className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50"
            />
            <button onClick={() => apply({ fontSize: (props.fontSize ?? 16) - 1 })} className="px-2 border border-slate-200 rounded-lg text-xs hover:bg-slate-100">−</button>
            <button onClick={() => apply({ fontSize: (props.fontSize ?? 16) + 1 })} className="px-2 border border-slate-200 rounded-lg text-xs hover:bg-slate-100">+</button>
          </div>

          <label className="block text-xs font-semibold text-slate-600 mb-1">Style</label>
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => apply({ fontWeight: props.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`px-2 py-1.5 rounded-lg text-xs font-black border transition-colors ${props.fontWeight === 'bold' ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >B</button>
            <button
              onClick={() => apply({ fontStyle: props.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`px-2 py-1.5 rounded-lg text-xs italic border transition-colors ${props.fontStyle === 'italic' ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >I</button>
            <button
              onClick={() => apply({ underline: !props.underline })}
              className={`px-2 py-1.5 rounded-lg text-xs underline border transition-colors ${props.underline ? 'bg-sky-600 text-white border-sky-600' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            >U</button>
          </div>
        </>
      )}

      <label className="block text-xs font-semibold text-slate-600 mb-1">Color</label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => apply({ fill: c })}
            style={{ background: c }}
            className={`w-5 h-5 rounded-md border transition-all ${props.fill === c ? 'ring-2 ring-sky-500 ring-offset-1' : 'border-slate-200'}`}
          />
        ))}
      </div>

      <label className="block text-xs font-semibold text-slate-600 mb-1">
        Opacity: {Math.round((props.opacity ?? 1) * 100)}%
      </label>
      <input
        type="range"
        min={0.1}
        max={1}
        step={0.05}
        value={props.opacity ?? 1}
        onChange={(e) => apply({ opacity: Number(e.target.value) })}
        className="w-full mb-3 accent-sky-600"
      />

      <div className="grid grid-cols-2 gap-1.5 mb-4">
        <div>
          <label className="text-xs text-slate-400">X</label>
          <div className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50">{props.left}px</div>
        </div>
        <div>
          <label className="text-xs text-slate-400">Y</label>
          <div className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-slate-50">{props.top}px</div>
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
```

- [ ] **Step 2: Manual test**

Add a text annotation, click it — Properties panel should show font/size/color controls. Changing font size should update the text immediately.

- [ ] **Step 3: Commit**

```bash
git add src/components/PropertiesPanel/
git commit -m "feat: PropertiesPanel — context-sensitive annotation properties"
```

---

## Task 12: pdfExporter Library

**Files:**
- Create: `src/lib/pdfExporter.ts`
- Test: `src/__tests__/lib/pdfExporter.test.ts`

This is the most complex piece. Key challenge: PDF.js uses top-left origin, pdf-lib uses bottom-left. All Y coordinates must be flipped.

- [ ] **Step 1: Write failing tests for coordinate conversion**

Create `src/__tests__/lib/pdfExporter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { flipY, fabricColorToRgb } from '../../lib/pdfExporter'

describe('pdfExporter', () => {
  describe('flipY', () => {
    it('converts top-left Y to bottom-left Y', () => {
      // Object at top: fabricY=0, height=20, pageHeight=800 → pdfY=780
      expect(flipY(0, 20, 800)).toBe(780)
    })

    it('converts mid-page Y correctly', () => {
      // fabricY=400, height=20, pageHeight=800 → pdfY=380
      expect(flipY(400, 20, 800)).toBe(380)
    })

    it('handles scaled objects', () => {
      // fabricY=100, height=50, scaleY=2 (rendered height=100), pageHeight=800 → pdfY=600
      expect(flipY(100, 50, 800, 2)).toBe(600)
    })
  })

  describe('fabricColorToRgb', () => {
    it('converts hex to 0-1 rgb', () => {
      const result = fabricColorToRgb('#ff0000')
      expect(result.r).toBeCloseTo(1)
      expect(result.g).toBeCloseTo(0)
      expect(result.b).toBeCloseTo(0)
    })

    it('handles shorthand hex', () => {
      const result = fabricColorToRgb('#fff')
      expect(result.r).toBeCloseTo(1)
      expect(result.g).toBeCloseTo(1)
      expect(result.b).toBeCloseTo(1)
    })

    it('returns black for invalid color', () => {
      const result = fabricColorToRgb('not-a-color')
      expect(result).toEqual({ r: 0, g: 0, b: 0 })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test -- --run src/__tests__/lib/pdfExporter.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement pdfExporter**

Create `src/lib/pdfExporter.ts`:

```typescript
import { PDFDocument, rgb, StandardFonts, LineCapStyle } from 'pdf-lib'
import type { FabricJsonExport, FabricObjectExport } from '../types/pdf'

// Exported for testing
export function flipY(fabricY: number, fabricHeight: number, pageHeight: number, scaleY = 1): number {
  return pageHeight - fabricY - fabricHeight * scaleY
}

export function fabricColorToRgb(color: string | undefined): { r: number; g: number; b: number } {
  if (!color || color === 'transparent') return { r: 0, g: 0, b: 0 }

  // Expand shorthand hex (#fff → #ffffff)
  const hex = color.startsWith('#')
    ? color.length === 4
      ? '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      : color
    : null

  if (hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    if (isNaN(r) || isNaN(g) || isNaN(b)) return { r: 0, g: 0, b: 0 }
    return { r, g, b }
  }

  return { r: 0, g: 0, b: 0 }
}

async function drawObject(
  page: ReturnType<PDFDocument['getPage']>,
  obj: FabricObjectExport,
  pdfDoc: PDFDocument,
  pageHeight: number,
  renderScale: number,
): Promise<void> {
  const scale = 1 / renderScale   // convert Fabric pixel coords → PDF point coords
  const scaleX = (obj.scaleX ?? 1) * scale
  const scaleY = (obj.scaleY ?? 1) * scale
  const x = obj.left * scale
  const w = obj.width * scaleX
  const h = obj.height * scaleY
  const y = flipY(obj.top * scale, h, pageHeight)
  const opacity = obj.opacity ?? 1
  const fillColor = obj.fill && obj.fill !== 'transparent' ? fabricColorToRgb(obj.fill) : null
  const strokeColor = obj.stroke ? fabricColorToRgb(obj.stroke) : null

  switch (obj.type) {
    case 'i-text':
    case 'text': {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const fontSize = (obj.fontSize ?? 16) * scale
      const textColor = fabricColorToRgb(obj.fill)
      page.drawText(obj.text ?? '', {
        x,
        y: y + h * 0.1,
        size: fontSize,
        font,
        color: rgb(textColor.r, textColor.g, textColor.b),
        opacity,
      })
      break
    }

    case 'rect': {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
        borderColor: strokeColor ? rgb(strokeColor.r, strokeColor.g, strokeColor.b) : undefined,
        borderWidth: (obj.strokeWidth ?? 0) * scale,
        opacity,
      })
      break
    }

    case 'ellipse': {
      page.drawEllipse({
        x: x + w / 2,
        y: y + h / 2,
        xScale: (obj.rx ?? obj.width / 2) * scaleX,
        yScale: (obj.ry ?? obj.height / 2) * scaleY,
        color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
        borderColor: strokeColor ? rgb(strokeColor.r, strokeColor.g, strokeColor.b) : undefined,
        borderWidth: (obj.strokeWidth ?? 0) * scale,
        opacity,
      })
      break
    }

    case 'line': {
      if (strokeColor) {
        page.drawLine({
          start: { x: (obj.x1 ?? x) * scale, y: flipY((obj.y1 ?? 0) * scale, 0, pageHeight) },
          end: { x: (obj.x2 ?? x + w) * scale, y: flipY((obj.y2 ?? 0) * scale, 0, pageHeight) },
          thickness: (obj.strokeWidth ?? 1) * scale,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity,
        })
      }
      break
    }

    case 'path': {
      if (obj.path) {
        const svgPath = (obj.path as [string, ...number[]][])
          .map((cmd) => cmd.join(' '))
          .join(' ')
        if (strokeColor) {
          page.drawSvgPath(svgPath, {
            x,
            y,
            scale: scale,
            color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
            borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
            borderWidth: (obj.strokeWidth ?? 1) * scale,
            opacity,
          })
        }
      }
      break
    }

    case 'image': {
      if (obj.src) {
        try {
          const res = await fetch(obj.src)
          const bytes = await res.arrayBuffer()
          const isPng = obj.src.startsWith('data:image/png') || obj.src.includes('.png')
          const embedded = isPng
            ? await pdfDoc.embedPng(bytes)
            : await pdfDoc.embedJpg(bytes)
          page.drawImage(embedded, { x, y, width: w, height: h, opacity })
        } catch {
          // Skip images that fail to embed
        }
      }
      break
    }
  }
}

export async function exportPdf(
  originalBytes: ArrayBuffer,
  perPageJson: Record<number, string>,
  renderScale: number,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes)
  const pages = pdfDoc.getPages()

  for (let i = 0; i < pages.length; i++) {
    const pageNum = i + 1
    const json = perPageJson[pageNum]
    if (!json) continue

    const fabricJson = JSON.parse(json) as FabricJsonExport
    const page = pages[i]
    const { height: pageHeight } = page.getSize()

    for (const obj of fabricJson.objects) {
      await drawObject(page, obj, pdfDoc, pageHeight, renderScale)
    }
  }

  return pdfDoc.save()
}

export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.replace(/\.pdf$/i, '') + '-edited.pdf'
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test -- --run src/__tests__/lib/pdfExporter.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pdfExporter.ts src/__tests__/lib/pdfExporter.test.ts
git commit -m "feat: pdfExporter — burn Fabric annotations into PDF via pdf-lib"
```

---

## Task 13: Toast Notifications

**Files:**
- Create: `src/components/Toast/Toast.tsx`

- [ ] **Step 1: Implement Toast**

Create `src/components/Toast/Toast.tsx`:

```typescript
import { useEffect, useState } from 'react'

export interface ToastMessage {
  id: number
  message: string
  type: 'info' | 'error' | 'success'
}

let toastId = 0
const listeners: ((msg: ToastMessage) => void)[] = []

export function showToast(message: string, type: ToastMessage['type'] = 'info') {
  const msg = { id: ++toastId, message, type }
  listeners.forEach((fn) => fn(msg))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((t) => [...t, msg])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== msg.id)), 4000)
    }
    listeners.push(handler)
    return () => { const i = listeners.indexOf(handler); if (i > -1) listeners.splice(i, 1) }
  }, [])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
            t.type === 'error' ? 'bg-red-600 text-white' :
            t.type === 'success' ? 'bg-green-600 text-white' :
            'bg-slate-800 text-white'
          }`}
        >
          {t.type === 'error' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️'}
          {t.message}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Toast/
git commit -m "feat: Toast notification system"
```

---

## Task 14: Full App Integration

**Files:**
- Modify: `src/App.tsx`

This task wires every component together into the final editor layout and handles PDF form field fill.

- [ ] **Step 1: Implement final App.tsx**

Replace `src/App.tsx` with:

```typescript
import { useCallback } from 'react'
import { PDFUploader } from './components/PDFUploader/PDFUploader'
import { PDFCanvas } from './components/PDFCanvas/PDFCanvas'
import { EditorToolbar } from './components/EditorToolbar/EditorToolbar'
import { PageThumbnailSidebar } from './components/PageThumbnailSidebar/PageThumbnailSidebar'
import { PropertiesPanel } from './components/PropertiesPanel/PropertiesPanel'
import { ToastContainer, showToast } from './components/Toast/Toast'
import { usePdfStore } from './store/pdfStore'
import { useAnnotationStore } from './store/annotationStore'
import { useEditorStore } from './store/editorStore'
import { loadPdfDocument } from './lib/pdfLoader'
import { exportPdf, downloadBytes } from './lib/pdfExporter'
import { getFabricCanvas } from './lib/fabricManager'

export default function App() {
  const { pdfDocument, pageCount, pdfBytes, fileName, setPdfBytes, setPageCount, setPdfDocument, reset } = usePdfStore()
  const { perPageJson, undo, redo } = useAnnotationStore()
  const { currentPage, zoom } = useEditorStore()

  const handleFileLoaded = useCallback(async (bytes: ArrayBuffer, name: string) => {
    try {
      setPdfBytes(bytes, name)
      const { doc, pageCount } = await loadPdfDocument(bytes)
      setPdfDocument(doc)
      setPageCount(pageCount)
    } catch (e) {
      showToast('Failed to load PDF. The file may be corrupted.', 'error')
    }
  }, [])

  function handleUndo() {
    const fc = getFabricCanvas(currentPage)
    const json = undo(currentPage)
    if (json && fc) {
      fc.loadFromJSON(JSON.parse(json), () => fc.renderAll())
    }
  }

  function handleRedo() {
    const fc = getFabricCanvas(currentPage)
    const json = redo(currentPage)
    if (json && fc) {
      fc.loadFromJSON(JSON.parse(json), () => fc.renderAll())
    }
  }

  async function handleDownload() {
    if (!pdfBytes) return
    try {
      const renderScale = zoom * window.devicePixelRatio * 1.5
      const bytes = await exportPdf(pdfBytes, perPageJson, renderScale)
      downloadBytes(bytes, fileName)
      showToast('PDF downloaded successfully!', 'success')
    } catch (e) {
      showToast('Export failed. Please try again.', 'error')
      console.error(e)
    }
  }

  // Keyboard shortcuts
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      handleUndo()
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      handleRedo()
    }
  }

  if (!pdfDocument) {
    return (
      <>
        <PDFUploader onFileLoaded={handleFileLoaded} />
        <ToastContainer />
      </>
    )
  }

  const activeFabricCanvas = getFabricCanvas(currentPage) ?? null

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden" onKeyDown={handleKeyDown} tabIndex={0}>
      <EditorToolbar onDownload={handleDownload} onUndo={handleUndo} onRedo={handleRedo} />
      <div className="flex flex-1 overflow-hidden">
        <PageThumbnailSidebar doc={pdfDocument} pageCount={pageCount} />
        <PDFCanvas doc={pdfDocument} pageCount={pageCount} />
        <PropertiesPanel fabricCanvas={activeFabricCanvas} />
      </div>
      <ToastContainer />
    </div>
  )
}
```

- [ ] **Step 2: Add "open new file" button to toolbar**

In `EditorToolbar.tsx`, add a secondary button next to the logo:

```typescript
// Add prop:
interface Props {
  onDownload: () => void
  onUndo: () => void
  onRedo: () => void
  onOpenNew?: () => void
}

// Add button after the logo divider:
{onOpenNew && (
  <button
    onClick={onOpenNew}
    className="text-xs text-slate-500 hover:text-sky-600 px-2 py-1 rounded hidden sm:block"
  >
    Open new
  </button>
)}
```

- [ ] **Step 3: Add loading state while PDF loads**

In `App.tsx`, add a loading state:

```typescript
const [loading, setLoading] = useState(false)

const handleFileLoaded = useCallback(async (bytes: ArrayBuffer, name: string) => {
  setLoading(true)
  try {
    setPdfBytes(bytes, name)
    const { doc, pageCount } = await loadPdfDocument(bytes)
    setPdfDocument(doc)
    setPageCount(pageCount)
  } catch (e) {
    showToast('Failed to load PDF. The file may be corrupted.', 'error')
  } finally {
    setLoading(false)
  }
}, [])
```

Show a loading screen between upload and editor:

```typescript
if (loading) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-100 gap-4">
      <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      <p className="text-slate-500 font-medium">Loading your PDF...</p>
    </div>
  )
}
```

Also wrap the Download button in `handleDownload` with a loading indicator:

```typescript
const [exporting, setExporting] = useState(false)

async function handleDownload() {
  if (!pdfBytes) return
  setExporting(true)
  try {
    const renderScale = zoom * window.devicePixelRatio * 1.5
    const bytes = await exportPdf(pdfBytes, perPageJson, renderScale)
    downloadBytes(bytes, fileName)
    showToast('PDF downloaded successfully!', 'success')
  } catch (e) {
    showToast('Export failed. Please try again.', 'error')
  } finally {
    setExporting(false)
  }
}
```

Pass `exporting` to `EditorToolbar` and disable/label the button:

```typescript
// In EditorToolbar props:
interface Props {
  onDownload: () => void
  onUndo: () => void
  onRedo: () => void
  onOpenNew?: () => void
  exporting?: boolean
}

// Update button:
<button
  onClick={onDownload}
  disabled={exporting}
  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors text-sm"
>
  {exporting ? '⏳ Exporting...' : '⬇ Download PDF'}
</button>
```

- [ ] **Step 4: Add PDF form fill support**

PDF.js renders interactive form fields automatically. To write filled values back via pdf-lib, add to `pdfExporter.ts`:

```typescript
// Add this function to pdfExporter.ts, called inside exportPdf before pdfDoc.save():
async function writeFormFields(
  pdfDoc: PDFDocument,
  originalBytes: ArrayBuffer,
): Promise<void> {
  // pdf-lib exposes the AcroForm — we read field values from the DOM
  // (PDF.js renders form inputs as real <input>/<select> elements)
  const form = pdfDoc.getForm()
  const fields = form.getFields()

  fields.forEach((field) => {
    const name = field.getName()
    // Find the DOM input PDF.js rendered for this field
    const domInput = document.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[name="${CSS.escape(name)}"]`,
    )
    if (!domInput) return

    try {
      if (field.constructor.name === 'PDFTextField') {
        (field as any).setText(domInput.value)
      } else if (field.constructor.name === 'PDFCheckBox') {
        const checked = (domInput as HTMLInputElement).checked
        checked ? (field as any).check() : (field as any).uncheck()
      } else if (field.constructor.name === 'PDFDropdown') {
        (field as any).select((domInput as HTMLSelectElement).value)
      }
    } catch {
      // Skip fields that fail — don't block the whole export
    }
  })
}
```

Call it inside `exportPdf` before `pdfDoc.save()`:

```typescript
await writeFormFields(pdfDoc, originalBytes)
return pdfDoc.save()
```

- [ ] **Step 5: Run the app and do a full manual test**

```bash
npm run dev
```

Walk through this test checklist:
1. Upload a PDF — pages should render
2. Click Text, click a page — text box should appear
3. Click on the text box — Properties panel should show font controls
4. Change font size — text should update
5. Click Draw, draw on the page
6. Click Undo (or Ctrl+Z) — drawing should disappear
7. Click Shape → Rect, click a page — rectangle should appear
8. Click Highlight, click a page — yellow highlight should appear
9. Click Sign → draw a signature → Use Signature — signature should appear on page
10. Click Download PDF — browser should download the edited file
11. Open the downloaded PDF in a PDF viewer — all annotations should be visible

- [ ] **Step 4: Run all tests**

```bash
npm run test:run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/EditorToolbar/EditorToolbar.tsx
git commit -m "feat: full editor integration — all components wired together"
```

---

## Task 15: Mobile Responsive Layout

**Files:**
- Modify: `src/App.tsx`, `src/components/EditorToolbar/EditorToolbar.tsx`
- Modify: `src/components/PageThumbnailSidebar/PageThumbnailSidebar.tsx`
- Modify: `src/components/PropertiesPanel/PropertiesPanel.tsx`

- [ ] **Step 1: Hide sidebars on small screens, add toggle buttons**

In `App.tsx`, add mobile sidebar state:

```typescript
import { useState } from 'react'

// Inside App component:
const [showThumbs, setShowThumbs] = useState(false)
const [showProps, setShowProps] = useState(false)
```

Update the layout div:

```typescript
<div className="flex flex-1 overflow-hidden relative">
  {/* Left sidebar — hidden on mobile, shown via toggle */}
  <div className={`${showThumbs ? 'flex' : 'hidden'} md:flex`}>
    <PageThumbnailSidebar doc={pdfDocument} pageCount={pageCount} />
  </div>

  <PDFCanvas doc={pdfDocument} pageCount={pageCount} />

  {/* Right panel — hidden on mobile, shown via toggle */}
  <div className={`${showProps ? 'flex' : 'hidden'} md:flex`}>
    <PropertiesPanel fabricCanvas={activeFabricCanvas} />
  </div>

  {/* Mobile toggle buttons — bottom of screen */}
  <div className="fixed bottom-4 left-4 right-4 flex justify-between md:hidden">
    <button
      onClick={() => setShowThumbs((v) => !v)}
      className="bg-white shadow-lg border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700"
    >
      📄 Pages
    </button>
    <button
      onClick={() => setShowProps((v) => !v)}
      className="bg-white shadow-lg border border-slate-200 rounded-full px-4 py-2 text-sm font-medium text-slate-700"
    >
      ⚙️ Properties
    </button>
  </div>
</div>
```

- [ ] **Step 2: Make toolbar scroll on small screens**

In `EditorToolbar.tsx`, wrap the tools div:

```typescript
// Replace the tools flex div with:
<div className="flex gap-1 overflow-x-auto no-scrollbar">
  {TOOLS.map((t) => ( ... ))}
</div>
```

Add to `index.css`:

```css
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

- [ ] **Step 3: Test on mobile viewport**

In Chrome DevTools, switch to mobile viewport (375px wide). Verify:
- Toolbar tools are scrollable horizontally
- "Pages" and "Properties" buttons appear at the bottom
- Clicking them shows/hides the sidebars

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/EditorToolbar/EditorToolbar.tsx src/index.css
git commit -m "feat: mobile responsive layout — sidebars toggle on small screens"
```

---

## Task 16: Deploy Setup

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create vercel.json for SPA routing**

Create `vercel.json` in the project root:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: No TypeScript errors. `dist/` directory created with `index.html` and assets.

- [ ] **Step 3: Preview the build locally**

```bash
npm run preview
```

Open `http://localhost:4173` — full app should work identically to dev mode.

- [ ] **Step 4: Deploy to Vercel**

```bash
npx vercel --prod
```

Or connect the GitHub repo at vercel.com → New Project → Import repo → Framework: Vite → Deploy.

- [ ] **Step 5: Final commit**

```bash
git add vercel.json
git commit -m "feat: vercel deploy config + production build verified"
```

---

## Done

At this point the app has:
- Drag-and-drop PDF upload
- All pages rendered via PDF.js with Fabric.js overlay
- Text, image, draw, shape (rect/circle/line/arrow), highlight, signature tools
- Click-to-place annotations, all selectable/movable/resizable before export
- Properties panel with font/color/opacity/position/delete
- Undo/Redo per page (Ctrl+Z / Ctrl+Shift+Z)
- Zoom in/out
- Download exports annotations burned into the original PDF via pdf-lib
- Privacy banner — zero server uploads
- Toast notifications for errors and success
- Mobile-responsive layout

**Phase 2 work (page tools) can begin using the same spec → plan → implement cycle.**
