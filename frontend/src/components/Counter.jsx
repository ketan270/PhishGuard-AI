import { useRef } from 'react'
import { gsap, useGSAP } from '../lib/gsap'

export default function Counter({ value, decimals = 0, suffix = '', prefix = '', duration = 2, scroll = true }) {
  const ref = useRef(null)
  useGSAP(() => {
    const obj = { v: 0 }
    gsap.to(obj, {
      v: value, duration, ease: 'power3.out',
      scrollTrigger: scroll ? { trigger: ref.current, start: 'top 90%', once: true } : undefined,
      onUpdate: () => {
        if (ref.current) ref.current.textContent = prefix + obj.v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
      },
    })
  }, { dependencies: [value] })
  return <span ref={ref}>{prefix}0{suffix}</span>
}
