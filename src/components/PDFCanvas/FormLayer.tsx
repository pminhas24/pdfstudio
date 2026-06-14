import { useEffect, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { useFormStore } from '../../store/formStore'
import { useEditorStore } from '../../store/editorStore'

interface Props {
  doc: PDFDocumentProxy
  pageNum: number
  scale: number
}

interface FieldInfo {
  name: string
  kind: 'text' | 'checkbox' | 'select'
  options: string[]
  // CSS pixel rect at the current render scale
  left: number
  top: number
  width: number
  height: number
  initialValue: string | boolean
}

// Renders real HTML inputs positioned over the PDF's AcroForm fields.
// Values are kept in formStore (keyed by field name) and written back into
// the PDF by the exporter on download.
export function FormLayer({ doc, pageNum, scale }: Props) {
  const [fields, setFields] = useState<FieldInfo[]>([])
  const values = useFormStore((s) => s.values)
  const setValue = useFormStore((s) => s.setValue)
  const interactionMode = useEditorStore((s) => s.interactionMode)
  const fieldsInteractive = interactionMode === 'form'

  useEffect(() => {
    let cancelled = false

    async function load() {
      const page = await doc.getPage(pageNum)
      const annotations = await page.getAnnotations({ intent: 'display' })
      if (cancelled) return

      // page.view = [x1, y1, x2, y2] in PDF points
      const pageTop = page.view[3]
      const found: FieldInfo[] = []

      for (const a of annotations) {
        if (a.subtype !== 'Widget' || !a.fieldName || a.readOnly) continue
        const [rx1, ry1, rx2, ry2] = a.rect as [number, number, number, number]
        const base = {
          name: a.fieldName as string,
          left: rx1 * scale,
          top: (pageTop - ry2) * scale,
          width: (rx2 - rx1) * scale,
          height: (ry2 - ry1) * scale,
        }
        if (a.fieldType === 'Tx') {
          found.push({
            ...base,
            kind: 'text',
            options: [],
            initialValue: (a.fieldValue as string) ?? '',
          })
        } else if (a.fieldType === 'Btn' && a.checkBox) {
          found.push({
            ...base,
            kind: 'checkbox',
            options: [],
            initialValue: a.fieldValue !== 'Off' && !!a.fieldValue,
          })
        } else if (a.fieldType === 'Ch') {
          found.push({
            ...base,
            kind: 'select',
            options: ((a.options as { displayValue: string; exportValue: string }[]) ?? []).map(
              (o) => o.exportValue,
            ),
            initialValue: (a.fieldValue as string) ?? '',
          })
        }
      }
      setFields(found)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [doc, pageNum, scale])

  if (fields.length === 0) return null

  return (
    // pointer-events:none on the layer so clicks between fields still reach
    // the Fabric canvas below; fields re-enable events only in Form Fill Mode.
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {fields.map((f, i) => {
        const style = {
          position: 'absolute' as const,
          left: f.left,
          top: f.top,
          width: f.width,
          height: f.height,
          fontSize: Math.max(8, f.height * 0.6),
        }
        const current = values[f.name] ?? f.initialValue

        if (f.kind === 'checkbox') {
          return (
            <input
              key={`${f.name}-${i}`}
              type="checkbox"
              style={style}
              checked={current === true}
              tabIndex={fieldsInteractive ? 0 : -1}
              aria-disabled={!fieldsInteractive}
              onChange={(e) => setValue(f.name, e.target.checked)}
              className={`accent-sky-600 ${
                fieldsInteractive ? 'pointer-events-auto' : 'pointer-events-none opacity-70'
              }`}
            />
          )
        }
        if (f.kind === 'select') {
          return (
            <select
              key={`${f.name}-${i}`}
              style={style}
              value={String(current)}
              tabIndex={fieldsInteractive ? 0 : -1}
              aria-disabled={!fieldsInteractive}
              onChange={(e) => setValue(f.name, e.target.value)}
              className={`bg-sky-50/80 border border-sky-300 rounded-sm text-slate-900 ${
                fieldsInteractive ? 'pointer-events-auto' : 'pointer-events-none opacity-70'
              }`}
            >
              <option value="" />
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )
        }
        return (
          <input
            key={`${f.name}-${i}`}
            type="text"
            style={style}
            value={String(current)}
            tabIndex={fieldsInteractive ? 0 : -1}
            aria-disabled={!fieldsInteractive}
            onChange={(e) => setValue(f.name, e.target.value)}
            className={`bg-sky-50/80 border border-sky-300 rounded-sm px-1 text-slate-900 focus:bg-white focus:outline-sky-500 ${
              fieldsInteractive ? 'pointer-events-auto' : 'pointer-events-none opacity-70'
            }`}
          />
        )
      })}
    </div>
  )
}
