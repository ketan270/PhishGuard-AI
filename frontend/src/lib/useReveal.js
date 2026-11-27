import { gsap, ScrollTrigger, useGSAP } from './gsap'

/** Fades/slides every `.reveal` element inside `scope` into view as it scrolls in. */
export default function useReveal(scope, deps = []) {
  useGSAP(() => {
    const els = gsap.utils.toArray('.reveal', scope.current)
    if (!els.length) return
    gsap.set(els, { opacity: 0, y: 40 })
    ScrollTrigger.batch(els, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, stagger: 0.08, duration: 0.9, overwrite: true }),
    })
  }, { scope, dependencies: deps })
}
