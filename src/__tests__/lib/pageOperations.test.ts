import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  deletePage,
  rotatePage,
  reorderPages,
  mergePdfs,
  extractPages,
  addPageNumbers,
  addWatermark,
  cropPage,
} from '../../lib/pageOperations'

async function makePdf(pages: number): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) doc.addPage([612, 792])
  const bytes = await doc.save()
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer
}

describe('pageOperations', () => {
  it('deletePage removes one page', async () => {
    const out = await deletePage(await makePdf(3), 2)
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
  })

  it('deletePage refuses to delete the only page', async () => {
    await expect(deletePage(await makePdf(1), 1)).rejects.toThrow(/only page/)
  })

  it('rotatePage adds 90 degrees and wraps at 360', async () => {
    let bytes = await makePdf(1)
    for (let i = 0; i < 5; i++) bytes = await rotatePage(bytes, 1)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
  })

  it('reorderPages permutes pages', async () => {
    const out = await reorderPages(await makePdf(3), [3, 1, 2])
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(3)
  })

  it('mergePdfs appends pages from other documents', async () => {
    const out = await mergePdfs(await makePdf(2), [await makePdf(3), await makePdf(1)])
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(6)
  })

  it('extractPages builds a new doc from selected pages', async () => {
    const out = await extractPages(await makePdf(5), [2, 4])
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
  })

  it('addPageNumbers grows every page content', async () => {
    const original = await makePdf(2)
    const out = await addPageNumbers(original, { position: 'bottom-right' })
    expect(out.byteLength).toBeGreaterThan(original.byteLength)
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
  })

  it('addWatermark writes diagonal text on every page', async () => {
    const original = await makePdf(2)
    const out = await addWatermark(original, { text: 'DRAFT' })
    expect(out.byteLength).toBeGreaterThan(original.byteLength)
  })

  it('cropPage sets the crop box from a top-left rect', async () => {
    const out = await cropPage(await makePdf(1), 1, {
      x: 50,
      y: 100,
      width: 300,
      height: 400,
    })
    const doc = await PDFDocument.load(out)
    const crop = doc.getPage(0).getCropBox()
    expect(crop.x).toBe(50)
    expect(crop.y).toBe(792 - 100 - 400)
    expect(crop.width).toBe(300)
    expect(crop.height).toBe(400)
  })
})
