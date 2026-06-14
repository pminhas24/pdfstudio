import { useCallback, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { imagesToPdf } from '../../lib/pageOperations'
import { showToast } from '../Toast/Toast'
import type { ToolModalName } from '../ToolsMenu/ToolsMenu'

interface Props {
  onFileLoaded: (bytes: ArrayBuffer, name: string) => void
  onWorkflowSelected?: (workflow: WorkflowIntent | null) => void
}

type ToolStatus = 'working' | 'coming-soon'
type ToolAction = 'upload-pdf' | 'images-to-pdf' | 'modal'

interface DashboardTool {
  title: string
  description: string
  status: ToolStatus
  action: ToolAction
  workflowModal?: ToolModalName
  limitation?: string
}

export interface WorkflowIntent {
  label: string
  modal: ToolModalName | null
}

const TOOL_GROUPS: { title: string; tools: DashboardTool[] }[] = [
  {
    title: 'Edit PDF',
    tools: [
      {
        title: 'Edit PDF',
        description: 'Add text, images, drawings, shapes, highlights, signatures, and form values.',
        status: 'working',
        action: 'upload-pdf',
      },
      {
        title: 'Crop PDF',
        description: 'Crop support is not in the current launch build.',
        status: 'coming-soon',
        action: 'modal',
        limitation: 'Crop controls are planned, but this phase does not add new PDF features.',
      },
    ],
  },
  {
    title: 'Organize PDF',
    tools: [
      {
        title: 'Organize pages',
        description: 'Delete, rotate, duplicate, and reorder pages in the editor sidebar.',
        status: 'working',
        action: 'upload-pdf',
        workflowModal: 'organize',
      },
      {
        title: 'Merge PDF',
        description: 'Open a PDF, then use Document tools to merge additional PDFs.',
        status: 'working',
        action: 'upload-pdf',
        workflowModal: 'merge',
      },
      {
        title: 'Split or extract',
        description: 'Open a PDF, then split or extract page ranges.',
        status: 'working',
        action: 'upload-pdf',
        workflowModal: 'split',
      },
      {
        title: 'Remove pages',
        description: 'Open a PDF, then remove one page or a page range.',
        status: 'working',
        action: 'upload-pdf',
        workflowModal: 'remove',
      },
    ],
  },
  {
    title: 'Optimize & Convert',
    tools: [
      {
        title: 'Compress PDF',
        description: 'Rasterize pages to reduce file size for many scanned documents.',
        status: 'working',
        action: 'upload-pdf',
        workflowModal: 'compress',
      },
      {
        title: 'JPG/PNG to PDF',
        description: 'Create a PDF from local image files.',
        status: 'working',
        action: 'images-to-pdf',
      },
      {
        title: 'PDF to JPG/PNG',
        description: 'Open a PDF, then export selected pages as images.',
        status: 'working',
        action: 'upload-pdf',
        workflowModal: 'pdfToJpg',
      },
      {
        title: 'PDF to text',
        description: 'Open a PDF, then extract selectable text from its pages.',
        status: 'working',
        action: 'upload-pdf',
        workflowModal: 'pdfToText',
      },
    ],
  },
  {
    title: 'Security & Privacy',
    tools: [
      {
        title: 'Remove metadata',
        description: 'Open a PDF, then clear common document metadata fields.',
        status: 'working',
        action: 'upload-pdf',
        workflowModal: 'securityPrivacy',
      },
      {
        title: 'Password protect',
        description: 'Reliable browser-side encryption is not in this launch build.',
        status: 'coming-soon',
        action: 'modal',
        limitation: 'Password protection is listed as Coming Soon and is not clickable as a working tool.',
      },
      {
        title: 'Unlock PDF',
        description: 'Password removal is not in this launch build.',
        status: 'coming-soon',
        action: 'modal',
        limitation: 'Unlocking encrypted PDFs is Coming Soon. Files are never uploaded.',
      },
      {
        title: 'Redact PDF',
        description: 'Permanent redaction is not in this launch build.',
        status: 'coming-soon',
        action: 'modal',
        limitation: 'Redaction requires careful flattening and verification, so it remains Coming Soon.',
      },
    ],
  },
]

export function PDFUploader({ onFileLoaded, onWorkflowSelected }: Props) {
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [comingSoon, setComingSoon] = useState<DashboardTool | null>(null)
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowIntent | null>(null)

  const loadPdfFile = useCallback(
    (file: File) => {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please choose a PDF file.', 'error')
        return
      }
      const reader = new FileReader()
      reader.onload = () => onFileLoaded(reader.result as ArrayBuffer, file.name)
      reader.onerror = () => showToast('Could not read this file. Please try another PDF.', 'error')
      reader.readAsArrayBuffer(file)
    },
    [onFileLoaded],
  )

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0]
      setActiveWorkflow(null)
      onWorkflowSelected?.(null)
      if (file) loadPdfFile(file)
    },
    [loadPdfFile, onWorkflowSelected],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  })

  async function handleImageInput(files: FileList | null) {
    const selected = [...(files ?? [])]
    if (selected.length === 0) return
    try {
      const images = await Promise.all(
        selected.map(async (file) => ({
          bytes: await file.arrayBuffer(),
          type: (file.type === 'image/png' ? 'png' : 'jpg') as 'png' | 'jpg',
        })),
      )
      const bytes = await imagesToPdf(images)
      onFileLoaded(bytes, 'images.pdf')
    } catch {
      showToast('Could not convert these images.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-lg font-black text-white shadow-sm">
              P
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">PDF Studio</h1>
              <p className="text-sm font-medium text-green-700">Files stay in your browser.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveWorkflow(null)
              onWorkflowSelected?.(null)
              pdfInputRef.current?.click()
            }}
            className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-700"
          >
            Choose PDF
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[360px_1fr]">
        <section
          {...getRootProps()}
          className={`flex min-h-[320px] cursor-pointer flex-col justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive
              ? 'border-sky-500 bg-sky-50'
              : 'border-slate-300 bg-white hover:border-sky-400 hover:bg-sky-50'
          }`}
        >
          <input {...getInputProps()} data-testid="file-input" />
          <p className="mb-2 text-xl font-bold">
            {isDragActive ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
          </p>
          <p className="mb-6 text-sm text-slate-500">
            Open a local PDF to edit, organize, optimize, convert, or remove metadata.
          </p>
          <span className="mx-auto rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-sm">
            Browse files
          </span>
          <p className="mt-5 text-xs font-medium text-green-700">
            Files stay in your browser. Nothing is uploaded.
          </p>
          {activeWorkflow && (
            <p className="mt-3 text-xs font-semibold text-slate-600">
              Workflow: {activeWorkflow.label} / Upload PDF
            </p>
          )}
        </section>

        <section className="space-y-5">
          {TOOL_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                {group.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.tools.map((tool) => (
                  <button
                    key={`${group.title}-${tool.title}`}
                    type="button"
                    onClick={() => {
                      if (tool.status === 'coming-soon') {
                        setComingSoon(tool)
                      } else if (tool.action === 'images-to-pdf') {
                        setActiveWorkflow(null)
                        onWorkflowSelected?.(null)
                        imageInputRef.current?.click()
                      } else {
                        const intent = {
                          label: tool.title,
                          modal: tool.workflowModal ?? null,
                        }
                        setActiveWorkflow(intent)
                        onWorkflowSelected?.(intent)
                        pdfInputRef.current?.click()
                      }
                    }}
                    className={`min-h-28 rounded-lg border p-4 text-left transition-colors ${
                      tool.status === 'coming-soon'
                        ? 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                        : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50'
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-slate-900">{tool.title}</h3>
                      {tool.status === 'coming-soon' && (
                        <span className="shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600">{tool.description}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) loadPdfFile(file)
          e.currentTarget.value = ''
        }}
      />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="hidden"
        data-testid="image-input"
        onChange={(e) => {
          handleImageInput(e.currentTarget.files)
          e.currentTarget.value = ''
        }}
      />

      {comingSoon && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setComingSoon(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="text-lg font-bold">{comingSoon.title}</h2>
              <button
                type="button"
                onClick={() => setComingSoon(null)}
                className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                x
              </button>
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              {comingSoon.limitation ?? 'This tool is Coming Soon.'}
            </p>
            <p className="mt-4 text-sm font-medium text-green-700">Files stay in your browser.</p>
          </div>
        </div>
      )}
    </div>
  )
}
