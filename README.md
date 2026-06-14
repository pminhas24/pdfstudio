# PDF Studio

PDF Studio is a static, browser-based PDF editor for common PDF editing, page organization, conversion, optimization, and privacy cleanup tasks.

## Working Features

- Edit PDF: add text, images, drawings, shapes, highlights, signatures, and fillable form values.
- Page management: delete, rotate, duplicate, and reorder pages from the thumbnail sidebar.
- Document tools: merge PDFs, split PDFs, extract pages, remove pages, add watermarks, and add page numbers.
- Optimize and convert: compress PDFs, create PDFs from JPG/PNG files, export PDF pages to JPG/PNG, and extract PDF text.
- Security and privacy: remove common PDF metadata fields.
- Export: download the final PDF with edits and supported document changes applied.

## Coming Soon

- Crop PDF
- Password protect
- Unlock PDF
- Permanent redaction
- Full OCR workflow

## Privacy

Files stay in your browser. PDF Studio is a static frontend app and does not upload documents to a backend server.

## Tech Stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- PDF.js for PDF rendering
- pdf-lib for PDF manipulation
- Fabric.js for the annotation layer
- Zustand for app state
- Vitest and Testing Library for tests

## Local Development

```bash
npm install
npm run dev
npm run test:run
npm run build
npm run preview
```

The dev server runs at the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Build

```bash
npm run build
```

The production output directory is `dist`.

## Vercel Deployment

Use the Vercel Vite preset or these settings:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

`vercel.json` includes a rewrite to `index.html` so direct refreshes route back to the single-page app.

## Known Limitations

- Existing PDF text is not edited in place. Add a text object over the document instead.
- Compression rasterizes pages, so selectable text can become image content in the compressed output.
- Very large PDFs can be slow or memory-intensive in the browser.
- Some encrypted, corrupted, or unusual PDFs may fail to load.
- Coming Soon tools are intentionally shown as unavailable and do not perform fake work.

## QA Checklist

- [ ] Upload PDF
- [ ] Add text
- [ ] Add image
- [ ] Draw/sign
- [ ] Delete object
- [ ] Undo/redo
- [ ] Delete/rotate/reorder pages
- [ ] Merge/split/extract/remove pages
- [ ] Watermark/page numbers
- [ ] Compress
- [ ] Image to PDF
- [ ] PDF to JPG/PNG
- [ ] PDF to text
- [ ] Remove metadata
- [ ] Download final PDF
- [ ] Build passes
