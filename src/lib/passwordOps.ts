// Password operations use the @cantoo/pdf-lib fork because upstream pdf-lib
// has no encryption support. Dynamically imported so the main bundle does
// not pay for it unless these tools are used.

export async function protectPdf(
  bytes: ArrayBuffer,
  password: string,
): Promise<ArrayBuffer> {
  const { PDFDocument } = await import('@cantoo/pdf-lib')
  const doc = await PDFDocument.load(bytes)
  doc.encrypt({ userPassword: password, ownerPassword: password })
  const out = await doc.save()
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
}

export async function unlockPdf(
  bytes: ArrayBuffer,
  password: string,
): Promise<ArrayBuffer> {
  const { PDFDocument } = await import('@cantoo/pdf-lib')
  // Loading with the correct password decrypts; saving without calling
  // encrypt() writes an unprotected document.
  const doc = await PDFDocument.load(bytes, { password })
  const out = await doc.save()
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer
}
