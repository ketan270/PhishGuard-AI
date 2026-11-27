import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'
import { scoreColor } from '../lib/format'

/** Animated semicircle-plus gauge (270°) showing a 0-100 risk score. */
export default function RiskGauge({ score = 0, size = 220, label = 'Risk score', delay = 0.2 }) {
  const root = useRef(null)
  const r = 80, c = 2 * Math.PI * r, arc = c * 0.75
  const color = scoreColor(score)
  useGSAP(() => {
    const obj = { v: 0 }
    const fill = root.current.querySelector('.g-fill')
    const num = root.current.querySelector('.g-num')
    const knob = root.current.querySelector('.g-knob')
    fill.style.strokeDasharray = `0 ${c}`
    gsap.to(obj, {
      v: score, duration: 1.8, delay, ease: 'power4.out',
      onUpdate: () => {
        const len = (obj.v / 100) * arc
        fill.style.strokeDasharray = `${len} ${c}`
        num.textContent = Math.round(obj.v)
        const ang = (135 + (obj.v / 100) * 270) * (Math.PI / 180)
        knob.setAttribute('cx', 100 + r * Math.cos(ang))
        knob.setAttribute('cy', 100 + r * Math.sin(ang))
      },
    })
  }, { scope: root, dependencies: [score] })
  const ticks = Array.from({ length: 28 }, (_, i) => {
    const ang = (135 + (i / 27) * 270) * (Math.PI / 180)
    return { x1: 100 + 92 * Math.cos(ang), y1: 100 + 92 * Math.sin(ang), x2: 100 + 97 * Math.cos(ang), y2: 100 + 97 * Math.sin(ang) }
  })
  return (
    <div ref={root} style={{ width: size, height: size, position: 'relative' }}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        <defs>
          <linearGradient id="gauge-grad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#10e0a0" />
            <stop offset=".55" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#ff4d6d" />
          </linearGradient>
          <filter id="gauge-glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {ticks.map((t, i) => <line key={i} {...t} stroke="rgba(148,163,255,.18)" strokeWidth="1.5" strokeLinecap="round" />)}
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="12"
          strokeDasharray={`${arc} ${c}`} strokeLinecap="round" transform="rotate(135 100 100)" />
        <circle className="g-fill" cx="100" cy="100" r={r} fill="none" stroke="url(#gauge-grad)" strokeWidth="12"
          strokeLinecap="round" transform="rotate(135 100 100)" filter="url(#gauge-glow)" />
        <circle className="g-knob" cx="43.4" cy="156.6" r="7" fill="#04060c" stroke={color} strokeWidth="3" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div className="g-num" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.26, lineHeight: 1, color, letterSpacing: '-0.04em' }}>0</div>
          <div style={{ fontSize: Math.max(11, size * 0.055), color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '.14em', marginTop: 6 }}>{label}</div>
        </div>
      </div>
    </div>
  )
}
