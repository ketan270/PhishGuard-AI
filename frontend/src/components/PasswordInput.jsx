import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'

export default function PasswordInput({ value, onChange, placeholder = '••••••••', autoComplete, id }) {
  const [show, setShow] = useState(false)
  return (
    <div className="input-wrap">
      <Lock size={18} />
      <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} required style={{ paddingRight: 46 }} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)', display: 'grid' }}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
