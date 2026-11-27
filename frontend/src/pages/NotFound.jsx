import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { gsap, useGSAP } from '../lib/gsap'

export default function NotFound() {
  const root = useRef(null)
  useGSAP(() => {
    gsap.from('.nf > *', { y: 40, opacity: 0, stagger: 0.1 })
    gsap.to('.glitch', { skewX: 8, x: 4, duration: 0.08, repeat: -1, repeatDelay: 2.2, yoyo: true })
  }, { scope: root })
  return (
    <div ref={root} className="notfound wrap">
      <div className="nf">
        <h1 className="glitch grad-text">404</h1>
        <h2 className="h-md" style={{ margin: '12px 0' }}>This page looks… suspicious.</h2>
        <p className="dim" style={{ marginBottom: 28 }}>The link you followed doesn't exist. Good thing you didn't enter your password.</p>
        <Link to="/" className="btn btn-primary"><span className="shine" />Take me home</Link>
      </div>
    </div>
  )
}
