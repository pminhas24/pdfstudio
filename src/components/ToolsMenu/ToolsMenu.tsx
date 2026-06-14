import { useEffect, useRef, useState } from 'react'
import { MergeModal } from '../modals/MergeModal'
import { SplitExtractModal } from '../modals/SplitExtractModal'
import { PageNumbersModal } from '../modals/PageNumbersModal'
import { WatermarkModal } from '../modals/WatermarkModal'
import { RemovePagesModal } from '../modals/RemovePagesModal'
import { RotatePdfModal } from '../modals/RotatePdfModal'
import { CompressModal } from '../modals/CompressModal'
import { ImagesToPdfModal } from '../modals/ImagesToPdfModal'
import { PdfToImageModal } from '../modals/PdfToImageModal'
import { PdfToTextModal } from '../modals/PdfToTextModal'
import { SecurityPrivacyModal } from '../modals/SecurityPrivacyModal'

export type ToolModalName =
  | 'merge'
  | 'split'
  | 'extract'
  | 'remove'
  | 'rotate'
  | 'organize'
  | 'watermark'
  | 'pageNumbers'
  | 'compress'
  | 'imagesToPdf'
  | 'pdfToJpg'
  | 'pdfToPng'
  | 'pdfToText'
  | 'securityPrivacy'

type ModalName = ToolModalName | null

interface Props {
  requestedModal?: ToolModalName | null
  onRequestedModalOpened?: () => void
}

const MENU_GROUPS: { title: string; items: { modal: Exclude<ModalName, null>; label: string }[] }[] = [
  {
    title: 'Organize PDF',
    items: [
      { modal: 'merge', label: 'Merge PDFs' },
      { modal: 'split', label: 'Split PDF' },
      { modal: 'extract', label: 'Extract pages' },
      { modal: 'remove', label: 'Remove pages' },
      { modal: 'rotate', label: 'Rotate PDF' },
      { modal: 'organize', label: 'Organize pages' },
      { modal: 'watermark', label: 'Watermark' },
      { modal: 'pageNumbers', label: 'Page numbers' },
    ],
  },
  {
    title: 'Optimize & Convert',
    items: [
      { modal: 'compress', label: 'Compress PDF' },
      { modal: 'imagesToPdf', label: 'JPG/PNG to PDF' },
      { modal: 'pdfToJpg', label: 'PDF to JPG' },
      { modal: 'pdfToPng', label: 'PDF to PNG' },
      { modal: 'pdfToText', label: 'PDF to Text' },
    ],
  },
  {
    title: 'Security & Privacy',
    items: [{ modal: 'securityPrivacy', label: 'Security & Privacy' }],
  },
]

export function ToolsMenu({ requestedModal, onRequestedModalOpened }: Props) {
  const [open, setOpen] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalName>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!requestedModal) return
    setActiveModal(requestedModal)
    setOpen(false)
    onRequestedModalOpened?.()
  }, [requestedModal, onRequestedModalOpened])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 ${
          open ? 'bg-sky-100 text-sky-700' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
        }`}
      >
        Tools <span className="text-xs">v</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 max-h-[75vh] w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-2 shadow-xl z-40">
          {MENU_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {group.title}
              </p>
              {group.items.map((item) => (
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
            </div>
          ))}
        </div>
      )}

      {activeModal === 'merge' && <MergeModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'split' && (
        <SplitExtractModal mode="split" onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'extract' && (
        <SplitExtractModal mode="extract" onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'remove' && <RemovePagesModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'rotate' && <RotatePdfModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'organize' && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-900">Organize pages</h2>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-700 text-xl leading-none"
              >
                x
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Use the page thumbnails on the left to reorder, delete, rotate, or duplicate pages.
              Then use Download PDF to save the organized document.
            </p>
          </div>
        </div>
      )}
      {activeModal === 'pageNumbers' && (
        <PageNumbersModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'watermark' && <WatermarkModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'compress' && <CompressModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'imagesToPdf' && (
        <ImagesToPdfModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'pdfToJpg' && (
        <PdfToImageModal format="jpg" onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'pdfToPng' && (
        <PdfToImageModal format="png" onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'pdfToText' && <PdfToTextModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'securityPrivacy' && (
        <SecurityPrivacyModal onClose={() => setActiveModal(null)} />
      )}
    </div>
  )
}
