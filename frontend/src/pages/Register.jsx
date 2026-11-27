import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Check, Mail, User } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AuthLayout from '../components/AuthLayout'
import PasswordInput from '../components/PasswordInput'

const RULES = [
  { test: (p) => p.length >= 8, label: '8+ characters' },
  { test: (p) => /[A-Za-z]/.test(p), label: 'a letter' },
  { test: (p) => /\d/.test(p), label: 'a number' },
  { test: (p) => /[^A-Za-z0-9]/.test(p), label: 'a symbol (bonus)' },
]

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const passed = useMemo(() => RULES.map((r) => r.test(form.password)), [form.password])
  const strength = passed.filter(Boolean).length
  const colors = ['#ff4d6d', '#ff4d6d', '#fbbf24', '#22d3ee', '#10e0a0']

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!passed[0] || !passed[1] || !passed[2]) { setError('Password must have at least 8 characters, a letter and a number.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', form)
      login(data.access_token, data.user)
      toast('Account created. Welcome to PhishGuard AI!', 'success')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Registration failed.'))
    } finally { setLoading(false) }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Free forever. Save your scans, build a dashboard and export reports.">
      <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
        {error && <div className="error-box"><AlertCircle size={18} />{error}</div>}
        <div className="field">
          <label className="label" htmlFor="name">Full name</label>
          <div className="input-wrap"><User size={18} /><input id="name" className="input" value={form.name} onChange={set('name')} placeholder="Ketan Sharma" autoComplete="name" required minLength={2} /></div>
        </div>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <div className="input-wrap"><Mail size={18} /><input id="email" className="input" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" required /></div>
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <PasswordInput id="password" value={form.password} onChange={set('password')} autoComplete="new-password" />
          <div className="pw-meter">{[0, 1, 2, 3].map((i) => <i key={i} style={{ background: i < strength ? colors[strength] : undefined }} />)}</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: '4px 14px', fontSize: 12 }}>
            {RULES.map((r, i) => (
              <span key={r.label} style={{ color: passed[i] ? 'var(--safe)' : 'var(--text-mute)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Check size={12} /> {r.label}
              </span>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" disabled={loading} style={{ marginTop: 6 }}>
          <span className="shine" />{loading ? <span className="spinner" /> : <>Create account <ArrowRight size={18} /></>}
        </button>
        <p className="dim" style={{ textAlign: 'center', fontSize: 14 }}>
          Already have an account? <Link to="/login" className="grad-text" style={{ fontWeight: 600 }}>Log in</Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: 13 }}><Link to="/" className="mute">← Back to home</Link></p>
      </form>
    </AuthLayout>
  )
}
