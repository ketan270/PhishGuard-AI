import { useEffect, useRef } from 'react'
import { gsap } from '../lib/gsap'

export default function CursorGlow() {
  const ref = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    const xTo = gsap.quickTo(ref.current, 'x', { duration: 0.6, ease: 'power3' })
    const yTo = gsap.quickTo(ref.current, 'y', { duration: 0.6, ease: 'power3' })
    const move = (e) => { xTo(e.clientX); yTo(e.clientY) }
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [])
  return <div ref={ref} className="cursor-glow" aria-hidden />
}
