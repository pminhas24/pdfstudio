import { useEffect, useState } from 'react'

export interface ToastMessage {
  id: number
  message: string
  type: 'info' | 'error' | 'success'
}

let toastId = 0
const listeners: ((msg: ToastMessage) => void)[] = []

// Imperative API so non-React code (exporter, loaders) can surface messages.
export function showToast(message: string, type: ToastMessage['type'] = 'info') {
  const msg = { id: ++toastId, message, type }
  listeners.forEach((fn) => fn(msg))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((t) => [...t, msg])
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== msg.id)), 4000)
    }
    listeners.push(handler)
    return () => {
      const i = listeners.indexOf(handler)
      if (i > -1) listeners.splice(i, 1)
    }
  }, [])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[100]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${
            t.type === 'error'
              ? 'bg-red-600 text-white'
              : t.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-slate-800 text-white'
          }`}
        >
          <span>{t.type === 'error' ? '⚠️' : t.type === 'success' ? '✅' : 'ℹ️'}</span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
