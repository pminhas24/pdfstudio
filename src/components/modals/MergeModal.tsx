import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Modal } from './Modal'
import { mergePdfs } from '../../lib/pageOperations'
import { useDocOperation } from '../../hooks/useDocOperation'

interface Props {
  onClose: () => void
}

interface QueuedFile {
  name: string
  bytes: ArrayBuffer
}

export function MergeModal({ onClose }: Props) {
  const [files, setFiles] = useState<QueuedFile[]>([])
  const { applyOp, busy } = useDocOperation()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    onDrop: (accepted) => {
      accepted.forEach((file) => {
        const reader = new FileReader()
        reader.onload = () =>
          setFiles((f) => [...f, { name: file.name, bytes: reader.result as ArrayBuffer }])
        reader.readAsArrayBuffer(file)
      })
    },
  })

  async function handleMerge() {
    const ok = await applyOp({
      transform: (bytes) => mergePdfs(bytes, files.map((f) => f.bytes)),
      successMessage: `Merged ${files.length} file${files.length > 1 ? 's' : ''} into the document`,
    })
    if (ok) onClose()
  }

  return (
    <Modal title="Merge PDFs" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-3">
        Added files are appended to the end of the current document, in order.
      </p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-3 transition-colors ${
          isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-slate-600">Drop PDFs here or click to browse</p>
      </div>

      {files.length > 0 && (
        <ul className="mb-4 space-y-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2"
            >
              <span className="truncate text-slate-700">📄 {f.name}</span>
              <button
                onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}
                className="text-slate-400 hover:text-red-600 ml-2"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleMerge}
        disabled={files.length === 0 || busy}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Merging…' : `Merge ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
      </button>
    </Modal>
  )
}
