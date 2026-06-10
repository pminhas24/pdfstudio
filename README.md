# PDF Studio

A free, browser-based PDF editor. No signup, no watermarks, no usage limits — and your files never leave your browser. All PDF processing happens client-side.

## Features

**Annotate**

- Add text anywhere on a page (move, resize, restyle before saving)
- Insert images (PNG/JPEG)
- Freehand draw and highlight
- Shapes: rectangle, circle, line, arrow
- Signatures: draw, type, or upload
- Fill PDF form fields
- Per-page undo/redo (Ctrl+Z / Ctrl+Shift+Z)

**Organize pages**

- Delete, rotate, and drag-to-reorder pages from the thumbnail sidebar
- Merge other PDFs into the open document
- Split / extract page ranges
- Convert images to a PDF

**Document tools**

- Add page numbers and watermarks
- Crop pages
- Compress (rasterizes pages to JPEG — text becomes unselectable)
- Permanent redaction via page flattening
- Password protect / unlock (AES via `@cantoo/pdf-lib`)
- Export pages as PNG images
- OCR text extraction (Tesseract.js — the ~5 MB engine downloads from a CDN on first use; the PDF itself never leaves the browser)

**Known limitations**

- Existing PDF text cannot be edited in place (not feasible client-side) — add a text box on top instead
- Text annotations use the 14 standard PDF fonts (Helvetica, Times, Courier families)
- Very large PDFs (>50 MB) may be slow to load

## Tech stack

- [Vite](https://vitejs.dev/) + React 18 + TypeScript
- [PDF.js](https://mozilla.github.io/pdf.js/) for rendering
- [pdf-lib](https://pdf-lib.js.org/) for PDF modification
- [Fabric.js](http://fabricjs.com/) for the annotation overlay
- [Zustand](https://zustand-demo.pmnd.rs/) for state
- Tailwind CSS

## Development

```bash
npm install
npm run dev        # start dev server at http://localhost:5173
npm run test:run   # run the test suite once
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build locally
```

## Deployment

The app is fully static. On Vercel: import the repo, framework preset **Vite**, build command `npm run build`, output directory `dist`. `vercel.json` already contains the SPA rewrite. No environment variables are required.

## Privacy

Files are processed entirely in your browser with JavaScript and Web Workers. Nothing is uploaded to any server. The only network request the app can make after loading is the optional OCR engine download (Tesseract.js from a CDN), which is disclosed in the OCR dialog. There are no analytics.
