import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Globe, Radar, ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react'
import api, { errorMessage } from '../lib/api'
import { gsap, useGSAP } from '../lib/gsap'
import { URL_SAMPLES } from '../lib/project'
import { useAuth } from '../context/AuthContext'
import RiskGauge from './RiskGauge'

const STEPS = ['validating input', 'parsing URL structure', 'extracting 34 features', 'running ensemble models', 'computing risk & explanation']

export default function LiveScanner() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(-1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const root = useRef(null)
  const { isAuthed } = useAuth()
  const { contextSafe } = useGSAP({ scope: root })

  const animateResult = contextSafe(() => {
    gsap.from('.scan-result > *', { y: 20, opacity: 0, stagger: 0.08, duration: 0.6 })
    gsap.from('.ind-line', { x: -16, opacity: 0, stagger: 0.07, delay: 0.3, duration: 0.5 })
  })
  const runScanline = contextSafe(() => gsap.fromTo('.scanline', { top: '0%', opacity: 1 }, { top: '100%', duration: 1.1, repeat: 2, ease: 'none', onComplete: () => gsap.set('.scanline', { opacity: 0 }) }))

  const scan = async (value) => {
    const target = (value ?? url).trim()
    if (!target) { setError('Paste a URL to scan.'); return }
    setUrl(target)
    setError(''); setResult(null); setLoading(true); setStep(0)
    runScanline()
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i), i * 260))
    try {
      const [res] = await Promise.all([
        api.post('/analysis/quick', { input: target, type: 'url' }),
        new Promise((r) => setTimeout(r, STEPS.length * 260 + 150)),
      ])
      setStep(STEPS.length)
      setResult(res.data)
      requestAnimationFrame(animateResult)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      timers.forEach(clearTimeout)
      setLoading(false)
    }
  }

  const Icon = result?.risk_level === 'High' ? ShieldAlert : result?.risk_level === 'Medium' ? AlertTriangle : ShieldCheck
  const color = result?.risk_level === 'High' ? 'var(--danger)' : result?.risk_level === 'Medium' ? 'var(--warn)' : 'var(--safe)'

  return (
    <div ref={root} className="card glow scanner" style={{ overflow: 'hidden' }}>
      <div className="scanline" style={{ opacity: 0 }} />
      <div className="scanner-top">
        <div className="dots"><i /><i /><i /></div>
        <span className="title">phishguard://live-scan</span>
        <span className="badge neutral" style={{ marginLeft: 'auto' }}><Radar size={12} /> no sign-up needed</span>
      </div>
      <form className="scan-input-row" onSubmit={(e) => { e.preventDefault(); scan() }}>
        <div className="input-wrap" style={{ flex: 1 }}>
          <Globe size={18} />
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste any link, e.g. paypal-verify.tk/login" aria-label="URL to scan" spellCheck={false} />
        </div>
        <button className="btn btn-primary" disabled={loading}>
          <span className="shine" />
          {loading ? <span className="spinner" /> : <>Scan <ArrowRight size={16} /></>}
        </button>
      </form>
      <div className="scan-chips">
        {URL_SAMPLES.slice(0, 4).map((s) => (
          <button key={s.label} type="button" className={`chip ${s.bad ? 'bad' : ''}`} onClick={() => scan(s.value)} disabled={loading}>
            {s.label}
          </button>
        ))}
      </div>
      {error && <div className="error-box" style={{ marginTop: 14 }}>{error}</div>}

      {(loading || (step >= 0 && !result && !error)) && (
        <div className="scan-result terminal">
          {STEPS.map((s, i) => (
            <div key={s} className={i < step ? 'ok' : i === step ? 'cur' : ''} style={{ opacity: i <= step ? 1 : 0.3 }}>
              {i < step ? '✓' : i === step ? '›' : '·'} {s}{i === step && <> <span className="cursor" /></>}
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="scan-result">
          <div className="mini-result">
            <RiskGauge score={result.risk_score} size={120} label="risk" delay={0} />
            <div>
              <div className="row" style={{ gap: 10, color }}>
                <Icon size={22} />
                <h3 style={{ fontSize: 26 }}>{result.prediction}</h3>
                <span className={`badge ${result.risk_level}`}>{result.risk_level} risk</span>
              </div>
              <p className="dim" style={{ fontSize: 13.5, marginTop: 6 }}>
                {result.confidence}% confidence · {result.processing_ms} ms
              </p>
              <div className="stack" style={{ gap: 6, marginTop: 12 }}>
                {result.indicators.slice(0, 3).map((ind) => (
                  <div key={ind.title} className="ind-line row" style={{ gap: 8, fontSize: 13.5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 6, flexShrink: 0, background: ind.severity === 'high' ? 'var(--danger)' : ind.severity === 'medium' ? 'var(--warn)' : ind.severity === 'safe' ? 'var(--safe)' : '#a5b4fc' }} />
                    {ind.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Link to={isAuthed ? '/dashboard' : '/register'} className="btn btn-ghost btn-sm" style={{ marginTop: 18, width: '100%' }}>
            {isAuthed ? 'Open full explainable report in the scanner' : 'Create a free account for the full explainable report'} <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}
