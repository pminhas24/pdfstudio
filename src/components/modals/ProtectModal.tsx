import { useState } from 'react'
import { Modal } from './Modal'
import { protectPdf, unlockPdf } from '../../lib/passwordOps'
import { downloadBytes } from '../../lib/pdfExporter'
import { usePdfStore } from '../../store/pdfStore'
import { showToast } from '../Toast/Toast'

interface Props {
  onClose: () => void
}

// Password ops produce a DOWNLOAD rather than replacing the open document:
// an encrypted document can't be edited in place, and unlock is typically
// the last step before saving.
export function ProtectModal({ onClose }: Props) {
  const [mode, setMode] = useState<'protect' | 'unlock'>('protect')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [working, setWorking] = useState(false)
  const fileName = usePdfStore((s) => s.fileName)

  async function handleProtect() {
    if (password.length < 4) {
      showToast('Password must be at least 4 characters', 'error')
      return
    }
    if (password !== confirm) {
      showToast('Passwords do not match', 'error')
      return
    }
    setWorking(true)
    try {
      const bytes = usePdfStore.getState().pdfBytes!
      const out = await protectPdf(bytes, password)
      downloadBytes(new Uint8Array(out), fileName.replace(/\.pdf$/i, '') + '-protected.pdf')
      showToast('Protected PDF downloaded', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showToast('Failed to protect this PDF', 'error')
    } finally {
      setWorking(false)
    }
  }

  async function handleUnlock() {
    setWorking(true)
    try {
      const bytes = usePdfStore.getState().pdfBytes!
      const out = await unlockPdf(bytes, password)
      downloadBytes(new Uint8Array(out), fileName.replace(/\.pdf$/i, '') + '-unlocked.pdf')
      showToast('Unlocked PDF downloaded', 'success')
      onClose()
    } catch (e) {
      console.error(e)
      showToast('Wrong password, or this PDF cannot be unlocked', 'error')
    } finally {
      setWorking(false)
    }
  }

  return (
    <Modal title="Password Protection" onClose={onClose}>
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
        {(['protect', 'unlock'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              mode === m ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'
            }`}
          >
            {m === 'protect' ? '🔒 Add password' : '🔓 Remove password'}
          </button>
        ))}
      </div>

      <label className="block text-sm font-medium text-slate-700 mb-1">
        {mode === 'protect' ? 'New password' : 'Current password'}
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
      />

      {mode === 'protect' && (
        <>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Confirm password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
          />
        </>
      )}

      <p className="text-xs text-slate-400 mb-4">
        {mode === 'protect'
          ? 'A protected copy is downloaded; the document you are editing stays open.'
          : 'Note: to edit a password-protected PDF, unlock it here first, then open the unlocked copy.'}
      </p>

      <button
        onClick={mode === 'protect' ? handleProtect : handleUnlock}
        disabled={working || !password}
        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
      >
        {working
          ? 'Working…'
          : mode === 'protect'
            ? 'Download protected PDF'
            : 'Download unlocked PDF'}
      </button>
    </Modal>
  )
}
