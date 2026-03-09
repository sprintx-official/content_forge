import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  }

  const colors = {
    success: 'border-[#10b981]/50 bg-[#10b981]/10 text-[#10b981]',
    error: 'border-red-500/50 bg-red-500/10 text-red-400',
    info: 'border-[#6366f1]/50 bg-[#6366f1]/10 text-[#6366f1]',
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-xl shadow-lg animate-slide-in ${colors[t.type]}`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="text-sm flex-1">{t.message}</span>
              <button onClick={() => removeToast(t.id)} className="p-0.5 hover:opacity-70">
                <X className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
