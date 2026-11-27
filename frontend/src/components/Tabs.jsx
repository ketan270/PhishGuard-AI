import { useLayoutEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'

export default function Tabs({ tabs, value, onChange }) {
  const wrap = useRef(null)
  const ind = useRef(null)
  const first = useRef(true)
  useLayoutEffect(() => {
    const el = wrap.current?.querySelector(`[data-v="${value}"]`)
    if (!el) return
    const props = { x: el.offsetLeft - 5, width: el.offsetWidth }
    if (first.current) { gsap.set(ind.current, props); first.current = false }
    else gsap.to(ind.current, { ...props, duration: 0.5, ease: 'power3.out' })
  }, [value])
  return (
    <div ref={wrap} className="tabs" role="tablist">
      <span ref={ind} className="tab-indicator" style={{ left: 5 }} />
      {tabs.map((t) => (
        <button key={t.value} data-v={t.value} role="tab" aria-selected={value === t.value} type="button"
          className={`tab ${value === t.value ? 'active' : ''}`} onClick={() => onChange(t.value)}>
          {t.icon && <t.icon size={16} />}{t.label}
        </button>
      ))}
    </div>
  )
}
