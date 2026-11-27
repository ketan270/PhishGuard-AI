import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="PhishGuard AI home">
      <span className="logo-mark"><ShieldCheck size={20} strokeWidth={2.5} /></span>
      PhishGuard<span className="grad-text">AI</span>
    </Link>
  )
}
