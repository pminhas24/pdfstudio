import { useEffect, useRef, useState } from 'react'
import { MergeModal } from '../modals/MergeModal'
import { SplitExtractModal } from '../modals/SplitExtractModal'
import { PageNumbersModal } from '../modals/PageNumbersModal'
import { WatermarkModal } from '../modals/WatermarkModal'
import { CompressModal } from '../modals/CompressModal'
import { CropModal } from '../modals/CropModal'
import { ProtectModal } from '../modals/ProtectModal'
import { ExportImagesModal } from '../modals/ExportImagesModal'
import { OcrModal } from '../modals/OcrModal'
import { flattenPage } from '../../lib/rasterOps'
import { useDocOperation } from '../../hooks/useDocOperation'
import { usePdfStore } from '../../store/pdfStore'
import { useEditorStore } from '../../store/editorStore'
import { useAnnotationStore } from '../../store/annotationStore'
import { BASE_SCALE } from '../PDFCanvas/PDFCanvas'

type ModalName =
  | 'merge'
  | 'split'
  | 'pageNumbers'
  | 'watermark'
  | 'compress'
  | 'crop'
  | 'protect'
  | 'exportImages'
  | 'ocr'
  | null

const MENU_ITEMS: { modal: Exclude<ModalName, null>; label: string; group: string }[] = [
  { modal: 'merge', label: '📑 Merge PDFs', group: 'Pages' },
  { modal: 'split', label: '✂️ Split / Extract pages', group: 'Pages' },
  { modal: 'pageNumbers', label: '🔢 Add page numbers', group: 'Document' },
  { modal: 'watermark', label: '💧 Add watermark', group: 'Document' },
  { modal: 'crop', label: '⊡ Crop current page', group: 'Document' },
  { modal: 'compress', label: '🗜 Compress PDF', group: 'Document' },
  { modal: 'protect', label: '🔐 Password protect / unlock', group: 'Security' },
  { modal: 'exportImages', label: '🖼 Export pages as images', group: 'Export' },
  { modal: 'ocr', label: '🔎 OCR — extract text', group: 'Export' },
]

export function ToolsMenu() {
  const [open, setOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalName>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { applyOp } = useDocOperation()
  const pdfDocument = usePdfStore((s) => s.pdfDocument)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  // Permanent redaction: the user covers content with black shapes first,
  // then flattens the page — render + overlay become one image and the
  // covered text is truly gone from the document.
  async function handleFlattenRedact() {
    setOpen(false)
    if (!pdfDocument) return
    const page = useEditorStore.getState().currentPage
    const zoom = useEditorStore.getState().zoom
    if (
      !window.confirm(
        `Permanently flatten page ${page}? The page becomes an image: covered content is destroyed (this is what makes redaction permanent), text becomes unselectable, and annotations on this page are baked in. This cannot be undone.`,
      )
    )
      return
    await applyOp({
      transform: (bytes) => flattenPage(pdfDocument, bytes, page, zoom * BASE_SCALE),
      remapAnnotations: (map) => {
        // Annotations were baked into the image — drop them from the overlay.
        const { [page]: _, ...rest } = map
        return rest
      },
      successMessage: `Page ${page} flattened — covered content is permanently removed`,
    })
  }

  const groups = [...new Set(MENU_ITEMS.map((i) => i.group))]

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
          open ? 'bg-sky-100 text-sky-700' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
        }`}
      >
        🧰 Tools <span className="text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-40">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group}
              </p>
              {MENU_ITEMS.filter((i) => i.group === group).map((item) => (
                <button
                  key={item.modal}
                  onClick={() => {
                    setActiveModal(item.modal)
                    setOpen(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-700"
                >
                  {item.label}
                </button>
              ))}
              {group === 'Security' && (
                <button
                  onClick={handleFlattenRedact}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-700"
                >
                  ⬛ Redact — flatten current page
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeModal === 'merge' && <MergeModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'split' && <SplitExtractModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'pageNumbers' && (
        <PageNumbersModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'watermark' && <WatermarkModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'compress' && <CompressModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'crop' && <CropModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'protect' && <ProtectModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'exportImages' && (
        <ExportImagesModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'ocr' && <OcrModal onClose={() => setActiveModal(null)} />}
    </div>
  )
}
