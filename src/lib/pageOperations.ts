import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import { fabricColorToRgb } from './pdfExporter'

// Pure bytes→bytes document operations. Each loads the current PDF, applies
// one structural change, and returns the new bytes. The caller (the
// useDocOperation hook) swaps the document and remaps annotations.

async function load(bytes: ArrayBuffer): Promise<PDFDocument> {
  return PDFDocument.load(bytes)
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
}

export async function deletePage(
  bytes: ArrayBuffer,
  pageNum: number,
): Promise<ArrayBuffer> {
  const doc = await load(bytes)
  if (doc.getPageCount() <= 1) {
    throw new Error('Cannot delete the only page')
  }
  doc.removePage(pageNum - 1)
  return toArrayBuffer(await doc.save())
}

// Adds 90° clockwise to the page's existing rotation.
export async function rotatePage(
  bytes: ArrayBuffer,
  pageNum: number,
): Promise<ArrayBuffer> {
  const doc = await load(bytes)
  const page = doc.getPage(pageNum - 1)
  const current = page.getRotation().angle
  page.setRotation(degrees((current + 90) % 360))
  return toArrayBuffer(await doc.save())
}

// order: new page sequence as 1-based original page numbers,
// e.g. [3, 1, 2] puts the original page 3 first.
export async function reorderPages(
  bytes: ArrayBuffer,
  order: number[],
): Promise<ArrayBuffer> {
  const src = await load(bytes)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, order.map((n) => n - 1))
  copied.forEach((p) => out.addPage(p))
  return toArrayBuffer(await out.save())
}

// Appends every page of each additional PDF to the current document.
export async function mergePdfs(
  bytes: ArrayBuffer,
  others: ArrayBuffer[],
): Promise<ArrayBuffer> {
  const doc = await load(bytes)
  for (const other of others) {
    const src = await PDFDocument.load(other)
    const copied = await doc.copyPages(src, src.getPageIndices())
    copied.forEach((p) => doc.addPage(p))
  }
  return toArrayBuffer(await doc.save())
}

// Builds a new PDF containing only the given (1-based) pages, in order.
export async function extractPages(
  bytes: ArrayBuffer,
  pageNums: number[],
): Promise<ArrayBuffer> {
  const src = await load(bytes)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, pageNums.map((n) => n - 1))
  copied.forEach((p) => out.addPage(p))
  return toArrayBuffer(await out.save())
}

export type PageNumberPosition = 'bottom-center' | 'bottom-right' | 'bottom-left'

export async function addPageNumbers(
  bytes: ArrayBuffer,
  options: { position?: PageNumberPosition; startAt?: number; fontSize?: number } = {},
): Promise<ArrayBuffer> {
  const { position = 'bottom-center', startAt = 1, fontSize = 11 } = options
  const doc = await load(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  pages.forEach((page, i) => {
    const { width } = page.getSize()
    const label = String(startAt + i)
    const textWidth = font.widthOfTextAtSize(label, fontSize)
    const x =
      position === 'bottom-left'
        ? 36
        : position === 'bottom-right'
          ? width - 36 - textWidth
          : (width - textWidth) / 2
    page.drawText(label, {
      x,
      y: 24,
      size: fontSize,
      font,
      color: rgb(0.35, 0.35, 0.35),
    })
  })
  return toArrayBuffer(await doc.save())
}

export async function addWatermark(
  bytes: ArrayBuffer,
  options: { text: string; opacity?: number; fontSize?: number; color?: string },
): Promise<ArrayBuffer> {
  const { text, opacity = 0.18, fontSize = 50, color = '#64748b' } = options
  const doc = await load(bytes)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const c = fabricColorToRgb(color)
  const pages = doc.getPages()

  pages.forEach((page) => {
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(text, fontSize)
    // Centered diagonal: rotation pivots at the text origin, so offset the
    // start point so the rotated baseline passes through the page center.
    const angleRad = Math.PI / 4
    const x = width / 2 - (textWidth / 2) * Math.cos(angleRad)
    const y = height / 2 - (textWidth / 2) * Math.sin(angleRad)
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(c.r, c.g, c.b),
      opacity,
      rotate: degrees(45),
    })
  })
  return toArrayBuffer(await doc.save())
}

// rect is in PDF points with a TOP-LEFT origin (matching the editor view
// of an unrotated page); converted to the PDF's bottom-left CropBox here.
export async function cropPage(
  bytes: ArrayBuffer,
  pageNum: number,
  rect: { x: number; y: number; width: number; height: number },
): Promise<ArrayBuffer> {
  const doc = await load(bytes)
  const page = doc.getPage(pageNum - 1)
  const { height } = page.getSize()
  page.setCropBox(rect.x, height - rect.y - rect.height, rect.width, rect.height)
  return toArrayBuffer(await doc.save())
}

export async function imagesToPdf(
  images: { bytes: ArrayBuffer; type: 'png' | 'jpg' }[],
): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (const img of images) {
    const embedded =
      img.type === 'png' ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes)
    // One page per image, sized to the image so there are no margins.
    const page = doc.addPage([embedded.width, embedded.height])
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    })
  }
  return toArrayBuffer(await doc.save())
}
