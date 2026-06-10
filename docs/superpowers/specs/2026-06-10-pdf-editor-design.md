# PDF Editor — Phase 1 Design Spec

**Date:** 2026-06-10
**Scope:** Phase 1 — Core editing features only

---

## Goal

A free, browser-based PDF editor that competes with paid tools like Smallpdf and iLovePDF. No signup, no watermark, no usage limits, no server uploads. Everything runs client-side in the browser.

---

## Decisions Made

| Decision | Choice | Reason |
|---|---|---|
| Framework | Vite + React + TypeScript | Purely static, deploys to Vercel/Netlify, no server needed |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| PDF rendering | PDF.js | Industry standard for browser PDF preview |
| PDF modification | pdf-lib | Best client-side PDF write library |
| Editor overlay | Fabric.js | Handles selectable/movable objects, undo/redo, groups |
| State management | Zustand | Lightweight, great TypeScript support |
| Deployment target | Vercel or Netlify (static) | Free tier, CDN-distributed |
| Theme | Sky Blue / Adobe-style | Clean white panels, `#0284c7` accent |

---

## Phase 1 Feature Scope

These are the only features in this spec. Phases 2–4 (page tools, advanced, OCR/compare) are future work.

### Implemented in Phase 1

- Upload PDF via drag-and-drop or file picker
- Preview all pages in a scrollable editor (PDF.js renders each page)
- Add text anywhere on a page (selectable, movable, resizable before export)
- Add images (selectable, movable, resizable)
- Freehand pen/draw tool
- Highlight tool (semi-transparent colored rectangle)
- Shapes: rectangle, circle, line, arrow
- Signature: draw with mouse/touch, type text, or upload image
- Fill PDF form fields (PDF.js renders interactive fields; on Download, pdf-lib reads the `AcroForm` and writes field values back into the PDF)
- Undo / redo (full history per page)
- Zoom in / zoom out
- Download edited PDF (annotations burned in via pdf-lib)
- Page thumbnail sidebar (left) — click to jump to page
- Properties panel (right) — font, size, color, bold/italic/underline, opacity, X/Y position, delete
- Privacy banner: "Your file stays in your browser"
- Clear loading states and error messages
- Mobile-responsive layout (on screens <768px: left sidebar collapses to a bottom sheet, right panel becomes a slide-up drawer, toolbar tools wrap to two rows)

### Explicitly out of scope for Phase 1

- Edit existing PDF text (technically not feasible client-side — display friendly warning)
- Merge / split / delete / rotate / reorder pages (Phase 2)
- Compress / password protect / redact (Phase 3)
- OCR / PDF comparison (Phase 4)

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TOOLBAR: Logo | Tools | Undo Redo Zoom | Privacy badge | Download │
├──────────────┬──────────────────────────────┬───────────────────┤
│ PAGE THUMBS  │      PDF CANVAS (scroll)      │ PROPERTIES PANEL  │
│ (left 114px) │      center, flex-1           │ (right 186px)     │
│              │                               │                   │
│ Thumbnail    │  White PDF page card          │ Font, Size, Color │
│ per page     │  Fabric.js overlay on top     │ Bold/Italic/Under │
│ Active: blue │  Annotations: movable         │ Opacity, X/Y pos  │
│ border       │  Selection handles: blue      │ Delete button     │
│              │  Page badge: "Page N of M"    │                   │
└──────────────┴──────────────────────────────┴───────────────────┘
```

**Color palette (Tailwind classes):**
- Accent: `sky-600` (`#0284c7`), hover `sky-700`
- Background: `slate-100` canvas area, `white` panels
- Borders: `slate-200`
- Text: `slate-900` primary, `slate-500` secondary
- Success/privacy: `green-600` on `green-50`
- Danger: `red-600` on `red-50`
- Selection handles: `sky-600` 8×8px squares at corners

---

## Component Architecture

```
src/
├── components/
│   ├── PDFUploader/
│   │   └── PDFUploader.tsx       # Drag-and-drop landing screen
│   ├── EditorToolbar/
│   │   └── EditorToolbar.tsx     # Tool buttons, undo/redo, zoom, download
│   ├── PageThumbnailSidebar/
│   │   └── PageThumbnailSidebar.tsx  # Scrollable page list, click to navigate
│   ├── PDFCanvas/
│   │   ├── PDFCanvas.tsx         # Orchestrates all pages
│   │   └── PDFPage.tsx           # Single page: PDF.js render + Fabric overlay
│   ├── PropertiesPanel/
│   │   └── PropertiesPanel.tsx   # Right sidebar, context-sensitive controls
│   ├── SignatureModal/
│   │   └── SignatureModal.tsx    # Draw / type / upload signature
│   └── tools/
│       ├── TextTool.ts           # Creates Fabric IText
│       ├── ImageTool.ts          # Inserts Fabric Image from file
│       ├── DrawTool.ts           # Enables Fabric freeDrawingMode
│       ├── ShapeTool.ts          # Rect, circle, line, arrow factory
│       ├── SignatureTool.ts      # Converts signature canvas to Fabric Image
│       └── HighlightTool.ts     # Semi-transparent Fabric Rect
├── store/
│   ├── editorStore.ts            # activeTool, zoom, selectedObjectId
│   ├── pdfStore.ts               # pdfBytes (ArrayBuffer), pageCount, fileName
│   └── annotationStore.ts       # perPageJson: Record<number, string>, undoStack
├── lib/
│   ├── pdfLoader.ts              # PDF.js: load document, render page to canvas
│   ├── pdfExporter.ts            # pdf-lib: read Fabric JSON → write to PDF
│   └── fabricManager.ts         # Fabric canvas create/destroy/resize per page
├── App.tsx                       # Screens: Upload → Editor
└── main.tsx
```

---

## Data Flow

### Load
```
User drops PDF
  → pdfStore.setPdfBytes(ArrayBuffer)
  → pdfLoader.loadDocument() → PDF.js PDFDocumentProxy
  → pdfStore.setPageCount(n)
  → App switches from Upload screen to Editor screen
  → PDFCanvas maps pages [1..n] → <PDFPage pageNum={n} />
```

### Per-page render
```
PDFPage mounts
  → pdfLoader.renderPage(pageNum, scale) → draws to <canvas>
  → fabricManager.createCanvas(pageNum, width, height)
     → Fabric canvas overlaid, pointer-events on top
  → annotationStore has existing JSON? → fabricManager.loadFromJSON()
```

### Annotation edit
```
User selects tool in EditorToolbar
  → editorStore.setActiveTool(tool)
  → PDFPage listens → calls appropriate Tool.ts function on Fabric canvas
  → Fabric fires 'object:modified' / 'object:added'
  → annotationStore.savePageJson(pageNum, canvas.toJSON())
  → annotationStore pushes previous JSON to undoStack[pageNum]
```

### Undo
```
User clicks Undo
  → annotationStore.undo(pageNum)
  → pushes current JSON to redoStack[pageNum]
  → pops undoStack[pageNum]
  → fabricManager.loadFromJSON(pageNum, previousJson)
```

### Redo
```
User clicks Redo
  → annotationStore.redo(pageNum)
  → pushes current JSON to undoStack[pageNum]
  → pops redoStack[pageNum]
  → fabricManager.loadFromJSON(pageNum, nextJson)
```

### Export
```
User clicks Download
  → pdfExporter.export(pdfBytes, annotationStore.perPageJson)
  → pdf-lib loads original bytes
  → for each page:
      parse Fabric JSON
      for each object:
        IText       → page.drawText() with embedded font
        Rect        → page.drawRectangle()
        Circle/Ellipse → page.drawEllipse()
        Path        → page.drawSvgPath() (draw tool, arrows)
        Image       → embed + page.drawImage()
        Highlight   → page.drawRectangle() with opacity < 1
  → pdfDoc.save() → Uint8Array → trigger browser download
```

---

## Fabric → pdf-lib Translation Table

| Fabric object type | pdf-lib method | Notes |
|---|---|---|
| `IText` | `page.drawText()` | Embed standard font (Helvetica, Times, Courier). Custom fonts need embedding. |
| `Rect` | `page.drawRectangle()` | Map fill + stroke color, opacity |
| `Ellipse` | `page.drawEllipse()` | Map rx/ry |
| `Line` | `page.drawLine()` | |
| `Path` (draw tool) | `page.drawSvgPath()` | Fabric path.path → SVG path string |
| `Path` (arrow) | `page.drawSvgPath()` + arrowhead | Compute arrowhead triangle |
| `Image` | `page.drawImage()` | Embed as PNG via `embedPng()` |
| Highlight (`Rect` + opacity) | `page.drawRectangle()` | Set `opacity` field |
| Signature (drawn) | `page.drawSvgPath()` or `page.drawImage()` | Export as PNG from Fabric canvas |

**Coordinate system note:** PDF.js uses top-left origin; pdf-lib uses bottom-left. All Y coordinates must be flipped: `pdfY = pageHeight - fabricY - objectHeight`.

---

## State Shape (Zustand)

```typescript
// editorStore
interface EditorState {
  activeTool: 'select' | 'text' | 'image' | 'draw' | 'shape' | 'highlight' | 'signature'
  activeShape: 'rect' | 'circle' | 'line' | 'arrow'
  zoom: number  // 0.5 – 3.0, default 1.0
  currentPage: number
  selectedObjectId: string | null
}

// pdfStore
interface PDFState {
  pdfBytes: ArrayBuffer | null
  fileName: string
  pageCount: number
  pdfDocument: PDFDocumentProxy | null  // PDF.js doc
}

// annotationStore
interface AnnotationState {
  perPageJson: Record<number, string>   // pageNum → Fabric JSON string
  undoStack: Record<number, string[]>   // pageNum → stack of JSON snapshots
  redoStack: Record<number, string[]>
  savePageJson: (page: number, json: string) => void
  undo: (page: number) => string | null
  redo: (page: number) => string | null
}
```

---

## Key Technical Constraints & Browser Limitations

These must be communicated to users in the UI:

| Constraint | User-facing message |
|---|---|
| Cannot edit existing PDF text | "Existing text can't be edited — add a new text box on top" |
| Large PDFs (>50MB) may be slow | "Large files may take a moment to load" |
| Draw tool paths are rasterized in some browsers | No action needed — handled transparently |
| PDF form fill depends on form structure | "Some form fields may not be detected" |
| Fonts: only standard PDF fonts supported | "Custom fonts will fall back to Helvetica" |
| Mobile: draw tool limited by touch precision | "For best results, use a stylus or desktop" |

---

## Undo/Redo Strategy

- Each page has its own independent undo stack (max 50 snapshots)
- Snapshot is taken on every `object:added`, `object:modified`, `object:removed` Fabric event
- Snapshots are full Fabric JSON strings (not diffs) — simpler and fast enough for typical annotation counts
- Global undo (Ctrl+Z) always acts on the currently visible page

---

## Rendering Scale Strategy

PDF.js renders at `window.devicePixelRatio * 1.5` scale for sharp display. Fabric canvas is sized to match the CSS display size (not the pixel size). The scale factor is stored in `fabricManager` per page and used during export to correctly translate coordinates.

---

## File Privacy

- Zero server uploads for Phase 1
- All processing in Web Workers where possible (PDF.js already uses workers)
- Privacy banner shown at all times in the toolbar
- `<meta>` tags: no analytics, no external requests

---

## Out of Scope Warnings (in UI)

When a user attempts something not in Phase 1 (e.g. tries to click existing PDF text):
- Show a non-blocking toast: "This feature isn't supported yet — add a text box on top instead."
- Never crash or show a blank error.

---

## Dependencies

```json
{
  "react": "^18",
  "typescript": "^5",
  "vite": "^5",
  "tailwindcss": "^3",
  "fabric": "^6",
  "pdfjs-dist": "^4",
  "pdf-lib": "^1.17",
  "zustand": "^4",
  "react-dropzone": "^14"
}
```

---

## Deployment

- Build: `vite build` → static files in `dist/`
- Deploy: drag `dist/` to Vercel or Netlify, or connect GitHub repo for auto-deploy
- No environment variables needed for Phase 1
- Add `.superpowers/` to `.gitignore`

---

## Not In This Spec (Future Phases)

- Phase 2: Merge, split, delete pages, rotate, reorder, extract, page numbers, watermark
- Phase 3: Compress, password protect/remove, redact, crop, image→PDF, export pages as images
- Phase 4: OCR (Tesseract.js), PDF comparison
- Next.js migration (only if server-side features are needed in Phase 3+)
