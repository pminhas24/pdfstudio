import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Modal } from './Modal'
import {
  imagesToPdf,
  type ImagePdfMargin,
  type ImagePdfOrientation,
  type ImagePdfPageSize,
} from '../../lib/pageOperations'
import { downloadBytes } from '../../lib/pdfExporter'
import { showToast } from '../Toast/Toast'

interface Props {
  onClose: () => void
}

interface ImageFile {
  name: string
  bytes: ArrayBuffer
  type: 'png' | 'jpg'
}

export function ImagesToPdfModal({ onClose }: Props) {
  const [images, setImages] = useState<ImageFile[]>([])
  const [pageSize, setPageSize] = useState<ImagePdfPageSize>('auto')
  const [orientation, setOrientation] = useState<ImagePdfOrientation>('auto')
  const [margin, setMargin] = useState<ImagePdfMargin>('none')
  const [working, setWorking] = useState(false)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] },
    multiple: true,
    onDrop: (accepted) => {
      accepted.forEach((file) => {
        const reader = new FileReader()
        reader.onload = () =>
          setImages((current) => [
            ...current,
            {
              name: file.name,
              bytes: reader.result as ArrayBuffer,
              type: file.type === 'image/png' ? 'png' : 'jpg',
            },
          ])
        reader.readAsArrayBuffer(file)
      })
    },
  })

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  async function handleCreate() {
    setWorking(true)
    try {
      const out = await imagesToPdf(images, { pageSize, orientation, margin })
      downloadBytes(new Uint8Array(out), 'images.pdf')
      showToast('Image PDF downloaded', 'success')
      onClose()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Image conversion failed', 'error')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Modal title="JPG/PNG to PDF" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-3">Files stay in your browser.</p>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer mb-3 transition-colors ${
          isDragActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-400'
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm text-slate-600">Drop JPG/PNG images here or click to browse</p>
      </div>

      {images.length > 0 && (
        <ul className="mb-4 space-y-1">
          {images.map((img, i) => (
            <li
              key={`${img.name}-${i}`}
              className="flex items-center justify-between gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2"
            >
              <span className="truncate text-slate-700">{img.name}</span>
              <div className="flex items-center gap-1">
                <button
                  className="px-1.5 py-0.5 text-xs border border-slate-200 rounded disabled:opacity-40"
                  disabled={i === 0}
                  onClick={() => moveImage(i, -1)}
                >
                  Up
                </button>
                <button
                  className="px-1.5 py-0.5 text-xs border border-slate-200 rounded disabled:opacity-40"
                  disabled={i === images.length - 1}
                  onClick={() => moveImage(i, 1)}
                >
                  Dn
                </button>
                <button
                  className="px-1.5 py-0.5 text-xs border border-slate-200 rounded text-slate-500 hover:text-red-600"
                  onClick={() => setImages((arr) => arr.filter((_, j) => j !== i))}
                >
                  x
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Select label="Page" value={pageSize} onChange={(v) => setPageSize(v as ImagePdfPageSize)} options={['auto', 'letter', 'a4']} />
        <Select label="Orient" value={orientation} onChange={(v) => setOrientation(v as ImagePdfOrientation)} options={['auto', 'portrait', 'landscape']} />
        <Select label="Margin" value={margin} onChange={(v) => setMargin(v as ImagePdfMargin)} options={['none', 'small', 'medium']} />
      </div>

      <button
        onClick={handleCreate}
        disabled={working || images.length === 0}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {working ? 'Creating...' : 'Create PDF'}
      </button>
    </Modal>
  )
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
