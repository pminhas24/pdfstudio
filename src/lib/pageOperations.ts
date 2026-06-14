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

export async function removePages(
  bytes: ArrayBuffer,
  pageNums: number[],
): Promise<ArrayBuffer> {
  const src = await load(bytes)
  const remove = new Set(pageNums)
  const keep = src.getPageIndices().filter((index) => !remove.has(index + 1))
  if (keep.length === 0) {
    throw new Error('Cannot remove every page')
  }
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, keep)
  copied.forEach((p) => out.addPage(p))
  return toArrayBuffer(await out.save())
}

// Adds 90° clockwise to the page's existing rotation.
export async function rotatePage(
  bytes: ArrayBuffer,
  pageNum: number,
  deltaDegrees = 90,
): Promise<ArrayBuffer> {
  const doc = await load(bytes)
  const page = doc.getPage(pageNum - 1)
  const current = page.getRotation().angle
  page.setRotation(degrees((((current + deltaDegrees) % 360) + 360) % 360))
  return toArrayBuffer(await doc.save())
}

export async function rotatePages(
  bytes: ArrayBuffer,
  pageNums: number[],
  deltaDegrees = 90,
): Promise<ArrayBuffer> {
  const doc = await load(bytes)
  for (const pageNum of pageNums) {
    const page = doc.getPage(pageNum - 1)
    const current = page.getRotation().angle
    page.setRotation(degrees((((current + deltaDegrees) % 360) + 360) % 360))
  }
  return toArrayBuffer(await doc.save())
}

export async function duplicatePage(
  bytes: ArrayBuffer,
  pageNum: number,
): Promise<ArrayBuffer> {
  const src = await load(bytes)
  const out = await PDFDocument.create()
  const order: number[] = []
  for (let i = 0; i < src.getPageCount(); i++) {
    order.push(i)
    if (i === pageNum - 1) order.push(i)
  }
  const copied = await out.copyPages(src, order)
  copied.forEach((p) => out.addPage(p))
  return toArrayBuffer(await out.save())
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

export async function optimizePdf(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const src = await load(bytes)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, src.getPageIndices())
  copied.forEach((p) => out.addPage(p))
  out.setTitle('')
  out.setAuthor('')
  out.setSubject('')
  out.setKeywords([])
  out.setProducer('PDF Studio')
  out.setCreator('PDF Studio')
  out.setCreationDate(new Date(0))
  out.setModificationDate(new Date())
  return toArrayBuffer(await out.save({ useObjectStreams: true }))
}

export async function removePdfMetadata(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const src = await load(bytes)
  const out = await PDFDocument.create({ updateMetadata: false })
  const copied = await out.copyPages(src, src.getPageIndices())
  copied.forEach((p) => out.addPage(p))
  out.setTitle('')
  out.setAuthor('')
  out.setSubject('')
  out.setKeywords([])
  out.setCreator('')
  out.setProducer('')
  return toArrayBuffer(await out.save({ useObjectStreams: true }))
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

export type WatermarkPosition = 'center' | 'top' | 'bottom'

export async function addWatermark(
  bytes: ArrayBuffer,
  options: {
    text: string
    opacity?: number
    fontSize?: number
    color?: string
    rotation?: number
    position?: WatermarkPosition
  },
): Promise<ArrayBuffer> {
  const {
    text,
    opacity = 0.18,
    fontSize = 50,
    color = '#64748b',
    rotation = 45,
    position = 'center',
  } = options
  const doc = await load(bytes)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const c = fabricColorToRgb(color)
  const pages = doc.getPages()

  pages.forEach((page) => {
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(text, fontSize)
    const angleRad = (rotation * Math.PI) / 180
    const centerY =
      position === 'top' ? height * 0.75 : position === 'bottom' ? height * 0.25 : height / 2
    const x = width / 2 - (textWidth / 2) * Math.cos(angleRad)
    const y = centerY - (textWidth / 2) * Math.sin(angleRad)
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(c.r, c.g, c.b),
      opacity,
      rotate: degrees(rotation),
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

export type ImagePdfPageSize = 'auto' | 'letter' | 'a4'
export type ImagePdfOrientation = 'auto' | 'portrait' | 'landscape'
export type ImagePdfMargin = 'none' | 'small' | 'medium'

const PAGE_SIZES: Record<Exclude<ImagePdfPageSize, 'auto'>, [number, number]> = {
  letter: [612, 792],
  a4: [595.28, 841.89],
}

const MARGINS: Record<ImagePdfMargin, number> = {
  none: 0,
  small: 24,
  medium: 48,
}

export async function imagesToPdf(
  images: { bytes: ArrayBuffer; type: 'png' | 'jpg' }[],
  options: {
    pageSize?: ImagePdfPageSize
    orientation?: ImagePdfOrientation
    margin?: ImagePdfMargin
  } = {},
): Promise<ArrayBuffer> {
  const { pageSize = 'auto', orientation = 'auto', margin = 'none' } = options
  const doc = await PDFDocument.create()
  for (const img of images) {
    const embedded =
      img.type === 'png' ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes)
    let width = embedded.width
    let height = embedded.height
    if (pageSize !== 'auto') {
      ;[width, height] = PAGE_SIZES[pageSize]
      if (
        orientation === 'landscape' ||
        (orientation === 'auto' && embedded.width > embedded.height)
      ) {
        ;[width, height] = [Math.max(width, height), Math.min(width, height)]
      } else {
        ;[width, height] = [Math.min(width, height), Math.max(width, height)]
      }
    } else if (orientation === 'portrait' && width > height) {
      ;[width, height] = [height, width]
    } else if (orientation === 'landscape' && height > width) {
      ;[width, height] = [height, width]
    }
    const page = doc.addPage([width, height])
    const inset = MARGINS[margin]
    const maxW = Math.max(1, width - inset * 2)
    const maxH = Math.max(1, height - inset * 2)
    const scale = Math.min(maxW / embedded.width, maxH / embedded.height)
    const drawW = embedded.width * scale
    const drawH = embedded.height * scale
    page.drawImage(embedded, {
      x: (width - drawW) / 2,
      y: (height - drawH) / 2,
      width: drawW,
      height: drawH,
    })
  }
  return toArrayBuffer(await doc.save())
}
