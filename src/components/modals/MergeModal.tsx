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
    multiple: true,
    onDrop: (accepted) => {
      accepted.forEach((file) => {
        const reader = new FileReader()
        reader.onload = () =>
          setFiles((f) => [...f, { name: file.name, bytes: reader.result as ArrayBuffer }])
        reader.readAsArrayBuffer(file)
      })
    },
  })

  function moveFile(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleMerge() {
    const ok = await applyOp({
      transform: (bytes) => mergePdfs(bytes, files.map((f) => f.bytes)),
      successMessage: `Merged ${files.length} file${files.length > 1 ? 's' : ''}`,
    })
    if (ok) onClose()
  }

  return (
    <Modal title="Merge PDFs" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-3">
        Selected PDFs are appended after the current document in the order shown.
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
              className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2"
            >
              <span className="truncate text-slate-700">{f.name}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveFile(i, -1)}
                  disabled={i === 0}
                  className="px-1.5 py-0.5 text-xs border border-slate-200 rounded disabled:opacity-40"
                >
                  Up
                </button>
                <button
                  onClick={() => moveFile(i, 1)}
                  disabled={i === files.length - 1}
                  className="px-1.5 py-0.5 text-xs border border-slate-200 rounded disabled:opacity-40"
                >
                  Dn
                </button>
                <button
                  onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}
                  className="px-1.5 py-0.5 text-xs border border-slate-200 rounded text-slate-500 hover:text-red-600"
                >
                  x
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={handleMerge}
        disabled={files.length === 0 || busy}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {busy ? 'Merging...' : `Merge ${files.length || ''} file${files.length === 1 ? '' : 's'}`}
      </button>
    </Modal>
  )
}
