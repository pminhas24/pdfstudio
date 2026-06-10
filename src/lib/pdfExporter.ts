import {
  PDFDocument,
  StandardFonts,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
} from 'pdf-lib'
import type { PDFFont, PDFPage } from 'pdf-lib'
import type { FabricJsonExport, FabricObjectExport } from '../types/pdf'

// ─── Coordinate + color helpers (exported for tests) ────────────────────────

// Fabric uses a top-left origin with y growing downward; PDF uses a
// bottom-left origin with y growing upward. Convert the top edge of an
// object to its PDF bottom edge.
export function flipY(
  fabricY: number,
  fabricHeight: number,
  pageHeight: number,
  scaleY = 1,
): number {
  return pageHeight - fabricY - fabricHeight * scaleY
}

export function fabricColorToRgb(color: string | undefined): {
  r: number
  g: number
  b: number
} {
  if (!color || !color.startsWith('#')) return { r: 0, g: 0, b: 0 }
  const hex =
    color.length === 4
      ? '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
      : color
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  if (isNaN(r) || isNaN(g) || isNaN(b)) return { r: 0, g: 0, b: 0 }
  return { r, g, b }
}

// ─── Font selection ──────────────────────────────────────────────────────────

// Annotations only use the 14 standard PDF fonts, so no font files need
// embedding and the output stays small.
function pickFont(obj: FabricObjectExport): StandardFonts {
  const family = (obj.fontFamily ?? 'Helvetica').toLowerCase()
  const bold = obj.fontWeight === 'bold'
  const italic = obj.fontStyle === 'italic'

  if (family.includes('times') || family.includes('georgia')) {
    if (bold && italic) return StandardFonts.TimesRomanBoldItalic
    if (bold) return StandardFonts.TimesRomanBold
    if (italic) return StandardFonts.TimesRomanItalic
    return StandardFonts.TimesRoman
  }
  if (family.includes('courier')) {
    if (bold && italic) return StandardFonts.CourierBoldOblique
    if (bold) return StandardFonts.CourierBold
    if (italic) return StandardFonts.CourierOblique
    return StandardFonts.Courier
  }
  if (bold && italic) return StandardFonts.HelveticaBoldOblique
  if (bold) return StandardFonts.HelveticaBold
  if (italic) return StandardFonts.HelveticaOblique
  return StandardFonts.Helvetica
}

// ─── Path translation ────────────────────────────────────────────────────────

type PathCommand = [string, ...number[]]

// Fabric serializes free-draw paths with the absolute coordinates they were
// drawn at; the object's left/top reflects where the path sits NOW (it may
// have been moved). Re-base the path data to its own bounding-box origin so
// it can be drawn at left/top.
export function rebasePath(path: PathCommand[]): { d: string; minX: number; minY: number } {
  let minX = Infinity
  let minY = Infinity
  for (const cmd of path) {
    for (let i = 1; i < cmd.length; i += 2) {
      const x = cmd[i] as number
      const y = cmd[i + 1] as number
      if (typeof x === 'number' && x < minX) minX = x
      if (typeof y === 'number' && y < minY) minY = y
    }
  }
  if (!isFinite(minX)) minX = 0
  if (!isFinite(minY)) minY = 0

  const d = path
    .map((cmd) => {
      const op = cmd[0]
      const nums: number[] = []
      for (let i = 1; i < cmd.length; i += 2) {
        nums.push((cmd[i] as number) - minX, (cmd[i + 1] as number) - minY)
      }
      return op + ' ' + nums.map((n) => n.toFixed(2)).join(' ')
    })
    .join(' ')
  return { d, minX, minY }
}

// ─── Per-object drawing ──────────────────────────────────────────────────────

async function drawObject(
  pdfDoc: PDFDocument,
  page: PDFPage,
  obj: FabricObjectExport,
  fontCache: Map<StandardFonts, PDFFont>,
  pageHeight: number, // view-space height (differs from page height when rotated)
): Promise<void> {
  // Fabric rotates an object clockwise about its origin point (left/top).
  // Reproduce that with a graphics-state matrix so every object type —
  // including paths and images — exports its rotation correctly.
  const angle = (((obj.angle ?? 0) % 360) + 360) % 360
  if (angle !== 0) {
    const px = obj.left
    const py = pageHeight - obj.top
    const phi = (-angle * Math.PI) / 180 // PDF rotation is counter-clockwise
    const cos = Math.cos(phi)
    const sin = Math.sin(phi)
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(
        cos,
        sin,
        -sin,
        cos,
        px - px * cos + py * sin,
        py - px * sin - py * cos,
      ),
    )
  }
  try {
    await drawObjectShape(pdfDoc, page, obj, fontCache, pageHeight)
  } finally {
    if (angle !== 0) page.pushOperators(popGraphicsState())
  }
}

async function drawObjectShape(
  pdfDoc: PDFDocument,
  page: PDFPage,
  obj: FabricObjectExport,
  fontCache: Map<StandardFonts, PDFFont>,
  pageHeight: number,
): Promise<void> {
  const scaleX = obj.scaleX ?? 1
  const scaleY = obj.scaleY ?? 1
  const strokeW = (obj.strokeWidth ?? 1) * Math.max(scaleX, scaleY)
  const x = obj.left
  const w = obj.width * scaleX
  const h = obj.height * scaleY
  const opacity = obj.opacity ?? 1
  const hasFill = !!obj.fill && obj.fill !== 'transparent' && obj.fill !== ''
  const fill = hasFill ? fabricColorToRgb(obj.fill) : null
  const stroke = obj.stroke ? fabricColorToRgb(obj.stroke) : null
  const type = obj.type.toLowerCase()

  switch (type) {
    case 'i-text':
    case 'itext':
    case 'text':
    case 'textbox': {
      const fontName = pickFont(obj)
      let font = fontCache.get(fontName)
      if (!font) {
        font = await pdfDoc.embedFont(fontName)
        fontCache.set(fontName, font)
      }
      const fontSize = (obj.fontSize ?? 16) * scaleY
      const color = fabricColorToRgb(obj.fill)
      // drawText's y is the baseline of the first line; Fabric's top is the
      // top of the text box. The ascent is roughly 0.88 of the font size
      // for the standard fonts.
      page.drawText(obj.text ?? '', {
        x,
        y: pageHeight - obj.top - fontSize * 0.88,
        size: fontSize,
        font,
        color: rgb(color.r, color.g, color.b),
        opacity,
        lineHeight: fontSize * 1.16, // Fabric's default line-height factor
      })
      break
    }

    case 'rect': {
      page.drawRectangle({
        x,
        y: flipY(obj.top, h, pageHeight),
        width: w,
        height: h,
        color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
        borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
        borderWidth: stroke ? strokeW : 0,
        opacity: fill ? opacity : undefined,
        borderOpacity: stroke ? opacity : undefined,
      })
      break
    }

    case 'ellipse': {
      page.drawEllipse({
        x: x + w / 2,
        y: flipY(obj.top, h, pageHeight) + h / 2,
        xScale: w / 2,
        yScale: h / 2,
        color: fill ? rgb(fill.r, fill.g, fill.b) : undefined,
        borderColor: stroke ? rgb(stroke.r, stroke.g, stroke.b) : undefined,
        borderWidth: stroke ? strokeW : 0,
        opacity: fill ? opacity : undefined,
        borderOpacity: stroke ? opacity : undefined,
      })
      break
    }

    case 'line': {
      if (!stroke) break
      // x1..y2 are the line's original coordinates; left/top is where its
      // bounding box sits now. Reconstruct the endpoints from direction.
      const dx = (obj.x2 ?? 0) - (obj.x1 ?? 0)
      const dy = (obj.y2 ?? 0) - (obj.y1 ?? 0)
      const startX = x + (dx >= 0 ? 0 : w)
      const endX = x + (dx >= 0 ? w : 0)
      const topY = flipY(obj.top, h, pageHeight)
      const startY = dy >= 0 ? topY + h : topY
      const endY = dy >= 0 ? topY : topY + h
      page.drawLine({
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        thickness: strokeW,
        color: rgb(stroke.r, stroke.g, stroke.b),
        opacity,
      })
      break
    }

    case 'path': {
      if (!obj.path || !stroke) break
      const { d } = rebasePath(obj.path as PathCommand[])
      // drawSvgPath places the SVG origin at (x, y) with SVG's y-axis
      // growing downward, so y is the TOP of the drawing in PDF coords.
      page.drawSvgPath(d, {
        x,
        y: pageHeight - obj.top,
        scale: scaleX,
        borderColor: rgb(stroke.r, stroke.g, stroke.b),
        borderWidth: strokeW,
        borderOpacity: opacity,
      })
      break
    }

    case 'image': {
      if (!obj.src) break
      try {
        const res = await fetch(obj.src)
        const bytes = await res.arrayBuffer()
        const isPng = obj.src.startsWith('data:image/png')
        const embedded = isPng
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes)
        page.drawImage(embedded, {
          x,
          y: flipY(obj.top, h, pageHeight),
          width: w,
          height: h,
          opacity,
        })
      } catch {
        // Skip images that fail to embed rather than aborting the export.
      }
      break
    }
  }
}

// ─── Form fields ─────────────────────────────────────────────────────────────

function applyFormValues(
  pdfDoc: PDFDocument,
  values: Record<string, string | boolean>,
): void {
  let form
  try {
    form = pdfDoc.getForm()
  } catch {
    return // document has no AcroForm
  }

  for (const [name, value] of Object.entries(values)) {
    try {
      if (typeof value === 'boolean') {
        const cb = form.getCheckBox(name)
        value ? cb.check() : cb.uncheck()
      } else {
        try {
          form.getTextField(name).setText(value)
        } catch {
          form.getDropdown(name).select(value)
        }
      }
    } catch {
      // Field renamed/missing or wrong type — skip it, keep the rest.
    }
  }
}

// ─── Entry points ────────────────────────────────────────────────────────────

export async function exportPdf(
  originalBytes: ArrayBuffer,
  perPageJson: Record<number, string>,
  formValues: Record<string, string | boolean> = {},
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: false })
  const fontCache = new Map<StandardFonts, PDFFont>()

  applyFormValues(pdfDoc, formValues)

  const pageCount = pdfDoc.getPageCount()
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const json = perPageJson[pageNum]
    if (!json) continue
    const fabricJson = JSON.parse(json) as FabricJsonExport
    const page = pdfDoc.getPage(pageNum - 1)

    // Annotation coordinates are in VIEW space (what the user saw — PDF.js
    // applies /Rotate when rendering). For rotated pages, wrap drawing in a
    // matrix that maps view space back into the page's unrotated space.
    const { width: W, height: H } = page.getSize()
    const rot = ((page.getRotation().angle % 360) + 360) % 360
    const viewHeight = rot === 90 || rot === 270 ? W : H

    if (rot !== 0) {
      const m: [number, number, number, number, number, number] =
        rot === 90
          ? [0, 1, -1, 0, W, 0]
          : rot === 180
            ? [-1, 0, 0, -1, W, H]
            : [0, -1, 1, 0, 0, H]
      page.pushOperators(pushGraphicsState(), concatTransformationMatrix(...m))
    }

    try {
      for (const obj of fabricJson.objects ?? []) {
        await drawObject(pdfDoc, page, obj, fontCache, viewHeight)
      }
    } finally {
      if (rot !== 0) page.pushOperators(popGraphicsState())
    }
  }

  return pdfDoc.save()
}

export function downloadBytes(bytes: Uint8Array, fileName: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.replace(/\.pdf$/i, '') + '-edited.pdf'
  a.click()
  URL.revokeObjectURL(url)
}
