import { useEffect, useRef, useState } from 'react'
import { Check, ScanLine } from 'lucide-react'
import { gsap, useGSAP } from '../lib/gsap'

const STEPS = {
  URL: ['Validating URL structure', 'Normalising & parsing components', 'Extracting 34 security features', 'Gradient Boosting + n-gram ensemble', 'Reputation & threat-intel layer', 'Generating explanation'],
  Email: ['Validating email content', 'Cleaning & tokenising text', 'TF-IDF vectorisation', 'Linear SVM classification', 'Scanning embedded links', 'Generating explanation'],
}

export default function ScanOverlay({ type = 'URL' }) {
  const steps = STEPS[type]
  const [i, setI] = useState(0)
  const root = useRef(null)
  useEffect(() => {
    const id = setInterval(() => setI((x) => Math.min(x + 1, steps.length - 1)), 280)
    return () => clearInterval(id)
  }, [steps.length])
  useGSAP(() => {
    gsap.from(root.current, { opacity: 0, duration: 0.3 })
    gsap.from('.scan-box', { scale: 0.9, y: 30, opacity: 0, duration: 0.6, ease: 'back.out(1.4)' })
  }, { scope: root })
  return (
    <div ref={root} className="scan-overlay" role="status" aria-live="polite">
      <div className="card glow scan-box">
        <div className="radar"><div className="sweep" /><div className="core"><ScanLine size={36} /></div></div>
        <h3 style={{ fontSize: 22 }}>Analysing {type === 'URL' ? 'link' : 'email'}…</h3>
        <div className="scan-steps">
          {steps.map((s, k) => (
            <div key={s} className={k < i ? 'done' : k === i ? 'cur' : ''}>
              {k < i ? <Check size={14} /> : k === i ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <span style={{ width: 14 }}>·</span>}
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
