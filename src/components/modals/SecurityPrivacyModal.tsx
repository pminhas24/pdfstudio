import { Modal } from './Modal'
import { removePdfMetadata } from '../../lib/pageOperations'
import { useDocOperation } from '../../hooks/useDocOperation'

interface Props {
  onClose: () => void
}

export function SecurityPrivacyModal({ onClose }: Props) {
  const { applyOp, busy } = useDocOperation()

  async function handleRemoveMetadata() {
    const ok = await applyOp({
      transform: (bytes) => removePdfMetadata(bytes),
      successMessage: 'PDF metadata removed',
    })
    if (ok) onClose()
  }

  return (
    <Modal title="Security & Privacy" onClose={onClose}>
      <p className="text-sm text-slate-500 mb-4">Files stay in your browser.</p>

      <div className="space-y-3">
        <div className="border border-slate-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Remove PDF metadata</h3>
              <p className="text-xs text-slate-500 mt-1">
                Clears title, author, subject, keywords, creator, and producer where possible.
              </p>
            </div>
            <button
              onClick={handleRemoveMetadata}
              disabled={busy}
              className="shrink-0 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
            >
              {busy ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>

        <ComingSoon
          title="Password protect"
          description="Reliable browser-side PDF encryption is not implemented yet."
        />
        <ComingSoon
          title="Unlock PDF"
          description="Reliable in-browser password removal is not implemented yet."
        />
        <ComingSoon
          title="Redact PDF"
          description="Permanent redaction is not implemented yet."
        />
      </div>
    </Modal>
  )
}

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
          Coming Soon
        </span>
      </div>
    </div>
  )
}
