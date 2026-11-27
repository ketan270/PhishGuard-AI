import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { BarChart3, History, Info, LayoutDashboard, LogOut, Menu, X, ScanLine } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { gsap, useGSAP } from '../lib/gsap'
import Logo from './Logo'

export default function Navbar() {
  const { user, isAuthed, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const nav = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => setOpen(false), [pathname])

  useGSAP(() => {
    gsap.from(nav.current.querySelectorAll('.logo, .nav-link, .nav-actions > *'), {
      y: -24, opacity: 0, stagger: 0.05, duration: 0.8, delay: 0.1,
    })
  }, { scope: nav })

  const handleLogout = () => { logout(); navigate('/') }
  const links = isAuthed
    ? [
        { to: '/dashboard', label: 'Scanner', icon: ScanLine },
        { to: '/history', label: 'History', icon: History },
        { to: '/insights', label: 'Model Insights', icon: BarChart3 },
        { to: '/about', label: 'About', icon: Info },
      ]
    : [
        { to: '/insights', label: 'Model Insights', icon: BarChart3 },
        { to: '/about', label: 'About', icon: Info },
      ]

  return (
    <>
      <header ref={nav} className={`nav ${scrolled || open ? 'scrolled' : ''}`}>
        <div className="wrap">
          <Logo />
          <nav className="nav-links" aria-label="Main">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-actions">
            {isAuthed ? (
              <>
                <Link to="/dashboard" className="avatar hide-m" title={user?.email}>{(user?.name || '?').slice(0, 1).toUpperCase()}</Link>
                <button onClick={handleLogout} className="btn btn-ghost btn-sm hide-m"><LogOut size={16} /> Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm hide-m">Log in</Link>
                <Link to="/register" className="btn btn-primary btn-sm hide-m"><span className="shine" />Get started</Link>
              </>
            )}
            <button className="btn btn-ghost btn-icon menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="mobile-menu">
          {isAuthed && <NavLink to="/dashboard"><LayoutDashboard size={18} /> Dashboard</NavLink>}
          {links.filter((l) => l.to !== '/dashboard').map((l) => (
            <NavLink key={l.to} to={l.to}><l.icon size={18} /> {l.label}</NavLink>
          ))}
          {isAuthed ? (
            <button onClick={handleLogout}><LogOut size={18} /> Logout</button>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register">Create account</NavLink>
            </>
          )}
        </div>
      )}
    </>
  )
}
