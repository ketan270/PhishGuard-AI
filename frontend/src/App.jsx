import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Lenis from 'lenis'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { gsap, ScrollTrigger, prefersReducedMotion } from './lib/gsap'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import CyberBackground from './components/CyberBackground'
import CursorGlow from './components/CursorGlow'
import Home from './pages/Home'

const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Results = lazy(() => import('./pages/Results'))
const History = lazy(() => import('./pages/History'))
const Insights = lazy(() => import('./pages/Insights'))
const About = lazy(() => import('./pages/About'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Protected({ children }) {
  const { isAuthed } = useAuth()
  const loc = useLocation()
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return children
}

function GuestOnly({ children }) {
  const { isAuthed } = useAuth()
  return isAuthed ? <Navigate to="/dashboard" replace /> : children
}

let lenis = null
export const scrollToTop = (immediate = true) => (lenis ? lenis.scrollTo(0, { immediate }) : window.scrollTo(0, 0))

function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return
    lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(raf); lenis.destroy(); lenis = null }
  }, [])
  return null
}

function RouteChange() {
  const { pathname } = useLocation()
  const first = useRef(true)
  const bar = useRef(null)
  useEffect(() => {
    scrollToTop()
    // allow layout to settle before ScrollTriggers measure
    const id = setTimeout(() => ScrollTrigger.refresh(), 300)
    if (!first.current && bar.current && !prefersReducedMotion()) {
      gsap.fromTo(bar.current, { scaleX: 0, opacity: 1, transformOrigin: 'left' },
        { scaleX: 1, duration: 0.5, ease: 'power2.inOut', onComplete: () => gsap.to(bar.current, { opacity: 0, duration: 0.3 }) })
    }
    first.current = false
    return () => clearTimeout(id)
  }, [pathname])
  return <div ref={bar} style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'var(--grad)', zIndex: 120, opacity: 0, boxShadow: '0 0 12px var(--cyan)' }} />
}

function Shell() {
  const { pathname } = useLocation()
  const bare = pathname === '/login' || pathname === '/register'
  return (
    <>
      <CyberBackground />
      <CursorGlow />
      <SmoothScroll />
      <RouteChange />
      {!bare && <Navbar />}
      <main>
        <Suspense fallback={<div className="page wrap"><div className="skeleton" style={{ height: 320 }} /></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/results/:id" element={<Protected><Results /></Protected>} />
            <Route path="/history" element={<Protected><History /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!bare && <Footer />}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
