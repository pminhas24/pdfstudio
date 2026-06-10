# PDF Editor Phases 2–4 Implementation Plan

**Goal:** Complete the remaining feature set: page management, document tools, security, and OCR — making the app fully usable end-to-end. UI polish is deferred (user will restyle later).

**Core architecture decision:** *Document operations are eager; annotations are lazy.*
Page-structure operations (merge, split, delete, rotate, reorder, extract, page numbers, watermark, crop, compress, redact, protect/unlock) run pdf-lib against the current `pdfBytes` immediately, producing new bytes that replace the document and reload the PDF.js viewer. Annotations remain per-page Fabric JSON, burned in only at download. Every structural op must remap annotation page keys.

---

## Feature → Mechanism map

| Feature | Mechanism |
|---|---|
| Merge PDFs | `copyPages` from uploaded docs appended to current |
| Split / Extract pages | `copyPages` selected range into new doc → download or replace |
| Delete pages | `removePage` + annotation key shift |
| Rotate page | `setRotation(angle+90)` + annotation rigid-transform remap |
| Reorder pages | rebuild doc via `copyPages` permutation + annotation key permute |
| Page numbers | eager `drawText` on each page (position/format options) |
| Watermark | eager diagonal `drawText` with opacity on each page |
| Crop | modal with drag-rect over page thumbnail → `setCropBox` |
| Compress | rasterize pages via PDF.js at chosen quality → rebuild from JPEGs (lossy, honest about it) |
| Redact (permanent) | flatten page: composite PDF.js render + Fabric overlay → replace page with image; underlying text is destroyed |
| Images → PDF | embedJpg/embedPng one page per image |
| Export pages as images | PDF.js render at 2× → PNG downloads |
| Password protect / remove | `@cantoo/pdf-lib` fork (pdf-lib itself has no crypto); dynamic import |
| OCR | `tesseract.js` dynamic import; render page → recognize → text panel with copy. Language model downloads from CDN (disclosed in UI); the file itself never leaves the browser |
| Compare two PDFs | **dropped** — low value/effort ratio; revisit later |

## Rotation correctness (the hard part)

- **Viewer:** PDF.js `getViewport({scale})` already applies page `/Rotate` — rendering and Fabric canvas dims are automatically correct.
- **Export:** for pages with `/Rotate ≠ 0`, wrap annotation drawing in `pushGraphicsState` + `concatTransformationMatrix` + `popGraphicsState`, mapping view-space (what the user saw) into page space. Matrices (W,H = unrotated page size, view coords already y-flipped):
  - 90°: `cm = [0, 1, −1, 0, W, 0]`
  - 180°: `cm = [−1, 0, 0, −1, W, H]`
  - 270°: `cm = [0, −1, 1, 0, 0, H]`
- **Rotating an annotated page:** existing Fabric objects get a rigid transform: `left' = oldViewH − top`, `top' = left`, `angle' = angle + 90` (rotation about the object origin matches the page content rotation).

## New files

```
src/lib/pageOperations.ts     # pure bytes→bytes pdf-lib ops
src/lib/annotationRemap.ts    # delete-shift / reorder-permute / rotate-transform (unit tested)
src/lib/rasterOps.ts          # compress, flatten/redact, export-as-images (needs PDF.js doc)
src/lib/passwordOps.ts        # protect/unlock via @cantoo/pdf-lib (dynamic import)
src/lib/ocr.ts                # tesseract.js wrapper (dynamic import)
src/hooks/useDocOperation.ts  # apply op → reload doc → remap annotations → toasts
src/components/ToolsMenu/ToolsMenu.tsx        # toolbar dropdown listing all tools
src/components/modals/*.tsx   # Merge, SplitExtract, PageNumbers, Watermark,
                              # Compress, Crop, Protect, Ocr, ExportImages
```

Sidebar gains per-page hover actions (rotate ↻, delete ✕), drag-and-drop reorder, and checkbox selection for extract.

## Safety rules

- Destructive ops (delete page, redact/flatten, compress) get a confirm step.
- No undo for document ops in this phase (bytes history is memory-heavy); confirm dialogs are the guard.
- Every op wrapped in try/catch with a toast on failure; the previous bytes are kept on error.

## Out of scope (unchanged)

Editing existing PDF text, PDF comparison, UI polish.
