import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { gsap, useGSAP } from '../lib/gsap'

const ToastContext = createContext(() => {})

function ToastItem({ t }) {
  const ref = useRef(null)
  useGSAP(() => { gsap.from(ref.current, { x: 60, opacity: 0, duration: 0.5, ease: 'back.out(1.6)' }) }, { scope: ref })
  const Icon = t.type === 'error' ? AlertCircle : t.type === 'success' ? CheckCircle2 : Info
  return (
    <div ref={ref} className={`toast ${t.type}`} role="status">
      <Icon size={18} />
      <span>{t.message}</span>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toast = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((ts) => [...ts, { id, message, type }])
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3800)
  }, [])
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toasts">{toasts.map((t) => <ToastItem key={t.id} t={t} />)}</div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
