import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, AlertCircle, Mail } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AuthLayout from '../components/AuthLayout'
import PasswordInput from '../components/PasswordInput'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const loc = useLocation()

  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token, data.user)
      toast(`Welcome back, ${data.user.name.split(' ')[0]}!`, 'success')
      navigate(loc.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'Login failed.'))
    } finally { setLoading(false) }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue protecting yourself from phishing.">
      <form onSubmit={submit} className="stack" style={{ gap: 18 }}>
        {error && <div className="error-box"><AlertCircle size={18} />{error}</div>}
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <div className="input-wrap"><Mail size={18} /><input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <button className="btn btn-primary" disabled={loading} style={{ marginTop: 6 }}>
          <span className="shine" />{loading ? <span className="spinner" /> : <>Log in <ArrowRight size={18} /></>}
        </button>
        <p className="dim" style={{ textAlign: 'center', fontSize: 14 }}>
          New to PhishGuard? <Link to="/register" className="grad-text" style={{ fontWeight: 600 }}>Create an account</Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: 13 }}><Link to="/" className="mute">← Back to home</Link></p>
      </form>
    </AuthLayout>
  )
}
