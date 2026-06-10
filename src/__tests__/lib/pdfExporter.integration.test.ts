import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { exportPdf } from '../../lib/pdfExporter'

async function makeBlankPdf(pages = 2): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([612, 792])
  const bytes = await doc.save()
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
}

describe('exportPdf integration', () => {
  it('burns text, rect, line, and path annotations into the PDF', async () => {
    const original = await makeBlankPdf(2)
    const page1Json = JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'IText',
          left: 50,
          top: 100,
          width: 120,
          height: 20,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          opacity: 1,
          fill: '#111827',
          text: 'Hello PDF',
          fontSize: 16,
          fontFamily: 'Helvetica',
        },
        {
          type: 'Rect',
          left: 80,
          top: 200,
          width: 120,
          height: 80,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          opacity: 1,
          fill: 'transparent',
          stroke: '#0284c7',
          strokeWidth: 2,
        },
        {
          type: 'Line',
          left: 10,
          top: 300,
          width: 150,
          height: 0,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          opacity: 1,
          stroke: '#0284c7',
          strokeWidth: 2,
          x1: 10,
          y1: 300,
          x2: 160,
          y2: 300,
        },
        {
          type: 'Path',
          left: 20,
          top: 400,
          width: 30,
          height: 30,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          opacity: 1,
          stroke: '#0284c7',
          strokeWidth: 3,
          fill: '',
          path: [
            ['M', 20, 400],
            ['Q', 25, 410, 35, 415],
            ['L', 50, 430],
          ],
        },
      ],
    })

    const result = await exportPdf(original, { 1: page1Json })
    expect(result.length).toBeGreaterThan(0)

    const reloaded = await PDFDocument.load(result)
    expect(reloaded.getPageCount()).toBe(2)
    // The annotated page must have gained content; raw size growing is a
    // cheap proxy that drawing operations were written.
    expect(result.length).toBeGreaterThan(original.byteLength)
  })

  it('leaves the PDF intact when there are no annotations', async () => {
    const original = await makeBlankPdf(1)
    const result = await exportPdf(original, {})
    const reloaded = await PDFDocument.load(result)
    expect(reloaded.getPageCount()).toBe(1)
  })

  it('exports annotations on rotated pages via the rotation matrix', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([612, 792])
    const { degrees } = await import('pdf-lib')
    page.setRotation(degrees(90))
    const saved = await doc.save()
    const original = saved.buffer.slice(
      saved.byteOffset,
      saved.byteOffset + saved.byteLength,
    )

    const json = JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'Rect',
          left: 100,
          top: 100,
          width: 50,
          height: 50,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          opacity: 1,
          stroke: '#0284c7',
          strokeWidth: 2,
          fill: 'transparent',
        },
      ],
    })
    const result = await exportPdf(original as ArrayBuffer, { 1: json })
    const reloaded = await PDFDocument.load(result)
    expect(reloaded.getPage(0).getRotation().angle).toBe(90)
  })

  it('exports user-rotated objects without throwing', async () => {
    const original = await makeBlankPdf(1)
    const json = JSON.stringify({
      version: '6.0.0',
      objects: [
        {
          type: 'Rect',
          left: 200,
          top: 200,
          width: 100,
          height: 60,
          scaleX: 1,
          scaleY: 1,
          angle: 45,
          opacity: 1,
          fill: '#fde047',
        },
      ],
    })
    await expect(exportPdf(original, { 1: json })).resolves.toBeDefined()
  })

  it('skips unknown object types without throwing', async () => {
    const original = await makeBlankPdf(1)
    const json = JSON.stringify({
      version: '6.0.0',
      objects: [
        { type: 'Group', left: 0, top: 0, width: 10, height: 10, scaleX: 1, scaleY: 1, angle: 0, opacity: 1 },
      ],
    })
    await expect(exportPdf(original, { 1: json })).resolves.toBeDefined()
  })
})
