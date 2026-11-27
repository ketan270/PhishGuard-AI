import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, AlertCircle, ArrowRight, Globe, Mail, ScanLine, ShieldAlert, ShieldCheck, Target, Clock, Sparkles } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api, { errorMessage } from '../lib/api'
import { gsap, useGSAP } from '../lib/gsap'
import { riskHex, timeAgo } from '../lib/format'
import { EMAIL_SAMPLES, URL_SAMPLES } from '../lib/project'
import { useAuth } from '../context/AuthContext'
import Tabs from '../components/Tabs'
import ScanOverlay from '../components/ScanOverlay'
import Counter from '../components/Counter'

const tooltipStyle = { background: '#0c1222', border: '1px solid rgba(148,163,255,.22)', borderRadius: 12, fontSize: 13, color: '#e8ecf8' }

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function Scanner({ onDone }) {
  const [mode, setMode] = useState('URL')
  const [url, setUrl] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const box = useRef(null)
  const { contextSafe } = useGSAP({ scope: box })

  const swap = contextSafe((m) => {
    setMode(m); setError('')
    gsap.fromTo('.scan-body', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45 })
  })
  const shake = contextSafe(() => gsap.fromTo('.scan-body', { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }))

  const submit = async (e) => {
    e?.preventDefault()
    setError('')
    const value = mode === 'URL' ? url.trim() : email.trim()
    if (!value) { setError(mode === 'URL' ? 'Please enter a URL to analyse.' : 'Please paste the email content.'); shake(); return }
    setLoading(true)
    const started = Date.now()
    try {
      const { data } = mode === 'URL'
        ? await api.post('/analysis/url', { url: value })
        : await api.post('/analysis/email', { email_text: value })
      const wait = Math.max(0, 1700 - (Date.now() - started)) // let the scan animation breathe
      setTimeout(() => onDone(data), wait)
    } catch (err) {
      setLoading(false)
      setError(errorMessage(err)); shake()
    }
  }

  return (
    <div ref={box} className="card glow pad">
      {loading && <ScanOverlay type={mode} />}
      <div className="row-between" style={{ marginBottom: 22 }}>
        <span className="card-title" style={{ margin: 0 }}><ScanLine size={20} /> New analysis</span>
        <Tabs value={mode} onChange={swap} tabs={[{ value: 'URL', label: 'URL', icon: Globe }, { value: 'Email', label: 'Email', icon: Mail }]} />
      </div>
      <form onSubmit={submit} className="scan-body stack" style={{ gap: 14 }}>
        {mode === 'URL' ? (
          <>
            <div className="input-wrap">
              <Globe size={18} />
              <input className="input mono" style={{ height: 56, fontSize: 15 }} value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/login" spellCheck={false} autoFocus aria-label="URL" />
            </div>
            <div className="scan-chips" style={{ marginTop: 0 }}>
              <span className="mute" style={{ fontSize: 12, alignSelf: 'center' }}>Try:</span>
              {URL_SAMPLES.map((s) => (
                <button key={s.label} type="button" className={`chip ${s.bad ? 'bad' : ''}`} onClick={() => setUrl(s.value)}>{s.label}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <textarea className="textarea" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={'Paste the full email here, including the subject and any links…'} aria-label="Email content" />
            <div className="scan-chips" style={{ marginTop: 0 }}>
              <span className="mute" style={{ fontSize: 12, alignSelf: 'center' }}>Try:</span>
              {EMAIL_SAMPLES.map((s) => (
                <button key={s.label} type="button" className={`chip ${s.bad ? 'bad' : ''}`} onClick={() => setEmail(s.value)}>{s.label}</button>
              ))}
            </div>
          </>
        )}
        {error && <div className="error-box"><AlertCircle size={18} />{error}</div>}
        <button className="btn btn-primary" disabled={loading} style={{ height: 54 }}>
          <span className="shine" />
          <Sparkles size={18} /> Analyse {mode === 'URL' ? 'URL' : 'email'} <ArrowRight size={18} />
        </button>
        <p className="mute" style={{ fontSize: 12, textAlign: 'center' }}>
          PhishGuard never visits the link. Analysis is performed on the text only.
        </p>
      </form>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [err, setErr] = useState('')
  const root = useRef(null)

  useEffect(() => {
    api.get('/analysis/stats').then((r) => setStats(r.data)).catch((e) => setErr(errorMessage(e)))
  }, [])

  useGSAP(() => {
    gsap.from('.dash-head > *', { y: 24, opacity: 0, stagger: 0.08 })
    gsap.from('.dash-grid > *', { y: 40, opacity: 0, stagger: 0.12, delay: 0.15, duration: 1 })
  }, { scope: root })
  useGSAP(() => {
    if (!stats) return
    const from = (sel, vars) => { const els = gsap.utils.toArray(sel, root.current); if (els.length) gsap.from(els, vars) }
    from('.kpi', { y: 30, opacity: 0, stagger: 0.08, duration: 0.8 })
    from('.below > *', { y: 40, opacity: 0, stagger: 0.1, duration: 0.9, delay: 0.2 })
    from('.recent-item', { x: 20, opacity: 0, stagger: 0.06, delay: 0.3 })
  }, { scope: root, dependencies: [stats] })

  const onDone = (data) => navigate(`/results/${data._id}`, { state: { result: data } })
  const pie = stats ? [
    { name: 'Low', value: stats.by_risk.Low }, { name: 'Medium', value: stats.by_risk.Medium }, { name: 'High', value: stats.by_risk.High },
  ].filter((d) => d.value > 0) : []

  return (
    <div ref={root} className="page wrap">
      <div className="dash-head row-between">
        <div>
          <span className="eyebrow"><span className="dot" /> Protection active</span>
          <h1 className="h-lg">{greeting()}, <span className="grad-text">{(user?.name || 'there').split(' ')[0]}</span></h1>
          <p className="dim" style={{ marginTop: 8 }}>Paste a suspicious link or email. We'll tell you how risky it is and why.</p>
        </div>
      </div>

      {err && <div className="error-box" style={{ marginBottom: 20 }}><AlertCircle size={18} />{err}</div>}

      {stats && (
        <div className="kpis">
          {[
            { label: 'Total scans', v: stats.total, icon: Activity, c: 'var(--cyan)' },
            { label: 'Phishing caught', v: stats.phishing, icon: ShieldAlert, c: 'var(--danger)' },
            { label: 'Looked safe', v: stats.safe, icon: ShieldCheck, c: 'var(--safe)' },
            { label: 'Avg. risk score', v: stats.avg_risk_score, icon: Target, c: 'var(--warn)', d: 1 },
          ].map((k) => (
            <div key={k.label} className="card kpi">
              <div className="k-label">{k.label}<span className="k-ico" style={{ background: 'rgba(255,255,255,.04)', color: k.c }}><k.icon size={16} /></span></div>
              <div className="k-val"><Counter value={k.v} decimals={k.d || 0} scroll={false} duration={1.4} /></div>
            </div>
          ))}
        </div>
      )}

      <div className="dash-grid">
        <Scanner onDone={onDone} />
        <div className="stack" style={{ gap: 20 }}>
          <div className="card pad">
            <div className="card-title"><Target size={18} /> Risk distribution</div>
            {!stats ? <div className="skeleton" style={{ height: 180 }} /> : stats.total === 0 ? (
              <div className="empty"><ShieldCheck size={36} />No scans yet. Your risk breakdown will appear here.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', gap: 16 }}>
                <div style={{ height: 160, position: 'relative' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pie} dataKey="value" innerRadius={52} outerRadius={74} paddingAngle={3} stroke="none" animationDuration={1200}>
                        {pie.map((d) => <Cell key={d.name} fill={riskHex(d.name)} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#e8ecf8' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', textAlign: 'center' }}>
                    <div><div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>{stats.total}</div><div className="mute" style={{ fontSize: 11 }}>scans</div></div>
                  </div>
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  {['High', 'Medium', 'Low'].map((l) => (
                    <div key={l} className="row-between" style={{ fontSize: 14 }}>
                      <span className="row" style={{ gap: 8 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: riskHex(l) }} />{l} risk</span>
                      <b className="mono">{stats.by_risk[l]}</b>
                    </div>
                  ))}
                  <div className="divider" style={{ margin: '4px 0' }} />
                  <div className="row-between mute" style={{ fontSize: 13 }}><span>URLs / Emails</span><span className="mono">{stats.by_type.URL} / {stats.by_type.Email}</span></div>
                </div>
              </div>
            )}
          </div>
          <div className="card pad" style={{ flex: 1 }}>
            <div className="row-between" style={{ marginBottom: 10 }}>
              <span className="card-title" style={{ margin: 0 }}><Clock size={18} /> Recent scans</span>
              <Link to="/history" className="mute" style={{ fontSize: 13 }}>View all →</Link>
            </div>
            {!stats ? <div className="skeleton" style={{ height: 200 }} /> : stats.recent.length === 0 ? (
              <div className="empty"><ScanLine size={36} />Run your first analysis to see it here.</div>
            ) : stats.recent.map((r) => (
              <Link key={r._id} to={`/results/${r._id}`} className="recent-item">
                <span className="ri" style={{ color: riskHex(r.risk_level) }}>{r.analysis_type === 'URL' ? <Globe size={16} /> : <Mail size={16} />}</span>
                <div className="rt"><div className="mono" style={{ fontSize: 13 }}>{r.input}</div><small>{timeAgo(r.timestamp)} · score {r.risk_score}</small></div>
                <span className={`badge ${r.risk_level}`}>{r.risk_level}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {stats && stats.total > 0 && (
        <div className="below" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 20, marginTop: 20 }}>
          <div className="card pad">
            <div className="card-title"><Activity size={18} /> Activity · last 14 days</div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer>
                <AreaChart data={stats.timeline} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    {[['safe', '#10e0a0'], ['suspicious', '#fbbf24'], ['phishing', '#ff4d6d']].map(([k, c]) => (
                      <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c} stopOpacity={0.5} /><stop offset="1" stopColor={c} stopOpacity={0} /></linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,255,.07)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="#64708f" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#64708f" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="safe" stackId="1" stroke="#10e0a0" fill="url(#g-safe)" strokeWidth={2} />
                  <Area type="monotone" dataKey="suspicious" stackId="1" stroke="#fbbf24" fill="url(#g-suspicious)" strokeWidth={2} />
                  <Area type="monotone" dataKey="phishing" stackId="1" stroke="#ff4d6d" fill="url(#g-phishing)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card pad">
            <div className="card-title"><ShieldAlert size={18} /> Most frequent red flags</div>
            {stats.top_indicators.length === 0 ? <div className="empty">No red flags detected yet.</div> : (
              <div className="stack" style={{ gap: 14 }}>
                {stats.top_indicators.map((t) => (
                  <div key={t.title}>
                    <div className="row-between" style={{ fontSize: 13.5, marginBottom: 6 }}><span>{t.title}</span><span className="mono mute">{t.count}</span></div>
                    <div className="score-bar" style={{ width: '100%' }}><i style={{ width: `${(t.count / stats.top_indicators[0].count) * 100}%`, background: 'var(--grad-danger)' }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <style>{`@media (max-width: 1024px){ .below{ grid-template-columns: 1fr !important; } }`}</style>
        </div>
      )}
    </div>
  )
}
