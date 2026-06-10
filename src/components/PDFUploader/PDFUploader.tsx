import { useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { imagesToPdf } from '../../lib/pageOperations'
import { showToast } from '../Toast/Toast'

interface Props {
  onFileLoaded: (bytes: ArrayBuffer, name: string) => void
}

const FEATURES = [
  '✏️ Add text & annotations',
  '🖼 Insert images',
  '✍ Draw & sign',
  '🔷 Add shapes',
  '🖍 Highlight text',
  '📋 Fill forms',
]

export function PDFUploader({ onFileLoaded }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null)

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        onFileLoaded(reader.result as ArrayBuffer, file.name)
      }
      reader.readAsArrayBuffer(file)
    },
    [onFileLoaded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  })

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-gradient-to-br from-sky-600 to-sky-400 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md">
          P
        </div>
        <span className="text-2xl font-bold text-slate-900">
          PDF&nbsp;<span className="text-sky-600">Studio</span>
        </span>
      </div>

      <div
        {...getRootProps()}
        className={`w-full max-w-lg border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-sky-500 bg-sky-50'
            : 'border-slate-300 bg-white hover:border-sky-400 hover:bg-sky-50'
        }`}
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="text-5xl mb-4">📄</div>
        <p className="text-xl font-semibold text-slate-800 mb-2">
          {isDragActive ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
        </p>
        <p className="text-slate-500 mb-6">or click to browse files</p>
        <button
          type="button"
          className="bg-sky-600 hover:bg-sky-700 text-white font-semibold px-8 py-3 rounded-xl shadow transition-colors"
        >
          Choose PDF
        </button>
      </div>

      {/* Images → PDF entry point */}
      <button
        onClick={() => imageInputRef.current?.click()}
        className="mt-4 text-sm text-sky-600 hover:text-sky-700 font-medium underline-offset-2 hover:underline"
      >
        🖼 Or convert images to a PDF
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        className="hidden"
        data-testid="image-input"
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])]
          if (files.length === 0) return
          try {
            const images = await Promise.all(
              files.map(async (f) => ({
                bytes: await f.arrayBuffer(),
                type: (f.type === 'image/png' ? 'png' : 'jpg') as 'png' | 'jpg',
              })),
            )
            const bytes = await imagesToPdf(images)
            onFileLoaded(bytes, 'images.pdf')
          } catch {
            showToast('Could not convert these images', 'error')
          }
        }}
      />

      <div className="mt-6 flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2">
        <span className="text-green-600 text-sm">🔒</span>
        <span className="text-green-700 text-sm font-medium">
          Your file stays in your browser — nothing is uploaded
        </span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 max-w-md text-sm text-slate-600">
        {FEATURES.map((f) => (
          <div key={f} className="flex items-center gap-2">
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
